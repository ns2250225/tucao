<template>
  <div class="h-full flex flex-col bg-white rounded-xl shadow-lg border-2 border-secondary overflow-hidden">
    <div class="p-4 bg-primary text-white">
      <h2 class="font-serif text-xl font-bold flex items-center gap-2">
        <span class="inline-block w-2 h-2 rounded-full bg-cta animate-pulse"></span>
        在线用户 ({{ users.length }})
      </h2>
    </div>
    
    <div class="p-4 bg-background border-b-2 border-secondary/20">
      <label class="text-xs font-bold text-primary uppercase tracking-wider mb-1 block">我的昵称</label>
      <div class="flex gap-2">
        <div class="relative flex-1">
          <input 
            v-model="localName" 
            @keyup.enter="saveName"
            maxlength="20"
            class="w-full bg-white border-2 border-secondary/50 rounded-lg px-3 py-2 text-text-color focus:outline-none focus:border-primary transition-colors font-bold pr-12"
            placeholder="输入昵称..."
          />
          <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-mono pointer-events-none bg-white/80 px-1 rounded">
            {{ localName.length }}/20
          </span>
        </div>
        <button 
          @click="saveName"
          class="bg-cta hover:bg-green-600 text-white p-2 rounded-lg font-bold shadow-sm transition-transform active:scale-95 shrink-0"
          :disabled="!localName.trim() || localName === currentUserName || localName.length > 20"
        >
          保存
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-2 custom-scrollbar">
      <TransitionGroup name="user-list" tag="ul" class="space-y-2">
        <li 
          v-for="user in users" 
          :key="user.id"
          class="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/10 transition-colors border border-transparent hover:border-secondary/30"
          :class="{ 'bg-secondary/20 border-secondary/50': user.id === currentUserId }"
        >
          <div 
            class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm"
            :class="getUserColor(user.id)"
          >
            {{ user.name.charAt(0).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-text-color truncate">{{ user.name }}</div>
            <div class="text-[10px] text-gray-500 font-mono truncate">ID: {{ user.id.substr(0, 6) }}</div>
          </div>
          <div v-if="user.id === currentUserId" class="w-2 h-2 bg-cta rounded-full"></div>
        </li>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { User } from '../composables/useChat';

const props = defineProps<{
  users: User[];
  currentUserId?: string;
  currentUserName?: string;
}>();

const emit = defineEmits<{
  (e: 'updateName', name: string): void;
}>();

const localName = ref('');

watch(() => props.currentUserName, (newVal) => {
  if (newVal && !localName.value) {
    localName.value = newVal;
  }
}, { immediate: true });

const saveName = () => {
  if (localName.value.trim() && localName.value !== props.currentUserName && localName.value.length <= 20) {
    emit('updateName', localName.value.trim());
  }
};

const getUserColor = (id: string) => {
  const colors = ['bg-blue-500', 'bg-red-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
  // Simple hash
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};
</script>

<style scoped>
.user-list-enter-active,
.user-list-leave-active {
  transition: all 0.3s ease;
}
.user-list-enter-from,
.user-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(167, 139, 250, 0.3);
  border-radius: 3px;
}
</style>
