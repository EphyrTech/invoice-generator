'use client';

import { useState, useEffect } from 'react';
import { InvoiceDownloadLink } from '@/lib/pdf/invoice-generator';
import type { InvoiceData } from '@/lib/pdf/invoice-generator';

type PublicInvoiceData = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  status: string;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_rate: number;
  discount_amount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  show_logo_public: boolean;
  show_status_public: boolean;
  pdf_theme: string;
  items: {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    tax_rate: number;
    tax_amount: number;
  }[];
  businessProfile: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    tax_id: string | null;
    logo_url: string | null;
  } | null;
  client: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    tax_id: string | null;
  } | null;
};

function toPdfData(data: PublicInvoiceData): InvoiceData {
  return {
    invoiceNumber: data.invoice_number,
    issueDate: data.issue_date,
    dueDate: data.due_date || undefined,
    status: data.show_status_public ? data.status : undefined,
    currency: data.currency,
    subtotal: data.subtotal,
    taxRate: data.tax_rate,
    taxAmount: data.tax_amount,
    discountRate: data.discount_rate,
    discountAmount: data.discount_amount,
    total: data.total,
    notes: data.notes || undefined,
    terms: data.terms || undefined,
    businessProfile: {
      name: data.businessProfile?.name || '',
      email: data.businessProfile?.email || '',
      phone: data.businessProfile?.phone || '',
      address: data.businessProfile?.address || '',
      city: data.businessProfile?.city || '',
      state: data.businessProfile?.state || '',
      postalCode: data.businessProfile?.postal_code || '',
      country: data.businessProfile?.country || '',
      taxId: data.businessProfile?.tax_id || '',
      logoUrl: data.show_logo_public ? (data.businessProfile?.logo_url || '') : '',
    },
    client: {
      name: data.client?.name || '',
      email: data.client?.email || '',
      phone: data.client?.phone || '',
      address: data.client?.address || '',
      city: data.client?.city || '',
      state: data.client?.state || '',
      postalCode: data.client?.postal_code || '',
      country: data.client?.country || '',
      taxId: data.client?.tax_id || '',
    },
    items: data.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      amount: item.amount,
      taxRate: item.tax_rate,
      taxAmount: item.tax_amount,
    })),
  };
}

export default function PublicInvoicePage({ params }: { params: { token: string } }) {
  const [invoice, setInvoice] = useState<PublicInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const response = await fetch(`/api/public/invoices/${params.token}`);
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setInvoice(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [params.token]);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center py-16">
        <p className="text-gray-500">Loading invoice...</p>
      </div>
    );
  }

  if (notFound || !invoice) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center py-16">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          This invoice is no longer available
        </h1>
        <p className="text-gray-500">
          The link may have expired or been revoked.
        </p>
      </div>
    );
  }

  const pdfData = toPdfData(invoice);

  const formatAddress = (entity: { address?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string | null }) => {
    const parts = [entity.address, entity.city, entity.state, entity.postal_code, entity.country].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Invoice {invoice.invoice_number}
          </h1>
          <p className="text-sm text-gray-500">
            From {invoice.businessProfile?.name}
          </p>
        </div>
        <InvoiceDownloadLink data={pdfData} theme={invoice.pdf_theme || 'clean'}>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded">
            Download PDF
          </button>
        </InvoiceDownloadLink>
      </div>

      <div className="p-6">
        {/* Business + Client info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-2">From</h2>
            <p className="font-semibold text-gray-900">{invoice.businessProfile?.name}</p>
            <p className="text-sm text-gray-600">{formatAddress(invoice.businessProfile || {})}</p>
            {invoice.businessProfile?.email && <p className="text-sm text-gray-600">{invoice.businessProfile.email}</p>}
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-2">Bill To</h2>
            <p className="font-semibold text-gray-900">{invoice.client?.name}</p>
            <p className="text-sm text-gray-600">{formatAddress(invoice.client || {})}</p>
            {invoice.client?.email && <p className="text-sm text-gray-600">{invoice.client.email}</p>}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div>
            <p className="text-xs text-gray-500">Issue Date</p>
            <p className="text-sm font-medium">{invoice.issue_date}</p>
          </div>
          {invoice.due_date && (
            <div>
              <p className="text-xs text-gray-500">Due Date</p>
              <p className="text-sm font-medium">{invoice.due_date}</p>
            </div>
          )}
          {invoice.show_status_public && (
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <p className="text-sm font-medium capitalize">{invoice.status}</p>
            </div>
          )}
        </div>

        {/* Items table */}
        <div className="overflow-x-auto mb-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.items.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{invoice.currency} {item.unit_price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{invoice.currency} {item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>{invoice.currency} {invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.discount_rate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount ({invoice.discount_rate}%)</span>
                <span>-{invoice.currency} {invoice.discount_amount.toFixed(2)}</span>
              </div>
            )}
            {invoice.tax_rate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax ({invoice.tax_rate}%)</span>
                <span>{invoice.currency} {invoice.tax_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold">
              <span>Total</span>
              <span>{invoice.currency} {invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes/Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            {invoice.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
                <p className="text-sm text-gray-600">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Terms</h3>
                <p className="text-sm text-gray-600">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
