<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })

const form = reactive({
    name: '',
    email: '',
    message: ''
})

const submitForm = () => {
    alert(t('storefront.templates.cozy.contact.alert.sentWithLove'))
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-16">
    <div class="bg-white rounded-[4rem] shadow-soft overflow-hidden grid grid-cols-1 md:grid-cols-2">
        
        <!-- Info Side -->
        <div class="bg-brand-500 p-12 md:p-16 text-white flex flex-col justify-center relative overflow-hidden">
            <div class="absolute -top-24 -end-24 w-64 h-64 bg-brand-400 rounded-full opacity-50"></div>
            <div class="absolute -bottom-24 -start-24 w-64 h-64 bg-brand-600 rounded-full opacity-50"></div>
            
            <div class="relative z-10">
                <h1 class="font-cozy font-black text-5xl mb-6 leading-tight">{{ t('storefront.templates.cozy.contact.heading') }}</h1>
                <p class="text-brand-100 text-lg mb-12 font-medium">{{ t('storefront.templates.cozy.contact.subtitle') }}</p>
                
                <div class="space-y-6">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Icon name="lucide:map-pin" class="w-5 h-5" />
                        </div>
                        <span class="font-bold">123 Serenity Lane, Cloud City</span>
                    </div>
                    <div class="flex items-center gap-4">
                         <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Icon name="lucide:mail" class="w-5 h-5" />
                        </div>
                        <span class="font-bold">hello@cozy.store</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Form Side -->
        <div class="p-12 md:p-16 bg-white">
            <form @submit.prevent="submitForm" class="space-y-6">
                <div>
                    <label class="block text-sm font-bold text-slate-500 mb-2 ms-4">{{ t('storefront.templates.cozy.contact.form.nameLabel') }}</label>
                    <input 
                        v-model="form.name"
                        type="text" 
                        class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-2 focus:ring-brand-200 focus:bg-white transition-all outline-none"
                    >
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-500 mb-2 ms-4">{{ t('storefront.templates.cozy.contact.form.emailLabel') }}</label>
                    <input 
                        v-model="form.email"
                        type="email" 
                        class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-2 focus:ring-brand-200 focus:bg-white transition-all outline-none"
                    >
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-500 mb-2 ms-4">{{ t('storefront.templates.cozy.contact.form.messageLabel') }}</label>
                    <textarea 
                        v-model="form.message"
                        rows="4"
                        class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-2 focus:ring-brand-200 focus:bg-white transition-all outline-none resize-none"
                    ></textarea>
                </div>

                <button 
                    type="submit"
                    class="w-full bg-slate-800 text-white font-bold py-4 rounded-full shadow-lg hover:shadow-xl hover:bg-brand-500 hover:-translate-y-1 transition-all duration-300"
                >
                    {{ t('storefront.templates.cozy.contact.form.sendMessage') }}
                </button>
            </form>
        </div>

    </div>
  </div>
</template>
