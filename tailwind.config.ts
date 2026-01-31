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
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
                serif: ['Playfair Display', 'serif'],
                stationery: ['Merriweather', 'serif'],
                street: ['Anton', 'sans-serif'],
                cozy: ['Nunito', 'sans-serif'],
                cyber: ['Orbitron', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
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
                }
            },
            boxShadow: {
                'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
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
    plugins: [],
}
