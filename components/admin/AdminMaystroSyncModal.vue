<template>
  <Teleport to="body">
    <div 
      v-if="modelValue" 
      class="fixed inset-0 z-[100] overflow-y-auto"
    >
      <div class="flex items-center justify-center min-h-screen px-4">
        <!-- Overlay -->
        <div
          class="fixed inset-0 bg-black/70 backdrop-blur-sm"
          @click="!isSyncing && (isOpen = false)"
        />

        <!-- Modal -->
        <div class="relative rounded-2xl max-w-md w-full p-6 z-10 surface-2 border border-line shadow-overlay">
          
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-semibold text-primary">
              Sync Maystro Orders
            </h3>
            <button
              class="text-tertiary hover:text-secondary disabled:opacity-50"
              :disabled="isSyncing"
              @click="isOpen = false"
            >
              <Icon name="lucide:x" class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-4 min-h-[150px]">
            <div v-if="loadingCandidates" class="flex justify-center items-center h-full py-8">
              <Icon name="lucide:loader-2" class="w-8 h-8 animate-spin text-tertiary" />
            </div>

            <div v-else-if="candidates.length === 0" class="text-center py-8">
              <p class="text-secondary">
                No active Maystro orders require manual synchronization.
              </p>
            </div>

            <div v-else>
              <p class="mb-4 text-sm text-secondary">
                Found <strong>{{ candidates.length }}</strong> active Maystro order(s) that might need synchronization.
                Click Start to check their latest status from Maystro.
              </p>

              <div v-if="hasStarted" class="space-y-2 mt-4">
                <div class="flex justify-between text-sm text-primary">
                  <span>Syncing...</span>
                  <span>{{ currentIndex }} / {{ candidates.length }}</span>
                </div>
                <div class="w-full surface-2 rounded-full h-2.5 overflow-hidden">
                  <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-300" :style="{ width: `${progressPercentage}%` }"></div>
                </div>
              </div>
            </div>

            <div v-if="syncResults.length > 0 && !isSyncing" class="mt-4">
              <p class="text-sm font-medium mb-2 text-primary">Sync Complete!</p>
              <ul class="text-sm space-y-1 max-h-32 overflow-y-auto text-secondary">
                <li v-for="res in syncResults" :key="res.id" class="p-2 rounded-lg surface-2">
                  <span class="font-medium">Order {{ res.publicId }}:</span> {{ res.statusMessage }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2.5 mt-6 justify-end">
            <button
              type="button"
              class="ui-btn ui-btn--secondary ui-btn--md"
              :disabled="isSyncing"
              @click="isOpen = false"
            >
              {{ hasStarted && !isSyncing ? 'Close' : 'Cancel' }}
            </button>
            <button
              v-if="candidates.length > 0 && !hasStarted"
              type="button"
              class="ui-btn ui-btn--primary ui-btn--md flex items-center gap-2"
              :disabled="isSyncing"
              @click="startSync"
            >
              <Icon v-if="isSyncing" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
              Start Sync
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'completed'): void
}>()

const authStore = useAuthStore()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loadingCandidates = ref(false)
const isSyncing = ref(false)
const hasStarted = ref(false)
const candidates = ref<any[]>([])
const currentIndex = ref(0)
const syncResults = ref<any[]>([])

const progressPercentage = computed(() => {
  if (candidates.value.length === 0) return 0
  return (currentIndex.value / candidates.value.length) * 100
})

watch(isOpen, async (val) => {
  if (val) {
    // Reset state
    hasStarted.value = false
    isSyncing.value = false
    currentIndex.value = 0
    syncResults.value = []
    candidates.value = []
    
    // Fetch candidates
    loadingCandidates.value = true
    try {
      const data = await $fetch('/api/admin/orders/sync-maystro/candidates', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }) as { candidates: any[] }
      candidates.value = data?.candidates || []
    } catch (err) {
      console.error('Failed to fetch sync candidates:', err)
    } finally {
      loadingCandidates.value = false
    }
  }
})

const startSync = async () => {
  if (candidates.value.length === 0) return
  
  isSyncing.value = true
  hasStarted.value = true
  currentIndex.value = 0
  syncResults.value = []

  for (let i = 0; i < candidates.value.length; i++) {
    const candidate = candidates.value[i]
    try {
      const data = await $fetch(`/api/admin/orders/${candidate.id}/sync-maystro`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authStore.token}` }
      }) as any
      syncResults.value.push({
        id: candidate.id,
        publicId: candidate.publicId,
        statusMessage: data?.result?.synced 
          ? `Synced successfully (Status: ${data?.result?.newStatus})` 
          : 'No changes'
      })
    } catch (err: any) {
      syncResults.value.push({
        id: candidate.id,
        publicId: candidate.publicId,
        statusMessage: `Failed: ${err?.data?.statusMessage || err.message}`
      })
    }
    currentIndex.value = i + 1
  }

  isSyncing.value = false
  emit('completed')
}
</script>
