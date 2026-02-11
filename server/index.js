import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

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
    name: `用户 ${socket.id.substr(0, 4)}`,
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

  // Handle fireworks
  socket.on('sendFireworks', () => {
    // Broadcast fireworks to all clients
    io.emit('fireworks');
  });

  // Handle new message
  socket.on('sendMessage', (payload) => {
    // payload can be string (legacy) or object { text, image }
    let text = '';
    let image = null;

    if (typeof payload === 'string') {
      text = payload;
    } else {
      text = payload.text || '';
      image = payload.image || null;
    }

    if (!text.trim() && !image) return;
    
    const message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: text,
      image: image,
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
        totalVotes: 0,
        userVote: null // This will be dynamic per user when rendering, but here it's static structure
      }
    };

    messages.push(chatMessage);
    io.emit('newMessage', chatMessage);
  });

  // Handle vote
  socket.on('vote', (payload) => {
    const { pollId, optionId } = payload;
    const user = users[socket.id];
    const poll = polls[pollId];

    if (!poll) {
      socket.emit('error', '投票不存在或已过期');
      return;
    }

    // Check if already voted
    if (poll.voters[user.id] !== undefined) {
      socket.emit('error', '你已经投过票了');
      return;
    }

    const option = poll.options.find(o => o.id === optionId);
    if (!option) {
      socket.emit('error', '选项不存在');
      return;
    }

    // Record vote
    poll.voters[user.id] = optionId;
    option.count += 1;

    // Calculate total votes
    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.count, 0);

    // Update message
    const msgIndex = messages.findIndex(m => m.pollId === pollId);
    if (msgIndex !== -1) {
      // We need to broadcast the updated poll data
      // Note: userVote field needs to be handled by client side logic based on their ID
      // or we send a generic update and client checks against their own ID using 'voters' map if we exposed it?
      // Better: Send the full updated options structure and let client handle "my vote" visualization
      // But we don't want to expose who voted for what necessarily (privacy)?
      // For this app, let's just expose the counts.
      
      messages[msgIndex].pollData = {
        ...messages[msgIndex].pollData,
        options: poll.options,
        totalVotes: totalVotes
      };
      
      // We also need to tell the specific user they voted successfully so their UI updates
      // Actually, we can just broadcast the message update. 
      // The client needs to know "I voted for X".
      // We can send a specific event to the voter, or rely on client side optimistic update + server confirmation?
      // Simplest: Broadcast 'pollUpdated' with the pollId and new data.
      // And we need a way for clients to know if *they* voted.
      // We can include a list of voterIds in the public message? 
      // Or we can just let the client remember they voted? 
      // If user refreshes, they lose that state if we don't send it.
      // Let's add `voters` (just IDs) to the message payload so clients can check `voters.includes(myId)`
      
      messages[msgIndex].pollData.voters = Object.keys(poll.voters); // List of user IDs who voted
      
      io.emit('messageUpdated', messages[msgIndex]);
    }
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
