import { defineStore } from 'pinia'

export interface CartItem {
    productId: string
    title: string
    slug: string
    price: number
    quantity: number
    stock: number
}

export const useCartStore = defineStore('cart', {
    state: () => ({
        items: [] as CartItem[]
    }),

    getters: {
        itemCount: (state) => state.items.reduce((sum, item) => sum + item.quantity, 0),

        total: (state) => state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),

        hasItems: (state) => state.items.length > 0
    },

    actions: {
        addItem(product: Omit<CartItem, 'quantity'>) {
            const existingItem = this.items.find(item => item.productId === product.productId)

            if (existingItem) {
                // Increase quantity if item exists, but don't exceed stock
                if (existingItem.quantity < product.stock) {
                    existingItem.quantity++
                    this.saveToLocalStorage()
                }
            } else {
                // Add new item with quantity 1
                this.items.push({
                    ...product,
                    quantity: 1
                })
                this.saveToLocalStorage()
            }
        },

        removeItem(productId: string) {
            const index = this.items.findIndex(item => item.productId === productId)
            if (index > -1) {
                this.items.splice(index, 1)
                this.saveToLocalStorage()
            }
        },

        updateQuantity(productId: string, quantity: number) {
            const item = this.items.find(item => item.productId === productId)
            if (item) {
                // Ensure quantity is between 1 and stock
                item.quantity = Math.max(1, Math.min(quantity, item.stock))
                this.saveToLocalStorage()
            }
        },

        clearCart() {
            this.items = []
            this.saveToLocalStorage()
        },

        saveToLocalStorage() {
            if (process.client) {
                localStorage.setItem('cart', JSON.stringify(this.items))
            }
        },

        loadFromLocalStorage() {
            if (process.client) {
                const savedCart = localStorage.getItem('cart')
                if (savedCart) {
                    try {
                        this.items = JSON.parse(savedCart)
                    } catch (error) {
                        console.error('Failed to load cart from localStorage:', error)
                        this.items = []
                    }
                }
            }
        }
    }
})
