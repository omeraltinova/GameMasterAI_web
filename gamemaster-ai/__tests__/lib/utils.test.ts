import { describe, it, expect, vi } from 'vitest'
import {
  cn,
  formatDate,
  formatRelativeTime,
  generateId,
  calculateModifier,
  formatModifier,
  getProficiencyBonus,
  rollDice,
  rollAbilityScore,
} from '@/lib/utils'

// ==========================================
// calculateModifier - 5e SRD Ability Modifier
// ==========================================
describe('calculateModifier', () => {
  it('score 10 için modifier 0 döner', () => {
    expect(calculateModifier(10)).toBe(0)
  })

  it('score 11 için modifier 0 döner', () => {
    expect(calculateModifier(11)).toBe(0)
  })

  it('score 12 için modifier +1 döner', () => {
    expect(calculateModifier(12)).toBe(1)
  })

  it('score 20 için modifier +5 döner', () => {
    expect(calculateModifier(20)).toBe(5)
  })

  it('score 1 için modifier -5 döner', () => {
    expect(calculateModifier(1)).toBe(-5)
  })

  it('score 8 için modifier -1 döner', () => {
    expect(calculateModifier(8)).toBe(-1)
  })

  it('score 14 için modifier +2 döner', () => {
    expect(calculateModifier(14)).toBe(2)
  })

  it('score 15 için modifier +2 döner', () => {
    expect(calculateModifier(15)).toBe(2)
  })

  // 5e SRD standart ability score tablosu doğrulaması
  it.each([
    [1, -5], [2, -4], [3, -4], [4, -3], [5, -3],
    [6, -2], [7, -2], [8, -1], [9, -1], [10, 0],
    [11, 0], [12, 1], [13, 1], [14, 2], [15, 2],
    [16, 3], [17, 3], [18, 4], [19, 4], [20, 5],
  ])('score %i -> modifier %i', (score, expected) => {
    expect(calculateModifier(score)).toBe(expected)
  })
})

// ==========================================
// formatModifier
// ==========================================
describe('formatModifier', () => {
  it('pozitif modifier + işareti ile döner', () => {
    expect(formatModifier(3)).toBe('+3')
  })

  it('sıfır modifier + işareti ile döner', () => {
    expect(formatModifier(0)).toBe('+0')
  })

  it('negatif modifier - işareti ile döner', () => {
    expect(formatModifier(-2)).toBe('-2')
  })
})

// ==========================================
// getProficiencyBonus - 5e SRD Level tablosu
// ==========================================
describe('getProficiencyBonus', () => {
  it.each([
    [1, 2], [2, 2], [3, 2], [4, 2],
    [5, 3], [6, 3], [7, 3], [8, 3],
    [9, 4], [10, 4], [11, 4], [12, 4],
    [13, 5], [14, 5], [15, 5], [16, 5],
    [17, 6], [18, 6], [19, 6], [20, 6],
  ])('level %i -> proficiency bonus %i', (level, expected) => {
    expect(getProficiencyBonus(level)).toBe(expected)
  })
})

// ==========================================
// rollDice - Zar atma
// ==========================================
describe('rollDice', () => {
  it('varsayılan olarak 1 zar atar', () => {
    const result = rollDice(6)
    expect(result).toHaveLength(1)
  })

  it('belirtilen sayıda zar atar', () => {
    const result = rollDice(6, 4)
    expect(result).toHaveLength(4)
  })

  it('sonuçlar 1 ile sides arasında olmalı (d6)', () => {
    // 100 kez atarak istatistiksel olarak tüm aralığı kapsıyoruz
    for (let i = 0; i < 100; i++) {
      const [result] = rollDice(6)
      expect(result).toBeGreaterThanOrEqual(1)
      expect(result).toBeLessThanOrEqual(6)
    }
  })

  it('d20 sonuçları 1-20 arasında olmalı', () => {
    for (let i = 0; i < 100; i++) {
      const [result] = rollDice(20)
      expect(result).toBeGreaterThanOrEqual(1)
      expect(result).toBeLessThanOrEqual(20)
    }
  })

  it('d100 sonuçları 1-100 arasında olmalı', () => {
    for (let i = 0; i < 50; i++) {
      const [result] = rollDice(100)
      expect(result).toBeGreaterThanOrEqual(1)
      expect(result).toBeLessThanOrEqual(100)
    }
  })

  it('0 zar atılırsa boş array döner', () => {
    const result = rollDice(6, 0)
    expect(result).toHaveLength(0)
  })

  it('sabitlenmiş random ile belirli sonuç döner', () => {
    // Math.random = 0 -> floor(0 * 6) + 1 = 1
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(rollDice(6)).toEqual([1])
    vi.restoreAllMocks()
  })

  it('sabitlenmiş random ile maksimum sonuç döner', () => {
    // Math.random = 0.999 -> floor(0.999 * 6) + 1 = 6
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    expect(rollDice(6)).toEqual([6])
    vi.restoreAllMocks()
  })
})

