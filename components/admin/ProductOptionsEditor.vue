<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium text-gray-900">
        Options
      </h3>
    </div>

    <div class="space-y-4">
        <!-- Existing Options List -->
        <div 
            v-for="(option, index) in options" 
            :key="option.id"
            class="bg-white border rounded-lg p-4 relative group overflow-hidden"
        >
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 pr-8">
                <!-- Option Name & Display Type -->
                <div class="md:col-span-4 space-y-3">
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Option Name</label>
                        <input 
                            type="text" 
                            v-model="option.name"
                            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm px-3 py-2 border"
                            @change="updateOption(option)"
                            placeholder="e.g. Size"
                        >
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Display Type</label>
                        <select 
                            v-model="option.displayType"
                            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm px-3 py-2 border bg-white"
                            @change="updateOption(option)"
                        >
                            <option value="dropdown">Dropdown</option>
                            <option value="button">Buttons / Tags</option>
                            <option value="radio">Radio Buttons</option>
                            <option value="color">Color Swatch</option>
                            <option value="image">Image with Text</option>
                        </select>
                        <p class="mt-2 text-xs font-medium text-gray-500">Preview:</p>
                        <div class="mt-1 p-3 border border-gray-100 rounded-lg bg-gray-50/50">
                             <!-- Dropdown Preview -->
                            <div v-if="option.displayType === 'dropdown'" class="relative max-w-xs">
                                <div class="block w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm flex items-center justify-between">
                                    <span>Select value...</span>
                                    <Icon name="lucide:chevron-down" class="w-4 h-4 text-gray-500" />
                                </div>
                            </div>
                            
                            <!-- Button Preview -->
                            <div v-else-if="option.displayType === 'button'" class="flex flex-wrap gap-2">
                                <div class="px-3 py-1.5 rounded-md text-sm font-medium border bg-teal-600 text-white border-teal-600 shadow-sm">
                                    Value 1
                                </div>
                                <div class="px-3 py-1.5 rounded-md text-sm font-medium border bg-white text-gray-700 border-gray-200 hover:border-teal-300">
                                    Value 2
                                </div>
                            </div>

                            <!-- Radio Preview -->
                            <div v-else-if="option.displayType === 'radio'" class="space-y-2">
                                <div class="flex items-center">
                                    <div class="w-4 h-4 rounded-full border border-teal-600 flex items-center justify-center">
                                        <div class="w-2 h-2 rounded-full bg-teal-600"></div>
                                    </div>
                                    <span class="ml-2 text-sm text-gray-700 font-medium">Value 1</span>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-4 h-4 rounded-full border border-gray-300"></div>
                                    <span class="ml-2 text-sm text-gray-600">Value 2</span>
                                </div>
                            </div>

                             <!-- Color Preview -->
                            <div v-else-if="option.displayType === 'color'" class="flex flex-wrap gap-3">
                                <div class="w-8 h-8 rounded-full flex items-center justify-center relative ring-2 ring-offset-2 ring-teal-600 shadow-sm" style="background-color: #EF4444;">
                                    <Icon name="lucide:check" class="w-4 h-4 text-white drop-shadow-sm" />
                                </div>
                                <div class="w-8 h-8 rounded-full flex items-center justify-center relative ring-1 ring-black/5" style="background-color: #3B82F6;"></div>
                            </div>

                             <!-- Image Preview -->
                            <div v-else-if="option.displayType === 'image'" class="flex flex-wrap gap-3">
                                <div class="w-12 h-12 rounded-lg border-2 border-teal-600 shadow-sm relative overflow-hidden bg-gray-200">
                                   <div class="absolute inset-0 flex items-center justify-center text-xs text-gray-400">Img</div>
                                </div>
                                <div class="w-12 h-12 rounded-lg border-2 border-slate-100 relative overflow-hidden bg-gray-200">
                                    <div class="absolute inset-0 flex items-center justify-center text-xs text-gray-400">Img</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Option Values (Chips) -->
                <div class="md:col-span-8 overflow-hidden">
                    <label class="block text-xs font-medium text-gray-500 mb-1">Option Values</label>
                    <div 
                        class="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md bg-white min-h-[42px] focus-within:ring-1 focus-within:ring-teal-500 focus-within:border-teal-500"
                        @click="focusInput(index)"
                    >
                        <!-- Chips -->
                        <div 
                            v-for="value in option.values" 
                            :key="value.id"
                            class="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded px-2 py-1 text-sm text-gray-800"
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
                                class="shrink-0 text-gray-400 hover:text-teal-600 focus:outline-none"
                                title="Edit Metadata"
                                @click.stop="editValueMeta(option, value)"
                            >
                                <Icon name="lucide:pencil" class="w-3.5 h-3.5" />
                            </button>

                            <button 
                                type="button"
                                class="shrink-0 text-gray-400 hover:text-red-600 focus:outline-none"
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
                            class="flex-1 min-w-[120px] border-none p-0 focus:ring-0 text-sm h-7"
                            placeholder="Add value..."
                            @keydown="handleValueKeydown($event, option)"
                            @blur="handleValueBlur(option)"
                        >
                    </div>
                </div>
            </div>

            <!-- Delete Option -->
            <button 
                type="button"
                class="absolute top-4 right-4 text-gray-400 hover:text-red-600 p-1"
                title="Remove Option"
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
                class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                @click="startCreatingOption"
            >
                <Icon name="lucide:plus" class="-ml-1 mr-2 h-5 w-5 text-gray-400" />
                Add another option
            </button>

            <!-- Inline Create form -->
            <div v-else class="bg-white border border-teal-200 rounded-lg p-4 shadow-sm ring-1 ring-teal-500/20">
                 <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div class="md:col-span-4 space-y-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Option Name</label>
                            <input 
                                ref="newOptionNameRef"
                                type="text" 
                                v-model="newOptionName"
                                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm px-3 py-2 border"
                                placeholder="e.g. Color"
                                @keydown.enter="focusNewValues"
                            >
                        </div>
                         <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Display Type</label>
                            <select 
                                v-model="newOptionType"
                                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm px-3 py-2 border bg-white"
                            >
                                <option value="dropdown">Dropdown</option>
                                <option value="button">Buttons / Tags</option>
                                <option value="radio">Radio Buttons</option>
                                <option value="color">Color Swatch</option>
                                <option value="image">Image with Text</option>
                            </select>
                            <p class="mt-1 text-xs font-medium text-gray-500">Preview:</p>
                            <div class="mt-1 p-3 border border-gray-100 rounded-lg bg-gray-50/50">
                                 <!-- Dropdown Preview -->
                                <div v-if="newOptionType === 'dropdown'" class="relative max-w-xs">
                                    <div class="block w-full h-8 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm flex items-center justify-between">
                                        <span>Select value...</span>
                                        <Icon name="lucide:chevron-down" class="w-4 h-4 text-gray-500" />
                                    </div>
                                </div>
                                
                                <!-- Button Preview -->
                                <div v-else-if="newOptionType === 'button'" class="flex flex-wrap gap-2">
                                    <div class="px-2 py-1 rounded text-xs font-medium border bg-teal-600 text-white border-teal-600 shadow-sm">
                                        Value 1
                                    </div>
                                    <div class="px-2 py-1 rounded text-xs font-medium border bg-white text-gray-700 border-gray-200">
                                        Value 2
                                    </div>
                                </div>

                                <!-- Radio Preview -->
                                <div v-else-if="newOptionType === 'radio'" class="space-y-2">
                                    <div class="flex items-center">
                                        <span class="w-3 h-3 rounded-full border border-teal-600 flex items-center justify-center">
                                            <span class="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                                        </span>
                                        <span class="ml-2 text-xs text-gray-700 font-medium">Value 1</span>
                                    </div>
                                    <div class="flex items-center">
                                        <span class="w-3 h-3 rounded-full border border-gray-300"></span>
                                        <span class="ml-2 text-xs text-gray-600">Value 2</span>
                                    </div>
                                </div>

                                 <!-- Color Preview -->
                                <div v-else-if="newOptionType === 'color'" class="flex flex-wrap gap-2">
                                    <div class="w-6 h-6 rounded-full flex items-center justify-center relative ring-2 ring-offset-1 ring-teal-600 shadow-sm" style="background-color: #EF4444;">
                                        <Icon name="lucide:check" class="w-3 h-3 text-white" />
                                    </div>
                                    <div class="w-6 h-6 rounded-full ring-1 ring-black/5" style="background-color: #3B82F6;"></div>
                                </div>

                                 <!-- Image Preview -->
                                <div v-else-if="newOptionType === 'image'" class="flex flex-wrap gap-2">
                                    <div class="w-8 h-8 rounded border-2 border-teal-600 shadow-sm bg-gray-200"></div>
                                    <div class="w-8 h-8 rounded border border-gray-200 bg-gray-200"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="md:col-span-8">
                         <label class="block text-xs font-medium text-gray-500 mb-1">Option Values</label>
                         <input 
                            ref="newOptionValuesRef"
                            type="text" 
                            v-model="newOptionValues"
                            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm px-3 py-2 border"
                            placeholder="Separate values with comma (e.g. Red, Blue)"
                            @keydown.enter="createOption"
                        >
                        <p class="text-xs text-gray-400 mt-1">Press Enter to add</p>
                    </div>
                 </div>
                 <div class="flex justify-end mt-3 gap-2">
                     <button type="button" class="text-xs text-gray-500 hover:text-gray-700 px-2 py-1" @click="cancelCreatingOption">Cancel</button>
                     <button type="button" class="text-xs bg-teal-600 text-white px-3 py-1 rounded hover:bg-teal-700" @click="createOption">Done</button>
                 </div>
            </div>
        </div>
        <div v-else class="text-center py-2 text-sm text-gray-500">
            Maximum 3 options allowed.
        </div>
    </div>

    <!-- Confirmation modal -->
    <AdminConfirmModal
      v-model="showOptionDeleteModal"
      title="Delete Option"
      message="Are you sure you want to delete this option? All variants using it will be removed."
      confirm-text="Delete"
      cancel-text="Cancel"
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
        <div class="fixed inset-0 bg-black/25 backdrop-blur-sm" />
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
              class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all"
            >
              <DialogTitle
                as="h3"
                class="text-lg font-medium leading-6 text-gray-900 mb-4"
              >
                Edit {{ editingMetaType === 'color' ? 'Color' : 'Image' }} for "{{ editingValue?.label }}"
              </DialogTitle>
              
              <div v-if="editingMetaType === 'color'" class="space-y-4">
                  <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Color (Hex)</label>
                      <div class="flex gap-2">
                        <input type="color" v-model="editingMetaValue" class="h-10 w-10 p-0 border-0 rounded overflow-hidden cursor-pointer" />
                        <input 
                            type="text" 
                            v-model="editingMetaValue" 
                            class="flex-1 rounded-md border-gray-300 focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                            placeholder="#000000"
                        />
                      </div>
                  </div>
              </div>

               <div v-if="editingMetaType === 'image'" class="space-y-4">
                  <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                      <input 
                            type="text" 
                            v-model="editingMetaValue" 
                            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                            placeholder="https://example.com/image.jpg"
                        />
                      <p class="text-xs text-gray-500 mt-1">Provide a direct URL to the image icon.</p>
                  </div>
                  <div v-if="editingMetaValue" class="mt-2">
                        <p class="text-xs font-medium text-gray-500 mb-1">Preview:</p>
                        <img :src="editingMetaValue" class="w-16 h-16 object-cover rounded border border-gray-200" />
                  </div>
              </div>

              <div class="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  class="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                  @click="closeMetaModal"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="inline-flex justify-center rounded-md border border-transparent bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none"
                  @click="saveMeta"
                >
                  Save
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
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue'

const getDisplayTypeHint = (type: string) => {
    switch(type) {
        case 'dropdown': return 'Customers will select from a dropdown list. Best for many options.'
        case 'button': return 'Customers will see text buttons/tags. Best for few options.'
        case 'radio': return 'Customers will see a list of radio options.'
        case 'color': return 'Customers will see circular color swatches. You can assign colors to values.'
        case 'image': return 'Customers will see image thumbnails. You can assign images to values.'
        default: return ''
    }
}
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
    if (!confirm(`Remove "${value.label}"?`)) return // Simple confirm for values

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
