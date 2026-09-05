<!--
  Deprecated: use `<UiPageHeader>`. Kept as a pass-through while the remaining
  call sites move over; delete once none reference it.
-->
<template>
  <UiPageHeader v-bind="$attrs">
    <slot />
  </UiPageHeader>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>
