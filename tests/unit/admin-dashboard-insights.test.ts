import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import DashboardTrendChart from '../../components/admin/DashboardTrendChart.vue'
import DashboardInsightsPanels from '../../components/admin/DashboardInsightsPanels.vue'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string, params?: Record<string, unknown>) => {
            if (key === 'admin.pages.dashboard.insights.units' && params?.count !== undefined) return `${params.count} units`
            if (key === 'admin.pages.dashboard.insights.criticalStock.threshold' && params?.count !== undefined) {
                return `Threshold ${params.count}`
            }
            return key
        },
        locale: computed(() => 'en')
    })
}))

describe('Admin dashboard trend chart', () => {
    it('renders empty state when no trend points', () => {
        const wrapper = mount(DashboardTrendChart, {
            props: {
                title: 'Revenue trend',
                hint: 'Hint',
                trends: [],
                valueKey: 'totalRevenue',
                emptyLabel: 'No trend data'
            }
        })

        expect(wrapper.find('[data-testid=\"trend-empty\"]').exists()).toBe(true)
        expect(wrapper.text()).toContain('No trend data')
    })

    it('renders chart when trend points exist', () => {
        const wrapper = mount(DashboardTrendChart, {
            props: {
                title: 'Revenue trend',
                hint: 'Hint',
                valueKey: 'totalRevenue',
                trends: [
                    { date: '2026-04-20', ordersCount: 1, ordersRevenue: 100, posRevenue: 20, totalRevenue: 120 },
                    { date: '2026-04-21', ordersCount: 2, ordersRevenue: 150, posRevenue: 30, totalRevenue: 180 }
                ]
            }
        })

        expect(wrapper.find('[data-testid=\"trend-populated\"]').exists()).toBe(true)
        expect(wrapper.find('svg').exists()).toBe(true)
    })
})

describe('Admin dashboard insight panels', () => {
    const formatMoney = (value: number) => `${value} DZD`

    it('renders empty blocks when there is no analytics payload', () => {
        const wrapper = mount(DashboardInsightsPanels, {
            props: {
                topProducts: [],
                topCategories: [],
                criticalStock: [],
                formatMoney
            }
        })

        expect(wrapper.find('[data-testid=\"top-products-empty\"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid=\"top-categories-empty\"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid=\"critical-stock-empty\"]').exists()).toBe(true)
    })

    it('renders populated blocks for products, categories and stock', () => {
        const wrapper = mount(DashboardInsightsPanels, {
            props: {
                topProducts: [{ productId: 'p1', title: 'Phone X', quantity: 4, revenue: 250 }],
                topCategories: [{ categoryId: 'c1', title: 'Phones', quantity: 4, revenue: 250 }],
                criticalStock: [{ productId: 'p1', title: 'Phone X', stock: 2, lowStockThreshold: 5 }],
                formatMoney
            }
        })

        expect(wrapper.find('[data-testid=\"top-products-populated\"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid=\"top-categories-populated\"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid=\"critical-stock-populated\"]').exists()).toBe(true)
        expect(wrapper.text()).toContain('Phone X')
        expect(wrapper.text()).toContain('250 DZD')
    })
})
