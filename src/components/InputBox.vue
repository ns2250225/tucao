<template>
  <div class="p-4 clay-card flex flex-col md:flex-row gap-4 relative">
    <!-- Emoji Picker Popover -->
    <div v-if="showEmojiPicker" class="absolute bottom-full left-0 mb-2 z-50 shadow-clay rounded-clay overflow-hidden">
      <EmojiPicker :native="true" @select="onSelectEmoji" />
    </div>

    <!-- User Mention List -->
    <div v-if="showMentionList" class="absolute bottom-full left-0 mb-2 z-50 shadow-clay rounded-clay overflow-hidden bg-white w-48 max-h-48 overflow-y-auto custom-scrollbar">
      <div 
        v-for="(user, index) in filteredUsers" 
        :key="user.id" 
        class="p-2 cursor-pointer flex items-center gap-2 border-b border-gray-50 last:border-0"
        :class="{ 'bg-gray-100': index === selectedIndex, 'hover:bg-gray-100': index !== selectedIndex }"
        @click="selectMention(user)"
      >
        <div class="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
          {{ user.name.charAt(0) }}
        </div>
        <span class="text-sm truncate text-gray-700">{{ user.name }}</span>
      </div>
      <div v-if="filteredUsers.length === 0" class="p-2 text-xs text-gray-400 text-center">
        无匹配用户
      </div>
    </div>

    <div class="flex-1 flex flex-col gap-2">
      <!-- Reply Preview -->
      <div v-if="replyingTo" class="flex items-center gap-2 bg-gray-50 p-2 rounded-clay text-sm text-gray-600 border-l-4 border-primary shadow-inner">
        <div class="flex-1 truncate">
          <span class="font-bold text-primary mr-1">回复 {{ replyingTo.senderName }}:</span>
          <span>{{ replyingTo.text }}</span>
        </div>
        <button @click="setReplyTo(null)" class="text-gray-400 hover:text-gray-600 p-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="relative">
        <textarea
          v-model="text"
          @keydown="handleKeyDown"
          @keydown.enter.prevent="handleEnter"
          placeholder="在此输入你的槽点... (回车发送)"
          class="w-full clay-input resize-none h-16 md:h-24 custom-scrollbar font-sans"
        ></textarea>
      </div>
        
      <!-- Tools -->
      <div class="flex gap-2 items-center flex-wrap px-1">
        <button 
          type="button"
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

        <button 
          @click="showToastModal = true"
          class="p-1.5 rounded-full hover:bg-secondary/20 text-gray-500 hover:text-yellow-500 transition-colors"
          title="发布干杯活动"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
          </svg>
        </button>

        <button 
          @click="handleCreateDiceGame"
          class="p-1.5 rounded-full hover:bg-secondary/20 text-gray-500 hover:text-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="发布赌大小活动"
          :disabled="isDiceCoolingDown"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </button>

        <button 
          @click="showSongRequestModal = true"
          class="p-1.5 rounded-full hover:bg-secondary/20 text-gray-500 hover:text-pink-500 transition-colors"
          title="发布点歌活动"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
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
      <div v-if="imagePreview" class="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-dashed border-secondary/50 group shrink-0">
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
      class="w-full md:w-24 clay-button bg-cta flex items-center justify-center gap-2 md:flex-col md:gap-1 group shrink-0 py-3 md:py-0"
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
  <!-- Toast Activity Modal -->
  <div v-if="showToastModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border-2 border-yellow-200">
      <div class="bg-yellow-500 p-4 text-white flex justify-between items-center">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 5a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1V8a1 1 0 011-1zm5-5a1 1 0 011 1v1h1a1 1 0 010 2h-1v1a1 1 0 01-2 0V6H9a1 1 0 010-2h1V3a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          发布干杯活动
        </h3>
        <button @click="showToastModal = false" class="hover:bg-yellow-600 p-1 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">选择饮料</label>
          <div class="grid grid-cols-2 gap-3">
            <div 
              v-for="drink in availableDrinks" 
              :key="drink.name"
              @click="selectedDrink = drink.path"
              class="relative rounded-lg border-2 cursor-pointer transition-all overflow-hidden h-24 flex items-center justify-center bg-gray-50"
              :class="selectedDrink === drink.path ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-gray-200 hover:border-yellow-300'"
            >
              <img :src="drink.path" class="h-20 object-contain" :alt="drink.name" />
              <div class="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs text-center py-1 truncate">
                {{ drink.name }}
              </div>
            </div>
          </div>
        </div>
        <button 
          @click="handleSendToast" 
          class="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-lg shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!selectedDrink"
        >
          发布活动
        </button>
      </div>
    </div>
  </div>

  <!-- Song Request Modal -->
  <div v-if="showSongRequestModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border-2 border-pink-200">
      <div class="bg-pink-500 p-4 text-white flex justify-between items-center">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
          </svg>
          发布点歌活动
        </h3>
        <button @click="showSongRequestModal = false" class="hover:bg-pink-600 p-1 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1">歌曲名称</label>
          <div class="flex gap-2">
            <input v-model="songName" @keydown.enter="handleSearchSong" class="flex-1 border-2 border-gray-200 rounded-lg p-2 focus:border-pink-500 focus:outline-none transition-colors" placeholder="输入歌曲名 (如: 七里香)" />
            <button 
              @click="handleSearchSong" 
              class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 rounded-lg font-bold transition-colors disabled:opacity-50"
              :disabled="!songName.trim() || isSearchingSong"
            >
              {{ isSearchingSong ? '...' : '搜索' }}
            </button>
          </div>
        </div>

        <!-- Search Results List -->
        <div v-if="searchResults.length > 0" class="max-h-60 overflow-y-auto custom-scrollbar border-2 border-gray-100 rounded-lg">
          <div 
            v-for="song in searchResults" 
            :key="song.id"
            @click="selectedSong = song"
            class="p-3 hover:bg-pink-50 cursor-pointer transition-colors border-b last:border-b-0 flex items-center justify-between"
            :class="{'bg-pink-100': selectedSong?.id === song.id}"
          >
            <div class="min-w-0 flex-1">
              <div class="font-bold text-sm truncate">{{ song.name }}</div>
              <div class="text-xs text-gray-500 truncate">{{ song.artist }} - {{ song.album }}</div>
            </div>
            <div v-if="selectedSong?.id === song.id" class="text-pink-500 shrink-0 ml-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        <div v-else-if="hasSearched && !isSearchingSong" class="text-center text-gray-500 text-sm py-4">
          未找到相关歌曲
        </div>

        <button 
          @click="handlePublishSongRequest" 
          class="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-lg shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!selectedSong || isResolvingSong"
        >
          {{ isResolvingSong ? '获取资源中...' : '发布点歌活动' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import EmojiPicker from 'vue3-emoji-picker';
import 'vue3-emoji-picker/css';
import { useChat, type User } from '../composables/useChat';

const { sendRedPacket, sendFireworks, sendLottery, createPoll, sendToast, createDiceGame, sendMusic, replyingTo, setReplyTo, state } = useChat();

const isFireworksCoolingDown = ref(false);
const isDiceCoolingDown = ref(false);

const handleCreateDiceGame = () => {
  if (isDiceCoolingDown.value) return;
  
  createDiceGame();
  isDiceCoolingDown.value = true;
  
  setTimeout(() => {
    isDiceCoolingDown.value = false;
  }, 10000);
};

const handleSendFireworks = () => {
  if (isFireworksCoolingDown.value) return;
  
  sendFireworks();
  isFireworksCoolingDown.value = true;
  
  setTimeout(() => {
    isFireworksCoolingDown.value = false;
  }, 5000);
};

const emit = defineEmits<{
  (e: 'send', text: string, image: string | null, mentions: string[]): void;
}>();

const text = ref('');
const showEmojiPicker = ref(false);
const showMentionList = ref(false);
const mentionFilter = ref('');
const selectedIndex = ref(0);

watch(text, (newText) => {
  if (showMentionList.value) {
    const match = newText.match(/@([^@\s]*)$/);
    if (match) {
      mentionFilter.value = match[1] || '';
      selectedIndex.value = 0;
    } else {
      showMentionList.value = false;
    }
  } else {
    // Check if user just typed @
    const lastChar = newText.slice(-1);
    if (lastChar === '@') {
      showMentionList.value = true;
      mentionFilter.value = '';
      selectedIndex.value = 0;
    }
  }
});

const filteredUsers = computed(() => {
  if (!mentionFilter.value) return state.users;
  return state.users.filter(u => u.name.toLowerCase().includes(mentionFilter.value.toLowerCase()));
});

const selectMention = (user: User) => {
  const match = text.value.match(/@([^@\s]*)$/);
  if (match) {
    const index = match.index!;
    text.value = text.value.slice(0, index) + `@${user.name} ` + text.value.slice(index + match[0].length);
  } else {
    text.value += user.name + ' ';
  }
  showMentionList.value = false;
};

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
  const options = pollOptions.value.filter(o => o.trim());
  if (!pollTitle.value.trim() || options.length < 2) {
    alert('请输入标题和至少两个选项');
    return;
  }

  createPoll(pollTitle.value, options);
  showPollModal.value = false;
  
  // Reset
  pollTitle.value = '';
  pollOptions.value = ['', ''];
};

// Toast Activity State
const showToastModal = ref(false);
const selectedDrink = ref<string | null>(null);
const availableDrinks = [
  { name: '可乐', path: '/drink/可乐.jpg' },
  { name: '咖啡', path: '/drink/咖啡.jpg' },
  { name: '啤酒', path: '/drink/啤酒.jpg' },
  { name: '牛奶', path: '/drink/牛奶.png' }
];

const handleSendToast = () => {
  if (!selectedDrink.value) {
    alert('请选择一种饮料');
    return;
  }
  
  sendToast(selectedDrink.value);
  showToastModal.value = false;
  selectedDrink.value = null;
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

const handleEscKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (showEmojiPicker.value) {
      showEmojiPicker.value = false;
      return;
    }
    if (showMentionList.value) {
      showMentionList.value = false;
      return;
    }
    if (showRedPacketModal.value) {
      showRedPacketModal.value = false;
      return;
    }
    if (showLotteryModal.value) {
      showLotteryModal.value = false;
      return;
    }
    if (showPollModal.value) {
      showPollModal.value = false;
      return;
    }
    if (showToastModal.value) {
      showToastModal.value = false;
      return;
    }
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleEscKey);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleEscKey);
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

