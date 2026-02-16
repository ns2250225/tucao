import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

// Keys
const KEYS = {
  USERS: 'tucao:users', // Hash: socketId -> JSON
  MESSAGES: 'tucao:messages', // List of JSON
  REDPACKETS: 'tucao:redpackets', // Hash: id -> JSON
  DICEGAMES: 'tucao:dicegames', // Hash: id -> JSON
  POLLS: 'tucao:polls', // Hash: id -> JSON
  LOTTERIES: 'tucao:lotteries', // Hash: id -> JSON
  TOASTS: 'tucao:toasts', // Hash: id -> JSON
  KICKVOTES: 'tucao:kickvotes', // Hash: id -> JSON
};

// Lua script for grabbing red packet atomically
const grabRedPacketScript = `
  local redPacketId = KEYS[1]
  local userId = ARGV[1]
  local userName = ARGV[2]
  local now = tonumber(ARGV[3])

  -- Get red packet data
  local redPacketJson = redis.call('HGET', 'tucao:redpackets', redPacketId)
  if not redPacketJson then
    return cjson.encode({ success = false, message = '红包不存在或已过期' })
  end

  local redPacket = cjson.decode(redPacketJson)

  -- Check if already grabbed
  for _, grabbed in ipairs(redPacket.grabbedList) do
    if grabbed.userId == userId then
      return cjson.encode({ success = false, message = '你已经抢过这个红包了', amount = grabbed.amount, detail = redPacket })
    end
  end

  -- Check remaining count
  if redPacket.remainingCount <= 0 then
    return cjson.encode({ success = false, message = '手慢了，红包派完了', detail = redPacket })
  end

  -- Calculate amount
  local grabAmount = 0
  if redPacket.remainingCount == 1 then
    grabAmount = redPacket.remainingAmount
  else
    local max = (redPacket.remainingAmount / redPacket.remainingCount) * 2
    -- Lua random is float between 0 and 1
    grabAmount = math.random() * max
    grabAmount = math.floor(grabAmount * 100) / 100
    if grabAmount < 0.01 then grabAmount = 0.01 end
    if grabAmount > redPacket.remainingAmount then grabAmount = redPacket.remainingAmount end
  end
  
  -- Fix floating point issues
  grabAmount = math.floor(grabAmount * 100 + 0.5) / 100

  -- Update red packet
  redPacket.remainingAmount = redPacket.remainingAmount - grabAmount
  redPacket.remainingCount = redPacket.remainingCount - 1
  
  local grabRecord = {
    userId = userId,
    userName = userName,
    amount = grabAmount,
    timestamp = now
  }
  
  table.insert(redPacket.grabbedList, grabRecord)
  
  -- Save back
  redis.call('HSET', 'tucao:redpackets', redPacketId, cjson.encode(redPacket))
  
  return cjson.encode({ success = true, amount = grabAmount, detail = redPacket })
`;

redis.defineCommand('grabRedPacket', {
  numberOfKeys: 1,
  lua: grabRedPacketScript
});

