<template>
  <div class="bg-white p-4 rounded-xl shadow-lg border-2 border-secondary flex gap-4 relative">
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
          class="w-full bg-background border-2 border-secondary/30 rounded-lg p-3 text-text-color placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none h-24 custom-scrollbar font-sans"
        ></textarea>
      </div>
        
      <!-- Tools -->
      <div class="flex gap-2 items-center flex-wrap px-1">
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

        <button 
          @click="showRedPacketModal = true"
          class="p-1.5 rounded-full hover:bg-secondary/20 text-gray-500 hover:text-red-500 transition-colors"
          title="发红包"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <button 
          @click="handleSendFireworks"
          class="p-1.5 rounded-full hover:bg-secondary/20 text-gray-500 hover:text-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="放烟花"
          :disabled="isFireworksCoolingDown"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2a1 1 0 011 1v4a1 1 0 11-2 0V3a1 1 0 011-1zM4.929 4.929a1 1 0 011.414 0l2.828 2.828a1 1 0 11-1.414 1.414L4.93 6.343a1 1 0 010-1.414zM19.071 4.929a1 1 0 010 1.414l-2.828 2.828a1 1 0 11-1.414-1.414l2.828-2.828a1 1 0 011.414 0z" />
          </svg>
        </button>

        <button 
          @click="showLotteryModal = true"
          class="p-1.5 rounded-full hover:bg-secondary/20 text-gray-500 hover:text-blue-500 transition-colors"
          title="发布抽奖活动"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        </button>

        <button 
          @click="showPollModal = true"
          class="p-1.5 rounded-full hover:bg-secondary/20 text-gray-500 hover:text-orange-500 transition-colors"
          title="发布投票"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>

        <input 
          type="file" 
          ref="fileInput" 
          accept="image/*" 
          class="hidden" 
          @change="handleFileChange"
        />

        <div class="text-xs text-gray-400 font-mono ml-auto">
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
      class="w-24 bg-cta hover:bg-green-600 text-white rounded-lg font-bold font-serif text-lg shadow-md transition-all active:scale-95 flex flex-col items-center justify-center gap-1 group shrink-0"
      :disabled="!text.trim() && !imagePreview"
    >
      <span>吐槽</span>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    </button>
  </div>

  <!-- Red Packet Modal -->
  <div v-if="showRedPacketModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border-2 border-red-200">
      <div class="bg-red-500 p-4 text-white flex justify-between items-center">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clip-rule="evenodd" />
            <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
          </svg>
          发红包
        </h3>
        <button @click="showRedPacketModal = false" class="hover:bg-red-600 p-1 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1">总金额</label>
          <div class="relative">
            <input v-model.number="rpAmount" type="number" min="0.01" step="0.01" class="w-full border-2 border-gray-200 rounded-lg p-2 pr-8 focus:border-red-500 focus:outline-none transition-colors" placeholder="0.00" />
            <span class="absolute right-3 top-2 text-gray-400 font-bold">¥</span>
          </div>
        </div>
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1">红包个数</label>
          <div class="relative">
            <input v-model.number="rpCount" type="number" min="1" step="1" class="w-full border-2 border-gray-200 rounded-lg p-2 pr-8 focus:border-red-500 focus:outline-none transition-colors" placeholder="1" />
            <span class="absolute right-3 top-2 text-gray-400 font-bold">个</span>
          </div>
        </div>
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1">祝福语</label>
          <input v-model="rpMessage" class="w-full border-2 border-gray-200 rounded-lg p-2 focus:border-red-500 focus:outline-none transition-colors" placeholder="恭喜发财，大吉大利" />
        </div>
        <button 
          @click="handleSendRedPacket" 
          class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          塞钱进红包
        </button>
      </div>
    </div>
  </div>
  <!-- Lottery Modal -->
  <div v-if="showLotteryModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border-2 border-blue-200">
      <div class="bg-blue-500 p-4 text-white flex justify-between items-center">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
          </svg>
          发布抽奖活动
        </h3>
        <button @click="showLotteryModal = false" class="hover:bg-blue-600 p-1 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1">奖品图片</label>
          <div 
            @click="triggerLotteryImageUpload" 
            class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors h-32 flex flex-col items-center justify-center relative overflow-hidden"
          >
            <template v-if="!lotteryImagePreview">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span class="text-sm text-gray-500">点击上传奖品图片</span>
            </template>
            <img v-else :src="lotteryImagePreview" class="absolute inset-0 w-full h-full object-cover" />
            <input 
              type="file" 
              ref="lotteryFileInput" 
              accept="image/*" 
              class="hidden" 
              @change="handleLotteryFileChange"
            />
          </div>
        </div>
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1">参与人数</label>
          <div class="relative">
            <input v-model.number="lotteryMaxParticipants" type="number" min="1" step="1" class="w-full border-2 border-gray-200 rounded-lg p-2 pr-8 focus:border-blue-500 focus:outline-none transition-colors" placeholder="1" />
            <span class="absolute right-3 top-2 text-gray-400 font-bold">人</span>
          </div>
        </div>
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1">联系方式</label>
          <input v-model="lotteryContactInfo" class="w-full border-2 border-gray-200 rounded-lg p-2 focus:border-blue-500 focus:outline-none transition-colors" placeholder="手机号/微信号/邮箱" />
        </div>
        <button 
          @click="handleSendLottery" 
          class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!lotteryMaxParticipants || !lotteryContactInfo"
        >
          发布活动
        </button>
      </div>
    </div>
  </div>

  <!-- Poll Modal -->
  <div v-if="showPollModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border-2 border-orange-200">
      <div class="bg-orange-500 p-4 text-white flex justify-between items-center">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
          发布投票
        </h3>
        <button @click="showPollModal = false" class="hover:bg-orange-600 p-1 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1">投票标题</label>
          <input 
            v-model="pollTitle" 
            class="w-full border-2 border-gray-200 rounded-lg p-2 focus:border-orange-500 focus:outline-none transition-colors" 
            placeholder="例如：中午吃什么？" 
          />
        </div>
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1">选项</label>
          <div class="space-y-2">
            <div v-for="(_option, index) in pollOptions" :key="index" class="flex gap-2">
              <input 
                v-model="pollOptions[index]" 
                class="flex-1 border-2 border-gray-200 rounded-lg p-2 focus:border-orange-500 focus:outline-none transition-colors" 
                :placeholder="`选项 ${index + 1}`" 
              />
              <button 
                v-if="pollOptions.length > 2"
                @click="removePollOption(index)"
                class="text-red-400 hover:text-red-600 p-2"
                title="删除选项"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          <button 
            @click="addPollOption" 
            class="mt-2 text-sm text-orange-500 font-bold hover:text-orange-600 flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            添加选项
          </button>
        </div>
        <button 
          @click="handleSendPoll" 
          class="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!pollTitle.trim() || pollOptions.filter(o => o.trim()).length < 2"
        >
          发起投票
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import EmojiPicker from 'vue3-emoji-picker';
import 'vue3-emoji-picker/css';
import { useChat } from '../composables/useChat';