const handleKeyDown = (e: KeyboardEvent) => {
  if (showMentionList.value && filteredUsers.value.length > 0) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex.value = (selectedIndex.value - 1 + filteredUsers.value.length) % filteredUsers.value.length;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex.value = (selectedIndex.value + 1) % filteredUsers.value.length;
    }
  }
};

const handleEnter = (e: KeyboardEvent) => {
  if (showMentionList.value && filteredUsers.value.length > 0) {
    const selectedUser = filteredUsers.value[selectedIndex.value];
    if (selectedUser) {
      selectMention(selectedUser);
    }
    return;
  }
  if (!e.shiftKey) {
    send();
  }
};

const send = () => {
  if (text.value.trim() || imagePreview.value) {
    const mentions: string[] = [];
    state.users.forEach(user => {
      if (text.value.includes(`@${user.name}`)) {
        mentions.push(user.id);
      }
    });

    emit('send', text.value.trim(), imagePreview.value, mentions);
    text.value = '';
    imagePreview.value = null;
    showEmojiPicker.value = false;
    showMentionList.value = false;
  }
};

// Song Request Logic
const showSongRequestModal = ref(false);
const songName = ref('');
const isSearchingSong = ref(false);
const isResolvingSong = ref(false);
const searchResults = ref<any[]>([]);
const selectedSong = ref<any>(null);
const hasSearched = ref(false);

