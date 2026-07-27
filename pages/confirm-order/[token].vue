<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center space-y-6">
      <template v-if="status === 'loading'">
        <Icon name="lucide:loader" class="w-12 h-12 text-brand animate-spin mx-auto" />
        <h1 class="text-xl font-semibold text-gray-900">
          Validation de votre commande...
        </h1>
        <p class="text-gray-500">Veuillez patienter un instant.</p>
      </template>

      <template v-else-if="status === 'success'">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="lucide:check" class="w-8 h-8 text-green-600" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900">
          Commande confirmée !
        </h1>
        <p class="text-gray-600">
          Merci ! Votre commande a été confirmée avec succès.
        </p>
      </template>

      <template v-else-if="status === 'error'">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="lucide:x" class="w-8 h-8 text-red-600" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900">
          Lien invalide ou expiré
        </h1>
        <p class="text-gray-600">
          Ce lien de confirmation n'est plus valide ou a déjà été utilisé.
        </p>
        <NuxtLink to="/" class="inline-block mt-4 px-6 py-2 bg-brand text-white rounded-lg hover:opacity-90 transition-opacity">
          Retour à la boutique
        </NuxtLink>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const token = route.params.token as string

const status = ref<'loading' | 'success' | 'error'>('loading')
const orderPublicId = ref<string | null>(null)
const orderInternalId = ref<string | null>(null)

onMounted(async () => {
  if (!token) {
    status.value = 'error'
    return
  }

  try {
    const res: any = await $fetch('/api/orders/confirm', {
      method: 'POST',
      body: { token }
    })
    
    if (res && res.success) {
      status.value = 'success'
      orderPublicId.value = res.publicOrderId
      orderInternalId.value = res.orderId
      
      // Redirect to order-success after a short delay
      setTimeout(() => {
        router.push(`/order-success?orderId=${orderInternalId.value}&publicOrderId=${orderPublicId.value}`)
      }, 2000)
    } else {
      status.value = 'error'
    }
  } catch (err) {
    status.value = 'error'
  }
})

definePageMeta({
  layout: 'store',
  title: 'Confirmation de commande'
})
</script>
