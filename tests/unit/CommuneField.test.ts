import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import CommuneField from '../../components/storefront/CommuneField.vue'

const communesRef = ref<Array<{ name: string }>>([])
const loadingRef = ref(false)
const errorRef = ref<string | null>(null)

vi.mock('~/composables/useDeliveryCommunes', () => ({
    useDeliveryCommunes: () => ({
        communes: communesRef,
        loading: loadingRef,
        error: errorRef,
        refresh: vi.fn()
    })
}))

const Harness = defineComponent({
    components: { CommuneField },
    props: { wilayaCode: { type: String, required: true } },
    setup() {
        const model = ref('')
        return { model }
    },
    template: `<CommuneField v-model="model" :wilaya-code="wilayaCode" placeholder="Select commune" />`
})

const trigger = (wrapper: any) => wrapper.get('button[aria-haspopup="listbox"]')

describe('CommuneField', () => {
    beforeEach(() => {
        communesRef.value = []
        loadingRef.value = false
        errorRef.value = null
    })

    it('renders a disabled trigger when no wilaya is selected', () => {
        const wrapper = mount(Harness, { props: { wilayaCode: '' } })
        expect(trigger(wrapper).attributes('disabled')).toBeDefined()
    })

    it('renders a disabled trigger while loading communes', () => {
        loadingRef.value = true
        const wrapper = mount(Harness, { props: { wilayaCode: '16' } })
        expect(trigger(wrapper).attributes('disabled')).toBeDefined()
    })

    it('enables the trigger when communes are available', () => {
        communesRef.value = [{ name: 'Alger' }]
        const wrapper = mount(Harness, { props: { wilayaCode: '16' } })
        expect(trigger(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('shows the whole list on the first click, with search offered second', async () => {
        communesRef.value = [{ name: 'Alger' }, { name: 'Bab Ezzouar' }]
        const wrapper = mount(Harness, { props: { wilayaCode: '16' }, attachTo: document.body })

        expect(wrapper.find('[role="listbox"]').exists()).toBe(false)

        await trigger(wrapper).trigger('click')

        // One click: the options are on screen...
        const listbox = wrapper.get('[role="listbox"]')
        expect(listbox.findAll('[role="option"]')).toHaveLength(2)
        expect(listbox.text()).toContain('Alger')
        expect(listbox.text()).toContain('Bab Ezzouar')

        // ...and the search box is inside the panel, secondary to the list.
        const search = listbox.get('input[role="searchbox"]')
        expect((search.element as HTMLInputElement).value).toBe('')

        // Searching still filters once used.
        await search.setValue('bab')
        expect(wrapper.get('[role="listbox"]').findAll('[role="option"]')).toHaveLength(1)
    })

    it('keeps the panel open on a second click of the search box', async () => {
        communesRef.value = [{ name: 'Alger' }]
        const wrapper = mount(Harness, { props: { wilayaCode: '16' }, attachTo: document.body })

        await trigger(wrapper).trigger('click')
        await wrapper.get('input[role="searchbox"]').trigger('click')

        expect(wrapper.find('[role="listbox"]').exists()).toBe(true)
        expect(trigger(wrapper).attributes('aria-expanded')).toBe('true')
    })
})
