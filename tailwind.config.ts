import tailwindForms from '@tailwindcss/forms'

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./components/**/*.{js,vue,ts}",
        "./layouts/**/*.vue",
        "./pages/**/*.vue",
        "./plugins/**/*.{js,ts}",
        "./app.vue",
        "./error.vue",
    ],
    theme: {
        extend: {
            /*
             * The admin runs denser than Tailwind's default scale starts, so it
             * had grown 16 one-off `text-[9.5px]`-style sizes. These two steps
             * are what was actually missing below `text-xs`; everything else
             * maps onto the stock scale. See docs/design-system.md.
             */
            fontSize: {
                micro: ['10px', { lineHeight: '14px' }],
                mini: ['11px', { lineHeight: '16px' }],
            },
            fontFamily: {
                sans: ['DM Sans', 'system-ui', 'sans-serif'],
                display: ['Outfit', 'system-ui', 'sans-serif'],
                mono: ['Geist Mono', 'JetBrains Mono', 'monospace'],
                serif: ['Alice', 'serif'],
                stationery: ['Merriweather', 'serif'],
                street: ['Anton', 'sans-serif'],
                // Cozy (slow-living editorial magazine): Newsreader is the display/body
                // serif voice, Hanken Grotesk sets the UI + label microtype.
                cozy: ['Newsreader', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
                cozyUi: ['Hanken Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                food: ['Nunito', 'sans-serif'],
                // Playful (candy kawaii): Baloo 2 is the rounded display voice,
                // Nunito carries body + UI microtype.
                playful: ['Baloo 2', 'Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
                playfulBody: ['Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
                cyber: ['Orbitron', 'sans-serif'],
                jetbrains: ['JetBrains Mono', 'monospace'],
                // Wellness (apothecary): Archivo carries UI + body, Fraunces is the
                // display voice, Archivo Narrow sets the label/data microtype.
                wellness: ['Archivo', 'system-ui', 'sans-serif'],
                wellnessDisplay: ['Fraunces', 'Solway', 'serif'],
                wellnessLabel: ['Archivo Narrow', 'Archivo', 'sans-serif'],
                cinematic: ['Geist', 'system-ui', 'sans-serif'],
                cinematicDisplay: ['Geist', 'system-ui', 'sans-serif'],
            },
            colors: {
                brand: {
                    50: 'color-mix(in srgb, var(--brand), white 95%)',
                    100: 'color-mix(in srgb, var(--brand), white 90%)',
                    200: 'color-mix(in srgb, var(--brand), white 80%)',
                    300: 'color-mix(in srgb, var(--brand), white 60%)',
                    400: 'color-mix(in srgb, var(--brand), white 30%)',
                    500: 'rgb(var(--brand-rgb) / <alpha-value>)',
                    600: 'rgb(var(--brand-rgb) / <alpha-value>)', // Primary
                    700: 'color-mix(in srgb, var(--brand), black 10%)',
                    800: 'color-mix(in srgb, var(--brand), black 30%)',
                    900: 'color-mix(in srgb, var(--brand), black 50%)',
                    950: 'color-mix(in srgb, var(--brand), black 70%)',
                },
                navy: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a', // Footer Background
                    950: '#020617',
                },
                indigo: { // Keeping for backward compatibility if needed, or aliased
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                    950: '#1e1b4b',
                },
                slate: {
                    850: '#151e2e', // Custom deep slate
                },
                // Wellness (herbarium apothecary). Light ground throughout —
                // the one dark surface is the footer. Fixed on purpose: the
                // tenant's --brand stays an accent so any brand colour works
                // on top of the house palette.
                wl: {
                    paper: '#F1F2EC',    // page ground, label stock with a green cast
                    card: '#FCFCF9',     // raised surfaces: header, cards, drawers
                    linen: '#F7F5EC',    // warm alternate ground, one step off paper
                    tint: '#E7EADC',     // quiet botanical wash, between paper and rule
                    ink: '#1B1A16',      // primary type, solid buttons
                    muted: '#6E6E62',    // secondary type, units
                    rule: '#D4D5CB',     // the hairline everything is built on
                    ruleStrong: '#B6B7AA',
                    /*
                      Accents from the attarine — the herbalist's stall. Fixed,
                      like the neutrals, because each one carries a meaning the
                      tenant's --brand must not be able to overwrite:
                      olive is the house, saffron cautions, henna marks a price
                      that came down, zellige is the deep ground.
                    */
                    olive: '#6E7A33',      // pressed-oil green: the house hue
                    oliveDeep: '#4E5722',  // olive that holds AA on paper
                    oliveSoft: '#A3AC7A',
                    oliveWash: '#E3E7D2',
                    zellige: '#16413E',    // glazed tile green-blue: inverted grounds
                    zelligeDeep: '#0E2C2A',
                    saffron: '#8E6114',    // caution: low stock, time running out (AA on paper)
                    saffronWash: '#F3EAD5',
                    henna: '#8E3B26',      // markdowns, and nothing else
                    hennaWash: '#EFDFD8',
                    alert: '#B3261E',      // a form that failed: the only true red
                    alertWash: '#F7E3E0',
                },
                lime: {
                    neon: '#C6F432',
                },
            },
            boxShadow: {
                'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                // Wellness shadows are cast in the deep tile green, not black, so
                // raised paper never looks like it floats over a grey studio.
                'wl': '0 1px 1px rgba(27, 26, 22, 0.03), 0 10px 26px -18px rgba(22, 65, 62, 0.32)',
                'wl-lg': '0 2px 3px rgba(27, 26, 22, 0.04), 0 28px 60px -30px rgba(22, 65, 62, 0.45)',
            },
            animation: {
                marquee: 'marquee 25s linear infinite',
            },
            keyframes: {
                marquee: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                }
            }
        },
    },
    plugins: [
        tailwindForms,
        function ({ addUtilities, addVariant }: any) {
            addVariant('rtl', '[dir="rtl"] &')
            addVariant('ltr', '[dir="ltr"] &')

            const newUtilities = {
                '.scrollbar-hide': {
                    /* IE and Edge */
                    '-ms-overflow-style': 'none',
                    /* Firefox */
                    'scrollbar-width': 'none',
                    /* Safari and Chrome */
                    '&::-webkit-scrollbar': {
                        display: 'none'
                    }
                }
            }
            addUtilities(newUtilities)
        }
    ],
}
