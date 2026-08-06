<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps({
  error: Object as () => NuxtError
})

const { t } = useI18n({ useScope: 'global' })

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans text-slate-600">
    <div class="max-w-md w-full text-center">
      <div class="mb-8 relative flex justify-center">
        <!-- Background blob/glow effect -->
         <div class="absolute inset-0 bg-lime-500/10 rounded-full blur-3xl transform scale-150"></div>
        
        <!-- Icon container -->
        <div class="relative w-24 h-24 bg-white rounded-2xl shadow-soft flex items-center justify-center border border-slate-100">
           <Icon name="lucide:alert-circle" class="w-12 h-12 text-lime-600" />
        </div>
      </div>

      <h1 class="text-6xl font-bold text-slate-900 mb-2 tracking-tight">
        {{ error?.statusCode || 404 }}
      </h1>
      <h2 class="text-2xl font-bold text-slate-800 mb-4">
        {{ error?.statusCode === 404 ? t('common.errorPage.notFound.title') : t('common.errorPage.generic.title') }}
      </h2>
      
      <p class="text-slate-500 mb-8 leading-relaxed">
        {{ error?.statusCode === 404 ? t('common.errorPage.notFound.message') : t('common.errorPage.generic.message') }}
      </p>
      
      <button 
        @click="handleError"
        class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-lime-600 hover:bg-lime-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-500 transition-all duration-200 gap-2"
      >
        <Icon name="lucide:arrow-left" class="w-4 h-4" />
        {{ t('common.errorPage.actions.backHome') }}
      </button>
      
      <div v-if="error?.statusCode !== 404" class="mt-8 p-4 bg-red-50 rounded-lg border border-red-100 text-start">
          <p class="text-xs font-mono text-red-600 break-all">
              {{ t('common.errorPage.details') }}: {{ error?.message }}
          </p>
      </div>

    </div>
  </div>
</template>
