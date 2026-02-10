<template>
  <div class="bg-white p-4 rounded-xl shadow-lg border-2 border-secondary flex gap-4 items-end relative">
    <!-- Emoji Picker Popover -->
    <div v-if="showEmojiPicker" class="absolute bottom-full left-0 mb-2 z-50 shadow-xl rounded-xl overflow-hidden">
      <EmojiPicker :native="true" @select="onSelectEmoji" />
    </div>

    <div class="flex-1 flex flex-col gap-2">
      <div class="relative">
        <textarea
          v-model="text"
          @keydown.enter.prevent="handleEnter"
          placeholder="在此输入你的槽点... (回车发送)"
          class="w-full bg-background border-2 border-secondary/30 rounded-lg p-3 pb-10 text-text-color placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none h-24 custom-scrollbar font-sans"
        ></textarea>
        
        <!-- Tools -->
        <div class="absolute bottom-2 left-2 flex gap-2 items-center">
          <button 
            @click="toggleEmojiPicker"
            class="p-1.5 rounded-full hover:bg-secondary/20 text-gray-500 hover:text-primary transition-colors"
            title="添加表情"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          <button 
            @click="triggerImageUpload"
            class="p-1.5 rounded-full hover:bg-secondary/20 text-gray-500 hover:text-primary transition-colors"
            title="添加图片"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <input 
            type="file" 
            ref="fileInput" 
            accept="image/*" 
            class="hidden" 
            @change="handleFileChange"
          />
        </div>

        <div class="absolute bottom-2 right-2 text-xs text-gray-400 font-mono">
          {{ text.length }}/500
        </div>
      </div>

      <!-- Image Preview -->
      <div v-if="imagePreview" class="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-dashed border-secondary/50 group">
        <img :src="imagePreview" class="w-full h-full object-cover" />
        <button 
          @click="clearImage" 
          class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
    
    <button 
      @click="send"
      class="h-24 w-24 bg-cta hover:bg-green-600 text-white rounded-lg font-bold font-serif text-lg shadow-md transition-all active:scale-95 flex flex-col items-center justify-center gap-1 group shrink-0"
      :disabled="!text.trim() && !imagePreview"
    >
      <span>吐槽</span>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import EmojiPicker from 'vue3-emoji-picker';
import 'vue3-emoji-picker/css';

const emit = defineEmits<{
  (e: 'send', text: string, image: string | null): void;
}>();

const text = ref('');
const showEmojiPicker = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const imagePreview = ref<string | null>(null);

const toggleEmojiPicker = () => {
  showEmojiPicker.value = !showEmojiPicker.value;
};

const onSelectEmoji = (emoji: any) => {
  text.value += emoji.i;
  // Don't close picker immediately, user might want to add more
};

// Close emoji picker when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (showEmojiPicker.value && !target.closest('.vue3-emoji-picker') && !target.closest('button[title="添加表情"]')) {
    showEmojiPicker.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

const triggerImageUpload = () => {
  fileInput.value?.click();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
  // Reset input so same file can be selected again
  target.value = '';
};

const clearImage = () => {
  imagePreview.value = null;
};

const handleEnter = (e: KeyboardEvent) => {
  if (!e.shiftKey) {
    send();
  }
};

const send = () => {
  if (text.value.trim() || imagePreview.value) {
    emit('send', text.value.trim(), imagePreview.value);
    text.value = '';
    imagePreview.value = null;
    showEmojiPicker.value = false;
  }
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(167, 139, 250, 0.3);
  border-radius: 3px;
}
</style>
