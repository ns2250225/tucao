<template>
  <div class="flex-1 overflow-y-auto p-2 md:p-6 space-y-4 bg-white/40 backdrop-blur-md rounded-clay-lg shadow-clay-inset custom-scrollbar" ref="chatContainer">
    <TransitionGroup name="list" tag="div" class="space-y-4 pb-2">
      <div 
        v-for="msg in messages" 
        :key="msg.id"
        class="flex flex-col"
        :class="msg.senderId === currentUserId ? 'items-end' : 'items-start'"
      >
        <div 
          class="max-w-[85%] md:max-w-[70%] p-4 clay-card relative group"
          :class="[
            msg.senderId === currentUserId 
              ? 'rounded-tr-sm border-primary/20' 
              : 'rounded-tl-sm border-secondary/20'
          ]"
          @contextmenu.prevent="handleContextMenu($event, msg)"
        >
          <div class="text-xs opacity-70 mb-1 font-bold tracking-wider uppercase">
            {{ msg.senderName }}
          </div>

          <!-- Quoted Message -->
          <div v-if="msg.quote" class="mb-2 p-2 rounded bg-black/5 border-l-4 border-gray-400 text-xs text-gray-500 italic">
            <div class="font-bold not-italic mb-0.5">{{ msg.quote.senderName }}:</div>
            <div class="truncate">{{ msg.quote.text }}</div>
          </div>

          <div v-if="msg.image" class="mb-2 rounded-lg overflow-hidden border border-white/20">
             <img 
               :src="msg.image" 
               class="max-w-full max-h-64 object-cover block cursor-zoom-in" 
               @click.stop="previewImage = msg.image"
             />
          </div>
          
          <!-- Red Packet Message -->
          <div v-if="msg.type === 'redPacket'" class="cursor-pointer group" @click="handleGrabRedPacket(msg.redPacketId!)">
            <div class="bg-red-500 text-white p-3 rounded-t-clay shadow-clay-sm flex items-center gap-3 min-w-[200px] md:min-w-[240px] transition-transform group-hover:scale-[1.02]">
              <div class="bg-yellow-100 p-2 rounded-full shrink-0 shadow-inner">
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
            <div class="bg-white px-3 py-1 text-xs text-gray-500 rounded-b-clay border-t border-gray-100 shadow-clay-sm">
              在线吐槽红包
            </div>
          </div>

          <!-- Lottery Message -->
          <div v-else-if="msg.type === 'lottery'" class="w-full">
            <div class="bg-blue-500 text-white p-3 rounded-t-clay shadow-clay-sm min-w-[200px] md:min-w-[240px] space-y-3">
              <div class="flex items-center gap-3 border-b border-white/20 pb-2">
                <div class="bg-blue-100 w-10 h-10 rounded-full shrink-0 flex items-center justify-center shadow-inner">
                   <span class="text-xl">🎁</span>
                </div>
                <div>
                  <div class="font-bold text-sm">抽奖活动</div>
                  <div class="text-xs opacity-80">
                    参与人数: {{ msg.lotteryData?.currentParticipants || 0 }} / {{ msg.lotteryData?.maxParticipants }}
                  </div>
                </div>
              </div>
              
              <div v-if="msg.lotteryData?.prizeImage" class="rounded-clay overflow-hidden border-2 border-white/20 bg-white/10 relative group shadow-inner">
                <img 
                  :src="msg.lotteryData.prizeImage" 
                  class="w-full h-32 object-cover cursor-zoom-in" 
                  @click.stop="previewImage = msg.lotteryData.prizeImage"
                />
                <div class="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors pointer-events-none"></div>
              </div>

              <div v-if="msg.lotteryData?.status === 'active'">
                 <button 
                   @click="handleJoinLottery(msg.lotteryId!)" 
                   class="w-full clay-button bg-yellow-400 hover:bg-yellow-300 text-blue-900 py-2 text-sm flex items-center justify-center gap-1"
                 >
                   <span>👋</span> 点击参与
                 </button>
              </div>
              <div v-else class="bg-white/20 p-2 rounded-clay text-xs space-y-2 animate-pulse-once shadow-inner">
                <div class="font-bold text-center text-yellow-300 text-lg">🎉 已开奖 🎉</div>
                <div class="text-center">中奖者: <span class="font-bold text-base">{{ msg.lotteryData?.winnerName }}</span></div>
                <div v-if="msg.lotteryData?.contactInfo" class="bg-white text-blue-900 p-2 rounded-clay font-mono text-center select-all border-2 border-blue-200 shadow-sm">
                  <div class="text-[10px] text-gray-500 mb-0.5">发起者联系方式</div>
                  {{ msg.lotteryData.contactInfo }}
                </div>
              </div>
            </div>
            <div class="bg-white px-3 py-1 text-xs text-gray-500 rounded-b-clay border-t border-gray-100 shadow-clay-sm">
              拼手气抽奖
            </div>
          </div>

          <!-- Poll Message -->
          <div v-else-if="msg.type === 'poll'" class="w-full">
            <div class="bg-orange-500 text-white p-3 rounded-t-clay shadow-clay-sm min-w-[200px] md:min-w-[240px] space-y-3">
              <div class="flex items-center gap-3 border-b border-white/20 pb-2">
                <div class="bg-orange-100 w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-orange-500 shadow-inner">
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
                  <div class="absolute inset-0 bg-white/10 rounded-clay overflow-hidden shadow-inner">
                    <div 
                      class="h-full bg-white/30 transition-all duration-500 ease-out"
                      :style="{ width: `${msg.pollData?.totalVotes ? (option.count / msg.pollData.totalVotes * 100) : 0}%` }"
                    ></div>
                  </div>
                  
                  <!-- Option Content -->
                  <button 
                    @click="handleVote(msg.pollId!, option.id)"
                    class="relative w-full text-left py-2 px-3 rounded-clay border border-white/20 hover:bg-white/5 transition-colors flex justify-between items-center group z-10 disabled:cursor-default"
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
              
              <div v-if="hasVoted(msg)" class="text-center text-xs bg-white/20 rounded-clay py-1 shadow-inner">
                ✅ 您已参与投票
              </div>
            </div>
            <div class="bg-white px-3 py-1 text-xs text-gray-500 rounded-b-clay border-t border-gray-100 shadow-clay-sm">
              30分钟后截止
            </div>
          </div>

          <!-- Toast Message -->
          <div v-else-if="msg.type === 'toast'" class="w-full">
            <div class="bg-yellow-500 text-white p-3 rounded-t-clay shadow-clay-sm min-w-[200px] md:min-w-[240px] space-y-3">
              <div class="flex items-center gap-3 border-b border-white/20 pb-2">
                <div class="bg-yellow-100 w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-yellow-500 shadow-inner">
                   <span class="text-xl">🍻</span>
                </div>
                <div>
                  <div class="font-bold text-sm">干杯活动</div>
                  <div class="text-xs opacity-80">
                    一起云干杯！
                  </div>
                </div>
              </div>
              
              <div class="rounded-clay overflow-hidden border-2 border-white/20 bg-white/10 relative group flex justify-center bg-white shadow-inner">
                <img 
                  :src="msg.toastData?.image" 
                  class="h-40 object-contain cursor-zoom-in" 
                  @click.stop="previewImage = msg.toastData?.image || null"
                />
              </div>

              <button 
                @click="handleCheers(msg.toastId!)" 
                class="w-full clay-button bg-white text-yellow-600 hover:bg-yellow-50 py-2 text-sm flex items-center justify-center gap-2"
                :disabled="isCheersCoolingDown"
              >
                <span>🍻</span> {{ isCheersCoolingDown ? '冷却中...' : '干杯' }}
              </button>
            </div>
            <div class="bg-white px-3 py-1 text-xs text-gray-500 rounded-b-clay border-t border-gray-100 shadow-clay-sm">
              30分钟后结束
            </div>
          </div>

          <!-- Dice Game Message -->
          <div v-else-if="msg.type === 'diceGame'" class="w-full">
            <div class="bg-green-600 text-white p-3 rounded-t-clay shadow-clay-sm min-w-[200px] md:min-w-[240px] space-y-3">
              <div class="flex items-center gap-3 border-b border-white/20 pb-2">
                <div class="bg-green-100 w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-green-600 shadow-inner">
                   <span class="text-xl">🎲</span>
                </div>
                <div>
                  <div class="font-bold text-sm">赌大小活动</div>
                  <div class="text-xs opacity-80">
                    {{ msg.diceGameData?.participants.length || 0 }} / 8 人参与
                  </div>
                </div>
              </div>

              <!-- Active State -->
              <div v-if="msg.diceGameData?.status === 'active'" class="space-y-3">
                <div class="grid grid-cols-3 gap-2">
                   <button 
                     @click="openDiceBetModal(msg.diceGameId!, 'big')"
                     class="clay-button bg-red-500 hover:bg-red-600 py-2 flex flex-col items-center justify-center"
                     :disabled="hasJoinedDiceGame(msg)"
                   >
                     <span class="text-lg">大</span>
                     <span class="text-[10px] opacity-80">1:1</span>
                   </button>
                   <button 
                     @click="openDiceBetModal(msg.diceGameId!, 'leopard')"
                     class="clay-button bg-yellow-500 hover:bg-yellow-600 py-2 flex flex-col items-center justify-center"
                     :disabled="hasJoinedDiceGame(msg)"
                   >
                     <span class="text-lg">围骰</span>
                     <span class="text-[10px] opacity-80">1:24</span>
                   </button>
                   <button 
                     @click="openDiceBetModal(msg.diceGameId!, 'small')"
                     class="clay-button bg-blue-500 hover:bg-blue-600 py-2 flex flex-col items-center justify-center"
                     :disabled="hasJoinedDiceGame(msg)"
                   >
                     <span class="text-lg">小</span>
                     <span class="text-[10px] opacity-80">1:1</span>
                   </button>
                </div>
                <div v-if="hasJoinedDiceGame(msg)" class="text-center text-xs bg-black/20 rounded-clay py-1 shadow-inner">
                  ✅ 您已下注: {{ getMyBet(msg)?.betAmount }}元 ({{ getBetLabel(getMyBet(msg)?.betType) }})
                </div>
              </div>

              <!-- Finished State -->
              <div v-else class="space-y-3">
                <div class="flex justify-center gap-4 py-2">
                  <div v-for="(dice, idx) in msg.diceGameData?.result?.dice" :key="idx" 
                    class="w-8 h-8 md:w-10 md:h-10 bg-white rounded-clay flex items-center justify-center shadow-lg text-black font-bold text-lg md:text-xl border-2 border-gray-200"
                  >
                    {{ dice }}
                  </div>
                </div>
                <div class="text-center font-bold text-xl text-yellow-300">
                  {{ msg.diceGameData?.result?.total }}点 - {{ getBetLabel(msg.diceGameData?.result?.result) }}
                </div>
                
                <!-- Winner List -->
                <div class="bg-black/20 rounded-clay p-2 max-h-32 overflow-y-auto custom-scrollbar shadow-inner">
                   <div v-if="!msg.diceGameData?.result?.winners.length" class="text-center text-xs opacity-60 py-2">
                     无人中奖
                   </div>
                   <div v-else v-for="winner in msg.diceGameData?.result?.winners" :key="winner.userId" class="flex justify-between items-center text-xs py-1 border-b border-white/10 last:border-0">
                     <span class="text-white/90 truncate max-w-[80px]">{{ winner.userName }}</span>
                     <span class="text-yellow-300 font-bold shrink-0">+{{ winner.winAmount }}</span>
                   </div>
                </div>
              </div>

            </div>
            <div class="bg-white px-3 py-1 text-xs text-gray-500 rounded-b-clay border-t border-gray-100 shadow-clay-sm">
              满8人自动开奖 · 30分钟有效
            </div>
          </div>

          <!-- Kick Vote Message -->
          <div v-else-if="msg.type === 'kickVote'" class="w-full">
            <div class="bg-gray-800 text-white p-3 rounded-t-clay shadow-clay-sm min-w-[200px] md:min-w-[240px] space-y-3">
              <div class="flex items-center gap-3 border-b border-white/20 pb-2">
                <div class="bg-red-500 w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white shadow-inner animate-pulse">
                   <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 2.197V17h10v-2.003A5.973 5.973 0 019 14zM21 12h-6" />
                   </svg>
                </div>
                <div>
                  <div class="font-bold text-sm text-red-400">踢人投票</div>
                  <div class="text-xs opacity-80">
                    目标: {{ msg.kickVoteData?.targetUserName }}
                  </div>
                </div>
              </div>

              <div class="text-center py-2">
                <div class="text-sm mb-2 opacity-80">当前票数</div>
                <div class="text-3xl font-bold font-mono">
                  <span class="text-red-400">{{ msg.kickVoteData?.votes.length }}</span>
                  <span class="text-white/30 text-xl">/</span>
                  <span class="text-white/60 text-xl">{{ msg.kickVoteData?.requiredVotes }}</span>
                </div>
              </div>

              <div v-if="msg.kickVoteData?.status === 'active'">
                 <button 
                   @click="handleVoteKick(msg.kickVoteId!)" 
                   class="w-full clay-button bg-red-600 hover:bg-red-700 text-white py-2 text-sm flex items-center justify-center gap-2"
                   :disabled="hasVotedKick(msg)"
                 >
                   <span v-if="hasVotedKick(msg)">已投票</span>
                   <span v-else>同意踢出</span>
                 </button>
              </div>
              <div v-else class="bg-black/30 p-2 rounded-clay text-center text-sm font-bold text-red-400 shadow-inner">
                {{ msg.kickVoteData?.status === 'success' ? '投票通过，用户已被踢出' : '投票结束' }}
              </div>
            </div>
            <div class="bg-white px-3 py-1 text-xs text-gray-500 rounded-b-clay border-t border-gray-100 shadow-clay-sm">
              满3票自动执行
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
      
      <div class="pt-10 px-6" :class="resultGrabbedList.length > 0 ? 'pb-6' : 'pb-16'">
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

        <div v-if="resultGrabbedList.length > 0" class="mt-8 bg-black/20 rounded-xl overflow-hidden text-left border border-white/10">
          <div class="p-3 text-xs text-white/60 border-b border-white/10 flex justify-between items-center bg-black/10">
             <span>领取详情</span>
             <span>{{ resultGrabbedList.length }} 人已领</span>
          </div>
          <div class="max-h-48 overflow-y-auto custom-scrollbar">
            <div v-for="(record, index) in resultGrabbedList" :key="index" class="flex items-center justify-between p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-xs text-red-500 font-bold shadow-sm">
                  {{ record.userName.charAt(0) }}
                </div>
                <div class="text-white text-sm text-left">
                  <div class="font-medium truncate max-w-[80px]">{{ record.userName }}</div>
                  <div class="text-[10px] text-white/50">{{ formatTime(record.timestamp) }}</div>
                </div>
              </div>
              <div class="text-yellow-300 font-bold text-sm">
                {{ record.amount.toFixed(2) }} <span class="text-[10px] font-normal text-yellow-100/70">元</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="bg-[#d63031] p-4 text-center cursor-pointer hover:bg-[#c0392b] transition-colors text-white/80 text-sm" @click="showResultModal = false">
        关闭
      </div>
    </div>
  </div>

  <!-- Context Menu -->
  <div 
    v-if="contextMenu.visible"
    class="fixed z-[300] bg-white rounded-lg shadow-xl border border-gray-100 py-1 min-w-[120px]"
    :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"
  >
    <div 
      class="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700 flex items-center gap-2"
      @click="handleQuote"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
      引用消息
    </div>
    <div 
      class="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700 flex items-center gap-2"
      @click="handleInitiateKick"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 2.197V17h10v-2.003A5.973 5.973 0 019 14zM21 12h-6" />
      </svg>
      <span class="text-red-500 font-bold">发起踢出</span>
    </div>
  </div>

  <!-- Image Preview Modal -->
  <div v-if="previewImage" class="fixed inset-0 z-[400] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out" @click="previewImage = null">
    <div class="relative max-w-full max-h-full">
      <img :src="previewImage" class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" @click.stop />
      <button @click="previewImage = null" class="absolute -top-12 right-0 text-white/70 hover:text-white p-2 bg-white/10 rounded-full transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Dice Bet Modal -->
  <div v-if="showDiceBetModal" class="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-bounce-in">
      <div class="bg-green-600 p-4 text-white flex justify-between items-center">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <span class="text-2xl">🎲</span>
          参与下注
        </h3>
        <button @click="closeDiceBetModal" class="hover:bg-white/20 p-1 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="p-6 space-y-4">
        <div class="text-center">
          <div class="text-gray-500 text-sm mb-1">您选择下注</div>
          <div class="text-2xl font-bold" :class="{
            'text-red-500': selectedBetType === 'big',
            'text-blue-500': selectedBetType === 'small',
            'text-yellow-500': selectedBetType === 'leopard'
          }">
            {{ getBetLabel(selectedBetType) }}
          </div>
          <div class="text-xs text-gray-400 mt-1">
            赔率: {{ selectedBetType === 'leopard' ? '1:24' : '1:1' }}
          </div>
        </div>

        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">下注金额</label>
          <div class="relative">
            <input 
              v-model.number="betAmount" 
              type="number" 
              min="1" 
              step="1" 
              class="w-full border-2 border-gray-200 rounded-lg p-3 pr-10 text-lg font-bold text-center focus:border-green-500 focus:outline-none transition-colors"
              placeholder="0" 
              autofocus
              @keyup.enter="confirmBet"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">元</span>
          </div>
        </div>

        <button 
          @click="confirmBet" 
          class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!betAmount || betAmount <= 0"
        >
          确认下注
        </button>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { type Message, useChat, type RedPacketGrabbedRecord } from '../composables/useChat';

