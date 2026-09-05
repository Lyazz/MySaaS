<!--
  Deprecated: use `<UiInput>`. Kept as a pass-through so the call sites that
  still import this path render the kit component; delete once they are moved.
-->
<template>
  <UiInput v-bind="$attrs">
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </UiInput>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>
