<template>
  <div class="h-[100dvh] w-full bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
    <!-- Background Decoration -->
    <div class="absolute inset-0 z-0 opacity-10">
      <div class="absolute top-10 left-10 w-32 h-32 bg-primary rounded-full blur-3xl"></div>
      <div class="absolute bottom-10 right-10 w-40 h-40 bg-secondary rounded-full blur-3xl"></div>
    </div>

    <div class="z-10 bg-white/60 backdrop-blur-md p-8 md:p-12 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-8 border border-white/50">
      <div class="space-y-4">
        <h1 class="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 tracking-tight">
          欢迎光临
        </h1>
        <h2 class="text-2xl md:text-3xl font-bold text-gray-700 font-serif">
          自由吐槽领地
        </h2>
        <p class="text-gray-500 text-sm md:text-base">
          在这里，释放你的压力，分享你的快乐
        </p>
      </div>

      <div class="space-y-4">
        <div class="relative group">
          <input 
            v-model="username" 
            type="text" 
            placeholder="请输入昵称"
            class="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all text-center font-bold text-lg text-gray-800 placeholder:font-normal"
            @keyup.enter="handleStart"
          />
          <button 
            @click="regenerateName"
            class="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-primary transition-colors rounded-full hover:bg-gray-100"
            title="随机生成昵称"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <button 
          @click="handleStart"
          class="w-full py-3.5 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-xl rounded-xl shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 group"
          :disabled="!username.trim()"
        >
          <span>开始吐槽</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
    
    <div class="absolute bottom-4 text-xs text-gray-400">
      © {{ new Date().getFullYear() }} Tucao Chat
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { fakerZH_CN as faker } from '@faker-js/faker';

const emit = defineEmits(['start']);
const username = ref('');

const generateRandomName = () => {
  return faker.person.fullName();
};

const regenerateName = () => {
  username.value = generateRandomName();
};

const handleStart = () => {
  if (!username.value.trim()) return;
  localStorage.setItem('chat_username', username.value);
  emit('start', username.value);
};

onMounted(() => {
  const savedName = localStorage.getItem('chat_username');
  if (savedName) {
    username.value = savedName;
  } else {
    regenerateName();
  }
});
</script>
