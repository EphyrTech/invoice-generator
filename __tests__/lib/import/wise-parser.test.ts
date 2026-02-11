import { parseWiseDate, parseWiseDateRange, parseWiseText } from '@/lib/import/wise-parser'

// Real text extracted from a Wise balance statement PDF via pdf-parse
const WISE_PDF_TEXT = `Wise Europe SA
Rue du Trône 100, 3rd floor
Brussels
1050
Belgium
EUR statement
1 November 2025 [GMT] - 30 November 2025 [GMT]
Generated on: 11 December 2025
Account Holder
EphyrTech OÜ
Masina tn 22
Kesklinna district, Tallinn city, Harju county
10113
Estonia
IBAN
BE61 9051 1531 4617
Swift/BIC
TRWIBEB1XXX
EUR on 30 November 2025 [GMT] 697.15 EUR
Description Incoming Outgoing Amount
Card transaction of 29.43 USD issued by Backblaze Inc BACKBLAZE.COM
27 November 2025 Card ending in 9924 Bohdan-Volodymyr Lesiv Transaction: CARD-3166196743
-25.51 697.15
Card transaction of 88.49 EUR issued by Claude.ai Subscription ANTHROPIC.
COM
26 November 2025 Card ending in 9924 Bohdan-Volodymyr Lesiv Transaction: CARD-3162375092
-88.49 722.66
Card transaction of 21.78 EUR issued by Claude.ai Subscription ANTHROPIC.
COM
24 November 2025 Card ending in 9924 Bohdan-Volodymyr Lesiv Transaction: CARD-3155855301
-21.78 811.15
Sent money to Bohdan-Volodymyr Lesiv
21 November 2025 Transaction: TRANSFER-1831544314 Reference: Payment by contract myde5nq
-1,000.00 832.93
Sent money to BUSINESS PROFESSIONAL CONSULTATIONS OÜ
10 November 2025 Transaction: TRANSFER-1813429851 Reference: Arve nr. 300
-300.00 1,832.93
Card transaction of 617.79 EUR issued by Europcar Madrid
10 November 2025 Card ending in 7537 Bohdan-Volodymyr Lesiv Transaction: CARD-3076954634
100.00 2,132.93
Card transaction of 68.00 EUR issued by Booking.com AMSTERDAM
6 November 2025 Card ending in 9924 Bohdan-Volodymyr Lesiv Transaction: CARD-3091785824
-68.00 2,032.93
Cashback
6 November 2025 Transaction: BALANCE_CASHBACK-694c8a28-22ae-4410-eba1-ade3459fcceb
0.59 2,100.93
Sent money to Bohdan-Volodymyr Lesiv
4 November 2025 Transaction: TRANSFER-1804222834 Reference: Payment by contract myde5nq
-5,000.00 2,100.34
Card transaction of 136.90 EUR issued by Hetzner Online Gmbh \nGunzenhausen
4 November 2025 Card ending in 9924 Bohdan-Volodymyr Lesiv Transaction: CARD-3082119403
-136.90 7,100.34
Card transaction of -250.09 EUR issued by Europcar Spain Madrid
4 November 2025 Card ending in 9924 Bohdan-Volodymyr Lesiv Transaction: CARD-3082003520
250.09 7,237.24
Received money from NIUM * Ciba Health Inc with reference RT3772376495
3 November 2025 Transaction: TRANSFER-1801587256 Reference: RT3772376495
6,788.00 6,987.15
Card transaction of 617.79 EUR issued by Europcar Madrid
2 November 2025 Card ending in 7537 Bohdan-Volodymyr Lesiv Transaction: CARD-3076954634
-717.79 199.15
Received money from Bohdan-Volodymyr Lesiv with reference 727763
2 November 2025 Transaction: TRANSFER-1799705561 Reference: 727763
400.00 916.94
Card transaction of 32.40 EUR issued by Google Gsuite_ephyrtech.c Dublin
1 November 2025 Card ending in 9924 Bohdan-Volodymyr Lesiv Transaction: CARD-3072509862
-32.40 516.94
Wise is the trading name of Wise Europe SA, a Payment Institution authorised by the National Bank of Belgium, incorporated in Belgium with \nregistered number 0713629988 and registered office at Rue Du Trône 100, 3rd floor, 1050, Brussels, Belgium.
Need help? Visit wise.com/help`

