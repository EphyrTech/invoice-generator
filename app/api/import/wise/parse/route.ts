import { NextRequest, NextResponse } from 'next/server'
import { parseWiseText } from '@/lib/import/wise-parser'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type && file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Require internal module directly to skip index.js debug mode
    // which tries to load ./test/data/05-versions-space.pdf
    // eslint-disable-next-line
    const pdfParse = require('pdf-parse/lib/pdf-parse')

    // Extract text from PDF
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const pdfData = await pdfParse(buffer)
    const text = pdfData.text

    // Parse Wise statement text
    const result = parseWiseText(text)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error parsing Wise PDF:', error)

    // If the parser threw, it's a parsing/validation issue
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 422 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to parse PDF' },
      { status: 500 }
    )
  }
}
