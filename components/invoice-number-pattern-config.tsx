// Invoice number pattern configuration types and utilities

export interface InvoiceNumberPatternConfig {
  pattern: string;
  nextValue: number;
  resetFrequency: string;
  counterDigits: number;
}

export interface PatternTemplate {
  name: string;
  pattern: string;
  description: string;
  example: string;
}

// Simple placeholder component for now - will be enhanced with proper UI components later
export default function InvoiceNumberPatternConfig() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-medium mb-2">Invoice Number Pattern Configuration</h3>
      <p className="text-sm text-gray-600">
        This component will be enhanced with full pattern configuration UI.
        For now, patterns are configured via the API.
      </p>
    </div>
  );
}
