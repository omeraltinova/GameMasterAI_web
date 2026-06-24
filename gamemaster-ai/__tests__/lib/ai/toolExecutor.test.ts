import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ToolCall } from '@/lib/ai/tools'

// vi.hoisted ile mock objeleri vi.mock hoisting'den önce oluşturulur
const { mockNPC, mockCharacter, mockInventoryItem } = vi.hoisted(() => ({
  mockNPC: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  mockCharacter: {
    findUnique: vi.fn(),
  },
  mockInventoryItem: {
    create: vi.fn(),
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    nPC: mockNPC,
    character: mockCharacter,
    inventoryItem: mockInventoryItem,
  },
}))

// Mock sonrası import
import { executeToolCall, executeToolCalls } from '@/lib/ai/toolExecutor'

// Helper: ToolCall oluşturucu
function makeToolCall(name: string, args: Record<string, any>): ToolCall {
  return {
    id: `call_${name}_${Date.now()}`,
    type: 'function',
    function: {
      name,
      arguments: JSON.stringify(args),
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

// ==========================================
// create_npc
// ==========================================
describe('executeToolCall - create_npc', () => {
  const sessionId = 'session-123'

  it('yeni NPC oluşturur', async () => {
    mockNPC.findFirst.mockResolvedValue(null)
    mockNPC.create.mockResolvedValue({
      id: 'npc-1',
      name: 'Rodrick',
      role: 'Tavern Keeper',
      sessionId,
    })

    const result = await executeToolCall(
      makeToolCall('create_npc', { name: 'Rodrick', role: 'Tavern Keeper' }),
      sessionId
    )

    expect(result.success).toBe(true)
    expect(result.toolName).toBe('create_npc')
    expect(result.result.npcId).toBe('npc-1')
    expect(result.result.isNew).toBe(true)
    expect(mockNPC.create).toHaveBeenCalledOnce()
  })

  it('aynı isimde NPC varsa mevcut olanı döner', async () => {
    mockNPC.findFirst.mockResolvedValue({
      id: 'npc-existing',
      name: 'Rodrick',
      sessionId,
    })

    const result = await executeToolCall(
      makeToolCall('create_npc', { name: 'Rodrick', role: 'Tavern Keeper' }),
      sessionId
    )

    expect(result.success).toBe(true)
    expect(result.result.isNew).toBe(false)
    expect(result.result.npcId).toBe('npc-existing')
    expect(mockNPC.create).not.toHaveBeenCalled()
  })

  it('opsiyonel alanları (race, personality, isHostile) iletir', async () => {
    mockNPC.findFirst.mockResolvedValue(null)
    mockNPC.create.mockResolvedValue({
      id: 'npc-2',
      name: 'Elara',
      role: 'Mage',
    })

    await executeToolCall(
      makeToolCall('create_npc', {
        name: 'Elara',
        role: 'Mage',
        race: 'Elf',
        personality: 'Mysterious',
        isHostile: true,
      }),
      sessionId
    )

    expect(mockNPC.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Elara',
        role: 'Mage',
        race: 'Elf',
        personality: 'Mysterious',
        isHostile: true,
      }),
    })
  })

  it('opsiyonel alanlar yoksa null/false kullanır', async () => {
    mockNPC.findFirst.mockResolvedValue(null)
    mockNPC.create.mockResolvedValue({ id: 'npc-3', name: 'Guard' })

    await executeToolCall(
      makeToolCall('create_npc', { name: 'Guard', role: 'Guard' }),
      sessionId
    )

    expect(mockNPC.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        race: null,
        personality: null,
        isHostile: false,
        // Non-hostile NPC with no stats → null (not auto-statted)
        stats: null,
      }),
    })
  })

  it('düşman NPC için sağlanan hp/ac değerlerini sınırlandırarak saklar', async () => {
    mockNPC.findFirst.mockResolvedValue(null)
    mockNPC.create.mockResolvedValue({ id: 'npc-4', name: 'Ogre' })

    await executeToolCall(
      makeToolCall('create_npc', {
        name: 'Ogre',
        role: 'Brute',
        isHostile: true,
        hp: 59,
        ac: 14,
      }),
      sessionId
    )

    const createArg = mockNPC.create.mock.calls[0][0]
    expect(JSON.parse(createArg.data.stats)).toEqual({ hp: 59, maxHp: 59, ac: 14 })
  })

  it('düşman NPC stat vermezse varsayılan savaş bloğu atanır', async () => {
    mockNPC.findFirst.mockResolvedValue(null)
    mockNPC.create.mockResolvedValue({ id: 'npc-5', name: 'Goblin' })

    await executeToolCall(
      makeToolCall('create_npc', { name: 'Goblin', role: 'Scout', isHostile: true }),
      sessionId
    )

    const createArg = mockNPC.create.mock.calls[0][0]
    expect(JSON.parse(createArg.data.stats)).toEqual({ hp: 10, maxHp: 10, ac: 10 })
  })
})

