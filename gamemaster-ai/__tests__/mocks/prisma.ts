import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'
import { vi, beforeEach } from 'vitest'

// Gerçek Prisma Client'ı mock'luyoruz
export const prismaMock = mockDeep<PrismaClient>()

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: prismaMock,
  prisma: prismaMock
}))

beforeEach(() => {
  mockReset(prismaMock)
})
