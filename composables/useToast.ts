interface Toast {
    id: number
    message: string
    type: 'success' | 'error' | 'info'
}

const toasts = ref<Toast[]>([])
let nextId = 0

export function useToast() {
    const showToast = (message: string, type: Toast['type'] = 'info') => {
        const id = nextId++
        toasts.value.push({ id, message, type })

        // Auto-dismiss after 4 seconds
        setTimeout(() => {
            dismissToast(id)
        }, 4000)
    }

    const dismissToast = (id: number) => {
        const index = toasts.value.findIndex(t => t.id === id)
        if (index > -1) {
            toasts.value.splice(index, 1)
        }
    }

    return {
        toasts: readonly(toasts),
        showToast,
        dismissToast
    }
}
