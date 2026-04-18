<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h3 class="text-[15px] font-semibold" style="color: var(--text-primary)">
        {{ t('admin.productOptionsEditor.title') }}
      </h3>
    </div>

    <div class="space-y-4">
        <!-- Existing Options List -->
        <div 
            v-for="(option, index) in options" 
            :key="option.id"
            class="rounded-xl p-4 relative group overflow-hidden" style="background: var(--surface-1); border: 1px solid var(--surface-border)"
        >
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 pr-8">
                <!-- Option Name & Display Type -->
                <div class="md:col-span-4 space-y-3">
                    <div>
                        <label class="ui-label">{{ t('admin.productOptionsEditor.fields.optionName') }}</label>
                        <input 
                            type="text" 
                            v-model="option.name"
                            class="ui-input"
                            @change="updateOption(option)"
                            :placeholder="t('admin.productOptionsEditor.fields.optionNamePlaceholder')"
                        >
                    </div>
                    <div>
                        <label class="ui-label">{{ t('admin.productOptionsEditor.fields.displayType') }}</label>
                        <BaseSelect
                            v-model="option.displayType"
                            @change="updateOption(option)"
                        >
                            <option value="dropdown">{{ t('admin.productOptionsEditor.displayTypes.dropdown') }}</option>
                            <option value="button">{{ t('admin.productOptionsEditor.displayTypes.button') }}</option>
                            <option value="radio">{{ t('admin.productOptionsEditor.displayTypes.radio') }}</option>
                            <option value="color">{{ t('admin.productOptionsEditor.displayTypes.color') }}</option>
                            <option value="image">{{ t('admin.productOptionsEditor.displayTypes.image') }}</option>
                        </BaseSelect>
                        <p class="mt-2 text-xs font-medium" style="color: var(--text-tertiary)">{{ t('admin.productOptionsEditor.preview.title') }}</p>
                        <div
                            class="mt-1 p-3 rounded-lg" style="background: var(--surface-2); border: 1px solid var(--surface-border)"
                            :data-testid="`option-preview-${option.id}`"
                        >
                             <!-- Dropdown Preview -->
                            <div v-if="option.displayType === 'dropdown'" class="relative max-w-xs">
                                <select
                                    disabled
                                    class="ui-input h-9 pr-8 appearance-none text-sm"
                                >
                                    <option
                                        v-for="v in previewValuesForOption(option, { max: 6, min: 1 })"
                                        :key="v.id"
                                        :value="v.id"
                                    >
                                        {{ v.label }}
                                    </option>
                                </select>
                                <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Icon name="lucide:chevron-down" class="w-4 h-4" style="color: var(--text-tertiary)" />
                                </div>
                            </div>
                            
                            <!-- Button Preview -->
                            <div v-else-if="option.displayType === 'button'" class="flex flex-wrap gap-2">
                                <div
                                    v-for="(v, i) in previewValuesForOption(option, { max: 2, min: 2 })"
                                    :key="v.id"
                                    class="px-3 py-1.5 rounded-md text-sm font-medium border"
                                    :style="i === 0 ? 'background: var(--brand); color: #fff; border-color: var(--brand)' : 'background: var(--surface-3); color: var(--text-secondary); border-color: var(--surface-border)'"
                                >
                                    {{ v.label }}
                                </div>
                            </div>

                            <!-- Radio Preview -->
                            <div v-else-if="option.displayType === 'radio'" class="space-y-2">
                                <div
                                    v-for="(v, i) in previewValuesForOption(option, { max: 2, min: 2 })"
                                    :key="v.id"
                                    class="flex items-center"
                                >
                                    <div
                                        class="w-4 h-4 rounded-full border flex items-center justify-center"
                                        :style="i === 0 ? 'border-color: var(--brand)' : 'border-color: var(--surface-border)'"
                                    >
                                        <div v-if="i === 0" class="w-2 h-2 rounded-full bg-teal-600"></div>
                                    </div>
                                    <span
                                        class="ml-2 text-sm"
                                        :style="i === 0 ? 'color: var(--text-primary); font-weight: 500' : 'color: var(--text-secondary)'"
                                    >
                                        {{ v.label }}
                                    </span>
                                </div>
                            </div>

                             <!-- Color Preview -->
                            <div v-else-if="option.displayType === 'color'" class="flex flex-wrap gap-3">
                                <div
                                    v-for="(v, i) in previewValuesForOption(option, { max: 4, min: 2 })"
                                    :key="v.id"
                                    class="w-8 h-8 rounded-full flex items-center justify-center relative shadow-sm"
                                    :class="i === 0 ? 'ring-2 ring-offset-2 ring-teal-600' : 'ring-1 ring-black/5'"
                                    :style="{ backgroundColor: previewColor(v, i) }"
                                    :title="v.label"
                                >
                                    <Icon v-if="i === 0" name="lucide:check" class="w-4 h-4 text-white drop-shadow-sm" />
                                </div>
                            </div>

                             <!-- Image Preview -->
                            <div v-else-if="option.displayType === 'image'" class="flex flex-wrap gap-3">
                                <div
                                    v-for="(v, i) in previewValuesForOption(option, { max: 4, min: 2 })"
                                    :key="v.id"
                                    class="w-12 h-12 rounded-lg border-2 relative overflow-hidden"
                                    :style="i === 0 ? 'border-color: var(--brand); background: var(--surface-3)' : 'border-color: var(--surface-border); background: var(--surface-3)'"
                                    :title="v.label"
                                >
                                   <img v-if="v.meta" :src="v.meta" class="absolute inset-0 w-full h-full object-cover" />
                                   <div v-else class="absolute inset-0 flex items-center justify-center text-xs font-medium" style="color: var(--text-tertiary)">
                                       {{ v.label?.[0]?.toUpperCase() || t('admin.productOptionsEditor.preview.imageFallbackShort') }}
                                   </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Option Values (Chips) -->
                <div class="md:col-span-8 overflow-hidden">
                    <label class="block text-xs font-medium mb-1" style="color: var(--text-tertiary)">{{ t('admin.productOptionsEditor.fields.optionValues') }}</label>
                    <div
                        class="flex flex-wrap gap-2 p-2 rounded-md min-h-[42px] focus-within:ring-1 focus-within:ring-teal-500"
                        style="border: 1px solid var(--surface-border); background: var(--surface-2)"
                        @click="focusInput(index)"
                    >
                        <!-- Chips -->
                        <div 
                            v-for="value in option.values" 
                            :key="value.id"
                            class="inline-flex items-center gap-1.5 rounded px-2 py-1 text-sm" style="background: var(--surface-3); border: 1px solid var(--surface-border); color: var(--text-primary)"
                        >
                            <!-- Color Preview -->
                            <div 
                                v-if="option.displayType === 'color' && value.meta" 
                                class="w-4 h-4 rounded-full border border-black/10 shadow-sm shrink-0"
                                :style="{ backgroundColor: value.meta }"
                            ></div>
                             <!-- Image Preview -->
                             <img 
                                v-if="option.displayType === 'image' && value.meta" 
                                :src="value.meta"
                                class="w-5 h-5 rounded-sm object-cover border border-black/10 shrink-0"
                            />

                            <span class="truncate max-w-[120px]">{{ value.label }}</span>
                            
                            <!-- Meta Edit Trigger -->
                            <button 
                                v-if="['color', 'image'].includes(option.displayType)"
                                type="button"
                                class="shrink-0 hover:text-teal-400 focus:outline-none" style="color: var(--text-muted)"
                                :title="t('admin.productOptionsEditor.actions.editMetadata')"
                                @click.stop="editValueMeta(option, value)"
                            >
                                <Icon name="lucide:pencil" class="w-3.5 h-3.5" />
                            </button>

                            <button 
                                type="button"
                                class="shrink-0 hover:text-red-400 focus:outline-none" style="color: var(--text-muted)"
                                @click.stop="deleteValue(option, value)"
                            >
                                <Icon name="lucide:x" class="h-3 w-3" />
                            </button>
                        </div>

                        <!-- Input -->
                        <input 
                            :ref="el => setInputRef(el, index)"
                            v-model="newValues[option.id]"
                            type="text"
                            class="flex-1 min-w-[120px] border-none p-0 focus:ring-0 text-sm h-7 bg-transparent" style="color: var(--text-primary)"
                            :placeholder="t('admin.productOptionsEditor.fields.addValuePlaceholder')"
                            @keydown="handleValueKeydown($event, option)"
                            @blur="handleValueBlur(option)"
                        >
                    </div>
                </div>
            </div>

            <!-- Delete Option -->
            <button 
                type="button"
                class="absolute top-4 right-4 hover:text-red-400 p-1" style="color: var(--text-muted)"
                :title="t('admin.productOptionsEditor.actions.removeOption')"
                @click="requestDeleteOption(option)"
            >
                <Icon name="lucide:trash" class="w-5 h-5" />
            </button>
        </div>

        <!-- Add Another Option Button -->
        <div v-if="options.length < 3">
            <button
                v-if="!isCreatingOption"
                type="button"
                class="ui-btn ui-btn--secondary text-sm"
                @click="startCreatingOption"
            >
                <Icon name="lucide:plus" class="-ml-1 mr-2 h-5 w-5" style="color: var(--text-tertiary)" />
                {{ t('admin.productOptionsEditor.actions.addAnotherOption') }}
            </button>

            <!-- Inline Create form -->
            <div v-else class="rounded-lg p-4 ring-1 ring-teal-500/20" style="background: var(--surface-2); border: 1px solid rgba(var(--brand-rgb) / 0.4)">
                 <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div class="md:col-span-4 space-y-3">
                        <div>
                            <label class="ui-label">{{ t('admin.productOptionsEditor.fields.optionName') }}</label>
                            <input 
                                ref="newOptionNameRef"
                                type="text" 
                                v-model="newOptionName"
                                class="ui-input"
                                :placeholder="t('admin.productOptionsEditor.fields.newOptionNamePlaceholder')"
                                @keydown.enter="focusNewValues"
                            >
                        </div>
                         <div>
                            <label class="ui-label">{{ t('admin.productOptionsEditor.fields.displayType') }}</label>
                            <BaseSelect
                                v-model="newOptionType"
                            >
                                <option value="dropdown">{{ t('admin.productOptionsEditor.displayTypes.dropdown') }}</option>
                                <option value="button">{{ t('admin.productOptionsEditor.displayTypes.button') }}</option>
                                <option value="radio">{{ t('admin.productOptionsEditor.displayTypes.radio') }}</option>
                                <option value="color">{{ t('admin.productOptionsEditor.displayTypes.color') }}</option>
                                <option value="image">{{ t('admin.productOptionsEditor.displayTypes.image') }}</option>
                            </BaseSelect>
                            <p class="mt-1 text-xs font-medium" style="color: var(--text-tertiary)">{{ t('admin.productOptionsEditor.preview.title') }}</p>
                            <div class="mt-1 p-3 rounded-lg" style="border: 1px solid var(--surface-border); background: var(--surface-2)" data-testid="new-option-preview">
                                 <!-- Dropdown Preview -->
                                <div v-if="newOptionType === 'dropdown'" class="relative max-w-xs">
                                    <select
                                        disabled
                                        class="ui-input h-8 pr-8 appearance-none text-sm"
                                    >
                                        <option
                                            v-for="v in newOptionPreviewValues.slice(0, 6)"
                                            :key="v.id"
                                            :value="v.id"
                                        >
                                            {{ v.label }}
                                        </option>
                                    </select>
                                    <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Icon name="lucide:chevron-down" class="w-4 h-4" style="color: var(--text-tertiary)" />
                                    </div>
                                </div>
                                
                                <!-- Button Preview -->
                                <div v-else-if="newOptionType === 'button'" class="flex flex-wrap gap-2">
                                    <div
                                        v-for="(v, i) in newOptionPreviewValues.slice(0, 2)"
                                        :key="v.id"
                                        class="px-2 py-1 rounded text-xs font-medium border"
                                        :style="i === 0 ? 'background: var(--brand); color: #fff; border-color: var(--brand)' : 'background: var(--surface-3); color: var(--text-secondary); border-color: var(--surface-border)'"
                                    >
                                        {{ v.label }}
                                    </div>
                                </div>

                                <!-- Radio Preview -->
                                <div v-else-if="newOptionType === 'radio'" class="space-y-2">
                                    <div
                                        v-for="(v, i) in newOptionPreviewValues.slice(0, 2)"
                                        :key="v.id"
                                        class="flex items-center"
                                    >
                                        <span
                                            class="w-3 h-3 rounded-full border flex items-center justify-center"
                                            :style="i === 0 ? 'border-color: var(--brand)' : 'border-color: var(--surface-border)'"
                                        >
                                            <span v-if="i === 0" class="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                                        </span>
                                        <span class="ml-2 text-xs" :style="i === 0 ? 'color: var(--text-primary); font-weight: 500' : 'color: var(--text-secondary)'">
                                            {{ v.label }}
                                        </span>
                                    </div>
                                </div>

                                 <!-- Color Preview -->
                                <div v-else-if="newOptionType === 'color'" class="flex flex-wrap gap-2">
                                    <div
                                        v-for="(v, i) in newOptionPreviewValues.slice(0, 4)"
                                        :key="v.id"
                                        class="w-6 h-6 rounded-full flex items-center justify-center relative shadow-sm"
                                        :class="i === 0 ? 'ring-2 ring-offset-1 ring-teal-600' : 'ring-1 ring-black/5'"
                                        :style="{ backgroundColor: previewColor(v, i) }"
                                        :title="v.label"
                                    >
                                        <Icon v-if="i === 0" name="lucide:check" class="w-3 h-3 text-white" />
                                    </div>
                                </div>

                                 <!-- Image Preview -->
                                <div v-else-if="newOptionType === 'image'" class="flex flex-wrap gap-2">
                                    <div
                                        v-for="(v, i) in newOptionPreviewValues.slice(0, 4)"
                                        :key="v.id"
                                        class="w-8 h-8 rounded border-2 relative overflow-hidden"
                                        :style="i === 0 ? 'border-color: var(--brand); background: var(--surface-3)' : 'border-color: var(--surface-border); background: var(--surface-3)'"
                                        :title="v.label"
                                    >
                                        <div class="absolute inset-0 flex items-center justify-center text-[10px] font-medium" style="color: var(--text-tertiary)">
                                            {{ v.label?.[0]?.toUpperCase() || t('admin.productOptionsEditor.preview.imageFallbackShort') }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="md:col-span-8">
                         <label class="block text-xs font-medium mb-1" style="color: var(--text-tertiary)">{{ t('admin.productOptionsEditor.fields.optionValues') }}</label>
                         <input
                            ref="newOptionValuesRef"
                            type="text"
                            v-model="newOptionValues"
                            class="ui-input"
                            :placeholder="t('admin.productOptionsEditor.fields.optionValuesPlaceholder')"
                            @keydown.enter="createOption"
                        >
                        <p class="text-xs mt-1" style="color: var(--text-muted)">{{ t('admin.productOptionsEditor.fields.pressEnterToAdd') }}</p>
                    </div>
                 </div>
                 <div class="flex justify-end mt-3 gap-2">
                     <button type="button" class="text-xs px-2 py-1 hover:text-white transition-colors" style="color: var(--text-tertiary)" @click="cancelCreatingOption">{{ t('admin.common.cancel') }}</button>
                     <button type="button" class="text-xs bg-teal-600 text-white px-3 py-1 rounded hover:bg-teal-700" @click="createOption">{{ t('admin.productOptionsEditor.actions.done') }}</button>
                 </div>
            </div>
        </div>
        <div v-else class="text-center py-2 text-sm" style="color: var(--text-tertiary)">
            {{ t('admin.productOptionsEditor.maxOptions') }}
        </div>
    </div>

    <!-- Confirmation modal -->
    <AdminConfirmModal
      v-model="showOptionDeleteModal"
      :title="t('admin.productOptionsEditor.deleteModal.title')"
      :message="t('admin.productOptionsEditor.deleteModal.message')"
      :confirm-text="t('admin.common.delete')"
      :cancel-text="t('admin.common.cancel')"
      @confirm="deleteOptionConfirmed"
      @cancel="resetOptionDelete"
    />

    <!-- Edit Metadata Modal -->
    <TransitionRoot appear :show="isMetaModalOpen" as="template">
    <Dialog as="div" @close="closeMetaModal" class="relative z-50">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div
          class="flex min-h-full items-center justify-center p-4 text-center"
        >
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel
              class="w-full max-w-md transform overflow-hidden rounded-2xl p-6 text-left align-middle transition-all" style="background: var(--surface-2); border: 1px solid var(--surface-border); box-shadow: 0 24px 60px rgba(0,0,0,0.5)"
            >
              <DialogTitle
                as="h3"
                class="text-lg font-medium leading-6 mb-4" style="color: var(--text-primary)"
              >
                {{ t('admin.productOptionsEditor.metaModal.title', { type: editingMetaTypeLabel, label: editingValue?.label }) }}
              </DialogTitle>
              
              <div v-if="editingMetaType === 'color'" class="space-y-4">
                  <div>
                      <label class="ui-label mb-1">{{ t('admin.productOptionsEditor.metaModal.colorHex') }}</label>
                      <div class="flex gap-2">
                        <input type="color" v-model="editingMetaValue" class="h-10 w-10 p-0 border-0 rounded overflow-hidden cursor-pointer" />
                        <input 
                            type="text" 
                            v-model="editingMetaValue" 
                            class="ui-input flex-1"
                            placeholder="#000000"
                        />
                      </div>
                  </div>
              </div>

               <div v-if="editingMetaType === 'image'" class="space-y-4">
                  <div>
                      <label class="ui-label mb-1">{{ t('admin.productOptionsEditor.metaModal.imageUrl') }}</label>
                      <input 
                            type="text" 
                            v-model="editingMetaValue" 
                            class="ui-input"
                            placeholder="https://example.com/image.jpg"
                        />
                      <p class="text-xs mt-1" style="color: var(--text-muted)">{{ t('admin.productOptionsEditor.metaModal.imageUrlHint') }}</p>
                  </div>
                  <div v-if="editingMetaValue" class="mt-2">
                        <p class="text-xs font-medium mb-1" style="color: var(--text-tertiary)">{{ t('admin.productOptionsEditor.preview.title') }}</p>
                        <img :src="editingMetaValue" class="w-16 h-16 object-cover rounded" style="border: 1px solid var(--surface-border)" />
                  </div>
              </div>

              <div class="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  class="ui-btn ui-btn--secondary text-sm"
                  @click="closeMetaModal"
                >
                  {{ t('admin.common.cancel') }}
                </button>
                <button
                  type="button"
                  class="px-6 py-2 rounded-lg text-sm font-bold text-white shadow-lg shadow-teal-500/20 transition-all hover:shadow-teal-500/30 active:scale-95 flex items-center gap-2 bg-teal-600 hover:bg-teal-700"
                  @click="saveMeta"
                >
                  {{ t('admin.common.save') }}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
    </TransitionRoot>

  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseSelect from '~/components/ui/BaseSelect.vue'
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
    productId: string
    options: any[]
}>()

