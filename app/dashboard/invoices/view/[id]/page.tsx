'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { InvoiceDownloadLink } from '@/lib/pdf/invoice-generator';
import { generateQrDataUrl } from '@/lib/pdf/qr-code';

type BusinessProfile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  tax_id: string | null;
};

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  tax_id: string | null;
};

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  tax_rate: number;
  tax_amount: number;
};

type Invoice = {
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
  business_profile_id: string;
  client_id: string;
  items: InvoiceItem[];
  public_token: string | null;
  show_logo_public: boolean;
  show_status_public: boolean;
  pdf_theme: string;
  businessProfile?: BusinessProfile;
  client?: Client;
};

export default function ViewInvoice({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);


  useEffect(() => {
    async function fetchInvoice() {
      try {
        // Fetch the invoice
        const invoiceResponse = await fetch(`/api/invoices/${params.id}`);
        if (!invoiceResponse.ok) {
          throw new Error('Failed to fetch invoice');
        }
        const invoiceData = await invoiceResponse.json();

        // Fetch the business profile
        const businessProfileResponse = await fetch(`/api/business-profiles/${invoiceData.business_profile_id}`);
        if (!businessProfileResponse.ok) {
          throw new Error('Failed to fetch business profile');
        }
        const businessProfileData = await businessProfileResponse.json();

        // Fetch the client
        const clientResponse = await fetch(`/api/clients/${invoiceData.client_id}`);
        if (!clientResponse.ok) {
          throw new Error('Failed to fetch client');
        }
        const clientData = await clientResponse.json();

        // Combine the data
        const fullInvoice = {
          ...invoiceData,
          businessProfile: businessProfileData,
          client: clientData
        };

        setInvoice(fullInvoice);

        // Auto-create public token if missing (for QR code on PDF)
        let token = invoiceData.public_token;
        if (!token) {
          try {
            const shareResponse = await fetch(`/api/invoices/${params.id}/share`, { method: 'POST' });
            if (shareResponse.ok) {
              const shareData = await shareResponse.json();
              token = shareData.publicToken;
            }
          } catch {
            // Sharing is optional, don't block the page load
          }
        }
        if (token) {
          setPublicToken(token);
          const publicUrl = `${window.location.origin}/i/${token}`;
          const qr = await generateQrDataUrl(publicUrl);
          setQrDataUrl(qr);
        }
      } catch (err) {
        console.error('Error loading invoice:', err);
        setError('Error loading invoice. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchInvoice();
  }, [params.id]);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center py-10">
        <p className="text-gray-500">Loading invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div>
              <p className="text-sm text-red-700">{error || 'Invoice not found'}</p>
            </div>
          </div>
        </div>
        <Link href="/dashboard/invoices" className="text-blue-600 hover:text-blue-800">
          Back to Invoices
        </Link>
      </div>
    );
  }

  // Format date string to a more readable format
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
    } catch (error) {
      return dateString;
    }
  };

  // Format date string to a more readable format

  // Create a simplified invoice object for the PDF generator
  const pdfInvoiceData = {
    invoiceNumber: invoice.invoice_number,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date || undefined,
    // status removed as requested
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    taxRate: invoice.tax_rate,
    taxAmount: invoice.tax_amount,
    discountRate: invoice.discount_rate,
    discountAmount: invoice.discount_amount,
    total: invoice.total,
    notes: invoice.notes || undefined,
    terms: invoice.terms || undefined,
    qrCodeDataUrl: qrDataUrl || undefined,
    businessProfile: {
      name: invoice.businessProfile?.name || '',
      email: invoice.businessProfile?.email || '',
      phone: invoice.businessProfile?.phone || '',
      address: invoice.businessProfile?.address || '',
      city: invoice.businessProfile?.city || '',
      state: invoice.businessProfile?.state || '',
      postalCode: invoice.businessProfile?.postal_code || '',
      country: invoice.businessProfile?.country || '',
      taxId: invoice.businessProfile?.tax_id || '',
    },
    client: {
      name: invoice.client?.name || '',
      email: invoice.client?.email || '',
      phone: invoice.client?.phone || '',
      address: invoice.client?.address || '',
      city: invoice.client?.city || '',
      state: invoice.client?.state || '',
      postalCode: invoice.client?.postal_code || '',
      country: invoice.client?.country || '',
      taxId: invoice.client?.tax_id || '',
    },
    items: invoice.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      amount: item.amount,
      taxRate: item.tax_rate,
      taxAmount: item.tax_amount,
    })),
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoice {invoice.invoice_number}</h1>
        <div className="flex space-x-3">
          <Link
            href={`/dashboard/invoices/edit/${params.id}`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
          >
            Edit Invoice
          </Link>
          <InvoiceDownloadLink data={pdfInvoiceData} theme={invoice.pdf_theme || 'clean'}>
            <button className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded">
              Download PDF
            </button>
          </InvoiceDownloadLink>
          {publicToken && (
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/i/${publicToken}`)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded"
            >
              Copy Public Link
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">From</h2>
          <div className="text-sm text-gray-600">
            <p className="font-semibold">{invoice.businessProfile?.name}</p>
            <p>{invoice.businessProfile?.address}</p>
            <p>{invoice.businessProfile?.city}, {invoice.businessProfile?.state} {invoice.businessProfile?.postal_code}</p>
            <p>{invoice.businessProfile?.country}</p>
            <p>Email: {invoice.businessProfile?.email}</p>
            <p>Phone: {invoice.businessProfile?.phone}</p>
            {invoice.businessProfile?.tax_id && (
              <p>Tax ID: {invoice.businessProfile.tax_id}</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Bill To</h2>
          <div className="text-sm text-gray-600">
            <p className="font-semibold">{invoice.client?.name}</p>
            <p>{invoice.client?.address}</p>
            <p>{invoice.client?.city}, {invoice.client?.state} {invoice.client?.postal_code}</p>
            <p>{invoice.client?.country}</p>
            <p>Email: {invoice.client?.email}</p>
            <p>Phone: {invoice.client?.phone}</p>
            {invoice.client?.tax_id && (
              <p>Tax ID: {invoice.client.tax_id}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="text-sm font-medium text-gray-500">Invoice Number</h3>
          <p className="text-lg font-medium">{invoice.invoice_number}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded">
          <h3 className="text-sm font-medium text-gray-500">Issue Date</h3>
          <p className="text-lg font-medium">{formatDate(invoice.issue_date)}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded">
          <h3 className="text-sm font-medium text-gray-500">Due Date</h3>
          <p className="text-lg font-medium">{formatDate(invoice.due_date)}</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Invoice Items</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {invoice.currency} {item.unit_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.tax_rate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {invoice.currency} {item.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          {invoice.notes && (
            <div className="mb-4">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Notes</h2>
              <p className="text-sm text-gray-600">{invoice.notes}</p>
            </div>
          )}

          {invoice.terms && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Terms and Conditions</h2>
              <p className="text-sm text-gray-600">{invoice.terms}</p>
            </div>
          )}
        </div>

        <div className="bg-gray-50 p-6 rounded">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Invoice Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Subtotal:</span>
              <span className="text-sm font-medium">{invoice.currency} {invoice.subtotal.toFixed(2)}</span>
            </div>

            {invoice.discount_rate > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Discount ({invoice.discount_rate}%):</span>
                <span className="text-sm font-medium">-{invoice.currency} {invoice.discount_amount.toFixed(2)}</span>
              </div>
            )}

            {invoice.tax_rate > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tax ({invoice.tax_rate}%):</span>
                <span className="text-sm font-medium">{invoice.currency} {invoice.tax_amount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between pt-2 mt-2 border-t border-gray-200">
              <span className="text-base font-medium text-gray-900">Total:</span>
              <span className="text-base font-medium text-gray-900">{invoice.currency} {invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
