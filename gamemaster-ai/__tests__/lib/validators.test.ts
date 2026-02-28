import { describe, it, expect } from 'vitest'
import {
  registerSchema,
  passwordChangeSchema,
} from '@/lib/validators/auth'
import {
  characterStatsSchema,
  characterCreateSchema,
  characterHpUpdateSchema,
} from '@/lib/validators/characters'

// ==========================================
// registerSchema
// ==========================================
describe('registerSchema', () => {
  const validInput = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
  }

  it('geçerli input kabul eder', () => {
    const result = registerSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('username 3 karakterden kısa olursa reddeder', () => {
    const result = registerSchema.safeParse({ ...validInput, username: 'ab' })
    expect(result.success).toBe(false)
  })

  it('username 32 karakterden uzun olursa reddeder', () => {
    const result = registerSchema.safeParse({ ...validInput, username: 'a'.repeat(33) })
    expect(result.success).toBe(false)
  })

  it('username tam 3 karakter kabul eder', () => {
    const result = registerSchema.safeParse({ ...validInput, username: 'abc' })
    expect(result.success).toBe(true)
  })

  it('username tam 32 karakter kabul eder', () => {
    const result = registerSchema.safeParse({ ...validInput, username: 'a'.repeat(32) })
    expect(result.success).toBe(true)
  })

  it('geçersiz email reddeder', () => {
    const result = registerSchema.safeParse({ ...validInput, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('boş email reddeder', () => {
    const result = registerSchema.safeParse({ ...validInput, email: '' })
    expect(result.success).toBe(false)
  })

  it('password 6 karakterden kısa olursa reddeder', () => {
    const result = registerSchema.safeParse({ ...validInput, password: '12345' })
    expect(result.success).toBe(false)
  })

  it('password 128 karakterden uzun olursa reddeder', () => {
    const result = registerSchema.safeParse({ ...validInput, password: 'a'.repeat(129) })
    expect(result.success).toBe(false)
  })

  it('password tam 6 karakter kabul eder', () => {
    const result = registerSchema.safeParse({ ...validInput, password: '123456' })
    expect(result.success).toBe(true)
  })

  it('eksik alan olursa reddeder', () => {
    const result = registerSchema.safeParse({ username: 'test' })
    expect(result.success).toBe(false)
  })
})

// ==========================================
// passwordChangeSchema
// ==========================================
describe('passwordChangeSchema', () => {
  const validInput = {
    currentPassword: 'oldpass123',
    newPassword: 'newpass456',
    confirmPassword: 'newpass456',
  }

  it('geçerli input kabul eder', () => {
    const result = passwordChangeSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('şifreler eşleşmezse reddeder', () => {
    const result = passwordChangeSchema.safeParse({
      ...validInput,
      confirmPassword: 'farkli_sifre',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const confirmError = result.error.issues.find(i => i.path.includes('confirmPassword'))
      expect(confirmError).toBeDefined()
      expect(confirmError?.message).toBe('Yeni sifreler eslesmiyor')
    }
  })

  it('currentPassword 6 karakterden kısa olursa reddeder', () => {
    const result = passwordChangeSchema.safeParse({
      ...validInput,
      currentPassword: '12345',
    })
    expect(result.success).toBe(false)
  })

  it('newPassword 6 karakterden kısa olursa reddeder', () => {
    const result = passwordChangeSchema.safeParse({
      ...validInput,
      newPassword: '12345',
      confirmPassword: '12345',
    })
    expect(result.success).toBe(false)
  })

  it('newPassword 128 karakterden uzun olursa reddeder', () => {
    const longPass = 'a'.repeat(129)
    const result = passwordChangeSchema.safeParse({
      ...validInput,
      newPassword: longPass,
      confirmPassword: longPass,
    })
    expect(result.success).toBe(false)
  })
})

// ==========================================
// characterStatsSchema
// ==========================================
describe('characterStatsSchema', () => {
  const validStats = {
    strength: 15,
    dexterity: 14,
    constitution: 13,
    intelligence: 12,
    wisdom: 10,
    charisma: 8,
  }

  it('geçerli stats kabul eder', () => {
    const result = characterStatsSchema.safeParse(validStats)
    expect(result.success).toBe(true)
  })

  it('eksik stat olursa reddeder', () => {
    const { charisma, ...incomplete } = validStats
    const result = characterStatsSchema.safeParse(incomplete)
    expect(result.success).toBe(false)
  })

  it('ondalıklı sayı reddeder (integer zorunlu)', () => {
    const result = characterStatsSchema.safeParse({ ...validStats, strength: 15.5 })
    expect(result.success).toBe(false)
  })

  it('string değer reddeder', () => {
    const result = characterStatsSchema.safeParse({ ...validStats, strength: 'fifteen' })
    expect(result.success).toBe(false)
  })

  it('negatif değer kabul eder (schema sınırı yok)', () => {
    const result = characterStatsSchema.safeParse({ ...validStats, strength: -1 })
    expect(result.success).toBe(true)
  })
})

// ==========================================
// characterCreateSchema
// ==========================================
describe('characterCreateSchema', () => {
  const validCharacter = {
    name: 'Alderan',
    race: 'Human',
    class: 'Wizard',
  }

  it('minimum alanlarla geçerli karakter kabul eder', () => {
    const result = characterCreateSchema.safeParse(validCharacter)
    expect(result.success).toBe(true)
  })

  it('tüm alanlar dolu geçerli karakter kabul eder', () => {
    const full = {
      ...validCharacter,
      level: 5,
      experience: 6500,
      hp: 30,
      maxHp: 40,
      stats: {
        strength: 10, dexterity: 14, constitution: 12,
        intelligence: 18, wisdom: 15, charisma: 11,
      },
      background: 'Sage',
      appearance: 'Tall with grey robes',
      backstory: 'A powerful wizard from the East',
      imageUrl: 'https://example.com/alderan.png',
    }
    const result = characterCreateSchema.safeParse(full)
    expect(result.success).toBe(true)
  })

  it('boş isim reddeder', () => {
    const result = characterCreateSchema.safeParse({ ...validCharacter, name: '' })
    expect(result.success).toBe(false)
  })

  it('boş race reddeder', () => {
    const result = characterCreateSchema.safeParse({ ...validCharacter, race: '' })
    expect(result.success).toBe(false)
  })

  it('boş class reddeder', () => {
    const result = characterCreateSchema.safeParse({ ...validCharacter, class: '' })
    expect(result.success).toBe(false)
  })

  it('level 0 reddeder (min 1)', () => {
    const result = characterCreateSchema.safeParse({ ...validCharacter, level: 0 })
    expect(result.success).toBe(false)
  })

  it('level 21 reddeder (max 20)', () => {
    const result = characterCreateSchema.safeParse({ ...validCharacter, level: 21 })
    expect(result.success).toBe(false)
  })

  it('level 1 kabul eder', () => {
    const result = characterCreateSchema.safeParse({ ...validCharacter, level: 1 })
    expect(result.success).toBe(true)
  })

  it('level 20 kabul eder', () => {
    const result = characterCreateSchema.safeParse({ ...validCharacter, level: 20 })
    expect(result.success).toBe(true)
  })

  it('negatif experience reddeder', () => {
    const result = characterCreateSchema.safeParse({ ...validCharacter, experience: -1 })
    expect(result.success).toBe(false)
  })

  it('maxHp 0 reddeder (min 1)', () => {
    const result = characterCreateSchema.safeParse({ ...validCharacter, maxHp: 0 })
    expect(result.success).toBe(false)
  })

  it('background null kabul eder', () => {
    const result = characterCreateSchema.safeParse({ ...validCharacter, background: null })
    expect(result.success).toBe(true)
  })

  it('backstory null kabul eder', () => {
    const result = characterCreateSchema.safeParse({ ...validCharacter, backstory: null })
    expect(result.success).toBe(true)
  })
})

// ==========================================
// characterHpUpdateSchema
// ==========================================
describe('characterHpUpdateSchema', () => {
  it('geçerli HP update kabul eder', () => {
    const result = characterHpUpdateSchema.safeParse({ hp: 25 })
    expect(result.success).toBe(true)
  })

  it('HP ve maxHp birlikte kabul eder', () => {
    const result = characterHpUpdateSchema.safeParse({ hp: 25, maxHp: 40 })
    expect(result.success).toBe(true)
  })

  it('negatif HP reddeder', () => {
    const result = characterHpUpdateSchema.safeParse({ hp: -1 })
    expect(result.success).toBe(false)
  })

  it('HP 0 kabul eder (karakter bayılabilir)', () => {
    const result = characterHpUpdateSchema.safeParse({ hp: 0 })
    expect(result.success).toBe(true)
  })

  it('maxHp 0 reddeder (min 1)', () => {
    const result = characterHpUpdateSchema.safeParse({ hp: 0, maxHp: 0 })
    expect(result.success).toBe(false)
  })

  it('HP olmadan reddeder', () => {
    const result = characterHpUpdateSchema.safeParse({ maxHp: 40 })
    expect(result.success).toBe(false)
  })

  it('ondalıklı HP reddeder', () => {
    const result = characterHpUpdateSchema.safeParse({ hp: 25.5 })
    expect(result.success).toBe(false)
  })
})
