<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <footer class="bg-white border-t border-slate-200 mt-auto">
    <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div class="col-span-1 md:col-span-2">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-6 h-6 rounded bg-teal-600 flex items-center justify-center text-white">
              <Icon name="lucide:store" class="w-3 h-3" />
            </div>
            <span class="text-xl font-sans font-bold text-slate-900">Swekly</span>
          </div>
          <p class="text-slate-500 text-sm leading-relaxed max-w-xs">
            {{ t('marketing.footer.tagline') }}
          </p>
        </div>

        <div>
          <h3 class="text-sm font-semibold text-slate-900 tracking-wider uppercase mb-4">
            {{ t('marketing.footer.product.title') }}
          </h3>
          <ul class="space-y-3">
            <li>
              <NuxtLink
                to="/features"
                class="text-sm text-slate-500 hover:text-teal-600 transition-colors"
              >
                {{ t('marketing.nav.features') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/pricing"
                class="text-sm text-slate-500 hover:text-teal-600 transition-colors"
              >
                {{ t('marketing.nav.pricing') }}
              </NuxtLink>
            </li>
            <li>
              <a
                href="#"
                class="text-sm text-slate-500 hover:text-teal-600 transition-colors"
              >
                {{ t('marketing.footer.product.changelog') }}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 class="text-sm font-semibold text-slate-900 tracking-wider uppercase mb-4">
            {{ t('marketing.footer.support.title') }}
          </h3>
          <ul class="space-y-3">
            <li>
              <a
                href="#"
                class="text-sm text-slate-500 hover:text-teal-600 transition-colors"
              >
                {{ t('marketing.footer.support.documentation') }}
              </a>
            </li>
            <li>
              <a
                href="#"
                class="text-sm text-slate-500 hover:text-teal-600 transition-colors"
              >
                {{ t('marketing.footer.support.apiStatus') }}
              </a>
            </li>
            <li>
              <NuxtLink
                to="/contact"
                class="text-sm text-slate-500 hover:text-teal-600 transition-colors"
              >
                {{ t('marketing.footer.support.contact') }}
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>

      <div class="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <p class="text-center text-sm text-slate-400">
          {{ t('marketing.footer.copyright', { year: new Date().getFullYear() }) }}
        </p>
      </div>
    </div>
  </footer>
</template>

