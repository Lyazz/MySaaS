<script setup lang="ts">
// ThemeProvider for Cyber Synthwave template
// Minimal wrapper - same structure as Modern

const storeSettings = useState<any>('storeSettings')
</script>

<template>
  <div class="cyber-theme-provider">
    <slot />
  </div>
</template>

<style>
/* Global Cyber Synthwave Theme Styles */
.cyber-theme-provider {
    font-family: 'Inter', system-ui, sans-serif;
    background-color: #0d0515;
    color: #e9d5ff;
    min-height: 100vh;
}

/* Scrollbar styling */
.cyber-theme-provider ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

.cyber-theme-provider ::-webkit-scrollbar-track {
    background: #1a0a2e;
}

.cyber-theme-provider ::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, #ff2d95, #ff6b35);
    border-radius: 4px;
}

.cyber-theme-provider ::-webkit-scrollbar-thumb:hover {
    background: #ff2d95;
}

/* Selection styling */
.cyber-theme-provider ::selection {
    background: rgba(255, 45, 149, 0.3);
    color: white;
}

/* Focus outline styling */
.cyber-theme-provider *:focus-visible {
    outline: 2px solid #ff2d95;
    outline-offset: 2px;
}
</style>