const emit = defineEmits(['refresh'])
const authStore = useAuthStore()

// State
const newValues = ref<Record<string, string>>({})
const inputRefs = ref<HTMLInputElement[]>([])

// Create Option State
const isCreatingOption = ref(false)
const newOptionName = ref('')
const newOptionType = ref('dropdown')
const newOptionValues = ref('')
const newOptionNameRef = ref<HTMLInputElement | null>(null)
const newOptionValuesRef = ref<HTMLInputElement | null>(null)

// Delete State
const showOptionDeleteModal = ref(false)
const optionToDelete = ref<any | null>(null)

// Meta Edit State
const isMetaModalOpen = ref(false)
const editingOption = ref<any>(null)
const editingValue = ref<any>(null)
const editingMetaType = ref<'color'|'image'>('color')
const editingMetaValue = ref('')

type PreviewValue = { id: string; label: string; meta?: string | null }

const PREVIEW_FALLBACK_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']
const previewFallbackLabel = (index: number) => t('admin.productOptionsEditor.preview.valueWithIndex', { index: index + 1 })

const editingMetaTypeLabel = computed(() =>
  editingMetaType.value === 'color'
    ? t('admin.productOptionsEditor.metaModal.types.color')
    : t('admin.productOptionsEditor.metaModal.types.image')
)

