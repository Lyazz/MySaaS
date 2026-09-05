<template>
  <div class="divide-y divide-white/5 border-y border-white/5">
    <Disclosure
      v-for="(item, i) in items"
      :key="i"
      v-slot="{ open }"
      as="div"
    >
      <DisclosureButton class="group flex w-full items-center justify-between py-6 text-start">
        <span class="text-base md:text-lg font-medium text-white pe-6">{{ item.q }}</span>
        <span
          class="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[color:var(--m-text-dim)] transition-all group-hover:border-lime-neon/40 group-hover:text-lime-neon"
          :class="open ? 'border-lime-neon/60 text-lime-neon rotate-45' : ''"
        >
          <Icon name="lucide:plus" class="h-4 w-4" />
        </span>
      </DisclosureButton>
      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <DisclosurePanel class="pb-6 pr-12 text-[15px] leading-relaxed text-[color:var(--m-text-dim)]">
          {{ item.a }}
        </DisclosurePanel>
      </transition>
    </Disclosure>
  </div>
</template>

<script setup lang="ts">
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'

defineProps<{
  items: Array<{ q: string; a: string }>
}>()
</script>
