import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductOptionsEditor from '../../components/admin/ProductOptionsEditor.vue'

vi.mock('~/stores/auth', () => ({
    useAuthStore: () => ({ token: 'test-token' })
}))

describe('ProductOptionsEditor preview', () => {
    it('renders existing option preview using real values (button)', () => {
        const wrapper = mount(ProductOptionsEditor, {
            props: {
                productId: 'prod_1',
                options: [
                    {
                        id: 'opt_size',
                        name: 'Size',
                        displayType: 'button',
                        values: [
                            { id: 's', label: 'S' },
                            { id: 'm', label: 'M' }
                        ]
                    }
                ]
            },
            global: {
                stubs: {
                    BaseSelect: true,
                    Icon: true,
                    AdminConfirmModal: true,
                    TransitionRoot: true,
                    TransitionChild: true,
                    Dialog: true,
                    DialogPanel: true,
                    DialogTitle: true
                }
            }
        })

        const preview = wrapper.get('[data-testid="option-preview-opt_size"]')
        expect(preview.text()).toContain('S')
        expect(preview.text()).toContain('M')
        expect(preview.text()).not.toContain('Value 1')
        expect(preview.text()).not.toContain('Value 2')
    })

    it('renders existing option preview using real values (dropdown)', () => {
        const wrapper = mount(ProductOptionsEditor, {
            props: {
                productId: 'prod_1',
                options: [
                    {
                        id: 'opt_color',
                        name: 'Color',
                        displayType: 'dropdown',
                        values: [
                            { id: 'red', label: 'Red' },
                            { id: 'blue', label: 'Blue' }
                        ]
                    }
                ]
            },
            global: {
                stubs: {
                    BaseSelect: true,
                    Icon: true,
                    AdminConfirmModal: true,
                    TransitionRoot: true,
                    TransitionChild: true,
                    Dialog: true,
                    DialogPanel: true,
                    DialogTitle: true
                }
            }
        })

        const preview = wrapper.get('[data-testid="option-preview-opt_color"]')
        expect(preview.text()).toContain('Red')
        expect(preview.text()).toContain('Blue')
    })
})

