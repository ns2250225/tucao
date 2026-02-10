<template>
  <div class="flex-1 overflow-y-auto p-6 space-y-4 bg-white/50 backdrop-blur-sm rounded-xl shadow-inner custom-scrollbar" ref="chatContainer">
    <TransitionGroup name="list" tag="div" class="space-y-4">
      <div 
        v-for="msg in messages" 
        :key="msg.id"
        class="flex flex-col"
        :class="msg.senderId === currentUserId ? 'items-end' : 'items-start'"
      >
        <div 
          class="max-w-[70%] p-4 rounded-2xl shadow-md transition-all hover:scale-[1.02] duration-200 border-2"
          :class="[
            msg.senderId === currentUserId 
              ? 'bg-primary text-white border-primary rounded-tr-none' 
              : 'bg-white text-text-color border-secondary rounded-tl-none'
          ]"
        >
          <div class="text-xs opacity-70 mb-1 font-bold tracking-wider uppercase">
            {{ msg.senderName }}
          </div>
          <div v-if="msg.image" class="mb-2 rounded-lg overflow-hidden border border-white/20">
             <img :src="msg.image" class="max-w-full max-h-64 object-cover block" />
          </div>
          <div v-if="msg.text" class="text-base break-words font-sans leading-relaxed">
            {{ msg.text }}
          </div>
          <div class="text-[10px] opacity-50 mt-2 text-right font-mono">
            {{ formatTime(msg.timestamp) }}
          </div>
        </div>
      </div>
    </TransitionGroup>
    
    <div v-if="messages.length === 0" class="h-full flex items-center justify-center opacity-30">
      <div class="text-center">
        <h3 class="text-2xl font-serif font-bold text-primary mb-2">还没有吐槽</h3>
        <p class="text-text-color">快来发布第一条吐槽吧！</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import type { Message } from '../composables/useChat';

const props = defineProps<{
  messages: Message[];
  currentUserId?: string;
}>();

const chatContainer = ref<HTMLElement | null>(null);

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Auto scroll to bottom
watch(() => props.messages.length, () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
});
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.9);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(167, 139, 250, 0.1);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(124, 58, 237, 0.3);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(124, 58, 237, 0.5);
}
</style>
