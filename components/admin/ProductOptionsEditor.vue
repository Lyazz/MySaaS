<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium text-gray-900">
        Options
      </h3>
      <button
        type="button"
        class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        @click="showAddOptionModel = true"
      >
        Add Option
      </button>
    </div>

    <div
      v-if="options.length === 0"
      class="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
    >
      <p class="text-gray-500">
        No options defined (e.g. Size, Color).
      </p>
    </div>

    <div
      v-else
      class="space-y-4"
    >
      <div
        v-for="option in options"
        :key="option.id"
        class="bg-white border rounded-lg p-4"
      >
        <div class="flex items-center justify-between mb-4">
          <div>
            <span class="font-medium text-gray-900">{{ option.name }}</span>
            <span class="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{{ option.displayType }}</span>
          </div>
          <button 
            type="button"
            class="text-red-600 hover:text-red-800 text-sm" 
            @click="requestDeleteOption(option)"
          >
            Delete
          </button>
        </div>

        <!-- Values -->
        <div class="flex flex-wrap gap-2">
          <span
            v-for="val in option.values"
            :key="val.id"
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {{ val.label }}
            <button 
              type="button" 
              class="ml-1 text-blue-400 hover:text-blue-600 focus:outline-none"
              @click="requestDeleteValue(option, val)"
            >
              <span class="sr-only">Remove</span>
              <svg
                class="h-3 w-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              ><path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              /></svg>
            </button>
          </span>
          <!-- Add Value Input (placeholder for now, implementing basic option create first) -->
        </div>
      </div>
    </div>

    <!-- Add Option Modal -->
    <div
      v-if="showAddOptionModel"
      class="fixed inset-0 z-10 flex items-center justify-center bg-gray-900 bg-opacity-50"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 class="text-lg font-medium text-gray-900 mb-4">
          Add Product Option
        </h3>
        <form @submit.prevent="createOption">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Option Name</label>
              <input
                v-model="newOptionName"
                type="text"
                placeholder="e.g. Size, Color"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm h-10 px-3 border"
                required
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Display Type</label>
              <select
                v-model="newOptionType"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm h-10 px-3 border"
              >
                <option value="dropdown">
                  Dropdown
                </option>
                <option value="button">
                  Button/Pill
                </option>
                <option value="color">
                  Color Swatch
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Values (comma separated)</label>
              <input
                v-model="newOptionValues"
                type="text"
                placeholder="e.g. S, M, L"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm h-10 px-3 border"
                required
              >
            </div>
          </div>
          <div class="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="showAddOptionModel = false"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Confirmation modals -->
  <AdminConfirmModal
    v-model="showOptionDeleteModal"
    title="Delete Option"
    :message="optionDeleteMessage"
    confirm-text="Delete"
    cancel-text="Cancel"
    @confirm="deleteOptionConfirmed"
    @cancel="resetOptionDelete"
  />

  <AdminConfirmModal
    v-model="showValueDeleteModal"
    title="Delete Option Value"
    :message="valueDeleteMessage"
    confirm-text="Delete"
    cancel-text="Cancel"
    @confirm="deleteValueConfirmed"
    @cancel="resetValueDelete"
  />
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{
    productId: string
    options: any[]
}>()

const emit = defineEmits(['refresh'])

const authStore = useAuthStore()
const showAddOptionModel = ref(false)
const newOptionName = ref('')
const newOptionType = ref('dropdown')
const newOptionValues = ref('')
const deleting = ref(false)
const showOptionDeleteModal = ref(false)
const optionToDelete = ref<any | null>(null)
const showValueDeleteModal = ref(false)
const valueToDelete = ref<{ optionId: string; valueId: string; label?: string } | null>(null)
const optionDeleteMessage = computed(() => {
    const name = optionToDelete.value?.name || ''
    return name
        ? `Delete option "${name}"? All variants using it will be deleted and rebuilt automatically.`
        : 'Delete this option? All variants using it will be deleted and rebuilt automatically.'
})
const valueDeleteMessage = computed(() => {
    const label = valueToDelete.value?.label || ''
    return label
        ? `Delete value "${label}"? Variants using it will be deleted automatically.`
        : 'Delete this value? Variants using it will be deleted automatically.'
})

async function createOption() {
    try {
        const values = newOptionValues.value.split(',').map(v => v.trim()).filter(v => v.length > 0)
        
        await $fetch(`/api/admin/products/${props.productId}/options`, {
             baseURL: '', 
             method: 'POST',
             headers: { Authorization: `Bearer ${authStore.token}` },
             body: {
                 name: newOptionName.value,
                 displayType: newOptionType.value,
                 values: values.map(v => ({ label: v }))
             }
        })

        showAddOptionModel.value = false
        newOptionName.value = ''
        newOptionValues.value = ''
        emit('refresh')
    } catch (e) {
        console.error(e)
        alert('Failed to create option')
    }
}

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
    const id = optionToDelete.value.id
    try {
        await $fetch(`/api/admin/products/${props.productId}/options/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authStore.token}` }
        })
        emit('refresh')
    } catch (e) {
        console.error(e)
        alert('Failed to delete option')
    }
    resetOptionDelete()
}

function requestDeleteValue(option: any, value: any) {
    valueToDelete.value = { optionId: option.id, valueId: value.id, label: value.label }
    showValueDeleteModal.value = true
}

function resetValueDelete() {
    valueToDelete.value = null
    showValueDeleteModal.value = false
}

async function deleteValueConfirmed() {
    if (!valueToDelete.value) return
    const { optionId, valueId } = valueToDelete.value

    try {
        await $fetch(`/api/admin/products/${props.productId}/options/${optionId}/values/${valueId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authStore.token}` }
        })
        emit('refresh')
    } catch (e) {
        console.error(e)
        alert('Failed to delete value')
    }
    resetValueDelete()
}
</script>
