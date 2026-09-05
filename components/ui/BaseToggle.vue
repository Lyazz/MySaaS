<!--
  Deprecated: use `<UiToggle>`. Kept as a pass-through so the call sites that
  still import this path render the kit component; delete once they are moved.
-->
<template>
  <UiToggle v-bind="$attrs">
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </UiToggle>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>
