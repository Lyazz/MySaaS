<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-end">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Start Date
      </label>
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon name="lucide:calendar" class="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="date"
          :value="startDate"
          class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition duration-150 ease-in-out"
          @input="updateStartDate(($event.target as HTMLInputElement).value)"
        >
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        End Date
      </label>
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon name="lucide:calendar" class="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="date"
          :value="endDate"
          class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition duration-150 ease-in-out"
          @input="updateEndDate(($event.target as HTMLInputElement).value)"
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  startDate?: string
  endDate?: string
}>()

const emit = defineEmits<{
  (e: 'update:startDate', value: string): void
  (e: 'update:endDate', value: string): void
}>()

function updateStartDate(val: string) {
  emit('update:startDate', val)
}

function updateEndDate(val: string) {
  emit('update:endDate', val)
}


</script>
