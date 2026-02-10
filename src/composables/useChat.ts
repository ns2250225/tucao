import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';

export interface User {
  id: string;
  name: string;
  joinedAt: number;
}

export interface Message {
  id: string;
  text: string;
  image?: string | null;
  senderId: string;
  senderName: string;
  timestamp: number;
  type: 'user' | 'system';
}

const SOCKET_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

const socket: Socket = io(SOCKET_URL, {
  autoConnect: false
});

const state = reactive({
  users: [] as User[],
  messages: [] as Message[],
  currentUser: null as User | null,
  isConnected: false
});

// Reactive timestamp to trigger periodic updates for message expiration
const now = ref(Date.now());
let timeInterval: any;

export function useChat() {
  const connect = () => {
    socket.connect();
  };

  const disconnect = () => {
    socket.disconnect();
  };

  const sendMessage = (text: string, image: string | null = null) => {
    socket.emit('sendMessage', { text, image });
  };

  const updateName = (name: string) => {
    socket.emit('updateName', name);
    // Optimistic update
    if (state.currentUser) {
      state.currentUser.name = name;
    }
  };

  // Filter messages older than 30 minutes
  const visibleMessages = computed(() => {
    const thirtyMinutesAgo = now.value - 30 * 60 * 1000;
    return state.messages.filter(msg => msg.timestamp > thirtyMinutesAgo);
  });

  onMounted(() => {
    // Start timer to update 'now'
    timeInterval = setInterval(() => {
      now.value = Date.now();
    }, 10000); // Update every 10 seconds is enough for "disappearing"

    socket.on('connect', () => {
      state.isConnected = true;
    });

    socket.on('disconnect', () => {
      state.isConnected = false;
    });

    socket.on('init', (data: { users: User[], messages: Message[] }) => {
      state.users = data.users;
      state.messages = data.messages;
      // Find current user
      const me = data.users.find(u => u.id === socket.id);
      if (me) state.currentUser = me;
    });

    socket.on('userJoined', (user: User) => {
      state.users.push(user);
    });

    socket.on('userLeft', (userId: string) => {
      state.users = state.users.filter(u => u.id !== userId);
    });

    socket.on('userUpdated', (updatedUser: User) => {
      const index = state.users.findIndex(u => u.id === updatedUser.id);
      if (index !== -1) {
        state.users[index] = updatedUser;
      }
      // Also update messages sender name if needed? 
      // Usually message sender name is snapshot, but we can update it if we want "live" names.
      // For "Tucao", snapshot names are fine, but live names are also good.
      // Let's stick to snapshot for history integrity, or update if we want consistency.
      // User request: "用户可以设置修改自己的名字"
    });

    socket.on('newMessage', (message: Message) => {
      state.messages.push(message);
    });
  });

  onUnmounted(() => {
    clearInterval(timeInterval);
    socket.off('connect');
    socket.off('disconnect');
    socket.off('init');
    socket.off('userJoined');
    socket.off('userLeft');
    socket.off('userUpdated');
    socket.off('newMessage');
  });

  return {
    state,
    visibleMessages,
    connect,
    disconnect,
    sendMessage,
    updateName
  };
}
