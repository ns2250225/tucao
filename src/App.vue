<template>
  <div class="h-screen w-full bg-background flex flex-col overflow-hidden">
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
    <main class="flex-1 flex overflow-hidden p-4 gap-4 max-w-7xl mx-auto w-full">
      <!-- Left: Chat Area -->
      <div class="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">
        <ChatBox 
          :messages="visibleMessages" 
          :currentUserId="state.currentUser?.id" 
        />
        <InputBox @send="sendMessage" />
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
  <!-- Global Error Toast -->
  <div v-if="lastError" class="fixed top-20 left-1/2 transform -translate-x-1/2 z-[200] bg-red-500 text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2 animate-bounce">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
    </svg>
    {{ lastError }}
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useChat, initChat } from './composables/useChat';
import ChatBox from './components/ChatBox.vue';
import UserList from './components/UserList.vue';
import InputBox from './components/InputBox.vue';

// Initialize socket listeners
initChat();

const { state, visibleMessages, connect, sendMessage, updateName, lastError } = useChat();

onMounted(() => {
  connect();
});
</script>

<style>
/* Global resets or overrides if needed */
body {
  margin: 0;
  overflow: hidden; /* Prevent body scroll */
}
</style>
