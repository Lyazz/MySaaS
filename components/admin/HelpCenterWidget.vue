<template>
  <div>
    <!-- Floating button -->
    <button 
      @click="toggleChat"
      class="fixed bottom-6 right-6 w-14 h-14 bg-teal-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-teal-700 hover:scale-105 transition-all z-[99] focus:outline-none focus:ring-4 focus:ring-teal-600/30"
      :aria-label="t('admin.help.button')"
    >
      <Icon v-if="!isOpen" name="lucide:message-circle-question" class="w-7 h-7" />
      <Icon v-else name="lucide:x" class="w-7 h-7" />
    </button>

    <!-- Chatbot Popup -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-4 opacity-0 scale-95"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100 scale-100"
      leave-to-class="translate-y-4 opacity-0 scale-95"
    >
      <div 
        v-if="isOpen" 
        class="fixed bottom-24 right-6 w-80 sm:w-[400px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[99] flex flex-col overflow-hidden"
        style="max-height: calc(100vh - 120px); height: 550px;"
      >
        <!-- Header -->
        <div class="bg-gradient-to-r from-teal-600 to-teal-700 p-4 text-white flex-shrink-0 flex items-center justify-between">
          <div>
            <h3 class="font-sans font-semibold text-lg flex items-center gap-2">
              <Icon name="lucide:life-buoy" class="w-5 h-5" />
              {{ t('admin.help.title') }}
            </h3>
            <p class="text-teal-100 text-sm mt-1">{{ t('admin.help.subtitle') }}</p>
          </div>
          <button @click="isOpen = false" class="text-teal-100 hover:text-white p-1 rounded-md hover:bg-teal-800/50 transition-colors">
            <Icon name="lucide:x" class="w-5 h-5" />
          </button>
        </div>

        <!-- Chat Area -->
        <div class="flex-1 bg-slate-50 p-4 overflow-y-auto flex flex-col gap-4 relative custom-scrollbar" ref="chatContainer">
          
          <div 
            v-for="(msg, index) in messages" 
            :key="index"
            class="flex items-start gap-3 w-full animate-fadeIn"
            :class="msg.role === 'user' ? 'flex-row-reverse' : ''"
          >
            <!-- Avatar -->
            <div 
              class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              :class="msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-teal-100 text-teal-600'"
            >
              <Icon :name="msg.role === 'user' ? 'lucide:user' : 'lucide:bot'" class="w-5 h-5" />
            </div>
            
            <!-- Message Bubble -->
            <div 
              class="p-3 rounded-2xl text-sm"
              :class="[
                msg.role === 'user' 
                  ? 'bg-slate-800 text-white rounded-tr-none shadow-sm ml-auto' 
                  : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
              ]"
            >
              {{ msg.content }}
            </div>
          </div>

          <!-- Typing Indicator -->
          <div v-if="isTyping" class="flex items-start gap-3 w-full animate-fadeIn">
            <div class="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 text-teal-600">
              <Icon name="lucide:bot" class="w-5 h-5" />
            </div>
            <div class="bg-white border border-slate-200 py-3 px-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5 h-11">
              <div class="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
              <div class="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
              <div class="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <form @submit.prevent="sendMessage" class="p-3 bg-white border-t border-slate-100 flex gap-2 flex-shrink-0 items-end">
          <input 
            v-model="newMessage"
            type="text" 
            :placeholder="t('admin.help.inputPlaceholder')" 
            class="flex-1 ui-input ui-input--md bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-600/20 rounded-lg px-3 py-2 text-sm outline-none transition-all"
            :disabled="isTyping"
          >
          <button 
            type="submit"
            class="bg-teal-600 text-white p-2.5 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-[42px] w-[42px]" 
            :disabled="!newMessage.trim() || isTyping"
          >
            <Icon name="lucide:send" class="w-4 h-4 translate-x-[-1px] translate-y-[1px]" />
          </button>
        </form>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from 'vue'

const { t } = useI18n({ useScope: 'global' })
const isOpen = ref(false)
const isTyping = ref(false)
const newMessage = ref('')
const chatContainer = ref<HTMLElement | null>(null)

type Message = {
  role: 'bot' | 'user'
  content: string
}

const messages = ref<Message[]>([])

onMounted(() => {
  // Initialize with greeting
  messages.value = [
    { role: 'bot', content: t('admin.help.greeting') }
  ]
})

const scrollToBottom = async () => {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

watch(messages, () => {
  scrollToBottom()
}, { deep: true })

watch(isTyping, () => {
  scrollToBottom()
})

const toggleChat = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    setTimeout(() => {
      scrollToBottom()
    }, 50)
  }
}

const botResponses = [
  "I'm a mockup assistant right now, but soon I'll be able to help you!",
  "That sounds interesting! Please tell me more.",
  "I've noted that down. The development team is working on making me fully conversational.",
  "Can I help you with anything else regarding your Swekly store?",
  "Check out our documentation for more detailed guides!"
]

const sendMessage = () => {
  const content = newMessage.value.trim()
  if (!content) return

  // Add user message
  messages.value.push({
    role: 'user',
    content
  })

  // Clear input
  newMessage.value = ''
  
  // Simulate bot typing
  isTyping.value = true

  // Simulate network delay for bot reply (1-2 seconds)
  const delay = Math.floor(Math.random() * 1000) + 1000
  
  setTimeout(() => {
    isTyping.value = false
    const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)]
    
    messages.value.push({
      role: 'bot',
      content: randomResponse
    })
  }, delay)
}
</script>

<style scoped>
.animate-bounce {
  animation: bounce 1.4s infinite ease-in-out both;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Custom scrollbar for chat area */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}
</style>
