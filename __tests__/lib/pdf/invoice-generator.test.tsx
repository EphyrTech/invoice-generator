import React from 'react'
import { render, screen } from '@testing-library/react'
import { generateInvoicePDF, InvoiceDownloadLink } from '@/lib/pdf/invoice-generator'

const mockInvoiceData = {
  invoiceNumber: 'INV-2024-001',
  issueDate: '2024-01-15',
  dueDate: '2024-02-15',
  businessProfile: {
    name: 'Test Company',
    email: 'test@company.com',
    phone: '+1-555-0123',
    address: '123 Business St',
    city: 'Business City',
    state: 'BC',
    postalCode: '12345',
    country: 'USA',
    taxId: 'TAX123456',
    logoUrl: 'https://example.com/logo.png',
  },
  client: {
    name: 'Client Company',
    email: 'client@company.com',
    phone: '+1-555-0456',
    address: '456 Client Ave',
    city: 'Client City',
    state: 'CC',
    postalCode: '67890',
    country: 'USA',
    taxId: 'CLIENT123',
  },
  items: [
    {
      description: 'Consulting Services',
      quantity: 10,
      unitPrice: 100,
      amount: 1000,
      taxRate: 10,
      taxAmount: 100,
    },
    {
      description: 'Development Work',
      quantity: 5,
      unitPrice: 150,
      amount: 750,
      taxRate: 10,
      taxAmount: 75,
    },
  ],
  subtotal: 1750,
  taxAmount: 175,
  discountAmount: 0,
  total: 1925,
  currency: 'USD',
  notes: 'Thank you for your business!',
  terms: 'Payment due within 30 days.',
}

describe('Invoice PDF Generator', () => {
  describe('generateInvoicePDF', () => {
    it('should generate PDF component with invoice data', () => {
      const pdfComponent = generateInvoicePDF(mockInvoiceData)
      expect(pdfComponent).toBeDefined()
      expect(pdfComponent.type).toBeDefined()
    })
  })

  describe('InvoiceDownloadLink', () => {
    it('should render download link with default filename', () => {
      render(
        <InvoiceDownloadLink data={mockInvoiceData}>
          <button>Download PDF</button>
        </InvoiceDownloadLink>
      )

      const downloadLink = screen.getByTestId('pdf-download-link')
      expect(downloadLink).toBeInTheDocument()
      expect(downloadLink).toHaveAttribute('data-filename', 'Invoice-INV-2024-001.pdf')
      expect(screen.getByText('Download PDF')).toBeInTheDocument()
    })

    it('should render download link with custom filename', () => {
      const customFileName = 'custom-invoice.pdf'
      
      render(
        <InvoiceDownloadLink data={mockInvoiceData} fileName={customFileName}>
          <span>Custom Download</span>
        </InvoiceDownloadLink>
      )

      const downloadLink = screen.getByTestId('pdf-download-link')
      expect(downloadLink).toHaveAttribute('data-filename', customFileName)
      expect(screen.getByText('Custom Download')).toBeInTheDocument()
    })

    it('should handle missing optional data gracefully', () => {
      const minimalData = {
        ...mockInvoiceData,
        businessProfile: {
          ...mockInvoiceData.businessProfile,
          logoUrl: undefined,
        },
        notes: undefined,
        terms: undefined,
      }

      render(
        <InvoiceDownloadLink data={minimalData}>
          <button>Download</button>
        </InvoiceDownloadLink>
      )

      expect(screen.getByTestId('pdf-download-link')).toBeInTheDocument()
    })

    it('should handle empty items array', () => {
      const dataWithNoItems = {
        ...mockInvoiceData,
        items: [],
        subtotal: 0,
        taxAmount: 0,
        total: 0,
      }

      render(
        <InvoiceDownloadLink data={dataWithNoItems}>
          <button>Download</button>
        </InvoiceDownloadLink>
      )

      expect(screen.getByTestId('pdf-download-link')).toBeInTheDocument()
    })

    it('should handle different currencies', () => {
      const eurData = {
        ...mockInvoiceData,
        currency: 'EUR',
      }

      render(
        <InvoiceDownloadLink data={eurData}>
          <button>Download EUR Invoice</button>
        </InvoiceDownloadLink>
      )

      expect(screen.getByTestId('pdf-download-link')).toBeInTheDocument()
    })

    it('should handle large amounts correctly', () => {
      const largeAmountData = {
        ...mockInvoiceData,
        items: [
          {
            description: 'Large Project',
            quantity: 1,
            unitPrice: 999999.99,
            amount: 999999.99,
            taxRate: 0,
            taxAmount: 0,
          },
        ],
        subtotal: 999999.99,
        taxAmount: 0,
        total: 999999.99,
      }

      render(
        <InvoiceDownloadLink data={largeAmountData}>
          <button>Download Large Invoice</button>
        </InvoiceDownloadLink>
      )

      expect(screen.getByTestId('pdf-download-link')).toBeInTheDocument()
    })
  })
})