describe('parseWiseDate', () => {
  it('should convert "27 November 2025" to "2025-11-27"', () => {
    expect(parseWiseDate('27 November 2025')).toBe('2025-11-27')
  })

  it('should convert "1 November 2025" to "2025-11-01"', () => {
    expect(parseWiseDate('1 November 2025')).toBe('2025-11-01')
  })

  it('should convert "3 January 2024" to "2024-01-03"', () => {
    expect(parseWiseDate('3 January 2024')).toBe('2024-01-03')
  })

  it('should convert "15 December 2023" to "2023-12-15"', () => {
    expect(parseWiseDate('15 December 2023')).toBe('2023-12-15')
  })

  it('should convert "28 February 2025" to "2025-02-28"', () => {
    expect(parseWiseDate('28 February 2025')).toBe('2025-02-28')
  })

  it('should handle leading/trailing whitespace', () => {
    expect(parseWiseDate('  27 November 2025  ')).toBe('2025-11-27')
  })

  it('should throw on invalid date format', () => {
    expect(() => parseWiseDate('2025-11-27')).toThrow('Invalid Wise date format')
  })

  it('should throw on empty string', () => {
    expect(() => parseWiseDate('')).toThrow('Invalid Wise date format')
  })

  it('should throw on nonsense input', () => {
    expect(() => parseWiseDate('not a date')).toThrow('Invalid Wise date format')
  })
})

describe('parseWiseDateRange', () => {
  it('should parse "1 November 2025 [GMT] - 30 November 2025 [GMT]"', () => {
    const result = parseWiseDateRange('1 November 2025 [GMT] - 30 November 2025 [GMT]')
    expect(result).toEqual({
      from: '2025-11-01',
      to: '2025-11-30',
    })
  })

  it('should parse a range with different months', () => {
    const result = parseWiseDateRange('1 October 2025 [GMT] - 31 December 2025 [GMT]')
    expect(result).toEqual({
      from: '2025-10-01',
      to: '2025-12-31',
    })
  })

  it('should handle whitespace', () => {
    const result = parseWiseDateRange('  1 November 2025 [GMT] - 30 November 2025 [GMT]  ')
    expect(result).toEqual({
      from: '2025-11-01',
      to: '2025-11-30',
    })
  })

  it('should throw on invalid format', () => {
    expect(() => parseWiseDateRange('November 2025')).toThrow('Invalid Wise date range format')
  })

  it('should throw on empty string', () => {
    expect(() => parseWiseDateRange('')).toThrow('Invalid Wise date range format')
  })
})