// ==========================================
// update_npc
// ==========================================
describe('executeToolCall - update_npc', () => {
  const sessionId = 'session-123'

  it('NPC personality günceller', async () => {
    mockNPC.findUnique.mockResolvedValue({
      id: 'npc-1',
      sessionId,
      name: 'Rodrick',
      dialogue: null,
    })
    mockNPC.update.mockResolvedValue({})

    const result = await executeToolCall(
      makeToolCall('update_npc', { npcId: 'npc-1', personality: 'Angry' }),
      sessionId
    )

    expect(result.success).toBe(true)
    expect(result.result.updated).toBe(true)
    expect(mockNPC.update).toHaveBeenCalledWith({
      where: { id: 'npc-1' },
      data: { personality: 'Angry' },
    })
  })

  it('NPC bulunamazsa hata döner', async () => {
    mockNPC.findUnique.mockResolvedValue(null)

    const result = await executeToolCall(
      makeToolCall('update_npc', { npcId: 'non-existent' }),
      sessionId
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('NPC not found')
  })

  it('farklı session daki NPC ye erişimi engeller', async () => {
    mockNPC.findUnique.mockResolvedValue({
      id: 'npc-1',
      sessionId: 'other-session',
    })

    const result = await executeToolCall(
      makeToolCall('update_npc', { npcId: 'npc-1' }),
      sessionId
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('NPC not found')
  })

  it('güncelleme verisi yoksa updated=false döner', async () => {
    mockNPC.findUnique.mockResolvedValue({
      id: 'npc-1',
      sessionId,
      dialogue: null,
    })

    const result = await executeToolCall(
      makeToolCall('update_npc', { npcId: 'npc-1' }),
      sessionId
    )

    expect(result.success).toBe(true)
    expect(result.result.updated).toBe(false)
    expect(mockNPC.update).not.toHaveBeenCalled()
  })

  it('dialogue ekler (mevcut dialogue a append)', async () => {
    mockNPC.findUnique.mockResolvedValue({
      id: 'npc-1',
      sessionId,
      name: 'Rodrick',
      dialogue: JSON.stringify([{ text: 'Hello', timestamp: '2026-01-01' }]),
    })
    mockNPC.update.mockResolvedValue({})

    const result = await executeToolCall(
      makeToolCall('update_npc', { npcId: 'npc-1', addDialogue: 'Farewell!' }),
      sessionId
    )

    expect(result.success).toBe(true)
    const updateCall = mockNPC.update.mock.calls[0][0]
    const dialogueData = JSON.parse(updateCall.data.dialogue)
    expect(dialogueData).toHaveLength(2)
    expect(dialogueData[0].text).toBe('Hello')
    expect(dialogueData[1].text).toBe('Farewell!')
  })

  it('isHostile günceller', async () => {
    mockNPC.findUnique.mockResolvedValue({
      id: 'npc-1',
      sessionId,
      name: 'Rodrick',
      dialogue: null,
    })
    mockNPC.update.mockResolvedValue({})

    await executeToolCall(
      makeToolCall('update_npc', { npcId: 'npc-1', isHostile: true }),
      sessionId
    )

    expect(mockNPC.update).toHaveBeenCalledWith({
      where: { id: 'npc-1' },
      data: { isHostile: true },
    })
  })
})

// ==========================================
// give_item
// ==========================================
describe('executeToolCall - give_item', () => {
  const sessionId = 'session-123'
  const characterId = 'char-1'

  it('karaktere eşya verir', async () => {
    mockCharacter.findUnique.mockResolvedValue({
      id: characterId,
      name: 'Alderan',
    })
    mockInventoryItem.create.mockResolvedValue({
      id: 'item-1',
      name: 'Healing Potion',
      quantity: 1,
    })

    const result = await executeToolCall(
      makeToolCall('give_item', { itemName: 'Healing Potion', itemType: 'Potion' }),
      sessionId,
      characterId
    )

    expect(result.success).toBe(true)
    expect(result.result.itemName).toBe('Healing Potion')
    expect(result.result.quantity).toBe(1)
  })

  it('characterId yoksa hata döner', async () => {
    const result = await executeToolCall(
      makeToolCall('give_item', { itemName: 'Sword', itemType: 'Weapon' }),
      sessionId
      // characterId yok
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('No character specified')
  })

  it('karakter bulunamazsa hata döner', async () => {
    mockCharacter.findUnique.mockResolvedValue(null)

    const result = await executeToolCall(
      makeToolCall('give_item', { itemName: 'Sword', itemType: 'Weapon' }),
      sessionId,
      'non-existent-char'
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('Character not found')
  })

  it('quantity belirtilirse iletir, yoksa 1 kullanır', async () => {
    mockCharacter.findUnique.mockResolvedValue({ id: characterId, name: 'Hero' })
    mockInventoryItem.create.mockResolvedValue({
      id: 'item-2',
      name: 'Arrow',
      quantity: 20,
    })

    await executeToolCall(
      makeToolCall('give_item', { itemName: 'Arrow', itemType: 'Misc', quantity: 20 }),
      sessionId,
      characterId
    )

    expect(mockInventoryItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Arrow',
        quantity: 20,
      }),
    })
  })

  it('description opsiyonel olarak iletilir', async () => {
    mockCharacter.findUnique.mockResolvedValue({ id: characterId, name: 'Hero' })
    mockInventoryItem.create.mockResolvedValue({ id: 'item-3', name: 'Ring', quantity: 1 })

    await executeToolCall(
      makeToolCall('give_item', {
        itemName: 'Enchanted Ring',
        itemType: 'Treasure',
        description: 'A mysterious ring',
      }),
      sessionId,
      characterId
    )

    expect(mockInventoryItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: 'A mysterious ring',
      }),
    })
  })

  it('equip-slot tiplerini (Helmet) korur, geçersiz tipi Misc yapar', async () => {
    mockCharacter.findUnique.mockResolvedValue({ id: characterId, name: 'Hero' })
    mockInventoryItem.create.mockResolvedValue({ id: 'item-4', name: 'Iron Helm', quantity: 1 })

    await executeToolCall(
      makeToolCall('give_item', { itemName: 'Iron Helm', itemType: 'Helmet' }),
      sessionId,
      characterId
    )
    expect(mockInventoryItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'Iron Helm', type: 'Helmet' }),
    })

    mockInventoryItem.create.mockClear()
    mockInventoryItem.create.mockResolvedValue({ id: 'item-5', name: 'Junk', quantity: 1 })
    await executeToolCall(
      makeToolCall('give_item', { itemName: 'Junk', itemType: 'NotARealType' }),
      sessionId,
      characterId
    )
    expect(mockInventoryItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'Misc' }),
    })
  })
})

