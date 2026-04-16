<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
const storefrontContent = useStorefrontContent()

const form = reactive({
  name: '',
  email: '',
  message: ''
})

const submitForm = () => {
  alert('Votre message a été envoyé. Nous vous répondrons dans les plus brefs délais.')
}
</script>

<template>
  <div class="min-h-[80vh] py-12 md:py-16">
    <div class="max-w-5xl mx-auto px-6">
      <!-- Header -->
      <div class="mb-12 text-center">
        <p class="text-[10px] tracking-[0.3em] uppercase text-[#C17B4E] mb-3">Nous contacter</p>
        <h1 class="font-maison-serif text-4xl md:text-5xl font-semibold text-[#2C2420]">{{ storefrontContent.nav.contact }}</h1>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 border border-[#E8E0D4] overflow-hidden">
        <!-- Info side -->
        <div class="bg-[#2C2420] p-10 md:p-14 flex flex-col justify-between">
          <div>
            <h2 class="font-maison-serif text-2xl md:text-3xl text-white mb-4">Prenons contact</h2>
            <p class="text-[#A09080] text-sm leading-relaxed mb-10">
              Vous avez une question sur un produit, une commande ou vous souhaitez simplement nous dire bonjour ?
              Nous sommes là pour vous.
            </p>

            <div class="space-y-5">
              <div class="flex items-center gap-4">
                <div class="w-9 h-9 bg-[#C17B4E]/20 flex items-center justify-center shrink-0">
                  <Icon name="lucide:map-pin" class="w-4 h-4 text-[#C17B4E]" />
                </div>
                <span class="text-sm text-[#D4C4B4]">Algérie</span>
              </div>
              <div class="flex items-center gap-4">
                <div class="w-9 h-9 bg-[#C17B4E]/20 flex items-center justify-center shrink-0">
                  <Icon name="lucide:mail" class="w-4 h-4 text-[#C17B4E]" />
                </div>
                <span class="text-sm text-[#D4C4B4]">contact@maison.dz</span>
              </div>
            </div>
          </div>

          <div class="mt-10">
            <p class="text-[10px] tracking-[0.2em] uppercase text-[#6A5A50]">Maison — Art de vivre</p>
          </div>
        </div>

        <!-- Form side -->
        <div class="bg-white p-10 md:p-14">
          <form class="space-y-6" @submit.prevent="submitForm">
            <div>
              <label class="block text-xs tracking-[0.15em] uppercase text-[#7A6558] mb-2">Nom complet</label>
              <input
                v-model="form.name"
                type="text"
                placeholder="Votre nom"
                class="w-full border border-[#E8E0D4] bg-[#FAF8F5] py-3 px-4 text-sm text-[#2C2420] placeholder:text-[#B0A090] focus:border-[#C17B4E] focus:ring-1 focus:ring-[#C17B4E]/20 outline-none transition-colors"
              >
            </div>

            <div>
              <label class="block text-xs tracking-[0.15em] uppercase text-[#7A6558] mb-2">Email</label>
              <input
                v-model="form.email"
                type="email"
                placeholder="votre@email.com"
                class="w-full border border-[#E8E0D4] bg-[#FAF8F5] py-3 px-4 text-sm text-[#2C2420] placeholder:text-[#B0A090] focus:border-[#C17B4E] focus:ring-1 focus:ring-[#C17B4E]/20 outline-none transition-colors"
              >
            </div>

            <div>
              <label class="block text-xs tracking-[0.15em] uppercase text-[#7A6558] mb-2">Message</label>
              <textarea
                v-model="form.message"
                rows="5"
                placeholder="Votre message..."
                class="w-full border border-[#E8E0D4] bg-[#FAF8F5] py-3 px-4 text-sm text-[#2C2420] placeholder:text-[#B0A090] focus:border-[#C17B4E] focus:ring-1 focus:ring-[#C17B4E]/20 outline-none transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              class="w-full py-4 bg-[#2C2420] text-white text-xs tracking-[0.2em] uppercase hover:bg-[#C17B4E] transition-all"
            >
              Envoyer le message
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