describe('parseWiseText', () => {
  it('should extract the correct currency', () => {
    const result = parseWiseText(WISE_PDF_TEXT)
    expect(result.currency).toBe('EUR')
  })

  it('should extract the correct date range', () => {
    const result = parseWiseText(WISE_PDF_TEXT)
    expect(result.dateRange).toEqual({
      from: '2025-11-01',
      to: '2025-11-30',
    })
  })

  it('should extract exactly 15 transactions', () => {
    const result = parseWiseText(WISE_PDF_TEXT)
    expect(result.transactions).toHaveLength(15)
  })

  it('should set currency to EUR on all transactions', () => {
    const result = parseWiseText(WISE_PDF_TEXT)
    for (const tx of result.transactions) {
      expect(tx.currency).toBe('EUR')
    }
  })

  // --- Specific transaction verification ---

  describe('outgoing card transaction (Backblaze)', () => {
    it('should parse the Backblaze card transaction correctly', () => {
      const result = parseWiseText(WISE_PDF_TEXT)
      const tx = result.transactions.find(t => t.reference === 'CARD-3166196743')
      expect(tx).toBeDefined()
      expect(tx!.description).toContain('Backblaze')
      expect(tx!.date).toBe('2025-11-27')
      expect(tx!.outgoing).toBe(25.51)
      expect(tx!.incoming).toBeNull()
      expect(tx!.amount).toBe(25.51)
    })
  })

  describe('outgoing card transaction (ANTHROPIC — wrapped description)', () => {
    it('should parse the first Anthropic transaction with wrapped description', () => {
      const result = parseWiseText(WISE_PDF_TEXT)
      const tx = result.transactions.find(t => t.reference === 'CARD-3162375092')
      expect(tx).toBeDefined()
      expect(tx!.description).toContain('ANTHROPIC')
      expect(tx!.description).toContain('COM')
      expect(tx!.date).toBe('2025-11-26')
      expect(tx!.outgoing).toBe(88.49)
      expect(tx!.incoming).toBeNull()
      expect(tx!.amount).toBe(88.49)
    })
  })

  describe('outgoing transfer (BPC OÜ)', () => {
    it('should parse the BPC transfer correctly', () => {
      const result = parseWiseText(WISE_PDF_TEXT)
      const tx = result.transactions.find(t => t.reference === 'TRANSFER-1813429851')
      expect(tx).toBeDefined()
      expect(tx!.description).toContain('BUSINESS PROFESSIONAL CONSULTATIONS')
      expect(tx!.date).toBe('2025-11-10')
      expect(tx!.outgoing).toBe(300.00)
      expect(tx!.incoming).toBeNull()
      expect(tx!.amount).toBe(300.00)
    })
  })

  describe('outgoing transfer with comma-formatted amount', () => {
    it('should parse the large transfer to Bohdan correctly', () => {
      const result = parseWiseText(WISE_PDF_TEXT)
      const tx = result.transactions.find(t => t.reference === 'TRANSFER-1804222834')
      expect(tx).toBeDefined()
      expect(tx!.description).toContain('Sent money to Bohdan-Volodymyr Lesiv')
      expect(tx!.date).toBe('2025-11-04')
      expect(tx!.outgoing).toBe(5000.00)
      expect(tx!.incoming).toBeNull()
      expect(tx!.amount).toBe(5000.00)
    })
  })

  describe('incoming cashback', () => {
    it('should parse the cashback transaction correctly', () => {
      const result = parseWiseText(WISE_PDF_TEXT)
      const tx = result.transactions.find(t =>
        t.reference.startsWith('BALANCE_CASHBACK')
      )
      expect(tx).toBeDefined()
      expect(tx!.description).toBe('Cashback')
      expect(tx!.date).toBe('2025-11-06')
      expect(tx!.incoming).toBe(0.59)
      expect(tx!.outgoing).toBeNull()
      expect(tx!.amount).toBe(0.59)
    })
  })

  describe('large incoming (Ciba Health)', () => {
    it('should parse the Ciba Health incoming transfer correctly', () => {
      const result = parseWiseText(WISE_PDF_TEXT)
      const tx = result.transactions.find(t => t.reference === 'TRANSFER-1801587256')
      expect(tx).toBeDefined()
      expect(tx!.description).toContain('Ciba Health')
      expect(tx!.date).toBe('2025-11-03')
      expect(tx!.incoming).toBe(6788.00)
      expect(tx!.outgoing).toBeNull()
      expect(tx!.amount).toBe(6788.00)
    })
  })

  describe('wrapped description (Hetzner)', () => {
    it('should parse the Hetzner transaction with wrapped description', () => {
      const result = parseWiseText(WISE_PDF_TEXT)
      const tx = result.transactions.find(t => t.reference === 'CARD-3082119403')
      expect(tx).toBeDefined()
      expect(tx!.description).toContain('Hetzner')
      expect(tx!.description).toContain('Gunzenhausen')
      expect(tx!.date).toBe('2025-11-04')
      expect(tx!.outgoing).toBe(136.90)
      expect(tx!.incoming).toBeNull()
      expect(tx!.amount).toBe(136.90)
    })
  })

  describe('refund (positive amount from Europcar Spain)', () => {
    it('should parse the Europcar refund as incoming', () => {
      const result = parseWiseText(WISE_PDF_TEXT)
      const tx = result.transactions.find(t => t.reference === 'CARD-3082003520')
      expect(tx).toBeDefined()
      expect(tx!.description).toContain('Europcar Spain')
      expect(tx!.date).toBe('2025-11-04')
      expect(tx!.incoming).toBe(250.09)
      expect(tx!.outgoing).toBeNull()
      expect(tx!.amount).toBe(250.09)
    })
  })

  describe('Europcar Madrid charge', () => {
    it('should parse the Europcar Madrid incoming (100.00)', () => {
      const result = parseWiseText(WISE_PDF_TEXT)
      // There are two Europcar Madrid transactions with the same reference
      // The one on Nov 10 has +100.00 and the one on Nov 2 has -717.79
      const txs = result.transactions.filter(t => t.reference === 'CARD-3076954634')
      expect(txs).toHaveLength(2)

      const nov10 = txs.find(t => t.date === '2025-11-10')
      expect(nov10).toBeDefined()
      expect(nov10!.incoming).toBe(100.00)
      expect(nov10!.outgoing).toBeNull()
      expect(nov10!.amount).toBe(100.00)

      const nov2 = txs.find(t => t.date === '2025-11-02')
      expect(nov2).toBeDefined()
      expect(nov2!.outgoing).toBe(717.79)
      expect(nov2!.incoming).toBeNull()
      expect(nov2!.amount).toBe(717.79)
    })
  })

  describe('Booking.com transaction', () => {
    it('should parse the Booking.com transaction', () => {
      const result = parseWiseText(WISE_PDF_TEXT)
      const tx = result.transactions.find(t => t.reference === 'CARD-3091785824')
      expect(tx).toBeDefined()
      expect(tx!.description).toContain('Booking.com')
      expect(tx!.date).toBe('2025-11-06')
      expect(tx!.outgoing).toBe(68.00)
      expect(tx!.incoming).toBeNull()
      expect(tx!.amount).toBe(68.00)
    })
  })

  describe('received money with reference 727763', () => {
    it('should parse the personal transfer in', () => {
      const result = parseWiseText(WISE_PDF_TEXT)
      const tx = result.transactions.find(t => t.reference === 'TRANSFER-1799705561')
      expect(tx).toBeDefined()
      expect(tx!.date).toBe('2025-11-02')
      expect(tx!.incoming).toBe(400.00)
      expect(tx!.outgoing).toBeNull()
      expect(tx!.amount).toBe(400.00)
    })
  })

  describe('Google Gsuite transaction', () => {
    it('should parse the Google Gsuite transaction', () => {
      const result = parseWiseText(WISE_PDF_TEXT)
      const tx = result.transactions.find(t => t.reference === 'CARD-3072509862')
      expect(tx).toBeDefined()
      expect(tx!.description).toContain('Google Gsuite')
      expect(tx!.date).toBe('2025-11-01')
      expect(tx!.outgoing).toBe(32.40)
      expect(tx!.incoming).toBeNull()
      expect(tx!.amount).toBe(32.40)
    })
  })

  // --- USD statement (no-space format from pdf-parse/lib/pdf-parse) ---

  describe('USD statement with no-space column format', () => {
    const USD_PDF_TEXT = `Wise Europe SA
Rue du Trône 100, 3rd floor
Brussels
1050
Belgium
USD statement
1 January 2026 [GMT] - 31 January 2026 [GMT]
Generated on: 11 February 2026
Account Holder
EphyrTech OÜ
Masina tn 22
Kesklinna district, Tallinn city, Harju county
10113
Estonia
Account number
563252420989629
Routing number
084009519
Swift/BIC
TRWIUS35XXX
USD on 31 January 2026 [GMT]1,925.99 USD
DescriptionIncomingOutgoingAmount
Card transaction of 32.00 USD issued by Backblaze Inc BACKBLAZE.COM
27 January 2026Card ending in 9924Bohdan-Volodymyr LesivTransaction: CARD-3390446938
-32.001,925.99
Card transaction of 108.90 EUR issued by Claude.ai Subscription ANTHROPIC.
COM
26 January 2026Card ending in 9924Bohdan-Volodymyr LesivTransaction: CARD-3386929651
-7.211,957.99
Card transaction of 300.00 GBP issued by Avis Budget London
20 January 2026Card ending in 7537Bohdan-Volodymyr LesivTransaction: CARD-3358217165
402.261,965.20
Card transaction of 300.00 GBP issued by Avis Budget London
18 January 2026Card ending in 7537Bohdan-Volodymyr LesivTransaction: CARD-3358217165
-402.261,562.94
Sent money to Bohdan-Volodymyr Lesiv
12 January 2026Transaction: TRANSFER-1916123887Reference: Payment by contract myde5nq
-6,000.001,965.20
Card transaction of 24.80 USD issued by Figma FIGMA.COM
10 January 2026Card ending in 9924Bohdan-Volodymyr LesivTransaction: CARD-3331259541
-24.807,965.20
Card transaction of 10.00 USD issued by Aqua Voice AQUAVOICE.COM
9 January 2026Card ending in 7537Bohdan-Volodymyr LesivTransaction: CARD-3328110221
-10.007,990.00
Received money from GUSTO with reference 021000028330932
6 January 2026Transaction: TRANSFER-1907329445Reference: 021000028330932
8,000.008,000.00
Wise is the trading name of Wise Europe SA, a Payment Institution authorised by the National Bank of Belgium, incorporated in Belgium with
registered number 0713629988 and registered office at Rue Du Trône 100, 3rd floor, 1050, Brussels, Belgium.
Need help? Visit wise.com/help`

    it('should extract USD currency', () => {
      const result = parseWiseText(USD_PDF_TEXT)
      expect(result.currency).toBe('USD')
    })

    it('should extract 8 transactions', () => {
      const result = parseWiseText(USD_PDF_TEXT)
      expect(result.transactions).toHaveLength(8)
    })

    it('should parse Backblaze with correct description', () => {
      const result = parseWiseText(USD_PDF_TEXT)
      const tx = result.transactions.find(t => t.reference === 'CARD-3390446938')
      expect(tx).toBeDefined()
      expect(tx!.description).toContain('Backblaze')
      expect(tx!.outgoing).toBe(32.00)
      expect(tx!.date).toBe('2026-01-27')
    })

    it('should parse Anthropic with wrapped description', () => {
      const result = parseWiseText(USD_PDF_TEXT)
      const tx = result.transactions.find(t => t.reference === 'CARD-3386929651')
      expect(tx).toBeDefined()
      expect(tx!.description).toContain('Claude.ai')
      expect(tx!.description).toContain('ANTHROPIC')
      expect(tx!.outgoing).toBe(7.21)
    })

    it('should parse Avis Budget incoming (refund)', () => {
      const result = parseWiseText(USD_PDF_TEXT)
      const tx = result.transactions.find(t => t.date === '2026-01-20')
      expect(tx).toBeDefined()
      expect(tx!.incoming).toBe(402.26)
      expect(tx!.outgoing).toBeNull()
    })

    it('should parse large outgoing transfer', () => {
      const result = parseWiseText(USD_PDF_TEXT)
      const tx = result.transactions.find(t => t.reference === 'TRANSFER-1916123887')
      expect(tx).toBeDefined()
      expect(tx!.outgoing).toBe(6000.00)
      expect(tx!.description).toContain('Sent money')
    })

    it('should parse GUSTO incoming', () => {
      const result = parseWiseText(USD_PDF_TEXT)
      const tx = result.transactions.find(t => t.reference === 'TRANSFER-1907329445')
      expect(tx).toBeDefined()
      expect(tx!.incoming).toBe(8000.00)
      expect(tx!.description).toContain('GUSTO')
    })

    it('should have unique descriptions for each transaction', () => {
      const result = parseWiseText(USD_PDF_TEXT)
      const descriptions = result.transactions.map(t => t.description)
      const unique = new Set(descriptions)
      // At least 7 unique (Avis Budget London appears twice with same desc)
      expect(unique.size).toBeGreaterThanOrEqual(7)
    })
  })

  // --- Error cases ---

  describe('error handling', () => {
    it('should throw on non-Wise text', () => {
      expect(() => parseWiseText('This is not a Wise statement at all.')).toThrow(
        'Not a valid Wise statement'
      )
    })

    it('should throw on text with currency but no transactions', () => {
      const text = `EUR statement
1 November 2025 [GMT] - 30 November 2025 [GMT]
Description Incoming Outgoing Amount
Wise is the trading name of Wise Europe SA.`
      expect(() => parseWiseText(text)).toThrow('No transactions found')
    })

    it('should throw on empty string', () => {
      expect(() => parseWiseText('')).toThrow('Not a valid Wise statement')
    })
  })
})