function previewValuesForOption(option: any, params: { max: number; min: number }): PreviewValue[] {
    const raw = Array.isArray(option?.values) ? option.values : []
    const normalized: PreviewValue[] = raw
        .slice(0, params.max)
        .map((v: any, i: number) => ({
            id: String(v?.id ?? `value-${i}`),
            label: String(v?.label ?? previewFallbackLabel(i)),
            meta: v?.meta
        }))

    while (normalized.length < params.min) {
        const i = normalized.length
        normalized.push({
            id: `placeholder-${i}`,
            label: previewFallbackLabel(i)
        })
    }

    return normalized
}

function previewColor(v: PreviewValue, index: number): string {
    return v.meta || PREVIEW_FALLBACK_COLORS[index % PREVIEW_FALLBACK_COLORS.length]
}

const newOptionPreviewValues = computed<PreviewValue[]>(() => {
    const labels = newOptionValues.value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 6)

    const normalized: PreviewValue[] = labels.map((label, i) => ({ id: `new-${i}`, label }))

    while (normalized.length < 2) {
        const i = normalized.length
        normalized.push({
            id: `placeholder-new-${i}`,
            label: previewFallbackLabel(i)
        })
    }

    return normalized
})

// --- Meta Management ---
function editValueMeta(option: any, value: any) {
    editingOption.value = option
    editingValue.value = value
    editingMetaType.value = option.displayType === 'image' ? 'image' : 'color'
    editingMetaValue.value = value.meta || (editingMetaType.value === 'color' ? '#000000' : '')
    isMetaModalOpen.value = true
}

