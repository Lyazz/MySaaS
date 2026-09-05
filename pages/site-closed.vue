<script setup lang="ts">
import SaaSLogo from '~/components/branding/SaaSLogo.vue'

const { t } = useI18n({ useScope: 'global' })

definePageMeta({
  layout: false,
  title: 'Swekly'
})
</script>

<template>
  <div class="marketing-shell marketing-shell--cinematic flex min-h-screen flex-col items-center justify-center px-4 py-16">
    <div class="relative z-10 w-full max-w-xl">
      <div class="cinematic-card relative overflow-hidden p-8 text-center md:p-12">
        <div class="absolute inset-0 cinematic-grid-bg opacity-40" />
        <div class="relative">
          <div class="mb-6 flex justify-center">
            <SaaSLogo size="sm" />
          </div>

          <div class="mx-auto mt-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
            <Icon name="lucide:lock" class="h-6 w-6 text-lime-neon" />
          </div>

          <h1 class="cinematic-headline mt-6 !text-3xl md:!text-4xl">
            {{ t('common.siteClosed.title') }}
          </h1>

          <div class="mt-8 text-sm text-[color:var(--m-text-dim)]">
            {{ t('common.siteClosed.haveAccount') }}
            <NuxtLink to="/login" class="font-medium text-lime-neon hover:underline">
              {{ t('common.siteClosed.logIn') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
