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

// Cleanup routine: remove messages older than 30 minutes
const MESSAGE_LIFETIME = 30 * 60 * 1000; // 30 minutes in ms

setInterval(() => {
  const now = Date.now();
  const initialCount = messages.length;
  messages = messages.filter(msg => now - msg.timestamp < MESSAGE_LIFETIME);
  
  // Cleanup old red packets (optional, maybe keep them a bit longer or same)
  for (const id in redPackets) {
    if (now - redPackets[id].timestamp > MESSAGE_LIFETIME) {
      delete redPackets[id];
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
