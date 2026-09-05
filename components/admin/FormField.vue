<!--
  Deprecated: use `<UiField>`. Kept as a pass-through; the slot prop is
  re-exposed under its old `input-id` name so existing templates keep working.
-->
<template>
  <UiField v-bind="$attrs" class="mb-4">
    <template #default="{ fieldId }">
      <slot :input-id="fieldId" />
    </template>
  </UiField>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>
