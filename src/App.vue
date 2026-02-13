<template>
  <div class="h-[100dvh] w-full bg-background flex flex-col overflow-hidden">
    <!-- Header -->
    <header class="h-16 bg-white border-b-2 border-secondary flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white text-2xl font-bold shadow-md transform rotate-3">
          T
        </div>
        <h1 class="text-2xl font-serif font-bold text-text-color tracking-tight">
          在线 <span class="text-primary">吐槽</span>
        </h1>
      </div>
      <div class="flex items-center gap-4">
        <!-- Mobile User List Toggle -->
        <button 
          @click="showMobileUserList = true"
          class="lg:hidden p-2 rounded-full hover:bg-secondary/20 text-primary transition-colors relative"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-white">
            {{ state.users.length }}
          </span>
        </button>

        <div v-if="state.currentUser" class="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full border-2 border-yellow-300 text-yellow-800 font-bold shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.312-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.312.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd" />
          </svg>
          <span>¥{{ state.currentUser.money?.toFixed(2) || '0.00' }}</span>
        </div>
        <div 
          class="px-3 py-1 rounded-full text-xs font-bold border-2 transition-colors"
          :class="state.isConnected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'"
        >
          {{ state.isConnected ? '已连接' : '未连接' }}
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex overflow-hidden p-2 md:p-4 gap-4 max-w-7xl mx-auto w-full relative">
      <!-- Left: Chat Area -->
      <div class="flex-1 flex flex-col gap-2 md:gap-4 overflow-hidden min-w-0 h-full">
        <ChatBox 
          :messages="visibleMessages" 
          :currentUserId="state.currentUser?.id" 
          class="flex-1 min-h-0 overflow-hidden"
        />
        <InputBox @send="sendMessage" class="shrink-0" />
      </div>

      <!-- Right: User List (Hidden on mobile, visible on lg) -->
      <div class="w-80 hidden lg:block shrink-0 h-full">
        <UserList 
          :users="state.users" 
          :currentUserId="state.currentUser?.id"
          :currentUserName="state.currentUser?.name"
          @updateName="updateName"
        />
      </div>
    </main>
  </div>

  <!-- Mobile User List Drawer -->
  <div v-if="showMobileUserList" class="fixed inset-0 z-50 lg:hidden">
    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="showMobileUserList = false"></div>
    <div class="absolute right-0 top-0 bottom-0 w-80 bg-background shadow-2xl transform transition-transform duration-300 ease-out flex flex-col">
      <div class="p-4 bg-primary text-white flex justify-between items-center shrink-0">
        <h2 class="font-serif text-xl font-bold">用户列表</h2>
        <button @click="showMobileUserList = false" class="p-1 hover:bg-white/20 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="flex-1 overflow-hidden p-4">
        <UserList 
          :users="state.users" 
          :currentUserId="state.currentUser?.id"
          :currentUserName="state.currentUser?.name"
          @updateName="updateName"
        />
      </div>
    </div>
  </div>

  <!-- Global Error Toast -->
  <div v-if="lastError" class="fixed top-20 left-1/2 transform -translate-x-1/2 z-[200] bg-red-500 text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2 animate-bounce">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
    </svg>
    {{ lastError }}
  </div>

  <!-- Fireworks Text Overlay -->
    <Transition name="fade">
      <div v-if="showFireworksText" class="fixed inset-0 z-[150] flex items-center justify-center pointer-events-none">
        <div class="text-6xl md:text-8xl lg:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-red-500 to-yellow-300 animate-pulse drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] transform scale-100 transition-transform duration-500" style="text-shadow: 0 0 20px rgba(255,215,0,0.5);">
          新年快乐
        </div>
      </div>
    </Transition>

    <!-- Danmaku Overlay -->
    <div class="fixed inset-0 z-[160] pointer-events-none overflow-hidden">
      <div 
        v-for="item in danmakuList" 
        :key="item.id"
        class="absolute whitespace-nowrap font-bold text-2xl shadow-sm"
        :style="{ 
          top: `${item.top}%`, 
          left: '100%', 
          animation: `danmaku-move ${item.duration}s linear forwards`,
          textShadow: '1px 1px 2px black',
          color: item.color
        }"
      >
        {{ item.text }}
      </div>
    </div>
  </template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref } from 'vue';
import { useChat, initChat } from './composables/useChat';
import ChatBox from './components/ChatBox.vue';
import UserList from './components/UserList.vue';
import InputBox from './components/InputBox.vue';
import confetti from 'canvas-confetti';

