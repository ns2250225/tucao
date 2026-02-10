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
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useChat } from './composables/useChat';
import ChatBox from './components/ChatBox.vue';
import UserList from './components/UserList.vue';
import InputBox from './components/InputBox.vue';

const { state, visibleMessages, connect, sendMessage, updateName } = useChat();

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
