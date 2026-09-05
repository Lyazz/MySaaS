import type { TemplateKey } from '~/components/storefront/templates/registry'

/**
 * Presentation data for the onboarding gallery: each theme's own palette, radius
 * and typeface, so a card looks like the thing it selects rather than like every
 * other card. Purely cosmetic -- the themes themselves stay the source of truth
 * for what actually renders.
 *
 * `audiences` drives the "what do you sell?" filter. A theme may serve several.
 */
export type TemplateAudience = 'fashion' | 'beauty' | 'food' | 'tech' | 'home' | 'kids'

export interface TemplateSpecimen {
  label: string
  color: string
  bg: string
  textColor: string
  btnText: string
  radius: string
  fontStyle: string
  audiences: TemplateAudience[]
}

export const TEMPLATE_SPECIMENS: Record<TemplateKey, TemplateSpecimen> = {
  classic: {
    label: 'Classic', color: '#0F172A', bg: '#F8FAFC', textColor: '#0F172A', btnText: '#FFFFFF',
    radius: '4px', fontStyle: "'Alice', serif", audiences: ['fashion', 'home']
  },
  modern: {
    label: 'Modern', color: '#0D9488', bg: '#F8FAFC', textColor: '#475569', btnText: '#FFFFFF',
    radius: '8px', fontStyle: "'Outfit', ui-sans-serif, system-ui, sans-serif", audiences: ['fashion', 'tech', 'home']
  },
  interior: {
    label: 'Interior', color: '#10B981', bg: '#F7F7F5', textColor: '#1F2937', btnText: '#FFFFFF',
    radius: '8px', fontStyle: "'Outfit', ui-sans-serif, system-ui, sans-serif", audiences: ['home']
  },
  minimal: {
    label: 'Minimal', color: '#111827', bg: '#FFFFFF', textColor: '#374151', btnText: '#FFFFFF',
    radius: '4px', fontStyle: "'Outfit', ui-sans-serif, system-ui, sans-serif", audiences: ['fashion', 'home', 'tech']
  },
  street: {
    label: 'Street', color: '#FACC15', bg: '#FFFFFF', textColor: '#000000', btnText: '#000000',
    radius: '0px', fontStyle: "'Anton', sans-serif", audiences: ['fashion']
  },
  cozy: {
    label: 'Cozy', color: '#A4C3B2', bg: '#F5F2EA', textColor: '#475569', btnText: '#FFFFFF',
    radius: '16px', fontStyle: "'Nunito', sans-serif", audiences: ['home', 'beauty']
  },
  cyber: {
    label: 'Cyber', color: '#F43F5E', bg: '#0D0515', textColor: '#E9D5FF', btnText: '#FFFFFF',
    radius: '4px', fontStyle: "'Orbitron', sans-serif", audiences: ['tech']
  },
  stationnery: {
    label: 'Stationery', color: '#334155', bg: '#FDFBF7', textColor: '#1E293B', btnText: '#FDFBF7',
    radius: '2px', fontStyle: "'Merriweather', serif", audiences: ['home', 'kids']
  },
  food: {
    label: 'Food', color: '#EA580C', bg: '#F5F5F4', textColor: '#292524', btnText: '#FFFFFF',
    radius: '12px', fontStyle: "'Nunito', sans-serif", audiences: ['food']
  },
  wellness: {
    label: 'Wellness', color: '#84CC16', bg: '#F1F2EC', textColor: '#1B1A16', btnText: '#F1F2EC',
    radius: '0px', fontStyle: "'Fraunces', ui-serif, Georgia, serif", audiences: ['beauty', 'food']
  },
  playful: {
    label: 'Playful', color: '#ED5A96', bg: '#FFF6FA', textColor: '#4A2E4D', btnText: '#FFFFFF',
    radius: '30px', fontStyle: "'Baloo 2', 'Nunito', sans-serif", audiences: ['kids']
  },
  activewear: {
    label: 'Activewear', color: '#EAB308', bg: '#000000', textColor: '#D1D5DB', btnText: '#000000',
    radius: '0px', fontStyle: "'Teko', sans-serif", audiences: ['fashion']
  },
  chrono: {
    label: 'Chrono Luxe', color: '#A67C52', bg: '#0E1117', textColor: '#E8E0D5', btnText: '#FFFFFF',
    radius: '2px', fontStyle: "'Cormorant Garamond', serif", audiences: ['fashion', 'tech']
  },
  maison: {
    label: 'Pistachio', color: '#0B4A25', bg: '#FAF2E3', textColor: '#1C2318', btnText: '#FFFBF0',
    radius: '28px', fontStyle: "'Fraunces', serif", audiences: ['food', 'home']
  },
  arena: {
    label: 'Arena', color: '#00B8FC', bg: '#030508', textColor: '#E2E8F0', btnText: '#02060A',
    radius: '6px', fontStyle: "'Outfit', ui-sans-serif, system-ui, sans-serif", audiences: ['tech']
  },
  nour: {
    label: 'Nour Élégance', color: '#7A3B46', bg: '#FAF3EA', textColor: '#2E1E20', btnText: '#FFFDF9',
    radius: '20px', fontStyle: "'Marcellus', serif", audiences: ['fashion']
  },
  embellir: {
    label: 'Embellir', color: '#0E3F3A', bg: '#F2ECE1', textColor: '#16211E', btnText: '#FDFAF4',
    radius: '2px', fontStyle: "'Bodoni Moda', Didot, serif", audiences: ['beauty']
  }
}

/**
 * Teko, Cormorant, Marcellus and Bodoni Moda ship only inside the storefront
 * themes that use them, so the gallery loads them itself; without this the
 * specimens fall back to a system serif and misrepresent the theme.
 */
export const TEMPLATE_SPECIMEN_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,500&family=Cormorant+Garamond:wght@400;500;600&family=Marcellus&family=Teko:wght@400;500;600&display=swap'
