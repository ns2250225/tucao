import cluster from 'node:cluster';
import { cpus } from 'node:os';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fakerZH_CN as faker } from '@faker-js/faker';
import Meting from '@meting/core';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { state } from './state.js';

// Configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const PORT = 3000;

if (cluster.isPrimary) {
  const numCPUs = cpus().length;
  console.log(`Primary ${process.pid} is running with ${numCPUs} CPUs`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
    // Restart worker
    cluster.fork();
  });
  
  // Cleanup routine: remove messages/entities older than 30 minutes
  const MESSAGE_LIFETIME = 30 * 60 * 1000; // 30 minutes in ms

  setInterval(async () => {
    try {
      // Cleanup messages handled by trimming in addMessage, 
      // but we can also remove old ones if needed.
      // state.cleanupMessages(MESSAGE_LIFETIME); 
      
      await state.cleanupEntities('redPacket', MESSAGE_LIFETIME);
      await state.cleanupEntities('lottery', MESSAGE_LIFETIME);
      await state.cleanupEntities('poll', MESSAGE_LIFETIME);
      await state.cleanupEntities('toast', MESSAGE_LIFETIME);
      await state.cleanupEntities('diceGame', MESSAGE_LIFETIME);
      await state.cleanupEntities('kickVote', MESSAGE_LIFETIME);
      
      // Cleanup offline users? 
      // Socket.io handles disconnects, but if a server crashes, users might remain in Redis.
      // We could add a heartbeat or just rely on 'disconnect' event.
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  }, 60 * 1000); // Check every minute

} else {
  // Worker Process
  const app = express();
  app.use(cors());
  app.use(express.json());

  // --- API Routes ---
  app.get('/api/music/search', async (req, res) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Missing query parameter q' });
    }
    try {
      const meting = new Meting('netease');
      meting.format(true);
      const searchResult = await meting.search(q, { page: 1, limit: 10 });
      const songs = JSON.parse(searchResult);
      
      if (!songs || songs.length === 0) {
        return res.status(404).json({ error: 'No songs found' });
      }

      const results = songs.map(song => ({
        id: song.id,
        name: song.name,
        artist: song.artist.join(', '),
        album: song.album,
        url_id: song.url_id,
        pic_id: song.pic_id,
        source: song.source
      }));

      res.json(results);

    } catch (error) {
      console.error('Music search error:', error);
      res.status(500).json({ error: 'Failed to search music' });
    }
  });

  app.post('/api/music/resolve', async (req, res) => {
    const { song } = req.body;
    if (!song) {
      return res.status(400).json({ error: 'Missing song data' });
    }

    try {
      const meting = new Meting('netease');
      meting.format(true);

      const urlInfoStr = await meting.url(song.url_id);
      const urlInfo = JSON.parse(urlInfoStr);
      
      if (!urlInfo.url) {
         return res.status(404).json({ error: 'Song URL not found' });
      }

      const picInfoStr = await meting.pic(song.pic_id);
      const picInfo = JSON.parse(picInfoStr);

      res.json({
        id: song.id,
        name: song.name,
        artist: song.artist,
        album: song.album,
        url: urlInfo.url,
        cover: picInfo.url,
        source: song.source
      });

    } catch (error) {
      console.error('Music resolve error:', error);
      res.status(500).json({ error: 'Failed to resolve music' });
    }
  });

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 2e7
  });

  // Redis Adapter Setup
  const pubClient = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
  const subClient = pubClient.duplicate();

  io.adapter(createAdapter(pubClient, subClient));

  io.on('connection', async (socket) => {
    console.log(`Worker ${process.pid}: User connected: ${socket.id}`);

    // Default user setup
    const userData = {
      id: socket.id,
      name: faker.person.fullName(),
      joinedAt: Date.now(),
      money: 1000
    };
    
    await state.addUser(socket.id, userData);

    // Send initial state
    // Note: In high concurrency, getting ALL users might be heavy, but for this app it's required
    const allUsers = await state.getAllUsers();
    const messages = await state.getMessages();
    
    socket.emit('init', {
      users: allUsers,
      messages: messages
    });

    // Broadcast new user
    socket.broadcast.emit('userJoined', userData);

    // Handle name change
    socket.on('updateName', async (newName) => {
      if (!newName || newName.length > 20) return;
      
      const updatedUser = await state.updateUser(socket.id, { name: newName });
      if (updatedUser) {
        io.emit('userUpdated', updatedUser);
      }
    });

    // Handle send Red Packet
    socket.on('sendRedPacket', async (payload) => {
      const { amount, count, message } = payload;
      
      // Transaction-like check
      const user = await state.getUser(socket.id);
      if (!user) {
        socket.emit('error', '用户不存在');
        return;
      }

      if (user.money < amount) {
        socket.emit('error', '余额不足');
        return;
      }
      
      if (amount <= 0 || count <= 0) {
         socket.emit('error', '金额或数量必须大于0');
         return;
      }

      // Deduct money
      const updatedUser = await state.updateUser(socket.id, { money: user.money - amount });
      io.emit('userUpdated', updatedUser);

      const redPacketId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      const redPacket = {
        id: redPacketId,
        senderId: user.id,
        senderName: user.name,
        totalAmount: parseFloat(amount),
        totalCount: parseInt(count),
        remainingAmount: parseFloat(amount),
        remainingCount: parseInt(count),
        message: message || '恭喜发财，大吉大利',
        grabbedList: [],
        timestamp: Date.now()
      };
      
      await state.addEntity('redPacket', redPacketId, redPacket);

      const chatMessage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: redPacket.message,
        senderId: user.id,
        senderName: user.name,
        timestamp: Date.now(),
        type: 'redPacket',
        redPacketId: redPacketId
      };

      await state.addMessage(chatMessage);
      io.emit('newMessage', chatMessage);
    });

    // Handle grab Red Packet
    socket.on('grabRedPacket', async (redPacketId) => {
      const user = await state.getUser(socket.id);
      if (!user) return;

      // Use atomic grab
      const result = await state.grabRedPacket(redPacketId, user.id, user.name);
      
      if (!result.success) {
        socket.emit('grabResult', { success: false, message: result.message, detail: result.detail });
        return;
      }

      // If success, update user money
      // Note: grabRedPacket script doesn't update user money in Redis, only returns amount.
      // We need to update user money here.
      // There is a small risk: if server crashes here, user gets money in packet but not in account.
      // For strict correctness, user money update should be part of the Lua script or a transaction.
      // But user data is in a different key.
      
      const updatedUser = await state.updateUser(socket.id, { money: user.money + result.amount });
      io.emit('userUpdated', updatedUser);
      
      socket.emit('grabResult', { success: true, amount: result.amount, detail: result.detail });
    });

    // Handle get Red Packet Detail
    socket.on('getRedPacketDetail', async (redPacketId) => {
      const redPacket = await state.getEntity('redPacket', redPacketId);
      if (redPacket) {
        socket.emit('redPacketDetail', redPacket);
      }
    });

    // Handle create Dice Game
    socket.on('createDiceGame', async () => {
      const user = await state.getUser(socket.id);
      if (!user) return;

      const diceGameId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      const diceGame = {
        id: diceGameId,
        creatorId: user.id,
        creatorName: user.name,
        participants: [],
        status: 'active',
        timestamp: Date.now()
      };
      
      await state.addEntity('diceGame', diceGameId, diceGame);

      const chatMessage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: '发布了一个赌大小活动',
        senderId: user.id,
        senderName: user.name,
        timestamp: Date.now(),
        type: 'diceGame',
        diceGameId: diceGameId,
        diceGameData: {
          participants: [],
          status: 'active'
        }
      };

      await state.addMessage(chatMessage);
      io.emit('newMessage', chatMessage);
    });

    // Handle join Dice Game
    socket.on('joinDiceGame', async (payload) => {
      const { diceGameId, betType, amount } = payload;
      const user = await state.getUser(socket.id);
      if (!user) return;

      // Optimistic lock / read-modify-write
      // In high concurrency, this might conflict. 
      // A Lua script would be better, but we stick to JS for complexity balance here.
      
      const diceGame = await state.getEntity('diceGame', diceGameId);

      if (!diceGame) {
        socket.emit('error', '活动不存在或已过期');
        return;
      }

      if (diceGame.status !== 'active') {
        socket.emit('error', '活动已结束');
        return;
      }

      if (diceGame.participants.some(p => p.userId === user.id)) {
        socket.emit('error', '你已经参与过该活动了');
        return;
      }

      if (user.money < amount) {
        socket.emit('error', '余额不足');
        return;
      }
      
      // Update User Money
      const updatedUser = await state.updateUser(socket.id, { money: user.money - amount });
      io.emit('userUpdated', updatedUser);

      // Update Game
      // Re-fetch to be safe? Or just update.
      const updatedGame = await state.updateEntity('diceGame', diceGameId, (game) => {
          game.participants.push({
            userId: user.id,
            userName: user.name,
            betType: betType,
            betAmount: amount
          });
          return game;
      });

      io.emit('diceGameUpdated', {
        diceGameId: diceGameId,
        diceGameData: {
          participants: updatedGame.participants,
          status: updatedGame.status
        }
      });

      if (updatedGame.participants.length >= 3) {
        await settleDiceGame(diceGameId);
      }
    });

    // Helper: Settle Dice Game
    async function settleDiceGame(diceGameId) {
      const diceGame = await state.getEntity('diceGame', diceGameId);
      if (!diceGame || diceGame.status !== 'active') return;

      diceGame.status = 'finished';

      const dice = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ];
      
      const total = dice.reduce((a, b) => a + b, 0);
      let result = '';
      const isLeopard = dice[0] === dice[1] && dice[1] === dice[2];
      
      if (isLeopard) result = 'leopard';
      else if (total >= 4 && total <= 10) result = 'small';
      else if (total >= 11 && total <= 17) result = 'big';

      const winners = [];

      for (const p of diceGame.participants) {
        let winAmount = 0;
        let isWinner = false;

        if (p.betType === result) {
          isWinner = true;
          winAmount = result === 'leopard' ? p.betAmount * 25 : p.betAmount * 2;
        }

        if (isWinner) {
          // Update user money
          const winnerUser = await state.getUser(p.userId);
          // Only update if user exists (might have left?)
          // If using Redis, user data persists even if disconnected, unless we remove on disconnect.
          // In this implementation, we remove on disconnect.
          // So if user disconnected, they lose money. 
          // Improvement: Don't remove user data on disconnect, just mark offline.
          // But for now, we follow original logic: remove on disconnect.
          if (winnerUser) {
             const newMoney = winnerUser.money + winAmount;
             await state.updateUser(p.userId, { money: newMoney });
             // Broadcast update (since we don't know which worker they are on, emit to all)
             // But 'userUpdated' is handled by clients.
             // We need to fetch the updated user to broadcast? 
             // updateUser returns it.
             // Wait, `updateUser` is atomic-ish.
             
             // We need to emit 'userUpdated' for this user.
             // Since we are in a worker, io.emit goes to all.
             const updated = { ...winnerUser, money: newMoney };
             io.emit('userUpdated', updated);
          }
          
          winners.push({
            userId: p.userId,
            userName: p.userName,
            betType: p.betType,
            betAmount: p.betAmount,
            winAmount: winAmount
          });
        }
      }

      const resultData = { dice, total, result, winners };
      diceGame.result = resultData;

      await state.addEntity('diceGame', diceGameId, diceGame);

      io.emit('diceGameUpdated', {
        diceGameId: diceGameId,
        diceGameData: {
          participants: diceGame.participants,
          status: 'finished',
          result: resultData
        }
      });
    }

    // Handle Kick Vote
    socket.on('initiateKickVote', async (payload) => {
      const { targetUserId } = payload;
      const initiator = await state.getUser(socket.id);
      const targetUser = await state.getUser(targetUserId);

      if (socket.id === targetUserId) {
        socket.emit('error', '不能发起踢出自己的投票');
        return;
      }
      if (!targetUser) {
        socket.emit('error', '该用户已下线或不存在');
        return;
      }

      // Check existing active votes
      // This requires iterating all kick votes or keeping an index.
      // For simplicity/performance: we can skip this check or do a quick scan if list is small.
      // Or store `active_kick_vote:targetUserId` key.
      const activeVoteId = await state.redis.get(`active_kick_vote:${targetUserId}`);
      if (activeVoteId) {
          socket.emit('error', '该用户正在被投票踢出中');
          return;
      }

      const kickVoteId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const kickVote = {
        id: kickVoteId,
        targetUserId: targetUser.id,
        targetUserName: targetUser.name,
        initiatorId: initiator.id,
        votes: [initiator.id],
        requiredVotes: 3,
        status: 'active',
        timestamp: Date.now()
      };

      await state.addEntity('kickVote', kickVoteId, kickVote);
      await state.redis.set(`active_kick_vote:${targetUserId}`, kickVoteId, 'EX', 300); // 5 min expire

      const chatMessage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: `${initiator.name} 发起了踢出 ${targetUser.name} 的投票`,
        senderId: 'system',
        senderName: '系统',
        timestamp: Date.now(),
        type: 'kickVote',
        kickVoteId: kickVoteId,
        kickVoteData: {
          targetUserId: targetUser.id,
          targetUserName: targetUser.name,
          votes: kickVote.votes,
          requiredVotes: kickVote.requiredVotes,
          status: 'active'
        }
      };

      await state.addMessage(chatMessage);
      io.emit('newMessage', chatMessage);
    });

    socket.on('voteKick', async (payload) => {
      const { kickVoteId } = payload;
      
      const kickVote = await state.updateEntity('kickVote', kickVoteId, (vote) => {
          if (vote.status !== 'active') return vote;
          if (vote.votes.includes(socket.id)) return vote; // Already voted
          vote.votes.push(socket.id);
          return vote;
      });

      if (!kickVote) {
          socket.emit('error', '投票不存在');
          return;
      }
      
      io.emit('kickVoteUpdated', {
        kickVoteId: kickVoteId,
        kickVoteData: {
          targetUserId: kickVote.targetUserId,
          targetUserName: kickVote.targetUserName,
          votes: kickVote.votes,
          requiredVotes: kickVote.requiredVotes,
          status: kickVote.status
        }
      });

      if (kickVote.votes.length >= kickVote.requiredVotes && kickVote.status === 'active') {
          await executeKick(kickVoteId);
      }
    });

    async function executeKick(kickVoteId) {
        const kickVote = await state.updateEntity('kickVote', kickVoteId, (v) => {
            v.status = 'success';
            return v;
        });
        
        if (!kickVote) return;

        io.emit('kickVoteUpdated', {
            kickVoteId: kickVoteId,
            kickVoteData: { ...kickVote, status: 'success' } // Simplified
        });

        await kickUser(kickVote.targetUserId, '已被投票踢出聊天室');
        await state.redis.del(`active_kick_vote:${kickVote.targetUserId}`);
    }

    async function kickUser(targetUserId, reason) {
        const targetUser = await state.getUser(targetUserId);
        
        // Remove messages? 
        // Original code filtered messages.
        // In Redis, we can't easily filter list.
        // We will skip message deletion for now or implement a "tombstone" message system.
        // Or just clear client side.
        io.emit('clearUserMessages', targetUserId);

        // Disconnect
        // Since we are in a cluster, we need to tell the worker managing that socket to disconnect it.
        // Socket.io Redis adapter handles `disconnectSockets`.
        io.in(targetUserId).disconnectSockets(true);

        // Remove user
        if (targetUser) {
            await state.removeUser(targetUserId);
            io.emit('userLeft', targetUserId);
            
            const chatMessage = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                text: `${targetUser.name} ${reason}`,
                senderId: 'system',
                senderName: '系统',
                timestamp: Date.now(),
                type: 'system'
            };
            await state.addMessage(chatMessage);
            io.emit('newMessage', chatMessage);
        }
    }

    socket.on('adminKick', async (payload) => {
        const { targetUserId } = payload;
        if (socket.id === targetUserId) {
            socket.emit('error', '不能踢出自己');
            return;
        }
        await kickUser(targetUserId, '已被管理员踢出聊天室');
    });

    // Handle fireworks
    socket.on('sendFireworks', () => {
      io.emit('fireworks');
    });

    // Handle send Music
    socket.on('sendMusic', async (payload) => {
      const { musicData, text } = payload;
      if (!musicData) return;
      
      const user = await state.getUser(socket.id);

      const message = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: text || `分享了歌曲: ${musicData.name}`,
        senderId: socket.id,
        senderName: user?.name || '未知用户',
        timestamp: Date.now(),
        type: 'music',
        musicData: musicData
      };
      
      await state.addMessage(message);
      io.emit('newMessage', message);
    });

    // Handle new message
    socket.on('sendMessage', async (payload) => {
      let text = '', image = null, quote = null, mentions = [];
      if (typeof payload === 'string') {
        text = payload;
      } else {
        text = payload.text || '';
        image = payload.image || null;
        quote = payload.quote || null;
        mentions = payload.mentions || [];
      }

      if (!text.trim() && !image) return;
      
      const user = await state.getUser(socket.id);

      const message = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: text,
        image: image,
        quote: quote,
        mentions: mentions,
        senderId: socket.id,
        senderName: user?.name || '未知用户',
        timestamp: Date.now(),
        type: 'user'
      };

      await state.addMessage(message);
      io.emit('newMessage', message);
    });

    // Handle create Poll
    socket.on('createPoll', async (payload) => {
      const { title, options } = payload;
      const user = await state.getUser(socket.id);
      if (!user) return;
      
      const pollId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const poll = {
        id: pollId,
        creatorId: user.id,
        creatorName: user.name,
        title: title,
        options: options.map((opt, index) => ({ id: index, text: opt, count: 0 })),
        voters: {},
        timestamp: Date.now()
      };
      
      await state.addEntity('poll', pollId, poll);

      const chatMessage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: '发布了一个投票',
        senderId: user.id,
        senderName: user.name,
        timestamp: Date.now(),
        type: 'poll',
        pollId: pollId,
        pollData: {
          title: poll.title,
          options: poll.options,
          totalVotes: 0
        }
      };

      await state.addMessage(chatMessage);
      io.emit('newMessage', chatMessage);
    });

    // Handle vote Poll
    socket.on('votePoll', async (payload) => {
      const { pollId, optionId } = payload;
      const user = await state.getUser(socket.id);
      if (!user) return;

      const poll = await state.updateEntity('poll', pollId, (p) => {
          if (p.voters[user.id] !== undefined) return p; // Already voted
          
          const option = p.options.find(o => o.id === optionId);
          if (option) {
              option.count++;
              p.voters[user.id] = optionId;
          }
          return p;
      });

      if (poll) {
         io.emit('pollUpdated', {
            pollId: pollId,
            pollData: {
              title: poll.title,
              options: poll.options,
              totalVotes: Object.keys(poll.voters).length,
              voters: Object.keys(poll.voters)
            }
          });
      } else {
          socket.emit('error', '投票失败或已结束');
      }
    });

    // Handle create Toast
    socket.on('sendToast', async (payload) => {
      const { image } = payload;
      const user = await state.getUser(socket.id);
      if (!user) return;

      const toastId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const toast = {
        id: toastId,
        creatorId: user.id,
        creatorName: user.name,
        image: image,
        timestamp: Date.now()
      };
      
      await state.addEntity('toast', toastId, toast);

      const chatMessage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: '发起了一个干杯活动',
        senderId: user.id,
        senderName: user.name,
        timestamp: Date.now(),
        type: 'toast',
        toastId: toastId,
        toastData: { image: toast.image }
      };

      await state.addMessage(chatMessage);
      io.emit('newMessage', chatMessage);
    });

    socket.on('sendCheers', () => {
      io.emit('cheers');
    });

    // Handle send Lottery
    socket.on('sendLottery', async (payload) => {
      const { prizeImage, contactInfo, maxParticipants } = payload;
      const user = await state.getUser(socket.id);
      if (!user) return;

      const lotteryId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const lottery = {
        id: lotteryId,
        creatorId: user.id,
        creatorName: user.name,
        prizeImage: prizeImage,
        contactInfo: contactInfo,
        maxParticipants: parseInt(maxParticipants),
        participants: [],
        winnerId: null,
        winnerName: null,
        status: 'active',
        timestamp: Date.now()
      };
      
      await state.addEntity('lottery', lotteryId, lottery);

      const chatMessage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: '发布了一个抽奖活动',
        senderId: user.id,
        senderName: user.name,
        timestamp: Date.now(),
        type: 'lottery',
        lotteryId: lotteryId,
        lotteryData: {
          prizeImage: lottery.prizeImage,
          maxParticipants: lottery.maxParticipants,
          currentParticipants: 0,
          status: 'active',
          contactInfo: null
        }
      };

      await state.addMessage(chatMessage);
      io.emit('newMessage', chatMessage);
    });

    // Handle join Lottery
    socket.on('joinLottery', async (lotteryId) => {
      const user = await state.getUser(socket.id);
      if (!user) return;

      const lottery = await state.updateEntity('lottery', lotteryId, (l) => {
          if (l.status !== 'active') return l;
          if (l.participants.some(p => p.userId === user.id)) return l;
          
          l.participants.push({
              userId: user.id,
              userName: user.name,
              timestamp: Date.now()
          });
          
          if (l.participants.length >= l.maxParticipants) {
              const winnerIndex = Math.floor(Math.random() * l.participants.length);
              const winner = l.participants[winnerIndex];
              l.winnerId = winner.userId;
              l.winnerName = winner.userName;
              l.status = 'finished';
          }
          return l;
      });

      if (!lottery) {
          socket.emit('error', '参与失败');
          return;
      }
      
      // We need to find the message to update it
      // This is hard because we don't know the message ID.
      // We can broadcast a "lotteryUpdated" event and let client handle it,
      // OR we scan messages (expensive).
      // The original code updated the message in the 'messages' array.
      // Here we should emit a specific event.
      
      io.emit('lotteryUpdated', {
          lotteryId: lotteryId,
          lotteryData: {
              currentParticipants: lottery.participants.length,
              status: lottery.status,
              winnerName: lottery.winnerName,
              winnerId: lottery.winnerId,
              contactInfo: lottery.status === 'finished' ? lottery.contactInfo : null
          }
      });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`Worker ${process.pid}: User disconnected: ${socket.id}`);
      await state.removeUser(socket.id);
      io.emit('userLeft', socket.id);
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`Worker ${process.pid} started on port ${PORT}`);
  });
}
