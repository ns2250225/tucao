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
          class="max-w-[85%] md:max-w-[70%] p-4 rounded-2xl shadow-md transition-all hover:scale-[1.02] duration-200 border-2"
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
          
          <!-- Red Packet Message -->
          <div v-if="msg.type === 'redPacket'" class="cursor-pointer" @click="handleGrabRedPacket(msg.redPacketId!)">
            <div class="bg-red-500 text-white p-3 rounded-lg flex items-center gap-3 min-w-[200px]">
              <div class="bg-yellow-100 p-2 rounded-full shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clip-rule="evenodd" />
                  <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-bold text-sm truncate">{{ msg.text }}</div>
                <div class="text-xs opacity-80">领取红包</div>
              </div>
            </div>
            <div class="bg-white px-3 py-1 text-xs text-gray-500 rounded-b-lg border-t border-gray-100">
              在线吐槽红包
            </div>
          </div>

          <!-- Lottery Message -->
          <div v-else-if="msg.type === 'lottery'" class="w-full">
            <div class="bg-blue-500 text-white p-3 rounded-t-lg min-w-[200px] space-y-3">
              <div class="flex items-center gap-3 border-b border-white/20 pb-2">
                <div class="bg-blue-100 w-10 h-10 rounded-full shrink-0 flex items-center justify-center">
                   <span class="text-xl">🎁</span>
                </div>
                <div>
                  <div class="font-bold text-sm">抽奖活动</div>
                  <div class="text-xs opacity-80">
                    参与人数: {{ msg.lotteryData?.currentParticipants || 0 }} / {{ msg.lotteryData?.maxParticipants }}
                  </div>
                </div>
              </div>
              
              <div v-if="msg.lotteryData?.prizeImage" class="rounded-lg overflow-hidden border-2 border-white/20 bg-white/10 relative group">
                <img :src="msg.lotteryData.prizeImage" class="w-full h-32 object-cover" />
                <div class="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
              </div>

              <div v-if="msg.lotteryData?.status === 'active'">
                 <button 
                   @click="handleJoinLottery(msg.lotteryId!)" 
                   class="w-full bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-bold py-2 rounded-lg text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-1"
                 >
                   <span>👋</span> 点击参与
                 </button>
              </div>
              <div v-else class="bg-white/20 p-2 rounded-lg text-xs space-y-2 animate-pulse-once">
                <div class="font-bold text-center text-yellow-300 text-lg">🎉 已开奖 🎉</div>
                <div class="text-center">中奖者: <span class="font-bold text-base">{{ msg.lotteryData?.winnerName }}</span></div>
                <div v-if="msg.lotteryData?.contactInfo" class="bg-white text-blue-900 p-2 rounded font-mono text-center select-all border-2 border-blue-200">
                  <div class="text-[10px] text-gray-500 mb-0.5">发起者联系方式</div>
                  {{ msg.lotteryData.contactInfo }}
                </div>
              </div>
            </div>
            <div class="bg-white px-3 py-1 text-xs text-gray-500 rounded-b-lg border-t border-gray-100 shadow-sm">
              拼手气抽奖
            </div>
          </div>

          <!-- Poll Message -->
          <div v-else-if="msg.type === 'poll'" class="w-full">
            <div class="bg-orange-500 text-white p-3 rounded-t-lg min-w-[240px] space-y-3">
              <div class="flex items-center gap-3 border-b border-white/20 pb-2">
                <div class="bg-orange-100 w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-orange-500">
                   <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                   </svg>
                </div>
                <div>
                  <div class="font-bold text-sm">投票活动</div>
                  <div class="text-xs opacity-80">
                    {{ msg.pollData?.totalVotes || 0 }} 人参与
                  </div>
                </div>
              </div>
              
              <div class="font-bold text-lg leading-tight">
                {{ msg.pollData?.title }}
              </div>

              <div class="space-y-2">
                <div v-for="option in msg.pollData?.options" :key="option.id" class="relative">
                  <!-- Result Bar Background -->
                  <div class="absolute inset-0 bg-white/10 rounded-lg overflow-hidden">
                    <div 
                      class="h-full bg-white/30 transition-all duration-500 ease-out"
                      :style="{ width: `${msg.pollData?.totalVotes ? (option.count / msg.pollData.totalVotes * 100) : 0}%` }"
                    ></div>
                  </div>
                  
                  <!-- Option Content -->
                  <button 
                    @click="handleVote(msg.pollId!, option.id)"
                    class="relative w-full text-left py-2 px-3 rounded-lg border border-white/20 hover:bg-white/5 transition-colors flex justify-between items-center group z-10 disabled:cursor-default"
                    :disabled="hasVoted(msg)"
                  >
                    <span class="text-sm font-medium truncate flex-1 mr-2">{{ option.text }}</span>
                    <div class="text-xs font-mono shrink-0 flex items-center gap-2">
                      <span v-if="currentUserId && msg.pollData?.voters?.includes(currentUserId)"></span>
                      <span>{{ option.count }}票</span>
                      <span class="opacity-70 text-[10px] w-8 text-right">
                        {{ msg.pollData?.totalVotes ? Math.round(option.count / msg.pollData.totalVotes * 100) : 0 }}%
                      </span>
                    </div>
                  </button>
                </div>
              </div>
              
              <div v-if="hasVoted(msg)" class="text-center text-xs bg-white/20 rounded py-1">
                ✅ 您已参与投票
              </div>
            </div>
            <div class="bg-white px-3 py-1 text-xs text-gray-500 rounded-b-lg border-t border-gray-100 shadow-sm">
              30分钟后截止
            </div>
          </div>

          <!-- Toast Message -->
          <div v-else-if="msg.type === 'toast'" class="w-full">
            <div class="bg-yellow-500 text-white p-3 rounded-t-lg min-w-[240px] space-y-3">
              <div class="flex items-center gap-3 border-b border-white/20 pb-2">
                <div class="bg-yellow-100 w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-yellow-500">
                   <span class="text-xl">🍻</span>
                </div>
                <div>
                  <div class="font-bold text-sm">干杯活动</div>
                  <div class="text-xs opacity-80">
                    一起云干杯！
                  </div>
                </div>
              </div>
              
              <div class="rounded-lg overflow-hidden border-2 border-white/20 bg-white/10 relative group flex justify-center bg-white">
                <img :src="msg.toastData?.image" class="h-40 object-contain" />
              </div>

              <button 
                @click="handleCheers(msg.toastId!)" 
                class="w-full bg-white text-yellow-600 font-bold py-2 rounded-lg text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-50"
                :disabled="isCheersCoolingDown"
              >
                <span>🍻</span> {{ isCheersCoolingDown ? '冷却中...' : '干杯' }}
              </button>
            </div>
            <div class="bg-white px-3 py-1 text-xs text-gray-500 rounded-b-lg border-t border-gray-100 shadow-sm">
              30分钟后结束
            </div>
          </div>

          <div v-else-if="msg.text" class="text-base break-all whitespace-pre-wrap font-sans leading-relaxed">
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

  <!-- Grab Result Modal -->
  <div v-if="showResultModal" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div class="bg-red-500 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden text-center relative animate-bounce-in">
      <button @click="showResultModal = false" class="absolute top-2 right-2 text-white/70 hover:text-white p-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      <div class="pt-10 pb-16 px-6">
        <div class="w-20 h-20 bg-yellow-100 rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg border-4 border-yellow-300">
           <span class="text-4xl">🧧</span>
        </div>
        
        <h3 class="text-white font-bold text-xl mb-1">{{ resultSender }} 的红包</h3>
        <p class="text-red-100 text-sm mb-6">{{ resultMessage }}</p>
        
        <div v-if="resultAmount" class="text-yellow-300 font-bold text-5xl mb-2 flex justify-center items-end gap-1">
          {{ resultAmount.toFixed(2) }} <span class="text-lg mb-2">元</span>
        </div>
        <div v-else class="text-yellow-300 font-bold text-2xl mb-2">
          {{ resultStatus }}
        </div>
        
        <div v-if="resultAmount" class="text-red-200 text-xs mt-4">
          已存入余额，可用于发红包
        </div>
      </div>
      
      <div class="bg-[#d63031] p-4 text-center cursor-pointer hover:bg-[#c0392b] transition-colors text-white/80 text-sm" @click="showResultModal = false">
        关闭
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { type Message, useChat } from '../composables/useChat';

