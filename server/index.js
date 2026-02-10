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
  }
});

// Store connected users: { socketId: { id, name, ... } }
const users = {};
// Store messages: [{ id, text, senderId, senderName, timestamp, type }]
let messages = [];

// Cleanup routine: remove messages older than 30 minutes
const MESSAGE_LIFETIME = 30 * 60 * 1000; // 30 minutes in ms

setInterval(() => {
  const now = Date.now();
  const initialCount = messages.length;
  messages = messages.filter(msg => now - msg.timestamp < MESSAGE_LIFETIME);
  
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
    joinedAt: Date.now()
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
