import { describe, it, expect, vi } from 'vitest'
import { computed } from 'vue'
import { mount } from '@vue/test-utils'
import ExtractedLinesTable from '../../components/admin/ai-import/ExtractedLinesTable.vue'
import type { DraftLine } from '../../composables/useAiImportJob'

/** Echoes interpolation params back so assertions can see computed values. */
const t = (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t, locale: computed(() => 'fr') })
}))

vi.stubGlobal('useI18n', () => ({ t, locale: computed(() => 'fr') }))
const makeLine = (overrides: Partial<DraftLine> = {}): DraftLine => ({
    index: 0,
    label: 'CHOCOLAT NOIR 100G',
    sku: null,
    barcode: null,
    quantity: 12,
    unitCost: 375,
    salePrice: 488,
    salePricePinned: false,
    action: 'match',
    variantId: 'var_1',
    matchSource: 'fuzzy',
    matchScore: 0.86,
    candidates: [],
    confidence: { label: 0.95, quantity: 0.95, unitCost: 0.95 },
    reviewed: [],
    ...overrides
})

const variants = {
    var_1: { sku: 'CHOC100', title: 'Chocolat noir 100g', cost: '350', price: '500' }
}

const mountTable = (lines: DraftLine[], pendingReview = new Set<string>()) =>
    mount(ExtractedLinesTable, {
        props: { lines, variants, pendingReview },
        global: {
            stubs: {
                Icon: true,
                UiCard: { template: '<div><slot name="header" /><slot /></div>' },
                UiEmptyState: { template: '<div class="empty-state" />' },
                UiInput: {
                    props: ['modelValue'],
                    template: '<input :value="modelValue" v-bind="$attrs" />'
                },
                AdminAiImportLineMatcher: true
            }
        }
    })

describe('ExtractedLinesTable', () => {
    it('renders one row per line', () => {
        const wrapper = mountTable([makeLine(), makeLine({ index: 1, label: 'HUILE 5L' })])
        expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    })

    it('flags only the cells the AI was unsure about', () => {
        const wrapper = mountTable([makeLine()], new Set(['0:quantity']))
        const flagged = wrapper.findAll('.ui-input--flagged')
        expect(flagged).toHaveLength(1)
    })

    it('shows no flags when nothing is pending', () => {
        const wrapper = mountTable([makeLine()])
        expect(wrapper.findAll('.ui-input--flagged')).toHaveLength(0)
    })

    it('computes the margin a line actually earns', () => {
        const wrapper = mountTable([makeLine({ unitCost: 1000, salePrice: 1300 })])
        expect(wrapper.text()).toContain('30%')
    })

    it('warns in red when a line would sell below cost', () => {
        const wrapper = mountTable([makeLine({ unitCost: 1000, salePrice: 900 })])
        expect(wrapper.find('.text-danger').exists()).toBe(true)
    })

    it('shows a dash rather than a fake margin when there is no sale price', () => {
        const wrapper = mountTable([makeLine({ salePrice: null })])
        expect(wrapper.text()).toContain('—')
    })

    it('excludes skipped lines from the total', () => {
        const wrapper = mountTable([
            makeLine({ quantity: 2, unitCost: 100 }),
            makeLine({ index: 1, quantity: 5, unitCost: 100, action: 'skip' })
        ])
        // 2 x 100, not 7 x 100 — the skipped line does not count.
        expect(wrapper.text()).toContain('"total":"200')
        expect(wrapper.text()).not.toContain('"total":"700')
    })

    it('emits a review event when a gated cell is focused', async () => {
        const wrapper = mountTable([makeLine()], new Set(['0:quantity']))
        await wrapper.find('.ui-input--flagged').trigger('focus')
        expect(wrapper.emitted('review')?.[0]?.[1]).toBe('quantity')
    })

    it('toggles a line between skipped and included', async () => {
        const line = makeLine()
        const wrapper = mountTable([line])
        await wrapper.find('.ui-table-action').trigger('click')
        expect(wrapper.emitted('update')?.[0]?.[1]).toEqual({ action: 'skip' })
    })

    it('shows an empty state when the AI found no lines', () => {
        const wrapper = mountTable([])
        expect(wrapper.find('.empty-state').exists()).toBe(true)
    })
})
