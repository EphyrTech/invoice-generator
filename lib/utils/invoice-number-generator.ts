// Invoice number pattern generator utility

export interface InvoiceNumberPattern {
  pattern: string;
  nextValue: number;
  prefix: string;
  suffix: string;
  dateFormat: string;
  counterDigits: number;
  resetFrequency: 'never' | 'yearly' | 'monthly' | 'daily';
  lastResetDate?: string;
}

export interface GeneratedInvoiceNumber {
  invoiceNumber: string;
  nextValue: number;
  shouldUpdateTemplate: boolean;
}

/**
 * Generate the next invoice number based on the pattern
 */
export function generateInvoiceNumber(
  pattern: InvoiceNumberPattern,
  currentDate: Date = new Date()
): GeneratedInvoiceNumber {
  const { 
    pattern: patternString, 
    nextValue, 
    resetFrequency, 
    lastResetDate,
    counterDigits 
  } = pattern;

  // Check if we need to reset the counter
  const shouldReset = shouldResetCounter(resetFrequency, lastResetDate, currentDate);
  const currentValue = shouldReset ? 1 : nextValue;
  const newNextValue = currentValue + 1;

  // Replace pattern placeholders
  let invoiceNumber = patternString;

  // Replace date placeholders
  invoiceNumber = replaceDatePlaceholders(invoiceNumber, currentDate);

  // Replace counter placeholders
  invoiceNumber = replaceCounterPlaceholders(invoiceNumber, currentValue, counterDigits);

  return {
    invoiceNumber,
    nextValue: newNextValue,
    shouldUpdateTemplate: true
  };
}

/**
 * Check if the counter should be reset based on frequency and last reset date
 */
function shouldResetCounter(
  resetFrequency: string,
  lastResetDate: string | undefined,
  currentDate: Date
): boolean {
  if (resetFrequency === 'never' || !lastResetDate) {
    return false;
  }

  const lastReset = new Date(lastResetDate);
  const now = currentDate;

  switch (resetFrequency) {
    case 'yearly':
      return lastReset.getFullYear() !== now.getFullYear();
    case 'monthly':
      return lastReset.getFullYear() !== now.getFullYear() || 
             lastReset.getMonth() !== now.getMonth();
    case 'daily':
      return lastReset.toDateString() !== now.toDateString();
    default:
      return false;
  }
}

/**
 * Replace date placeholders in the pattern
 */
function replaceDatePlaceholders(pattern: string, date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return pattern
    .replace(/\{YYYY\}/g, year.toString())
    .replace(/\{YY\}/g, year.toString().slice(-2))
    .replace(/\{MM\}/g, month.toString().padStart(2, '0'))
    .replace(/\{M\}/g, month.toString())
    .replace(/\{DD\}/g, day.toString().padStart(2, '0'))
    .replace(/\{D\}/g, day.toString());
}

/**
 * Replace counter placeholders in the pattern
 */
function replaceCounterPlaceholders(
  pattern: string, 
  value: number, 
  digits: number
): string {
  // Replace {####} style placeholders
  const counterRegex = /\{#+\}/g;
  return pattern.replace(counterRegex, (match) => {
    const placeholderDigits = match.length - 2; // Remove { and }
    const actualDigits = Math.max(digits, placeholderDigits);
    return value.toString().padStart(actualDigits, '0');
  });
}

/**
 * Validate an invoice number pattern
 */
export function validateInvoiceNumberPattern(pattern: string): {
  isValid: boolean;
  errors: string[];
  preview: string;
} {
  const errors: string[] = [];

  if (!pattern || pattern.trim() === '') {
    errors.push('Pattern cannot be empty');
  }

  // Check for valid placeholders
  const validPlaceholders = [
    '{YYYY}', '{YY}', '{MM}', '{M}', '{DD}', '{D}', // Date placeholders
    /\{#+\}/ // Counter placeholders like {####}
  ];

  const placeholderRegex = /\{[^}]+\}/g;
  const foundPlaceholders = pattern.match(placeholderRegex) || [];

  for (const placeholder of foundPlaceholders) {
    const isValid = validPlaceholders.some(valid => {
      if (valid instanceof RegExp) {
        return valid.test(placeholder);
      }
      return valid === placeholder;
    });

    if (!isValid) {
      errors.push(`Invalid placeholder: ${placeholder}`);
    }
  }

  // Generate preview
  const previewPattern: InvoiceNumberPattern = {
    pattern,
    nextValue: 1,
    prefix: '',
    suffix: '',
    dateFormat: 'YYYY',
    counterDigits: 4,
    resetFrequency: 'never'
  };

  const preview = generateInvoiceNumber(previewPattern).invoiceNumber;

  return {
    isValid: errors.length === 0,
    errors,
    preview
  };
}

/**
 * Get common invoice number pattern templates
 */
export function getPatternTemplates(): Array<{
  name: string;
  pattern: string;
  description: string;
  example: string;
}> {
  const templates = [
    {
      name: 'Simple Sequential',
      pattern: 'INV-{####}',
      description: 'Simple incrementing number with prefix',
      example: 'INV-0001'
    },
    {
      name: 'Year + Sequential',
      pattern: 'INV-{YYYY}-{####}',
      description: 'Year followed by incrementing number',
      example: 'INV-2024-0001'
    },
    {
      name: 'Month/Year + Sequential',
      pattern: '{MM}{YY}-{####}',
      description: 'Month/Year followed by incrementing number',
      example: '0124-0001'
    },
    {
      name: 'Date + Sequential',
      pattern: '{YYYY}{MM}{DD}-{###}',
      description: 'Full date followed by daily counter',
      example: '20240115-001'
    },
    {
      name: 'Custom Prefix',
      pattern: 'INVOICE-{YYYY}-{MM}-{#####}',
      description: 'Custom prefix with year, month, and 5-digit counter',
      example: 'INVOICE-2024-01-00001'
    }
  ];

  return templates.map(template => ({
    ...template,
    example: generateInvoiceNumber({
      pattern: template.pattern,
      nextValue: 1,
      prefix: '',
      suffix: '',
      dateFormat: 'YYYY',
      counterDigits: 4,
      resetFrequency: 'never'
    }).invoiceNumber
  }));
}
