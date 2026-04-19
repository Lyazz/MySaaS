import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import SafeRichText from '~/components/common/SafeRichText.vue'

describe('SafeRichText', () => {
    it('sanitizes unsafe HTML before rendering', () => {
        const wrapper = mount(SafeRichText, {
            props: {
                html: `<p>hello</p><script>alert(1)</script><a href="javascript:alert(2)">x</a>`
            }
        })

        const html = wrapper.html()
        expect(html).toContain('<p>hello</p>')
        expect(html).not.toContain('<script')
        expect(html).not.toContain('javascript:')
    })
})