const props = defineProps<{
  messages: Message[];
  currentUserId?: string;
}>();

const { grabRedPacket, joinLottery, votePoll, lastGrabResult, sendCheers, setReplyTo, joinDiceGame, initiateKickVote, voteKick } = useChat();
const chatContainer = ref<HTMLElement | null>(null);
const previewImage = ref<string | null>(null);

// Dice Game Logic
const showDiceBetModal = ref(false);
const selectedDiceGameId = ref<string | null>(null);
const selectedBetType = ref<'big' | 'small' | 'leopard'>('big');
const betAmount = ref<number | null>(null);

const openDiceBetModal = (gameId: string, type: 'big' | 'small' | 'leopard') => {
  selectedDiceGameId.value = gameId;
  selectedBetType.value = type;
  betAmount.value = null;
  showDiceBetModal.value = true;
};

const closeDiceBetModal = () => {
  showDiceBetModal.value = false;
  selectedDiceGameId.value = null;
  betAmount.value = null;
};

const confirmBet = () => {
  if (selectedDiceGameId.value && betAmount.value && betAmount.value > 0) {
    joinDiceGame(selectedDiceGameId.value, selectedBetType.value, betAmount.value);
    closeDiceBetModal();
  }
};

const hasJoinedDiceGame = (msg: Message) => {
  if (!msg.diceGameData || !props.currentUserId) return false;
  return msg.diceGameData.participants.some(p => p.userId === props.currentUserId);
};

