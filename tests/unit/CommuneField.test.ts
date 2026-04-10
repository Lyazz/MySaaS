import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import CommuneField from '../../components/storefront/CommuneField.vue'

const communesRef = ref<Array<{ id: number; name: string }>>([])
const loadingRef = ref(false)
const errorRef = ref<string | null>(null)

vi.mock('~/composables/useMaystroCommunes', () => ({
    useMaystroCommunes: () => ({
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

describe('CommuneField', () => {
    beforeEach(() => {
        communesRef.value = []
        loadingRef.value = false
        errorRef.value = null
    })

    it('renders a disabled <select> when no wilaya is selected', () => {
        const wrapper = mount(Harness, { props: { wilayaCode: '' } })
        expect(wrapper.find('input').exists()).toBe(false)
        const select = wrapper.get('select')
        expect(select.attributes('disabled')).toBeDefined()
    })

    it('renders a disabled <select> while loading communes', () => {
        loadingRef.value = true
        const wrapper = mount(Harness, { props: { wilayaCode: '16' } })
        const select = wrapper.get('select')
        expect(select.attributes('disabled')).toBeDefined()
    })

    it('enables <select> when communes are available', () => {
        communesRef.value = [{ id: 575, name: 'Alger' }]
        const wrapper = mount(Harness, { props: { wilayaCode: '16' } })
        const select = wrapper.get('select')
        expect(select.attributes('disabled')).toBeUndefined()
        expect(wrapper.text()).toContain('575 - Alger')
    })
})

