<script setup lang="ts">
const tenant = useState<any>('tenant')
const storeSettings = useState<any>('storeSettings')
</script>

<template>
  <div class="min-h-[80vh] px-4 py-12">
    <div class="max-w-4xl mx-auto text-center">
        
        <div class="mb-12 relative inline-block">
            <div class="absolute inset-0 bg-brand-100 rounded-full filter blur-xl opacity-50"></div>
            <h1 class="relative font-cozy font-black text-6xl md:text-8xl text-slate-800 mb-4 tracking-tight">
                Our Story
            </h1>
        </div>

        <div class="bg-white p-8 md:p-16 rounded-[4rem] shadow-soft mb-16 relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-200 via-brand-100 to-brand-200"></div>
            
            <p class="font-medium text-lg md:text-xl text-slate-600 leading-loose mb-8">
                {{ storeSettings?.description || 'We believe in slow living. In quality over quantity. In products that feel good to hold and even better to use. Every item is curated to bring a sense of calm to your daily ritual.' }}
            </p>
            
            <div class="w-24 h-24 rounded-full bg-slate-100 mx-auto mb-4 overflow-hidden">
                 <img src="https://placehold.co/200x200/e2e8f0/94a3b8?text=Founders" class="w-full h-full object-cover grayscale opacity-80" />
            </div>
            <p class="font-bold text-slate-400 text-sm uppercase tracking-widest">The Founders</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="bg-brand-50 p-8 rounded-[3rem] text-center hover:shadow-soft transition-all">
                <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-brand-500 shadow-sm">
                    <Icon name="lucide:leaf" class="w-8 h-8" />
                </div>
                <h3 class="font-bold text-slate-700 mb-2">Sustainable</h3>
                <p class="text-sm text-slate-500">Earth-friendly materials only.</p>
            </div>
            
            <div class="bg-brand-50 p-8 rounded-[3rem] text-center hover:shadow-soft transition-all transform md:-translate-y-4">
                 <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-brand-500 shadow-sm">
                    <Icon name="lucide:heart" class="w-8 h-8" />
                </div>
                <h3 class="font-bold text-slate-700 mb-2">Ethical</h3>
                <p class="text-sm text-slate-500">Fair wages for fair work.</p>
            </div>

            <div class="bg-brand-50 p-8 rounded-[3rem] text-center hover:shadow-soft transition-all">
                 <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-brand-500 shadow-sm">
                    <Icon name="lucide:smile" class="w-8 h-8" />
                </div>
                <h3 class="font-bold text-slate-700 mb-2">Joyful</h3>
                <p class="text-sm text-slate-500">Sparking joy in every package.</p>
            </div>
        </div>

    </div>
  </div>
</template>
