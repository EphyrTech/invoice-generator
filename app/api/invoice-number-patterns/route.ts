import { NextRequest, NextResponse } from 'next/server';
import { 
  validateInvoiceNumberPattern, 
  getPatternTemplates,
  generateInvoiceNumber,
  InvoiceNumberPattern 
} from '@/lib/utils/invoice-number-generator';

// GET /api/invoice-number-patterns - Get pattern templates and validation
export async function GET(request: NextRequest) {
  try {
    // Handle case where request.url might be empty during static generation
    const url = request.url || 'http://localhost:3000/api/invoice-number-patterns';
    const { searchParams } = new URL(url);
    const action = searchParams.get('action');

    if (action === 'templates') {
      // Return pattern templates
      const templates = getPatternTemplates();
      return NextResponse.json({ templates });
    }

    if (action === 'validate') {
      // Validate a pattern
      const pattern = searchParams.get('pattern');
      if (!pattern) {
        return NextResponse.json(
          { error: 'Pattern parameter is required' },
          { status: 400 }
        );
      }

      const validation = validateInvoiceNumberPattern(pattern);
      return NextResponse.json(validation);
    }

    if (action === 'preview') {
      // Preview a pattern with custom settings
      const pattern = searchParams.get('pattern') || 'INV-{YYYY}-{####}';
      const nextValue = parseInt(searchParams.get('nextValue') || '1');
      const resetFrequency = searchParams.get('resetFrequency') || 'never';
      const counterDigits = parseInt(searchParams.get('counterDigits') || '4');

      const patternConfig: InvoiceNumberPattern = {
        pattern,
        nextValue,
        prefix: '',
        suffix: '',
        dateFormat: 'YYYY',
        counterDigits,
        resetFrequency: resetFrequency as 'never' | 'yearly' | 'monthly' | 'daily',
        lastResetDate: undefined
      };

      const result = generateInvoiceNumber(patternConfig);
      
      return NextResponse.json({
        preview: result.invoiceNumber,
        nextValue: result.nextValue,
        pattern
      });
    }

    // Default: return both templates and validation info
    const templates = getPatternTemplates();
    return NextResponse.json({ 
      templates,
      supportedPlaceholders: {
        date: [
          { placeholder: '{YYYY}', description: 'Full year (e.g., 2024)' },
          { placeholder: '{YY}', description: 'Short year (e.g., 24)' },
          { placeholder: '{MM}', description: 'Month with leading zero (e.g., 01)' },
          { placeholder: '{M}', description: 'Month without leading zero (e.g., 1)' },
          { placeholder: '{DD}', description: 'Day with leading zero (e.g., 05)' },
          { placeholder: '{D}', description: 'Day without leading zero (e.g., 5)' }
        ],
        counter: [
          { placeholder: '{####}', description: 'Counter with specified digits (e.g., 0001)' },
          { placeholder: '{###}', description: 'Counter with 3 digits (e.g., 001)' },
          { placeholder: '{#####}', description: 'Counter with 5 digits (e.g., 00001)' }
        ]
      }
    });

  } catch (error) {
    console.error('Error handling invoice number patterns:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// POST /api/invoice-number-patterns - Validate and test a pattern
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pattern, nextValue = 1, resetFrequency = 'never', counterDigits = 4 } = body;

    if (!pattern) {
      return NextResponse.json(
        { error: 'Pattern is required' },
        { status: 400 }
      );
    }

    // Validate the pattern
    const validation = validateInvoiceNumberPattern(pattern);
    
    if (!validation.isValid) {
      return NextResponse.json({
        isValid: false,
        errors: validation.errors,
        preview: null
      });
    }

    // Generate preview with the provided settings
    const patternConfig: InvoiceNumberPattern = {
      pattern,
      nextValue,
      prefix: '',
      suffix: '',
      dateFormat: 'YYYY',
      counterDigits,
      resetFrequency: resetFrequency as 'never' | 'yearly' | 'monthly' | 'daily',
      lastResetDate: undefined
    };

    const result = generateInvoiceNumber(patternConfig);

    return NextResponse.json({
      isValid: true,
      errors: [],
      preview: result.invoiceNumber,
      nextValue: result.nextValue,
      examples: {
        current: result.invoiceNumber,
        next: generateInvoiceNumber({
          ...patternConfig,
          nextValue: result.nextValue
        }).invoiceNumber,
        withDifferentDate: generateInvoiceNumber({
          ...patternConfig,
          nextValue: 1
        }, new Date('2025-12-31')).invoiceNumber
      }
    });

  } catch (error) {
    console.error('Error validating invoice number pattern:', error);
    return NextResponse.json(
      { error: 'Failed to validate pattern' },
      { status: 500 }
    );
  }
}