const API_URL = '';

const handleSearchSong = async () => {
  if (!songName.value.trim()) return;
  
  isSearchingSong.value = true;
  hasSearched.value = true;
  searchResults.value = [];
  selectedSong.value = null;
  
  try {
    const res = await fetch(`${API_URL}/api/music/search?q=${encodeURIComponent(songName.value)}`);
    const data = await res.json();
    
    if (!res.ok) {
      if (res.status === 404) {
         // Empty results
         searchResults.value = [];
      } else {
         alert(data.error || '搜索失败');
      }
      return;
    }
    
    if (Array.isArray(data)) {
        searchResults.value = data;
    } else {
        searchResults.value = [data];
    }
    
  } catch (e) {
    console.error(e);
    alert('搜索出错，请稍后重试');
  } finally {
    isSearchingSong.value = false;
  }
};

const handlePublishSongRequest = async () => {
  if (!selectedSong.value) return;
  
  isResolvingSong.value = true;
  try {
     const res = await fetch(`${API_URL}/api/music/resolve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ song: selectedSong.value })
     });
     const data = await res.json();

     if (!res.ok) {
        alert(data.error || '获取歌曲资源失败');
        return;
     }

    sendMusic(data);
    showSongRequestModal.value = false;
    // Reset state
    songName.value = '';
    searchResults.value = [];
    selectedSong.value = null;
    hasSearched.value = false;
  } catch (e) {
    console.error(e);
    alert('发布出错，请稍后重试');
  } finally {
    isResolvingSong.value = false;
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
