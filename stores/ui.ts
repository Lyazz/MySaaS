import { defineStore } from 'pinia'

type Theme = 'dark' | 'light'

const STORAGE_KEY = 'admin-theme'

export const useUiStore = defineStore('ui', () => {
  const theme = ref<Theme>('dark')

  function applyTheme(t: Theme) {
    theme.value = t
    if (import.meta.client) {
      document.documentElement.dataset.theme = t
      localStorage.setItem(STORAGE_KEY, t)
    }
  }

  function toggleTheme() {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function initTheme() {
    if (!import.meta.client) return
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
    applyTheme(saved === 'light' ? 'light' : 'dark')
  }

  return { theme, toggleTheme, initTheme }
})
