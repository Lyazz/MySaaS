<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

definePageMeta({
  middleware: 'saas-only',
  layout: 'marketing',
  title: 'Register - Swekly'
})

const form = ref({
  name: '',
  slug: '',
  email: '',
  password: ''
})

const loading = ref(false)
const error = ref('')
const successData = ref<any>(null)

// Auto-generate slug from name
watch(() => form.value.name, (newName) => {
  if (!successData.value) { // Stop updating if already success
    form.value.slug = newName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '') // Trim hyphens
  }
})

async function register() {
  loading.value = true
  error.value = ''
  successData.value = null

  try {
    const data = await $fetch('/api/register', {
      method: 'POST',
      body: form.value
    })
    successData.value = data
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'An error occurred during registration.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex bg-white font-sans">
    
    <!-- LEFT SIDE: Marketing / Visual (Hidden on mobile) -->
    <div class="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 text-white">
      <!-- Animated Background -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-[10%] left-[10%] w-[50%] h-[50%] bg-teal-600/20 rounded-full blur-[100px] animate-blob" />
        <div class="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] bg-violet-600/20 rounded-full blur-[100px] animate-blob animation-delay-2000" />
        <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>



      <div class="relative z-10 max-w-lg">
        <h2 class="text-5xl font-bold tracking-tight mb-6 leading-tight">
          Launch your <br> <span class="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Empire</span> today.
        </h2>
        <p class="text-lg text-slate-400 mb-8 leading-relaxed">
          Join thousands of merchants building the next generation of commerce. 
          Scalable, secure, and ready for growth.
        </p>

        <!-- Mini Testimonial -->
        <div class="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
          <div class="flex gap-1 text-amber-400 mb-3">
            <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
          </div>
          <p class="text-slate-300 italic mb-4">"Moving to Swekly was the best decision we made. Our revenue doubled in 3 months."</p>
          <div class="flex items-center gap-3">
             <div class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">JD</div>
             <div class="text-sm">
               <div class="font-bold text-white">John Doe</div>
               <div class="text-slate-500">CEO, FashionNova</div>
             </div>
          </div>
        </div>
      </div>

      <div class="relative z-10 text-xs text-slate-500">
        © 2026 Swekly Inc.
      </div>
    </div>

    <!-- RIGHT SIDE: Form -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative">
      <div class="max-w-md w-full space-y-8">
        
        <div class="text-center lg:text-left">

          <h2 class="text-3xl font-bold text-slate-900 tracking-tight">Create your account</h2>
          <p class="mt-2 text-slate-500">Start your 14-day free trial. No credit card required.</p>
        </div>

        <div v-if="successData" class="rounded-2xl bg-green-50 p-6 border border-green-100 animate-fadeIn">
          <div class="flex">
            <div class="flex-shrink-0">
              <Icon name="lucide:check-circle" class="h-6 w-6 text-green-500" />
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-bold text-green-800">You're in!</h3>
              <div class="mt-2 text-green-700">
                <p>Your workspace <strong>{{ successData.tenant.name }}</strong> has been created.</p>
                <div class="mt-4">
                  <a :href="successData.tenant.url" class="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors">
                    Go to Dashboard &rarr;
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form v-else class="mt-8 space-y-6" @submit.prevent="register">
          <div class="space-y-5">
            
            <!-- Company Name -->
            <div>
              <label for="company-name" class="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
              <input 
                id="company-name" 
                v-model="form.name" 
                name="name" 
                type="text" 
                required 
                class="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-all" 
                placeholder="Ex. Acme Corp"
              >
            </div>

            <!-- Slug -->
            <div>
              <label for="slug" class="block text-sm font-medium text-slate-700 mb-1">Store URL</label>
              <div class="flex rounded-xl shadow-sm">
                <input 
                  id="slug" 
                  v-model="form.slug" 
                  name="slug" 
                  type="text" 
                  required 
                  class="flex-1 min-w-0 block w-full px-4 py-3 rounded-none rounded-l-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-all"
                  placeholder="acme"
                >
                <span class="inline-flex items-center px-4 rounded-r-xl border border-l-0 border-slate-300 bg-slate-50 text-slate-500 text-sm font-medium">
                  .swekly.com
                </span>
              </div>
              <p v-if="form.slug" class="mt-1 text-xs text-teal-500 font-medium">
                Your store will be at: {{ form.slug }}.swekly.com
              </p>
            </div>

            <!-- Email -->
            <div>
              <label for="email-address" class="block text-sm font-medium text-slate-700 mb-1">Work Email</label>
              <input 
                id="email-address" 
                v-model="form.email" 
                name="email" 
                type="email" 
                autocomplete="email" 
                required 
                class="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-all" 
                placeholder="name@company.com"
              >
            </div>

            <!-- Password -->
            <div>
              <label for="password" class="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input 
                id="password" 
                v-model="form.password" 
                name="password" 
                type="password" 
                autocomplete="current-password" 
                required 
                class="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-all" 
                placeholder="••••••••"
              >
            </div>
          </div>

          <div v-if="error" class="rounded-lg bg-red-50 p-4 border border-red-100 flex items-center gap-3">
            <Icon name="lucide:alert-circle" class="w-5 h-5 text-red-500 flex-shrink-0" />
            <span class="text-sm text-red-700 font-medium">{{ error }}</span>
          </div>

          <div>
            <button 
              type="submit" 
              :disabled="loading"
              class="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-teal-500/30 hover:-translate-y-0.5"
            >
              <span v-if="loading" class="flex items-center gap-2">
                <Icon name="lucide:loader-2" class="animate-spin h-5 w-5 text-white" />
                Creating Account...
              </span>
              <span v-else>Register & Create Tenant</span>
            </button>
          </div>
          
          <div class="text-center text-sm text-slate-500">
            Already have an account? <NuxtLink to="/login" class="font-medium text-teal-600 hover:text-teal-500 hover:underline">Log in</NuxtLink>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-blob {
  animation: blob 10s infinite alternate;
}
.animation-delay-2000 {
  animation-delay: 2s;
}

@keyframes blob {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(20px, -20px) scale(1.1); }
  100% { transform: translate(-20px, 20px) scale(0.9); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}


@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.4s ease-out forwards;
}
</style>