// Initialize socket listeners
initChat();

const { state, visibleMessages, connect, sendMessage, updateName, lastError, fireworksSignal, cheersSignal } = useChat();

const showMobileUserList = ref(false);
const showFireworksText = ref(false);

const handleEscKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (showMobileUserList.value) {
      showMobileUserList.value = false;
    }
  }
};

// Danmaku Logic
const danmakuList = ref<{ id: number; text: string; top: number; duration: number; color: string }[]>([]);
const toastTexts = [ 
   "祝我们合作愉快，事业蒸蒸日上，干杯！", 
   "敬这段真诚的友谊，愿我们岁月不老，初心不改。", 
   "这一杯敬未来，愿所有的努力都不被辜负，前路繁花似锦。", 
   "祝您福如东海，寿比南山，身体康健，干杯！", 
   "为今天的相聚干杯，愿大家岁岁有今朝，岁岁皆平安。", 
   "敬我们的梦想，即便星辰大海，也要乘风破浪。", 
   "祝你新婚快乐，百年好合，永结同心，干杯！", 
   "愿你往后余生，万事胜意，不负韶华，这一杯我干了。", 
   "敬奋斗中的我们，愿付出的汗水都能换来成功的喜悦。", 
   "祝大家财源广进，好运连连，生活甜如蜜，干杯！", 
   "这一杯，敬那些生命中温暖而美好的瞬间。", 
   "祝事业如日中天，家庭幸福美满，干杯！", 
   "敬你一杯酒，愿你烦恼消散，快乐长存。", 
   "为我们的团队精神干杯，齐心协力，共创辉煌！", 
   "祝你在新的一年里，大展宏图，步步高升，干杯！", 
   "敬时光，敬自己，愿每一天都活得热气腾腾。", 
   "祝大家心想事成，万事顺遂，这一杯我敬大家！", 
   "敬我们的缘分，世界这么大，感谢能与各位同桌共饮。", 
   "祝笑容常驻，青春永驻，干杯！", 
   "最后一杯，祝大家前程似锦，顶峰相见！" 
];

const danmakuColors = [
  '#FF5252', '#FF4081', '#E040FB', '#7C4DFF', '#536DFE', 
  '#448AFF', '#40C4FF', '#18FFFF', '#64FFDA', '#69F0AE', 
  '#B2FF59', '#EEFF41', '#FFFF00', '#FFD740', '#FFAB40', 
  '#FF6E40', '#FFFFFF'
];

watch(cheersSignal, () => {
  const text = toastTexts[Math.floor(Math.random() * toastTexts.length)] || "干杯！";
  const id = Date.now() + Math.random();
  const top = Math.random() * 80 + 10; // 10% to 90% height
  const duration = Math.random() * 3 + 6; // 6-9 seconds (slower for better readability)
  const color = danmakuColors[Math.floor(Math.random() * danmakuColors.length)] || '#FFFFFF';

  danmakuList.value.push({ id, text, top, duration, color });

  // Cleanup with extra buffer
  setTimeout(() => {
    danmakuList.value = danmakuList.value.filter(item => item.id !== id);
  }, duration * 1000 + 2000);
});

watch(fireworksSignal, () => {
  // Show text
  showFireworksText.value = true;
  
  const duration = 5 * 1000;
  
  // Hide text after duration
  setTimeout(() => {
    showFireworksText.value = false;
  }, duration);

  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  }

  const interval: any = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 100 * (timeLeft / duration); // Increased particle count for density
    
    // Determine origins based on screen width
    // On mobile, spread fireworks more towards the center or cover full width
    if (window.innerWidth < 768) {
       // Mobile: Launch from multiple points
       confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.4), y: Math.random() - 0.2 } });
       confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.6, 0.9), y: Math.random() - 0.2 } });
       // Add center burst for mobile
       if (Math.random() > 0.7) {
         confetti({ ...defaults, particleCount: particleCount / 2, origin: { x: 0.5, y: 0.3 } });
       }
    } else {
       // Desktop: Original behavior + density
       confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
       confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }
    
  }, 200); // Faster interval for more frequent bursts
});

onMounted(() => {
  connect();
  document.addEventListener('keydown', handleEscKey);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscKey);
});
</script>

<style>
/* Global resets or overrides if needed */
body {
  margin: 0;
  overflow: hidden; /* Prevent body scroll */
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes danmaku-move {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(calc(-100vw - 100%));
  }
}
</style>