// ==========================================
// rollAbilityScore - 4d6 drop lowest
// ==========================================
describe('rollAbilityScore', () => {
  it('sonuç 3 ile 18 arasında olmalı', () => {
    for (let i = 0; i < 100; i++) {
      const score = rollAbilityScore()
      expect(score).toBeGreaterThanOrEqual(3)
      expect(score).toBeLessThanOrEqual(18)
    }
  })

  it('4d6 atıp en düşüğü düşürür (hepsi 6 ise sonuç 18)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    expect(rollAbilityScore()).toBe(18)
    vi.restoreAllMocks()
  })

  it('4d6 atıp en düşüğü düşürür (hepsi 1 ise sonuç 3)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(rollAbilityScore()).toBe(3)
    vi.restoreAllMocks()
  })

  it('karışık zarlarla en düşüğü düşürür', () => {
    // 4d6 sonuçları: [3, 1, 4, 2] -> sort desc: [4, 3, 2, 1] -> top 3: 4+3+2 = 9
    const mockValues = [
      (3 - 1) / 6, // floor(0.333*6)+1 = 3
      (1 - 1) / 6, // floor(0*6)+1 = 1
      (4 - 1) / 6, // floor(0.5*6)+1 = 4
      (2 - 1) / 6, // floor(0.166*6)+1 = 2
    ]
    let callIndex = 0
    vi.spyOn(Math, 'random').mockImplementation(() => mockValues[callIndex++])
    expect(rollAbilityScore()).toBe(9)
    vi.restoreAllMocks()
  })
})

// ==========================================
// cn - Tailwind class merge
// ==========================================
describe('cn', () => {
  it('birden fazla class birleştirir', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
  })

  it('çakışan Tailwind class larını merge eder', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('conditional class destekler', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra')
  })

  it('boş input ile boş string döner', () => {
    expect(cn()).toBe('')
  })
})

// ==========================================
// formatDate
// ==========================================
describe('formatDate', () => {
  it('Date nesnesini Türkçe formata çevirir', () => {
    const date = new Date('2026-01-15T00:00:00')
    const result = formatDate(date)
    expect(result).toContain('2026')
    expect(result).toContain('15')
  })

  it('string tarihi kabul eder', () => {
    const result = formatDate('2026-06-20T12:00:00')
    expect(result).toContain('2026')
    expect(result).toContain('20')
  })
})

// ==========================================
// formatRelativeTime
// ==========================================
describe('formatRelativeTime', () => {
  it('"Az önce" döner (birkaç saniye önce)', () => {
    const now = new Date()
    expect(formatRelativeTime(now)).toBe('Az önce')
  })

  it('dakika cinsinden döner', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    expect(formatRelativeTime(fiveMinAgo)).toBe('5 dakika önce')
  })

  it('saat cinsinden döner', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    expect(formatRelativeTime(twoHoursAgo)).toBe('2 saat önce')
  })

  it('gün cinsinden döner', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    expect(formatRelativeTime(threeDaysAgo)).toBe('3 gün önce')
  })

  it('string tarih kabul eder', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(yesterday)).toBe('1 gün önce')
  })
})

// ==========================================
// generateId
// ==========================================
describe('generateId', () => {
  it('boş olmayan string döner', () => {
    const id = generateId()
    expect(id).toBeTruthy()
    expect(typeof id).toBe('string')
  })

  it('her çağrıda farklı ID üretir', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })

  it('9 karakter uzunluğunda olmalı', () => {
    const id = generateId()
    expect(id.length).toBe(9)
  })
})
