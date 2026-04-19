<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        html?: string | null
        tag?: string
        allowedTags?: string[]
        allowedAttr?: string[]
    }>(),
    {
        html: '',
        tag: 'div'
    }
)

const { sanitize } = useSafeRichText()

const sanitizedHtml = computed(() =>
    sanitize(props.html ?? '', {
        allowedTags: props.allowedTags,
        allowedAttr: props.allowedAttr
    })
)
</script>

<template>
  <component :is="tag" v-html="sanitizedHtml" />
</template>
