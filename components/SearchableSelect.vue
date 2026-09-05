<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/vue'

const props = defineProps<{
  modelValue: string | number
  options: { value: string | number; label: string }[]
  placeholder?: string
  disabled?: boolean
  inputClass?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
}>()

// Fallbacks keep the component mountable outside a full Nuxt app (unit tests).
const FALLBACK: Record<string, string> = {
  'storefront.actions.search': 'Search',
  'admin.common.noResults': 'No results',
}
let translate = (key: string) => FALLBACK[key] || key
try {
  const { t: i18nT } = useI18n()
  translate = (key: string) => String(i18nT(key) || FALLBACK[key] || key)
} catch {
  /* no i18n instance — use the fallbacks */
}
const t = translate

const query = ref('')

const filteredOptions = computed(() => {
  const opts = props.options || []
  if (query.value === '') return opts
  const q = query.value.toLowerCase().replace(/\s+/g, '')
  return opts.filter((option) =>
    (option.label || '').toLowerCase().replace(/\s+/g, '').includes(q)
  )
})

const selectedOption = computed(() => {
  const opts = props.options || []
  return opts.find((o) => String(o.value) === String(props.modelValue)) || null
})

// The field itself is a button, not a text box: one tap opens the panel and the
// whole list is readable straight away. Searching is the second step, offered by
// the box at the top of the panel.
//
// Headless UI always moves focus to its ComboboxInput when the trigger opens, so
// on touch devices that input stays read-only — it takes focus (keeping arrow
// keys and Escape working) without raising the on-screen keyboard over the
// options. Tapping it unlocks typing. On a mouse/keyboard device there is no
// keyboard to hide, so it opens unlocked and you can type right away.
const inputRef = ref<any>(null)
const searchLocked = ref(true)

const isTouch = () =>
  typeof window === 'undefined' || !window.matchMedia
    ? true
    : window.matchMedia('(pointer: coarse)').matches

const onTriggerClick = () => {
  query.value = ''
  searchLocked.value = isTouch()
}

const unlockSearch = () => {
  if (props.disabled || !searchLocked.value) return
  searchLocked.value = false
  // Re-focus inside the same gesture so the keyboard actually comes up.
  nextTick(() => {
    const el = inputRef.value?.$el || inputRef.value
    el?.focus?.()
  })
}

const resetPanel = () => {
  query.value = ''
  searchLocked.value = true
}

const handleUpdate = (val: any) => {
  emit('update:modelValue', val?.value || '')
}
</script>

<template>
  <Combobox
    :modelValue="selectedOption"
    @update:modelValue="handleUpdate"
    :disabled="disabled"
    v-slot="{ open }"
  >
    <div class="relative w-full">
      <ComboboxButton
        :class="[inputClass, 'w-full flex items-center gap-2 text-start disabled:cursor-not-allowed']"
        @click="onTriggerClick"
      >
        <span class="flex-1 truncate" :class="{ 'opacity-60': !selectedOption }">
          {{ selectedOption?.label || placeholder }}
        </span>
        <Icon name="lucide:chevron-down" class="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      </ComboboxButton>

      <transition
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
        @after-leave="resetPanel"
      >
        <div
          v-if="open && !disabled"
          class="absolute z-50 mt-1 w-full overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5 border border-slate-100"
        >
          <ComboboxOptions
            static
            as="div"
            class="max-h-60 overflow-auto py-1 text-base focus:outline-none sm:text-sm"
          >
            <!-- Lives inside the options element on purpose: Headless UI closes
                 the panel on any pointer press outside it. -->
            <div
              role="none"
              class="sticky top-0 z-10 -mt-1 mb-1 border-b border-slate-100 bg-white px-2 py-2"
              @mousedown.stop.prevent
              @click="unlockSearch"
            >
              <ComboboxInput
                ref="inputRef"
                role="searchbox"
                :readonly="searchLocked"
                :placeholder="t('storefront.actions.search')"
                :displayValue="() => ''"
                class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                @input="query = ($event.target as HTMLInputElement).value"
                @mousedown.stop
                @click.stop="unlockSearch"
              />
            </div>

            <div
              v-if="filteredOptions.length === 0 && query !== ''"
              class="relative cursor-default select-none py-2 px-4 text-slate-700"
            >
              {{ t('admin.common.noResults') }}
            </div>

            <ComboboxOption
              v-for="option in filteredOptions"
              :key="option.value"
              :value="option"
              as="template"
              v-slot="{ selected, active }"
            >
              <div
                class="relative cursor-pointer select-none py-2.5 px-4"
                :class="{
                  'bg-brand-50 text-brand-900': active,
                  'text-slate-700': !active,
                }"
              >
                <span
                  class="block truncate"
                  :class="{ 'font-semibold text-brand-700': selected, 'font-medium': !selected }"
                >
                  {{ option.label }}
                </span>
              </div>
            </ComboboxOption>
          </ComboboxOptions>
        </div>
      </transition>
    </div>
  </Combobox>
</template>
