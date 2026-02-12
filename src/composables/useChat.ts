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

export interface LotteryData {
  prizeImage: string | null;
  maxParticipants: number;
  currentParticipants: number;
  status: 'active' | 'finished';
  winnerName?: string;
  winnerId?: string;
  contactInfo?: string | null;
}

export interface PollOption {
  id: number;
  text: string;
  count: number;
}

export interface PollData {
  title: string;
  options: PollOption[];
  totalVotes: number;
  voters?: string[]; // Array of user IDs who voted
}

export interface ToastData {
  image: string;
}

export interface DiceGameResult {
  dice: [number, number, number];
  total: number;
  result: 'big' | 'small' | 'leopard';
  winners: {
    userId: string;
    userName: string;
    betType: 'big' | 'small' | 'leopard';
    betAmount: number;
    winAmount: number;
  }[];
}

export interface DiceGameData {
  participants: {
    userId: string;
    userName: string;
    betType: 'big' | 'small' | 'leopard';
    betAmount: number;
  }[];
  status: 'active' | 'finished';
  result?: DiceGameResult;
}

export interface Message {
  id: string;
  text: string;
  image?: string | null;
  senderId: string;
  senderName: string;
  timestamp: number;
  type: 'user' | 'system' | 'redPacket' | 'lottery' | 'poll' | 'toast' | 'diceGame';
  redPacketId?: string;
  lotteryId?: string;
  lotteryData?: LotteryData;
  pollId?: string;
  pollData?: PollData;
  toastId?: string;
  toastData?: ToastData;
  diceGameId?: string;
  diceGameData?: DiceGameData;
  quote?: {
    id: string;
    text: string;
    senderName: string;
  };
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
const cheersSignal = ref(0);
const replyingTo = ref<Message | null>(null);

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

    socket.on('messageUpdated', (updatedMsg: Message) => {
      const index = state.messages.findIndex(m => m.id === updatedMsg.id);
      if (index !== -1) {
        state.messages[index] = updatedMsg;
      }
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

    socket.on('cheers', () => {
      cheersSignal.value = Date.now();
    });

    socket.on('pollUpdated', (data: { pollId: string, pollData: PollData }) => {
      const msg = state.messages.find(m => m.pollId === data.pollId);
      if (msg) {
        msg.pollData = data.pollData;
      }
    });

    socket.on('diceGameUpdated', (data: { diceGameId: string, diceGameData: DiceGameData }) => {
      const msg = state.messages.find(m => m.diceGameId === data.diceGameId);
      if (msg) {
        msg.diceGameData = data.diceGameData;
      }
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
    socket.off('messageUpdated');
    socket.off('grabResult');
    socket.off('error');
    socket.off('fireworks');
    socket.off('cheers');
    socket.off('pollUpdated');
    socket.off('diceGameUpdated');
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
    socket.emit('sendMessage', { 
      text, 
      image,
      quote: replyingTo.value ? {
        id: replyingTo.value.id,
        text: replyingTo.value.text || '[图片]',
        senderName: replyingTo.value.senderName
      } : undefined
    });
    replyingTo.value = null; // Clear reply after sending
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

  const sendLottery = (prizeImage: string | null, contactInfo: string, maxParticipants: number) => {
    socket.emit('sendLottery', { prizeImage, contactInfo, maxParticipants });
  };

  const joinLottery = (lotteryId: string) => {
    socket.emit('joinLottery', lotteryId);
  };

  const createPoll = (title: string, options: string[]) => {
    socket.emit('createPoll', { title, options });
  };

  const votePoll = (pollId: string, optionId: number) => {
    socket.emit('votePoll', { pollId, optionId });
  };

  const sendToast = (image: string) => {
    socket.emit('sendToast', { image });
  };

  const sendCheers = () => {
    socket.emit('sendCheers');
  };

  const createDiceGame = () => {
    socket.emit('createDiceGame');
  };

  const joinDiceGame = (diceGameId: string, betType: 'big' | 'small' | 'leopard', amount: number) => {
    socket.emit('joinDiceGame', { diceGameId, betType, amount });
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
    sendLottery,
    joinLottery,
    createPoll,
    votePoll,
    sendToast,
    sendCheers,
    createDiceGame,
    joinDiceGame,
    lastGrabResult,
    lastError,
    fireworksSignal,
    cheersSignal,
    replyingTo,
    setReplyTo: (msg: Message | null) => replyingTo.value = msg
  };
}