const { sendRedPacket, sendFireworks, sendLottery, createPoll } = useChat();

const isFireworksCoolingDown = ref(false);

const handleSendFireworks = () => {
  if (isFireworksCoolingDown.value) return;
  
  sendFireworks();
  isFireworksCoolingDown.value = true;
  
  setTimeout(() => {
    isFireworksCoolingDown.value = false;
  }, 5000);
};

const emit = defineEmits<{
  (e: 'send', text: string, image: string | null): void;
}>();

const text = ref('');
const showEmojiPicker = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const imagePreview = ref<string | null>(null);

// Red Packet State
const showRedPacketModal = ref(false);
const rpAmount = ref<number | null>(null);
const rpCount = ref<number | null>(null);
const rpMessage = ref('');

// Lottery State
const showLotteryModal = ref(false);
const lotteryMaxParticipants = ref<number | null>(null);
const lotteryContactInfo = ref('');
const lotteryImagePreview = ref<string | null>(null);
const lotteryFileInput = ref<HTMLInputElement | null>(null);

const triggerLotteryImageUpload = () => {
  lotteryFileInput.value?.click();
};

const handleLotteryFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    
    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      lotteryImagePreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
  // Reset input
  target.value = '';
};

const handleSendLottery = () => {
  if (!lotteryMaxParticipants.value || lotteryMaxParticipants.value <= 0) {
    alert('请输入有效的参与人数');
    return;
  }
  
  if (!Number.isInteger(lotteryMaxParticipants.value)) {
    alert('参与人数必须是整数');
    return;
  }
  
  if (!lotteryContactInfo.value.trim()) {
    alert('请输入联系方式');
    return;
  }

  sendLottery(lotteryImagePreview.value, lotteryContactInfo.value, lotteryMaxParticipants.value);
  showLotteryModal.value = false;
  
  // Reset fields
  lotteryMaxParticipants.value = null;
  lotteryContactInfo.value = '';
  lotteryImagePreview.value = null;
};

// Poll State
const showPollModal = ref(false);
const pollTitle = ref('');
const pollOptions = ref(['', '']);

const addPollOption = () => {
  pollOptions.value.push('');
};

const removePollOption = (index: number) => {
  pollOptions.value.splice(index, 1);
};

const handleSendPoll = () => {
  if (!pollTitle.value.trim()) {
    alert('请输入投票标题');
    return;
  }
  
  const validOptions = pollOptions.value.map(o => o.trim()).filter(o => o);
  if (validOptions.length < 2) {
    alert('至少需要两个有效选项');
    return;
  }
  
  createPoll(pollTitle.value, validOptions);
  showPollModal.value = false;
  
  // Reset fields
  pollTitle.value = '';
  pollOptions.value = ['', ''];
};

const handleSendRedPacket = () => {
  console.log('Attempting to send red packet:', { amount: rpAmount.value, count: rpCount.value });
  
  if (!rpAmount.value || rpAmount.value <= 0) {
    alert('请输入有效的金额');
    return;
  }
  
  if (!rpCount.value || rpCount.value <= 0) {
    alert('请输入有效的红包个数');
    return;
  }
  
  if (!Number.isInteger(rpCount.value)) {
    alert('红包个数必须是整数');
    return;
  }

  sendRedPacket(rpAmount.value, rpCount.value, rpMessage.value || '恭喜发财，大吉大利');
  showRedPacketModal.value = false;
  // Reset fields
  rpAmount.value = null;
  rpCount.value = null;
  rpMessage.value = '';
};

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
    
    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      target.value = '';
      return;
    }

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
