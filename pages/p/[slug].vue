<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string
await navigateTo({ path: `/product/${encodeURIComponent(slug)}`, query: route.query }, { redirectCode: 301 })
</script>
