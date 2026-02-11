import { generateTransactionSchema, generateRequestSchema } from '@/lib/import/wise-types'

describe('generateTransactionSchema', () => {
  const validTransaction = {
    description: 'Web development services',
    date: '2024-01-15',
    amount: 1500.00,
    currency: 'EUR',
    reference: 'INV-001',
    businessProfileId: 'bp-123',
    clientId: 'cl-456',
  }

  it('should accept a valid transaction', () => {
    const result = generateTransactionSchema.safeParse(validTransaction)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(validTransaction)
    }
  })

  it('should reject when businessProfileId is missing', () => {
    const { businessProfileId, ...incomplete } = validTransaction
    const result = generateTransactionSchema.safeParse(incomplete)
    expect(result.success).toBe(false)
  })

  it('should reject when businessProfileId is empty string', () => {
    const result = generateTransactionSchema.safeParse({
      ...validTransaction,
      businessProfileId: '',
    })
    expect(result.success).toBe(false)
  })

  it('should reject a negative amount', () => {
    const result = generateTransactionSchema.safeParse({
      ...validTransaction,
      amount: -100,
    })
    expect(result.success).toBe(false)
  })

  it('should reject zero amount', () => {
    const result = generateTransactionSchema.safeParse({
      ...validTransaction,
      amount: 0,
    })
    expect(result.success).toBe(false)
  })

  it('should reject an empty description', () => {
    const result = generateTransactionSchema.safeParse({
      ...validTransaction,
      description: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('generateRequestSchema', () => {
  const validTransaction = {
    description: 'Web development services',
    date: '2024-01-15',
    amount: 1500.00,
    currency: 'EUR',
    reference: 'INV-001',
    businessProfileId: 'bp-123',
    clientId: 'cl-456',
  }

  it('should accept a valid request with one transaction', () => {
    const result = generateRequestSchema.safeParse({
      transactions: [validTransaction],
    })
    expect(result.success).toBe(true)
  })

  it('should accept a valid request with multiple transactions', () => {
    const result = generateRequestSchema.safeParse({
      transactions: [validTransaction, { ...validTransaction, reference: 'INV-002' }],
    })
    expect(result.success).toBe(true)
  })

  it('should reject an empty transactions array', () => {
    const result = generateRequestSchema.safeParse({
      transactions: [],
    })
    expect(result.success).toBe(false)
  })

  it('should reject when transactions is missing', () => {
    const result = generateRequestSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
