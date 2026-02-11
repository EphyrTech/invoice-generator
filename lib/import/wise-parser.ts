import type { WiseTransaction, WiseParseResult } from '@/lib/import/wise-types'

const MONTHS: Record<string, string> = {
  January: '01',
  February: '02',
  March: '03',
  April: '04',
  May: '05',
  June: '06',
  July: '07',
  August: '08',
  September: '09',
  October: '10',
  November: '11',
  December: '12',
}

const DATE_REGEX = /^(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/

/**
 * Converts "27 November 2025" to "2025-11-27"
 */
export function parseWiseDate(dateStr: string): string {
  const trimmed = dateStr.trim()
  const match = trimmed.match(DATE_REGEX)
  if (!match) {
    throw new Error(`Invalid Wise date format: "${dateStr}"`)
  }
  const [, day, month, year] = match
  const monthNum = MONTHS[month]
  return `${year}-${monthNum}-${day.padStart(2, '0')}`
}

/**
 * Parses "1 November 2025 [GMT] - 30 November 2025 [GMT]" into { from, to } ISO dates.
 */
export function parseWiseDateRange(line: string): { from: string; to: string } {
  const trimmed = line.trim()
  // Pattern: "DD Month YYYY [TZ] - DD Month YYYY [TZ]"
  const rangeRegex = /^(\d{1,2}\s+\w+\s+\d{4})\s+\[.*?\]\s*-\s*(\d{1,2}\s+\w+\s+\d{4})\s+\[.*?\]$/
  const match = trimmed.match(rangeRegex)
  if (!match) {
    throw new Error(`Invalid Wise date range format: "${line}"`)
  }
  return {
    from: parseWiseDate(match[1]),
    to: parseWiseDate(match[2]),
  }
}

/**
 * Parse a number string that may have commas and leading minus sign.
 * e.g. "-1,000.00" => -1000, "6,788.00" => 6788, "0.59" => 0.59
 */
function parseAmount(str: string): number {
  const cleaned = str.replace(/,/g, '')
  return parseFloat(cleaned)
}

/**
 * Main parser: extracts structured transaction data from Wise PDF text output.
 */
export function parseWiseText(text: string): WiseParseResult {
  const lines = text.split('\n')

  // 1. Find currency from "XXX statement" line
  const currencyLine = lines.find(l => /^[A-Z]{3}\s+statement$/.test(l.trim()))
  if (!currencyLine) {
    throw new Error('Not a valid Wise statement: could not find currency line (e.g. "EUR statement")')
  }
  const currency = currencyLine.trim().split(/\s+/)[0]

  // 2. Find date range — next line after currency line that matches the range pattern
  const currencyIdx = lines.indexOf(currencyLine)
  let dateRange: { from: string; to: string } | null = null
  for (let i = currencyIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '') continue
    try {
      dateRange = parseWiseDateRange(line)
      break
    } catch {
      // Not a date range line, keep looking (but only check a few lines)
      if (i > currencyIdx + 3) break
    }
  }
  if (!dateRange) {
    throw new Error('Not a valid Wise statement: could not find date range')
  }

  // 3. Find the transaction table boundaries
  const tableHeaderIdx = lines.findIndex(l =>
    l.trim().startsWith('Description') && l.includes('Amount')
  )
  if (tableHeaderIdx === -1) {
    throw new Error('Not a valid Wise statement: could not find transaction table header')
  }

  const footerIdx = lines.findIndex(l =>
    l.trim().startsWith('Wise is the trading name')
  )
  const endIdx = footerIdx !== -1 ? footerIdx : lines.length

  // 4. Extract transaction lines (between table header and footer)
  const txLines = lines.slice(tableHeaderIdx + 1, endIdx)

  // 5. Parse transactions by finding "Transaction:" anchors
  const transactions: WiseTransaction[] = []

  // Find all line indices within txLines that contain "Transaction:"
  const txAnchorIndices: number[] = []
  for (let i = 0; i < txLines.length; i++) {
    if (txLines[i].includes('Transaction:')) {
      txAnchorIndices.push(i)
    }
  }

  for (const anchorIdx of txAnchorIndices) {
    const anchorLine = txLines[anchorIdx].trim()

    // Extract date from the anchor line — it starts with "DD Month YYYY"
    const dateMatch = anchorLine.match(/^(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/)
    if (!dateMatch) continue

    const date = parseWiseDate(dateMatch[1])

    // Extract reference (Transaction: XXXX)
    const refMatch = anchorLine.match(/Transaction:\s+(\S+)/)
    const reference = refMatch ? refMatch[1] : ''

    // Collect description lines: everything above the anchor line until the previous
    // anchor's amounts line (or start of txLines). Description lines are those that
    // are NOT amount lines and NOT empty.
    const descLines: string[] = []

    // Walk backwards from the anchor line to collect description lines
    for (let j = anchorIdx - 1; j >= 0; j--) {
      const line = txLines[j].trim()
      if (line === '') break

      // Check if this is an amounts line (one or two numbers, possibly negative, possibly with commas)
      // Amounts lines look like: "-25.51 697.15" or "100.00 2,132.93" or "0.59 2,100.93"
      if (/^-?[\d,]+\.\d{2}(\s+-?[\d,]+\.\d{2})?$/.test(line)) {
        break
      }

      descLines.unshift(line)
    }

    const description = descLines.join(' ').trim()

    // Find the amounts line: it should be the next non-empty line after the anchor
    let amountsLine = ''
    for (let j = anchorIdx + 1; j < txLines.length; j++) {
      const line = txLines[j].trim()
      if (line === '') continue
      // Amounts line: one or two numbers
      if (/^-?[\d,]+\.\d{2}/.test(line)) {
        amountsLine = line
        break
      }
      break // If the next non-empty line isn't numbers, something's off
    }

    if (!amountsLine) continue

    // Parse amounts: first number is transaction amount, second is running balance
    const amountParts = amountsLine.match(/(-?[\d,]+\.\d{2})/g)
    if (!amountParts || amountParts.length < 2) continue

    const txAmount = parseAmount(amountParts[0])
    // Running balance is amountParts[1] — we don't store it

    const incoming = txAmount > 0 ? txAmount : null
    const outgoing = txAmount < 0 ? Math.abs(txAmount) : null
    const amount = Math.abs(txAmount)

    transactions.push({
      description,
      date,
      incoming,
      outgoing,
      amount,
      reference,
      currency,
    })
  }

  if (transactions.length === 0) {
    throw new Error('No transactions found in Wise statement')
  }

  return {
    currency,
    dateRange,
    transactions,
  }
}
