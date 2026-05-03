import { describe, expect, it } from 'vitest'
import {
  formatPriceAmount,
  normalizePriceInput,
  parsePriceInput
} from '../../shared/pricing/money-format'

describe('money format helpers', () => {
  it('formats numbers in fr-DZ style with 2 decimals', () => {
    expect(formatPriceAmount(245000)).toBe('245\u202f000,00')
    expect(formatPriceAmount(1500)).toBe('1\u202f500,00')
  })

  it('parses formatted strings with commas and spaces', () => {
    expect(parsePriceInput('245 000,00')).toBe(245000)
    expect(parsePriceInput('1\u202f500,25')).toBe(1500.25)
  })

  it('normalizes raw text inputs', () => {
    expect(normalizePriceInput('1500')).toBe('1\u202f500,00')
    expect(normalizePriceInput('12.5')).toBe('12,50')
  })
})