const props = defineProps<{
  messages: Message[];
  currentUserId?: string;
}>();

const { grabRedPacket, joinLottery, votePoll, lastGrabResult, sendCheers } = useChat();
const chatContainer = ref<HTMLElement | null>(null);

// Toast Cheers Cooldown
const isCheersCoolingDown = ref(false);

const handleCheers = (_toastId: string) => {
  if (isCheersCoolingDown.value) return;
  sendCheers();
  isCheersCoolingDown.value = true;
  setTimeout(() => {
    isCheersCoolingDown.value = false;
  }, 3000);
};

// Result Modal State
const showResultModal = ref(false);
const resultAmount = ref<number | null>(null);
const resultMessage = ref('');
const resultSender = ref('');
const resultStatus = ref('');

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const handleGrabRedPacket = (id: string) => {
  grabRedPacket(id);
};

const handleJoinLottery = (id: string) => {
  joinLottery(id);
};

const handleVote = (pollId: string, optionId: number) => {
  votePoll(pollId, optionId);
};

const hasVoted = (msg: Message) => {
  if (!msg.pollData?.voters || !props.currentUserId) return false;
  return msg.pollData.voters.includes(props.currentUserId);
};

// Watch for grab results
watch(lastGrabResult, (result) => {
  if (result) {
    showResultModal.value = true;
    if (result.success) {
      resultAmount.value = result.amount!;
      resultMessage.value = result.detail?.message || '恭喜发财';
      resultSender.value = result.detail?.senderName || '土豪';
      resultStatus.value = '';
    } else {
      resultAmount.value = null;
      // If user already grabbed, show how much they grabbed
      if (result.amount) {
        resultAmount.value = result.amount;
        resultMessage.value = '你已经领过啦';
        resultStatus.value = '';
      } else {
        resultStatus.value = result.message || '手慢了，红包派完了';
        resultMessage.value = result.detail?.message || '下次好运';
      }
      resultSender.value = result.detail?.senderName || '土豪';
    }
  }
});

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

@keyframes bounce-in {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.05); opacity: 1; }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); }
}
.animate-bounce-in {
  animation: bounce-in 0.5s cubic-bezier(0.215, 0.610, 0.355, 1.000) both;
}

.animate-pulse-once {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1);
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .7; }
}
</style>