function closeMetaModal() {
    isMetaModalOpen.value = false
    editingOption.value = null
    editingValue.value = null
    editingMetaValue.value = ''
}

async function saveMeta() {
    if (!editingOption.value || !editingValue.value) return

    try {
        await $fetch(`/api/admin/products/${props.productId}/options/${editingOption.value.id}/values/${editingValue.value.id}`, {
             method: 'PUT',
            headers: { Authorization: `Bearer ${authStore.token}` },
            body: { 
                label: editingValue.value.label,
                meta: editingMetaValue.value
            }
        })
        emit('refresh')
        closeMetaModal()
    } catch (e) {
        console.error('Failed to update value meta', e)
    }
}


// --- Inline Values Management ---

const setInputRef = (el: any, index: number) => {
    if (el) inputRefs.value[index] = el
}

const focusInput = (index: number) => {
    inputRefs.value[index]?.focus()
}

const handleValueKeydown = async (e: KeyboardEvent, option: any) => {
    const val = newValues.value[option.id]?.trim()
    
    if ((e.key === 'Enter' || e.key === ',') && val) {
        e.preventDefault()
        await addValue(option, val)
    } else if (e.key === 'Backspace' && !val) {
        // Optional: Remove last value on backspace?
        // Maybe too destructive without confirmation, let's skip for now
    }
}

