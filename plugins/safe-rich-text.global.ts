import SafeRichText from '~/components/common/SafeRichText.vue'

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.component('SafeRichText', SafeRichText)
})

