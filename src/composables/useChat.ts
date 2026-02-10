import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';

export interface User {
  id: string;
  name: string;
  joinedAt: number;
  money?: number;
}

export interface RedPacketGrabbedRecord {
  userId: string;
  userName: string;
  amount: number;
  timestamp: number;
}

export interface RedPacketDetail {
  id: string;
  senderId: string;
  senderName: string;
  totalAmount: number;
  totalCount: number;
  remainingAmount: number;
  remainingCount: number;
  message: string;
  grabbedList: RedPacketGrabbedRecord[];
  timestamp: number;
}

export interface Message {
  id: string;
  text: string;
  image?: string | null;
  senderId: string;
  senderName: string;
  timestamp: number;
  type: 'user' | 'system' | 'redPacket';
  redPacketId?: string;
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

// Event-related reactive state
const lastGrabResult = ref<{ success: boolean; amount?: number; message?: string; detail?: RedPacketDetail } | null>(null);
const lastError = ref<string | null>(null);
const fireworksSignal = ref(0);

// Reactive timestamp to trigger periodic updates for message expiration
const now = ref(Date.now());
let timeInterval: any;

// Initialize socket listeners only once
export function initChat() {
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
      // Update current user if it is me
      if (state.currentUser && state.currentUser.id === updatedUser.id) {
        state.currentUser = updatedUser;
      }
    });

    socket.on('newMessage', (message: Message) => {
      state.messages.push(message);
    });

    socket.on('grabResult', (result) => {
      lastGrabResult.value = result;
      // Reset after a short delay so we can react to same result if needed, or handle in UI
      // For now just keep it, UI should watch it
    });

    socket.on('error', (msg: string) => {
      lastError.value = msg;
      setTimeout(() => { lastError.value = null; }, 3000);
    });

    socket.on('fireworks', () => {
      fireworksSignal.value = Date.now();
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
    socket.off('grabResult');
    socket.off('error');
    socket.off('fireworks');
  });
}

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

  const sendRedPacket = (amount: number, count: number, message: string) => {
    console.log('Sending red packet:', { amount, count, message });
    socket.emit('sendRedPacket', { amount, count, message });
  };

  const grabRedPacket = (redPacketId: string) => {
    socket.emit('grabRedPacket', redPacketId);
  };

  const sendFireworks = () => {
    socket.emit('sendFireworks');
  };

  // Filter messages older than 30 minutes
  const visibleMessages = computed(() => {
    const thirtyMinutesAgo = now.value - 30 * 60 * 1000;
    return state.messages.filter(msg => msg.timestamp > thirtyMinutesAgo);
  });

  return {
    state,
    visibleMessages,
    connect,
    disconnect,
    sendMessage,
    updateName,
    sendRedPacket,
    grabRedPacket,
    sendFireworks,
    lastGrabResult,
    lastError,
    fireworksSignal
  };
}