const handleValueBlur = async (option: any) => {
    // Optional: Auto-add on blur?
    // Maybe checking if there's text left
    const val = newValues.value[option.id]?.trim()
    if (val) {
        await addValue(option, val)
    }
}

async function addValue(option: any, label: string) {
    // Check duplicate
    if (option.values.some((v: any) => v.label.toLowerCase() === label.toLowerCase())) {
        newValues.value[option.id] = '' // clear input
        return
    }

    try {
        await $fetch(`/api/admin/products/${props.productId}/options/${option.id}/values`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${authStore.token}` },
            body: { label }
        })
        newValues.value[option.id] = '' // clear input
        emit('refresh')
    } catch (e) {
        console.error('Failed to add value', e)
    }
}

async function deleteValue(option: any, value: any) {
    if (!confirm(t('admin.productOptionsEditor.confirm.removeValue', { label: value.label }))) return

    try {
        await $fetch(`/api/admin/products/${props.productId}/options/${option.id}/values/${value.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authStore.token}` }
        })
        emit('refresh')
    } catch (e) {
        console.error('Failed to delete value', e)
    }
}

// --- Option Name Management ---

async function updateOption(option: any) {
    if (!option.name.trim()) return

    try {
        await $fetch(`/api/admin/products/${props.productId}/options/${option.id}`, {
             method: 'PUT',
            headers: { Authorization: `Bearer ${authStore.token}` },
            body: { 
                name: option.name,
                displayType: option.displayType
            }
        })
        emit('refresh')
    } catch (e) {
        console.error('Failed to update option', e)
    }
}

// --- Create Option Management ---

function startCreatingOption() {
    isCreatingOption.value = true
    newOptionName.value = ''
    newOptionType.value = 'dropdown'
    newOptionValues.value = ''
    nextTick(() => {
        newOptionNameRef.value?.focus()
    })
}

function cancelCreatingOption() {
    isCreatingOption.value = false
}

function focusNewValues() {
    newOptionValuesRef.value?.focus()
}

async function createOption() {
    if (!newOptionName.value.trim()) return

    const values = newOptionValues.value.split(',').map(v => v.trim()).filter(Boolean)

    try {
        await $fetch(`/api/admin/products/${props.productId}/options`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${authStore.token}` },
            body: {
                name: newOptionName.value,
                displayType: newOptionType.value,
                values: values.map(v => ({ label: v }))
            }
        })
        isCreatingOption.value = false
        emit('refresh')
    } catch (e) {
        console.error('Failed to create option', e)
    }
}

// --- Delete Option Management ---

function requestDeleteOption(option: any) {
    optionToDelete.value = option
    showOptionDeleteModal.value = true
}

function resetOptionDelete() {
    optionToDelete.value = null
    showOptionDeleteModal.value = false
}

async function deleteOptionConfirmed() {
    if (!optionToDelete.value) return
    
    try {
        await $fetch(`/api/admin/products/${props.productId}/options/${optionToDelete.value.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authStore.token}` }
        })
        emit('refresh')
    } catch (e) {
        console.error('Failed to delete option', e)
    }
    resetOptionDelete()
}

</script>
