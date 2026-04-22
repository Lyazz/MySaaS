export type MarketingTone = 'cobalt' | 'teal' | 'orange' | 'neutral'

export interface MarketingStat {
  label: string
  value: string
  detail?: string
  icon?: string
  tone?: MarketingTone
}

export interface MarketingBullet {
  label: string
  icon?: string
}

export interface MarketingChapter {
  eyebrow?: string
  title: string
  description: string
  icon?: string
  tone?: MarketingTone
  bullets?: MarketingBullet[]
  stats?: MarketingStat[]
}

