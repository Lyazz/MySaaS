/**
 * The storefront themes as the marketing gallery lists them.
 *
 * What a theme *looks like* is not described here on purpose. The /themes page
 * shows a real screenshot of the theme's own demo store — captured from the
 * running app by `scripts/capture-theme-shots.mjs` into `public/themes/` — so
 * the picture cannot drift away from the storefront a merchant actually gets.
 * An earlier version of that page drew each theme as a hand-built mock, which
 * was a guess, and went stale the moment a theme was touched.
 *
 * What is left here is the handful of facts a screenshot cannot state: the
 * three colours worth naming, the face the type is set in, and the two traits
 * a visitor can filter on in their head — is it dark? is it a serif? The
 * colours come from each theme's `theme.tokens.ts` where one exists
 * (`modern`, `chrono`, `embellir`, `maison`, `nour`) and from its
 * `StoreShell` / `ThemeProvider` otherwise.
 *
 * `admin/AppearanceSettingsForm.vue` keeps its own longer copy of this table
 * for the merchant picker's thumbnails. Folding the two together is the
 * obvious follow-up, and is best done once every theme carries a manifest.
 */

/** The two traits a visitor can reason about at a glance. */
export type StoreThemeMood = 'dark' | 'light'
export type StoreThemeVoice = 'serif' | 'sans' | 'display'

export interface StoreThemeCard {
  /**
   * Registry key. Matches the folder under `components/storefront/templates/`,
   * the demo store's slug, and the screenshot at `public/themes/{key}.webp`.
   */
  key: string
  mood: StoreThemeMood
  voice: StoreThemeVoice
  /** The display face, named on the card. */
  fontName: string
  /** Page ground, primary type, house hue — the three swatches on the card. */
  swatches: [bg: string, ink: string, brand: string]
}

export const STORE_THEMES: StoreThemeCard[] = [
  {
    key: 'modern',
    mood: 'light',
    voice: 'sans',
    fontName: 'Outfit',
    swatches: ['#F8FAFC', '#0F172A', '#0D9488']
  },
  {
    key: 'classic',
    mood: 'light',
    voice: 'serif',
    fontName: 'Alice',
    swatches: ['#F8FAFC', '#0F172A', '#0F172A']
  },
  {
    key: 'street',
    mood: 'light',
    voice: 'display',
    fontName: 'Anton',
    swatches: ['#FFFFFF', '#000000', '#FACC15']
  },
  {
    key: 'food',
    mood: 'light',
    voice: 'sans',
    fontName: 'Nunito',
    swatches: ['#F5F5F4', '#292524', '#EA580C']
  },
  {
    key: 'wellness',
    mood: 'light',
    voice: 'serif',
    fontName: 'Fraunces',
    swatches: ['#F1F2EC', '#1B1A16', '#84CC16']
  },
  {
    key: 'cozy',
    mood: 'light',
    voice: 'sans',
    fontName: 'Nunito',
    swatches: ['#F5F2EA', '#3F3A33', '#A4C3B2']
  },
  {
    key: 'cyber',
    mood: 'dark',
    voice: 'display',
    fontName: 'Orbitron',
    swatches: ['#0D0515', '#F5E9FF', '#F43F5E']
  },
  {
    key: 'stationnery',
    mood: 'light',
    voice: 'serif',
    fontName: 'Merriweather',
    swatches: ['#FDFBF7', '#1E293B', '#334155']
  },
  {
    key: 'playful',
    mood: 'light',
    voice: 'sans',
    fontName: 'Baloo 2',
    swatches: ['#FFF6FA', '#4A2E4D', '#ED5A96']
  },
  {
    key: 'activewear',
    mood: 'dark',
    voice: 'display',
    fontName: 'Teko',
    swatches: ['#000000', '#F5F5F5', '#EAB308']
  },
  {
    key: 'arena',
    mood: 'dark',
    voice: 'sans',
    fontName: 'Outfit',
    swatches: ['#030508', '#E2E8F0', '#00B8FC']
  },
  {
    key: 'chrono',
    mood: 'dark',
    voice: 'serif',
    fontName: 'Cormorant Garamond',
    swatches: ['#0E1117', '#E8E0D5', '#A67C52']
  },
  {
    key: 'maison',
    mood: 'light',
    voice: 'serif',
    fontName: 'Fraunces',
    swatches: ['#FAF2E3', '#1C2318', '#0B4A25']
  },
  {
    key: 'nour',
    mood: 'light',
    voice: 'serif',
    fontName: 'Marcellus',
    swatches: ['#FAF3EA', '#2E1E20', '#7A3B46']
  },
  {
    key: 'embellir',
    mood: 'light',
    voice: 'serif',
    fontName: 'Bodoni Moda',
    swatches: ['#F2ECE1', '#16211E', '#0E3F3A']
  }
]