const getMyBet = (msg: Message) => {
  if (!msg.diceGameData || !props.currentUserId) return null;
  return msg.diceGameData.participants.find(p => p.userId === props.currentUserId);
};

const getBetLabel = (type?: string) => {
  switch (type) {
    case 'big': return '大';
    case 'small': return '小';
    case 'leopard': return '围骰';
    default: return type;
  }
};

// Context Menu State
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  message: null as Message | null
});

const handleContextMenu = (e: MouseEvent, msg: Message) => {
  e.preventDefault();
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    message: msg
  };
};

const closeContextMenu = () => {
  contextMenu.value.visible = false;
};

const handleQuote = () => {
  if (contextMenu.value.message) {
    setReplyTo(contextMenu.value.message);
  }
  closeContextMenu();
};

const handleInitiateKick = () => {
  if (contextMenu.value.message) {
    // Prevent kicking self or system
    if (contextMenu.value.message.senderId === props.currentUserId) {
      alert('不能踢出自己');
      closeContextMenu();
      return;
    }
    if (contextMenu.value.message.type === 'system') {
      alert('不能踢出系统');
      closeContextMenu();
      return;
    }
    
    initiateKickVote(contextMenu.value.message.senderId);
  }
  closeContextMenu();
};

const handleVoteKick = (kickVoteId: string) => {
  voteKick(kickVoteId);
};

const hasVotedKick = (msg: Message) => {
  if (!msg.kickVoteData || !props.currentUserId) return false;
  return msg.kickVoteData.votes.includes(props.currentUserId);
};

// Close context menu on click elsewhere
if (typeof window !== 'undefined') {
  window.addEventListener('click', closeContextMenu);
}

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
const resultGrabbedList = ref<RedPacketGrabbedRecord[]>([]);

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
        resultGrabbedList.value = result.detail?.grabbedList || [];
        resultSender.value = result.detail?.senderName || '土豪';
        
        if (result.success) {
          resultAmount.value = result.amount!;
          resultMessage.value = result.detail?.message || '恭喜发财';
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
