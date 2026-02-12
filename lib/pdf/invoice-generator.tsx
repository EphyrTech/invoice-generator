import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { getTheme } from './themes';

// Define types for invoice data
export type InvoiceData = {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  status?: string; // Made optional since we don't want to display it
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  notes?: string;
  terms?: string;

  // QR code for public link
  qrCodeDataUrl?: string;

  // Business profile (vendor)
  businessProfile: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    taxId?: string;
    logoUrl?: string;
  };

  // Client
  client: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    taxId?: string;
  };

  // Invoice items
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate?: number;
    taxAmount?: number;
  }[];
};

// Theme-aware PDF component
const InvoicePDF: React.FC<{ data: InvoiceData; theme?: string }> = ({ data, theme = 'clean' }) => {
  const ThemeComponent = getTheme(theme);
  return <ThemeComponent data={data} />;
};

// Function to generate PDF
export const generateInvoicePDF = (data: InvoiceData, theme?: string) => {
  return <InvoicePDF data={data} theme={theme} />;
};

// Component for downloading PDF
export const InvoiceDownloadLink: React.FC<{
  data: InvoiceData;
  fileName?: string;
  theme?: string;
  children: React.ReactNode;
}> = ({ data, fileName, theme, children }) => {
  const defaultFileName = `Invoice-${data.invoiceNumber}.pdf`;

  return (
    <PDFDownloadLink
      document={<InvoicePDF data={data} theme={theme} />}
      fileName={fileName || defaultFileName}
      style={{ textDecoration: 'none' }}
    >
      {children}
    </PDFDownloadLink>
  );
};