export const state = {
  redis,

  // Users
  async addUser(socketId, userData) {
    await redis.hset(KEYS.USERS, socketId, JSON.stringify(userData));
  },

  async removeUser(socketId) {
    await redis.hdel(KEYS.USERS, socketId);
  },

  async getUser(socketId) {
    const data = await redis.hget(KEYS.USERS, socketId);
    return data ? JSON.parse(data) : null;
  },

  async getAllUsers() {
    const data = await redis.hgetall(KEYS.USERS);
    return Object.values(data).map(JSON.parse);
  },
  
  async updateUser(socketId, updates) {
    // Optimistic locking via watch is safest, but for simplicity we'll just read-modify-write
    // Since this is usually one user modifying themselves, race conditions are low
    const user = await this.getUser(socketId);
    if (user) {
      const updatedUser = { ...user, ...updates };
      await this.addUser(socketId, updatedUser);
      return updatedUser;
    }
    return null;
  },

  // Messages
  async addMessage(message) {
    await redis.rpush(KEYS.MESSAGES, JSON.stringify(message));
    // Keep last 500 messages
    await redis.ltrim(KEYS.MESSAGES, -500, -1);
  },

  async getMessages() {
    const data = await redis.lrange(KEYS.MESSAGES, 0, -1);
    return data.map(JSON.parse);
  },

  async getEnrichedMessages() {
    const messages = await this.getMessages();
    const enrichedMessages = [...messages];

    // Collect IDs for each type
    const diceGameIds = [];
    const pollIds = [];
    const lotteryIds = [];
    const kickVoteIds = [];

    enrichedMessages.forEach((msg, index) => {
      if (msg.type === 'diceGame' && msg.diceGameId) {
        diceGameIds.push({ index, id: msg.diceGameId });
      } else if (msg.type === 'poll' && msg.pollId) {
        pollIds.push({ index, id: msg.pollId });
      } else if (msg.type === 'lottery' && msg.lotteryId) {
        lotteryIds.push({ index, id: msg.lotteryId });
      } else if (msg.type === 'kickVote' && msg.kickVoteId) {
        kickVoteIds.push({ index, id: msg.kickVoteId });
      }
    });

    // Helper to fetch and update
    const updateEntities = async (ids, key, dataProp) => {
      if (ids.length === 0) return;
      // Use pipeline to fetch all entities efficiently
      const pipeline = redis.pipeline();
      ids.forEach(({ id }) => pipeline.hget(key, id));
      const results = await pipeline.exec();

      results.forEach((result, i) => {
        const [err, data] = result;
        if (!err && data) {
          try {
            const entity = JSON.parse(data);
            const { index } = ids[i];
            const msg = enrichedMessages[index];

            // Update message data with latest entity data
            if (dataProp === 'diceGameData') {
              msg[dataProp] = {
                participants: entity.participants,
                status: entity.status,
                result: entity.result
              };
            } else if (dataProp === 'pollData') {
               msg[dataProp] = {
                title: entity.title,
                options: entity.options,
                totalVotes: Object.keys(entity.voters || {}).length,
                voters: Object.keys(entity.voters || {})
              };
            } else if (dataProp === 'lotteryData') {
               msg[dataProp] = {
                prizeImage: entity.prizeImage,
                maxParticipants: entity.maxParticipants,
                currentParticipants: entity.participants.length,
                status: entity.status,
                winnerName: entity.winnerName,
                winnerId: entity.winnerId,
                contactInfo: entity.status === 'finished' ? entity.contactInfo : null
              };
            } else if (dataProp === 'kickVoteData') {
               msg[dataProp] = {
                targetUserId: entity.targetUserId,
                targetUserName: entity.targetUserName,
                votes: entity.votes,
                requiredVotes: entity.requiredVotes,
                status: entity.status
              };
            }
          } catch (e) {
            console.error('Error parsing entity data:', e);
          }
        }
      });
    };

    await Promise.all([
      updateEntities(diceGameIds, KEYS.DICEGAMES, 'diceGameData'),
      updateEntities(pollIds, KEYS.POLLS, 'pollData'),
      updateEntities(lotteryIds, KEYS.LOTTERIES, 'lotteryData'),
      updateEntities(kickVoteIds, KEYS.KICKVOTES, 'kickVoteData')
    ]);

    return enrichedMessages;
  },

  async removeMessagesByUserId(userId) {
    const script = `
      local key = KEYS[1]
      local userId = ARGV[1]
      local items = redis.call('LRANGE', key, 0, -1)
      local newItems = {}
      for i, item in ipairs(items) do
        local decoded = cjson.decode(item)
        if decoded.senderId ~= userId then
          table.insert(newItems, item)
        end
      end
      redis.call('DEL', key)
      if #newItems > 0 then
        for i, item in ipairs(newItems) do
            redis.call('RPUSH', key, item)
        end
      end
      return 0
    `;
    // Note: RPUSH with unpack might fail if too many arguments, so looping is safer for large lists, 
    // or batching. Given max 500 items, unpack might be okay, but loop is safer.
    
    await redis.eval(script, 1, KEYS.MESSAGES, userId);
  },
  
  async cleanupMessages(maxAgeMs) {
      // Cleanup is harder in Redis List without iterating. 
      // We rely on LTRIM for size. 
      // Time-based cleanup: We can run a periodic job that pops old messages from the left
      // if they are too old.
      const now = Date.now();
      // Peek first message
      let first = await redis.lindex(KEYS.MESSAGES, 0);
      while (first) {
          const msg = JSON.parse(first);
          if (now - msg.timestamp > maxAgeMs) {
              await redis.lpop(KEYS.MESSAGES);
              first = await redis.lindex(KEYS.MESSAGES, 0);
          } else {
              break;
          }
      }
  },

  // Red Packets
  async addRedPacket(id, data) {
    await redis.hset(KEYS.REDPACKETS, id, JSON.stringify(data));
  },

  async getRedPacket(id) {
    const data = await redis.hget(KEYS.REDPACKETS, id);
    return data ? JSON.parse(data) : null;
  },

  async grabRedPacket(id, userId, userName) {
    // Use the Lua script
    const result = await redis.grabRedPacket(id, userId, userName, Date.now());
    return JSON.parse(result);
  },
  
  async removeRedPacket(id) {
      await redis.hdel(KEYS.REDPACKETS, id);
  },

  // Generic Helpers for other entities (Dice, Poll, etc)
  async addEntity(type, id, data) {
    const key = KEYS[type.toUpperCase() + 'S'] || `tucao:${type}s`;
    await redis.hset(key, id, JSON.stringify(data));
  },

  async getEntity(type, id) {
    const key = KEYS[type.toUpperCase() + 'S'] || `tucao:${type}s`;
    const data = await redis.hget(key, id);
    return data ? JSON.parse(data) : null;
  },

  async updateEntity(type, id, updateFn) {
    // Read-modify-write pattern
    const key = KEYS[type.toUpperCase() + 'S'] || `tucao:${type}s`;
    // Ideally use watch/multi/exec for atomicity
    const dataStr = await redis.hget(key, id);
    if (!dataStr) return null;
    
    let data = JSON.parse(dataStr);
    data = updateFn(data);
    
    await redis.hset(key, id, JSON.stringify(data));
    return data;
  },
  
  async removeEntity(type, id) {
      const key = KEYS[type.toUpperCase() + 'S'] || `tucao:${type}s`;
      await redis.hdel(key, id);
  },
  
  async getAllEntities(type) {
      const key = KEYS[type.toUpperCase() + 'S'] || `tucao:${type}s`;
      const data = await redis.hgetall(key);
      return Object.values(data).map(JSON.parse);
  },

  async cleanupEntities(type, maxAgeMs) {
      const key = KEYS[type.toUpperCase() + 'S'] || `tucao:${type}s`;
      const all = await this.getAllEntities(type);
      const now = Date.now();
      for (const item of all) {
          if (now - item.timestamp > maxAgeMs) {
              await redis.hdel(key, item.id);
          }
      }
  }
};