// ==========================================
// request_dice_roll
// ==========================================
describe('executeToolCall - request_dice_roll', () => {
  it('zar atma isteği döner', async () => {
    const result = await executeToolCall(
      makeToolCall('request_dice_roll', {
        diceType: 'd20',
        skill: 'Perception',
        dc: 15,
        reason: 'Checking for traps',
      }),
      'session-123'
    )

    expect(result.success).toBe(true)
    expect(result.toolName).toBe('request_dice_roll')
    expect(result.result).toEqual({
      diceType: 'd20',
      skill: 'Perception',
      dc: 15,
      reason: 'Checking for traps',
    })
  })
})

// ==========================================
// Hata senaryoları
// ==========================================
describe('executeToolCall - error handling', () => {
  it('bilinmeyen tool adı için hata döner', async () => {
    const result = await executeToolCall(
      makeToolCall('unknown_tool', {}),
      'session-123'
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unknown tool: unknown_tool')
  })

  it('geçersiz JSON arguments için hata döner', async () => {
    const result = await executeToolCall(
      {
        id: 'call-1',
        type: 'function',
        function: { name: 'create_npc', arguments: 'invalid-json{{{' },
      },
      'session-123'
    )

    expect(result.success).toBe(false)
    expect(result.toolName).toBe('create_npc')
    expect(result.error).toBeDefined()
  })

  it('Prisma hatası yakalanır', async () => {
    mockNPC.findFirst.mockRejectedValue(new Error('DB connection failed'))

    const result = await executeToolCall(
      makeToolCall('create_npc', { name: 'Test', role: 'Test' }),
      'session-123'
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('DB connection failed')
  })
})

// ==========================================
// executeToolCalls - toplu çalıştırma
// ==========================================
describe('executeToolCalls', () => {
  it('birden fazla tool call sırayla çalıştırır', async () => {
    mockNPC.findFirst.mockResolvedValue(null)
    mockNPC.create.mockResolvedValue({ id: 'npc-1', name: 'Guard', role: 'Guard' })

    const toolCalls = [
      makeToolCall('create_npc', { name: 'Guard', role: 'Guard' }),
      makeToolCall('request_dice_roll', { diceType: 'd20', skill: 'Stealth', dc: 12, reason: 'Sneaking past' }),
    ]

    const results = await executeToolCalls(toolCalls, 'session-123')

    expect(results).toHaveLength(2)
    expect(results[0].success).toBe(true)
    expect(results[0].toolName).toBe('create_npc')
    expect(results[1].success).toBe(true)
    expect(results[1].toolName).toBe('request_dice_roll')
  })

  it('boş array için boş sonuç döner', async () => {
    const results = await executeToolCalls([], 'session-123')
    expect(results).toHaveLength(0)
  })

  it('bir tool hata verse bile diğerleri çalışır', async () => {
    const toolCalls = [
      makeToolCall('unknown_tool', {}),
      makeToolCall('request_dice_roll', { diceType: 'd20', skill: 'STR', dc: 10, reason: 'test' }),
    ]

    const results = await executeToolCalls(toolCalls, 'session-123')

    expect(results).toHaveLength(2)
    expect(results[0].success).toBe(false)
    expect(results[1].success).toBe(true)
  })
})
