import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fakerZH_CN as faker } from '@faker-js/faker';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for dev
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 2e7 // 20MB to accommodate base64 encoded 10MB images
});

// Store connected users: { socketId: { id, name, ... } }
const users = {};
// Store messages: [{ id, text, senderId, senderName, timestamp, type }]
let messages = [];
// Store red packets: { id: { ... } }
const redPackets = {};
// Store lotteries: { id: { ... } }
const lotteries = {};
// Store polls: { id: { ... } }
const polls = {};
// Store toasts: { id: { ... } }
const toasts = {};
// Store dice games: { id: { ... } }
const diceGames = {};
// Store kick votes: { id: { ... } }
const kickVotes = {};

// Cleanup routine: remove messages older than 30 minutes
const MESSAGE_LIFETIME = 30 * 60 * 1000; // 30 minutes in ms

setInterval(() => {
  const now = Date.now();
  const initialCount = messages.length;
  messages = messages.filter(msg => now - msg.timestamp < MESSAGE_LIFETIME);
  
  // Handle red packets cleanup
  for (const id in redPackets) {
    if (now - redPackets[id].timestamp > MESSAGE_LIFETIME) {
      delete redPackets[id];
    }
  }

  // Handle lotteries cleanup
  for (const id in lotteries) {
    if (now - lotteries[id].timestamp > MESSAGE_LIFETIME) {
      delete lotteries[id];
    }
  }

  // Handle polls cleanup
  for (const id in polls) {
    if (now - polls[id].timestamp > MESSAGE_LIFETIME) {
      delete polls[id];
    }
  }

  // Handle toasts cleanup
  for (const id in toasts) {
    if (now - toasts[id].timestamp > MESSAGE_LIFETIME) {
      delete toasts[id];
    }
  }

  // Handle dice games cleanup
  for (const id in diceGames) {
    if (now - diceGames[id].timestamp > MESSAGE_LIFETIME) {
      delete diceGames[id];
    }
  }

  // Handle kick votes cleanup
  for (const id in kickVotes) {
    if (now - kickVotes[id].timestamp > MESSAGE_LIFETIME) {
      delete kickVotes[id];
    }
  }

  if (messages.length !== initialCount) {
    // Optional: emit an event if messages were removed, 
    // but clients can also handle expiration locally or just receive the updated list on reconnect.
    // Ideally, we might want to tell clients to remove specific messages, 
    // but syncing the whole list or letting clients expire them is easier.
    // For this simple app, we'll just keep the server state clean.
  }
}, 60 * 1000); // Check every minute

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Default user setup
  users[socket.id] = {
    id: socket.id,
    name: faker.person.fullName(),
    joinedAt: Date.now(),
    money: 1000 // Initial money
  };

  // Send initial state
  socket.emit('init', {
    users: Object.values(users),
    messages: messages
  });

  // Broadcast new user to others
  socket.broadcast.emit('userJoined', users[socket.id]);

  // Handle name change
  socket.on('updateName', (newName) => {
    if (users[socket.id]) {
      if (!newName || newName.length > 20) {
         return;
      }
      const oldName = users[socket.id].name;
      users[socket.id].name = newName;
      io.emit('userUpdated', users[socket.id]);
    }
  });

  // Handle send Red Packet
  socket.on('sendRedPacket', (payload) => {
    console.log(`[RedPacket] User ${socket.id} trying to send:`, payload);
    const { amount, count, message } = payload;
    const user = users[socket.id];
    
    if (!user) {
      console.log(`[RedPacket] User not found: ${socket.id}`);
      socket.emit('error', '用户不存在');
      return;
    }

    if (user.money < amount) {
      console.log(`[RedPacket] Insufficient funds: ${user.money} < ${amount}`);
      socket.emit('error', '余额不足');
      return;
    }
    
    if (amount <= 0 || count <= 0) {
       socket.emit('error', '金额或数量必须大于0');
       return;
    }

    // Deduct money
    user.money -= amount;
    // Notify user balance update
    io.emit('userUpdated', user);

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
    
    redPackets[redPacketId] = redPacket;

    // Create a message for the red packet
    const chatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: redPacket.message,
      senderId: user.id,
      senderName: user.name,
      timestamp: Date.now(),
      type: 'redPacket',
      redPacketId: redPacketId
    };

    messages.push(chatMessage);
    io.emit('newMessage', chatMessage);
  });

  // Handle grab Red Packet
  socket.on('grabRedPacket', (redPacketId) => {
    const user = users[socket.id];
    const redPacket = redPackets[redPacketId];

    if (!redPacket) {
      socket.emit('grabResult', { success: false, message: '红包不存在或已过期' });
      return;
    }

    // Check if already grabbed
    const alreadyGrabbed = redPacket.grabbedList.find(r => r.userId === user.id);
    if (alreadyGrabbed) {
      socket.emit('grabResult', { success: false, message: '你已经抢过这个红包了', amount: alreadyGrabbed.amount, detail: redPacket });
      return;
    }

    if (redPacket.remainingCount <= 0) {
      socket.emit('grabResult', { success: false, message: '手慢了，红包派完了', detail: redPacket });
      return;
    }

    // Calculate amount
    let grabAmount = 0;
    if (redPacket.remainingCount === 1) {
      grabAmount = redPacket.remainingAmount;
    } else {
      // Simple random algorithm: random between 0.01 and 2 * (remaining / count)
      const max = (redPacket.remainingAmount / redPacket.remainingCount) * 2;
      grabAmount = Math.floor(Math.random() * max * 100) / 100;
      if (grabAmount < 0.01) grabAmount = 0.01;
      // Ensure we don't grab more than remaining
      if (grabAmount > redPacket.remainingAmount) grabAmount = redPacket.remainingAmount;
    }
    
    // Fix floating point issues
    grabAmount = Math.round(grabAmount * 100) / 100;
    
    // Adjust if last one calculation was off slightly due to float math (though logic above handles exact last one)
    // Update red packet
    redPacket.remainingAmount -= grabAmount;
    redPacket.remainingCount -= 1;
    
    // Add record
    redPacket.grabbedList.push({
      userId: user.id,
      userName: user.name,
      amount: grabAmount,
      timestamp: Date.now()
    });

    // Update user money
    user.money += grabAmount;
    // Broadcast user update
    io.emit('userUpdated', user);

    // Notify result
    socket.emit('grabResult', { success: true, amount: grabAmount, detail: redPacket });
    
    // Optionally notify others that redpacket status changed (e.g. grabbed count)
    // But usually we only fetch detail when clicking. 
    // However, we might want to update the message status if it becomes empty?
    // For simplicity, we don't broadcast every grab event to everyone, only result to grabber.
  });

  // Handle get Red Packet Detail (for viewing without grabbing or after grabbing)
  socket.on('getRedPacketDetail', (redPacketId) => {
    const redPacket = redPackets[redPacketId];
    if (redPacket) {
      socket.emit('redPacketDetail', redPacket);
    }
  });

  // Handle create Dice Game
  socket.on('createDiceGame', () => {
    const user = users[socket.id];
    if (!user) return;

    const diceGameId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    const diceGame = {
      id: diceGameId,
      creatorId: user.id,
      creatorName: user.name,
      participants: [], // Array of { userId, userName, betType, betAmount }
      status: 'active',
      timestamp: Date.now()
    };
    
    diceGames[diceGameId] = diceGame;

    // Create a message for the dice game
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

    messages.push(chatMessage);
    io.emit('newMessage', chatMessage);
  });

  // Handle join Dice Game
  socket.on('joinDiceGame', (payload) => {
    const { diceGameId, betType, amount } = payload;
    const diceGame = diceGames[diceGameId];
    const user = users[socket.id];

    if (!diceGame || !user) {
      socket.emit('error', '活动不存在或已过期');
      return;
    }

    if (diceGame.status !== 'active') {
      socket.emit('error', '活动已结束');
      return;
    }

    // Check if already joined
    if (diceGame.participants.some(p => p.userId === user.id)) {
      socket.emit('error', '你已经参与过该活动了');
      return;
    }

    // Check balance
    if (user.money < amount) {
      socket.emit('error', '余额不足');
      return;
    }
    
    if (amount <= 0) {
      socket.emit('error', '赌注必须大于0');
      return;
    }

    // Deduct money
    user.money -= amount;
    io.emit('userUpdated', user);

    // Add participant
    diceGame.participants.push({
      userId: user.id,
      userName: user.name,
      betType: betType,
      betAmount: amount
    });

    // Notify update
    io.emit('diceGameUpdated', {
      diceGameId: diceGameId,
      diceGameData: {
        participants: diceGame.participants,
        status: diceGame.status
      }
    });

    // Check if full (3 participants)
    if (diceGame.participants.length >= 3) {
      settleDiceGame(diceGameId);
    }
  });

  // Handle Kick Vote
  socket.on('initiateKickVote', (payload) => {
    const { targetUserId } = payload;
    const initiator = users[socket.id];
    const targetUser = users[targetUserId]; // Might not be in 'users' map if disconnected, but we check connected users

    // Can't kick yourself
    if (socket.id === targetUserId) {
      socket.emit('error', '不能发起踢出自己的投票');
      return;
    }

    if (!targetUser) {
      socket.emit('error', '该用户已下线或不存在');
      return;
    }

    // Check if active vote already exists for this user
    const existingVote = Object.values(kickVotes).find(
      v => v.targetUserId === targetUserId && v.status === 'active'
    );

    if (existingVote) {
      socket.emit('error', '该用户正在被投票踢出中');
      return;
    }

    const kickVoteId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    const kickVote = {
      id: kickVoteId,
      targetUserId: targetUser.id,
      targetUserName: targetUser.name,
      initiatorId: initiator.id,
      votes: [initiator.id], // Initiator automatically votes yes
      requiredVotes: 3,
      status: 'active',
      timestamp: Date.now()
    };

    kickVotes[kickVoteId] = kickVote;

    // Create a system message for the kick vote
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

    messages.push(chatMessage);
    io.emit('newMessage', chatMessage);
  });

  socket.on('voteKick', (payload) => {
    const { kickVoteId } = payload;
    const kickVote = kickVotes[kickVoteId];
    const user = users[socket.id];

    if (!kickVote || kickVote.status !== 'active') {
      socket.emit('error', '投票不存在或已结束');
      return;
    }

    // Check if already voted
    if (kickVote.votes.includes(socket.id)) {
      socket.emit('error', '你已经投过票了');
      return;
    }

    kickVote.votes.push(socket.id);

    // Notify update
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

    // Check if passed
    if (kickVote.votes.length >= kickVote.requiredVotes) {
      executeKick(kickVoteId);
    }
  });

  function kickUser(targetUserId, reason = '已被踢出聊天室') {
    const targetUser = users[targetUserId]; // Might be undefined if already left, but we might still have messages

    // Remove user's messages
    messages = messages.filter(m => m.senderId !== targetUserId);
    
    // Notify clients to refresh messages (or we could send a "clearUserMessages" event, 
    // but sending the full list or filtering locally is safer)
    // Since we don't have a "bulkDelete" event, let's just emit 'init' again to everyone or 
    // better, emit a specific event
    io.emit('clearUserMessages', targetUserId); 
    
    // Disconnect user
    // We need to find the socket object. 
    // 'users' map stores data, but we need the socket instance.
    // IO instance can fetch sockets.
    io.in(targetUserId).disconnectSockets(true);
    
    // Remove from users list
    if (users[targetUserId]) {
      const userName = users[targetUserId].name;
      delete users[targetUserId];
      io.emit('userLeft', targetUserId);
      
      // System message
      const chatMessage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: `${userName} ${reason}`,
        senderId: 'system',
        senderName: '系统',
        timestamp: Date.now(),
        type: 'system'
      };
      messages.push(chatMessage);
      io.emit('newMessage', chatMessage);
    }
  }

  function executeKick(kickVoteId) {
    const kickVote = kickVotes[kickVoteId];
    if (!kickVote || kickVote.status !== 'active') return;

    kickVote.status = 'success';
    
    // Notify update first
    io.emit('kickVoteUpdated', {
      kickVoteId: kickVoteId,
      kickVoteData: {
        targetUserId: kickVote.targetUserId,
        targetUserName: kickVote.targetUserName,
        votes: kickVote.votes,
        requiredVotes: kickVote.requiredVotes,
        status: 'success'
      }
    });

    kickUser(kickVote.targetUserId, '已被投票踢出聊天室');
  }

  // Handle Admin Kick
  socket.on('adminKick', (payload) => {
    const { targetUserId } = payload;
    
    // Simple verification (in a real app, we should verify a token or password here too, 
    // but for now we trust the client has verified the password)
    
    if (socket.id === targetUserId) {
      socket.emit('error', '不能踢出自己');
      return;
    }

    kickUser(targetUserId, '已被管理员踢出聊天室');
  });

  function settleDiceGame(diceGameId) {
    const diceGame = diceGames[diceGameId];
    if (!diceGame || diceGame.status !== 'active') return;

    diceGame.status = 'finished';

    // Roll 3 dice
    const dice = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1
    ];
    
    const total = dice.reduce((a, b) => a + b, 0);
    let result = ''; // 'big', 'small', 'leopard'

    // Determine result
    const isLeopard = dice[0] === dice[1] && dice[1] === dice[2];
    
    if (isLeopard) {
      result = 'leopard';
    } else if (total >= 4 && total <= 10) {
      result = 'small';
    } else if (total >= 11 && total <= 17) {
      result = 'big';
    }

    const winners = [];

    // Distribute winnings
    diceGame.participants.forEach(p => {
      let winAmount = 0;
      let isWinner = false;

      if (p.betType === result) {
        isWinner = true;
        if (result === 'leopard') {
          // Odds 1:24
          winAmount = p.betAmount + p.betAmount * 24;
        } else {
          // Odds 1:1
          winAmount = p.betAmount + p.betAmount * 1;
        }
      }

      if (isWinner) {
        const winnerUser = users[p.userId]; // Find by ID, might be disconnected but we update state
        // If user is connected/in memory
        if (winnerUser) {
          winnerUser.money += winAmount;
          io.emit('userUpdated', winnerUser);
        } else {
           // If user disconnected, we might need persistent storage. 
           // For now, we update the user object if it exists in 'users' map.
           // Since 'users' map is only connected users, if they left they lose money.
           // This is a limitation of in-memory store.
        }
        
        winners.push({
          userId: p.userId,
          userName: p.userName,
          betType: p.betType,
          betAmount: p.betAmount,
          winAmount: winAmount
        });
      }
    });

    const resultData = {
      dice,
      total,
      result,
      winners
    };

    diceGame.result = resultData;

    // Notify update
    io.emit('diceGameUpdated', {
      diceGameId: diceGameId,
      diceGameData: {
        participants: diceGame.participants,
        status: 'finished',
        result: resultData
      }
    });
  }

  // Handle fireworks
  socket.on('sendFireworks', () => {
    // Broadcast fireworks to all clients
    io.emit('fireworks');
  });

  // Handle new message
  socket.on('sendMessage', (payload) => {
    // payload can be string (legacy) or object { text, image, quote, mentions }
    let text = '';
    let image = null;
    let quote = null;
    let mentions = [];

    if (typeof payload === 'string') {
      text = payload;
    } else {
      text = payload.text || '';
      image = payload.image || null;
      quote = payload.quote || null;
      mentions = payload.mentions || [];
    }

    if (!text.trim() && !image) return;
    
    const message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: text,
      image: image,
      quote: quote,
      mentions: mentions,
      senderId: socket.id,
      senderName: users[socket.id]?.name || '未知用户',
      timestamp: Date.now(),
      type: 'user'
    };

    messages.push(message);
    io.emit('newMessage', message);
  });

  // Handle create Poll
  socket.on('createPoll', (payload) => {
    console.log(`[Poll] User ${socket.id} creating poll:`, payload);
    const { title, options } = payload;
    const user = users[socket.id];
    
    if (!user) return;
    if (!title || !options || !Array.isArray(options) || options.length < 2) {
      socket.emit('error', '投票数据无效');
      return;
    }

    const pollId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    const poll = {
      id: pollId,
      creatorId: user.id,
      creatorName: user.name,
      title: title,
      options: options.map((opt, index) => ({
        id: index,
        text: opt,
        count: 0
      })),
      voters: {}, // userId -> optionId
      timestamp: Date.now()
    };
    
    polls[pollId] = poll;

    // Create a message for the poll
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

    messages.push(chatMessage);
    io.emit('newMessage', chatMessage);
  });

  // Handle vote Poll
  socket.on('votePoll', (payload) => {
    const { pollId, optionId } = payload;
    const poll = polls[pollId];
    const user = users[socket.id];

    if (!poll || !user) return;

    // Check if already voted
    if (poll.voters[user.id] !== undefined) {
       socket.emit('error', '你已经投过票了');
       return;
    }

    const option = poll.options.find(o => o.id === optionId);
    if (!option) return;

    option.count++;
    poll.voters[user.id] = optionId;

    // Broadcast update
    io.emit('pollUpdated', {
      pollId: pollId,
      pollData: {
        title: poll.title,
        options: poll.options,
        totalVotes: Object.keys(poll.voters).length,
        voters: Object.keys(poll.voters)
      }
    });
  });

  // Handle create Toast Activity
  socket.on('sendToast', (payload) => {
    console.log(`[Toast] User ${socket.id} creating toast:`, payload);
    const { image } = payload;
    const user = users[socket.id];
    
    if (!user) return;
    if (!image) {
      socket.emit('error', '请选择饮料图片');
      return;
    }

    const toastId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    const toast = {
      id: toastId,
      creatorId: user.id,
      creatorName: user.name,
      image: image,
      timestamp: Date.now()
    };
    
    toasts[toastId] = toast;

    // Create a message for the toast
    const chatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: '发起了一个干杯活动',
      senderId: user.id,
      senderName: user.name,
      timestamp: Date.now(),
      type: 'toast',
      toastId: toastId,
      toastData: {
        image: toast.image
      }
    };

    messages.push(chatMessage);
    io.emit('newMessage', chatMessage);
  });

  // Handle cheers (danmaku)
  socket.on('sendCheers', () => {
    // Broadcast cheers (danmaku) to all clients
    io.emit('cheers');
  });

  // Handle send Lottery
  socket.on('sendLottery', (payload) => {
    console.log(`[Lottery] User ${socket.id} creating lottery:`, payload);
    const { prizeImage, contactInfo, maxParticipants } = payload;
    const user = users[socket.id];
    
    if (!user) return;
    if (!maxParticipants || maxParticipants <= 0) return;

    const lotteryId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    const lottery = {
      id: lotteryId,
      creatorId: user.id,
      creatorName: user.name,
      prizeImage: prizeImage || null,
      contactInfo: contactInfo,
      maxParticipants: parseInt(maxParticipants),
      participants: [],
      winnerId: null,
      winnerName: null,
      status: 'active', // active, finished
      timestamp: Date.now()
    };
    
    lotteries[lotteryId] = lottery;

    // Create a message for the lottery
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
        contactInfo: null // Hide contact info initially
      }
    };

    messages.push(chatMessage);
    io.emit('newMessage', chatMessage);
  });

  // Handle join Lottery
  socket.on('joinLottery', (lotteryId) => {
    const user = users[socket.id];
    const lottery = lotteries[lotteryId];

    if (!lottery) {
      socket.emit('error', '抽奖活动不存在或已过期');
      return;
    }

    if (lottery.status !== 'active') {
      socket.emit('error', '抽奖活动已结束');
      return;
    }

    // Check if already joined
    if (lottery.participants.some(p => p.userId === user.id)) {
      socket.emit('error', '你已经参与过该活动了');
      return;
    }

    // Add participant
    lottery.participants.push({
      userId: user.id,
      userName: user.name,
      timestamp: Date.now()
    });

    // Check if full
    if (lottery.participants.length >= lottery.maxParticipants) {
      // Pick a winner
      const winnerIndex = Math.floor(Math.random() * lottery.participants.length);
      const winner = lottery.participants[winnerIndex];
      
      lottery.winnerId = winner.userId;
      lottery.winnerName = winner.userName;
      lottery.status = 'finished';
      
      // Update message
      const msgIndex = messages.findIndex(m => m.lotteryId === lotteryId);
      if (msgIndex !== -1) {
        messages[msgIndex].lotteryData = {
          ...messages[msgIndex].lotteryData,
          currentParticipants: lottery.participants.length,
          status: 'finished',
          winnerName: lottery.winnerName,
          winnerId: lottery.winnerId,
          contactInfo: lottery.contactInfo // Reveal contact info
        };
        
        io.emit('messageUpdated', messages[msgIndex]);
      }
    } else {
      // Update message progress
      const msgIndex = messages.findIndex(m => m.lotteryId === lotteryId);
      if (msgIndex !== -1) {
        messages[msgIndex].lotteryData = {
          ...messages[msgIndex].lotteryData,
          currentParticipants: lottery.participants.length
        };
        
        io.emit('messageUpdated', messages[msgIndex]);
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const user = users[socket.id];
    delete users[socket.id];
    io.emit('userLeft', socket.id);
  });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
