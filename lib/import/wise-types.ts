import { z } from 'zod'

// --- Interfaces for Wise PDF parsing ---

export interface WiseTransaction {
  description: string
  date: string          // ISO format: YYYY-MM-DD
  incoming: number | null
  outgoing: number | null
  amount: number        // absolute value
  reference: string
  currency: string
}

export interface WiseParseResult {
  currency: string
  dateRange: { from: string; to: string }
  transactions: WiseTransaction[]
}

// --- Zod schemas for the generate endpoint ---

export const generateTransactionSchema = z.object({
  description: z.string().min(1),
  date: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(1),
  reference: z.string().min(1),
  businessProfileId: z.string().min(1),
  clientId: z.string().min(1),
})

export const generateRequestSchema = z.object({
  transactions: z.array(generateTransactionSchema).min(1),
})

export type GenerateTransaction = z.infer<typeof generateTransactionSchema>
export type GenerateRequest = z.infer<typeof generateRequestSchema>
