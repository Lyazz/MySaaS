<script setup lang="ts">
import { ref, computed } from 'vue'
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

const btnRef = ref<any>(null)
const openDropdown = () => {
  query.value = ''
  if (btnRef.value) {
    const el = btnRef.value.$el || btnRef.value
    if (el && typeof el.click === 'function') {
      // Small delay to ensure focus doesn't steal the click effect, though click() on button is usually synchronous
      setTimeout(() => el.click(), 10)
    }
  }
}

const handleUpdate = (val: any) => {
  emit('update:modelValue', val?.value || '')
}
</script>

<template>
  <Combobox :modelValue="selectedOption" @update:modelValue="handleUpdate" :disabled="disabled">
    <div class="relative w-full">
      <div class="relative w-full">
        <ComboboxInput
          :class="[inputClass, 'w-full pr-10 truncate rtl:pr-4 rtl:pl-10']"
          :displayValue="(option: any) => option?.label || ''"
          :placeholder="placeholder"
          @change="query = $event.target.value"
          @focus="openDropdown"
          @click="openDropdown"
        />
        <ComboboxButton
          ref="btnRef"
          class="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 flex items-center pr-4 rtl:pr-0 rtl:pl-4"
        >
          <Icon name="lucide:chevron-down" class="h-4 w-4 text-slate-500" aria-hidden="true" />
        </ComboboxButton>
      </div>
      <transition
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
        @after-leave="query = ''"
      >
        <ComboboxOptions
          v-if="!disabled"
          class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm border border-slate-100"
        >
          <div v-if="filteredOptions.length === 0 && query !== ''" class="relative cursor-default select-none py-2 px-4 text-slate-700">
            Aucun résultat.
          </div>

          <ComboboxOption
            v-for="option in filteredOptions"
            :key="option.value"
            :value="option"
            v-slot="{ selected, active }"
          >
            <li
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
            </li>
          </ComboboxOption>
        </ComboboxOptions>
      </transition>
    </div>
  </Combobox>
</template>
