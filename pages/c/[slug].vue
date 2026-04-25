<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string
await navigateTo({ path: `/category/${encodeURIComponent(slug)}`, query: route.query }, { redirectCode: 301 })
</script>
