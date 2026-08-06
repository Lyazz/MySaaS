<template>
  <div>
    <!-- Floating button -->
    <button 
      @click="toggleChat"
      class="fixed bottom-6 right-6 w-14 h-14 [background:var(--brand)] text-white rounded-full shadow-lg flex items-center justify-center hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] hover:scale-105 transition-all z-[99] focus:outline-none focus:ring-4 focus:[--tw-ring-color:rgba(var(--brand-rgb)/0.3)]"
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
        class="fixed bottom-24 end-6 w-80 sm:w-[400px] rounded-2xl z-[99] flex flex-col overflow-hidden"
        style="background: var(--surface-2); border: 1px solid var(--surface-border); box-shadow: 0 24px 60px rgba(0,0,0,0.5); max-height: calc(100vh - 120px); height: 550px;"
      >
        <!-- Header -->
        <div class="bg-gradient-to-r [--tw-gradient-from:var(--brand)] [--tw-gradient-to:color-mix(in_srgb,var(--brand)_80%,#000)] p-4 text-white flex-shrink-0 flex items-center justify-between">
          <div>
            <h3 class="font-sans font-semibold text-lg flex items-center gap-2">
              <Icon name="lucide:life-buoy" class="w-5 h-5" />
              {{ t('admin.help.title') }}
            </h3>
            <p class="text-white/80 text-sm mt-1">{{ t('admin.help.subtitle') }}</p>
          </div>
          <button @click="isOpen = false" class="text-white/80 hover:text-white p-1 rounded-md hover:[background:rgba(0,0,0/0.3)] transition-colors">
            <Icon name="lucide:x" class="w-5 h-5" />
          </button>
        </div>

        <!-- Chat Area -->
        <div class="flex-1 p-4 overflow-y-auto flex flex-col gap-4 relative custom-scrollbar" ref="chatContainer" style="background: var(--admin-content-bg)">
          
          <div 
            v-for="(msg, index) in messages" 
            :key="index"
            class="flex items-start gap-3 w-full animate-fadeIn"
            :class="msg.role === 'user' ? 'flex-row-reverse' : ''"
          >
            <!-- Avatar -->
            <div 
              class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              :class="msg.role === 'user' ? '[background:var(--brand)] text-white' : '[background:rgba(var(--brand-rgb)/0.15)] [color:rgba(var(--brand-rgb)/0.85)]'"
            >
              <Icon :name="msg.role === 'user' ? 'lucide:user' : 'lucide:bot'" class="w-5 h-5" />
            </div>
            
            <!-- Message Bubble -->
            <div 
              class="p-3 rounded-2xl text-sm"
              :style="msg.role === 'user'
                ? 'background: var(--brand); color: #fff'
                : 'background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-secondary)'"
              :class="[
                msg.role === 'user' ? 'rounded-se-none ms-auto' : 'rounded-ss-none'
              ]"
            >
              {{ msg.content }}
            </div>
          </div>

          <!-- Typing Indicator -->
          <div v-if="isTyping" class="flex items-start gap-3 w-full animate-fadeIn">
            <div class="w-8 h-8 rounded-full [background:rgba(var(--brand-rgb)/0.15)] flex items-center justify-center flex-shrink-0 [color:rgba(var(--brand-rgb)/0.85)]">
              <Icon name="lucide:bot" class="w-5 h-5" />
            </div>
            <div class="py-3 px-4 rounded-2xl rounded-ss-none flex items-center gap-1.5 h-11" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
              <div class="w-1.5 h-1.5 [background:var(--brand)] rounded-full animate-bounce" style="animation-delay: 0ms"></div>
              <div class="w-1.5 h-1.5 [background:var(--brand)] rounded-full animate-bounce" style="animation-delay: 150ms"></div>
              <div class="w-1.5 h-1.5 [background:var(--brand)] rounded-full animate-bounce" style="animation-delay: 300ms"></div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <form @submit.prevent="sendMessage" class="p-3 flex gap-2 flex-shrink-0 items-end" style="border-top: 1px solid var(--surface-border); background: var(--surface-1)">
          <input
            v-model="newMessage"
            type="text"
            :placeholder="t('admin.help.inputPlaceholder')"
            class="flex-1 ui-input"
            :disabled="isTyping"
          >
          <button 
            type="submit"
            class="[background:var(--brand)] text-white p-2.5 rounded-lg hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-[42px] w-[42px]" 
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
  background-color: rgba(255,255,255,0.1);
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255,255,255,0.2);
}
</style>
