<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })

const form = reactive({
    name: '',
    email: '',
    message: ''
})

const submitForm = () => {
    alert(t('storefront.templates.street.contact.alert.sent'))
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-24 items-start grid grid-cols-1 lg:grid-cols-2 gap-16">
    
    <!-- Info Section -->
    <div>
        <h1 class="font-street text-7xl md:text-8xl w-full mb-12 uppercase leading-none bg-black text-white p-4 shadow-[12px_12px_0_0_var(--brand)] inline-block">
            {{ t('storefront.templates.street.contact.titlePrefix') }}<br>{{ t('storefront.templates.street.contact.titleAccent') }}
        </h1>
        
        <div class="space-y-12 font-mono text-lg uppercase pl-4 border-l-4 border-brand">
            <div>
                <h3 class="font-bold mb-2 text-gray-400 text-xs">{{ t('storefront.templates.street.contact.sections.hqLocation') }}</h3>
                <p class="text-2xl font-bold">123 Street Ave,<br>Concrete Jungle, NY</p>
            </div>
            <div>
                <h3 class="font-bold mb-2 text-gray-400 text-xs">{{ t('storefront.templates.street.contact.sections.directLine') }}</h3>
                <p class="text-2xl font-bold hover:bg-brand hover:text-black inline-block px-1">+1 (555) 000-0000</p>
            </div>
            <div>
                <h3 class="font-bold mb-2 text-gray-400 text-xs">{{ t('storefront.templates.street.contact.sections.emailProtocol') }}</h3>
                <p class="text-2xl font-bold hover:bg-brand hover:text-black inline-block px-1">contact@street.store</p>
            </div>
        </div>
    </div>

    <!-- Contact Form -->
    <div class="bg-gray-100 p-8 md:p-12 border-4 border-black shadow-[16px_16px_0_0_#000]">
        <form @submit.prevent="submitForm" class="space-y-8">
            <div>
                <label class="block font-street text-2xl uppercase mb-2">{{ t('storefront.templates.street.contact.form.name.label') }}</label>
                <input 
                    v-model="form.name"
                    type="text" 
                    :placeholder="t('storefront.templates.street.contact.form.name.placeholder')"
                    class="w-full bg-white border-2 border-black p-4 font-mono text-lg focus:outline-none focus:shadow-[4px_4px_0_0_var(--brand)] placeholder:text-gray-400"
                >
            </div>

            <div>
                <label class="block font-street text-2xl uppercase mb-2">{{ t('storefront.templates.street.contact.form.email.label') }}</label>
                <input 
                    v-model="form.email"
                    type="email" 
                    :placeholder="t('storefront.templates.street.contact.form.email.placeholder')"
                    class="w-full bg-white border-2 border-black p-4 font-mono text-lg focus:outline-none focus:shadow-[4px_4px_0_0_var(--brand)] placeholder:text-gray-400"
                >
            </div>

            <div>
                <label class="block font-street text-2xl uppercase mb-2">{{ t('storefront.templates.street.contact.form.message.label') }}</label>
                <textarea 
                    v-model="form.message"
                    rows="4"
                    :placeholder="t('storefront.templates.street.contact.form.message.placeholder')"
                    class="w-full bg-white border-2 border-black p-4 font-mono text-lg focus:outline-none focus:shadow-[4px_4px_0_0_var(--brand)] placeholder:text-gray-400 resize-none"
                ></textarea>
            </div>

            <button 
                type="submit"
                class="w-full bg-black text-white font-street text-3xl uppercase py-4 border-2 border-transparent hover:bg-brand hover:text-black hover:border-black transition-colors"
            >
                {{ t('storefront.templates.street.contact.form.send') }}
            </button>
        </form>
    </div>

  </div>
</template>
