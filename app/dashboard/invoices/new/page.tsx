"use client";

import Link from 'next/link';
import { useState, useEffect, FormEvent, ChangeEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

type BusinessProfile = {
  id: string;
  name: string;
};

type Client = {
  id: string;
  name: string;
};

type InvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
};

type Template = {
  id: string;
  name: string;
  business_profile_id: string;
  client_id: string;
  invoice_number: string | null;
  tax_rate: number;
  discount_rate: number;
  notes: string | null;
  terms: string | null;
  currency: string;
  items: {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
  }[];
};

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('templateId');

  const [businessProfiles, setBusinessProfiles] = useState<BusinessProfile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unitPrice: 0, taxRate: 0, amount: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  const [formData, setFormData] = useState({
    businessProfileId: '',
    clientId: '',
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    dueDate: '',
    currency: 'USD',
    taxRate: 0,
    discountRate: 0,
    notes: '',
    terms: '',
    templateName: ''
  });

  // Calculate subtotal, tax, discount, and total
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const discountAmount = (subtotal * formData.discountRate) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * formData.taxRate) / 100;
  const total = taxableAmount + taxAmount;

  // Update item amounts when quantity or unit price changes
  const updateItemAmounts = () => {
    setItems(prevItems => prevItems.map(item => ({
      ...item,
      amount: item.quantity * item.unitPrice
    })));
  };

  // Handle form input changes
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      if (name === 'saveAsTemplate') {
        setSaveAsTemplate(checked);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle item changes
  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    setItems(newItems);

    // Update amounts if quantity or unit price changes
    if (field === 'quantity' || field === 'unitPrice') {
      setTimeout(updateItemAmounts, 0);
    }
  };

  // Add a new item
  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, taxRate: 0, amount: 0 }]);
  };

  // Remove an item
  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.businessProfileId) {
        throw new Error('Business profile is required');
      }
      if (!formData.clientId) {
        throw new Error('Client is required');
      }
      if (!formData.invoiceNumber) {
        throw new Error('Invoice number is required');
      }
      if (!formData.issueDate) {
        throw new Error('Issue date is required');
      }

      // Submit the invoice data to the API
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          items: items.filter(item => item.description.trim() !== ''),
          saveAsTemplate,
          action: 'final'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invoice');
      }

      // Redirect to invoices list
      router.push('/dashboard/invoices');
      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch business profiles, clients, and template data
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch business profiles
        const profilesResponse = await fetch('/api/business-profiles');
        if (!profilesResponse.ok) {
          throw new Error('Failed to fetch business profiles');
        }
        const profilesData = await profilesResponse.json();
        setBusinessProfiles(profilesData);

        // Fetch clients
        const clientsResponse = await fetch('/api/clients');
        if (!clientsResponse.ok) {
          throw new Error('Failed to fetch clients');
        }
        const clientsData = await clientsResponse.json();
        setClients(clientsData);

        // If templateId is provided, fetch template data
        if (templateId) {
          const templateResponse = await fetch(`/api/templates/${templateId}`);
          if (!templateResponse.ok) {
            throw new Error('Failed to fetch template');
          }
          const templateData: Template = await templateResponse.json();

          // Apply template data to form
          setFormData({
            businessProfileId: templateData.business_profile_id,
            clientId: templateData.client_id,
            invoiceNumber: templateData.invoice_number || '',
            issueDate: new Date().toISOString().split('T')[0], // Today's date
            dueDate: '',
            currency: templateData.currency,
            taxRate: templateData.tax_rate,
            discountRate: templateData.discount_rate,
            notes: templateData.notes || '',
            terms: templateData.terms || '',
            templateName: ''
          });

          // Apply template items
          if (templateData.items && templateData.items.length > 0) {
            setItems(templateData.items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              taxRate: item.tax_rate,
              amount: item.quantity * item.unit_price
            })));
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Error loading data. Please try again.');
      }
    }

    fetchData();
  }, [templateId]);
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Create New Invoice</h1>
        <Link
          href="/dashboard/invoices"
          className="text-blue-600 hover:text-blue-800"
        >
          Back to Invoices
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form className="space-y-8" onSubmit={handleSubmit}>
        {/* Invoice Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="businessProfileId" className="block text-sm font-medium text-gray-700">
              Your Business Profile *
            </label>
            <select
              id="businessProfileId"
              name="businessProfileId"
              value={formData.businessProfileId}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select a business profile</option>
              {businessProfiles.map(profile => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">
              Client *
            </label>
            <select
              id="clientId"
              name="clientId"
              value={formData.clientId}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select a client</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700">
              Invoice Number *
            </label>
            <input
              type="text"
              id="invoiceNumber"
              name="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="INV-001"
            />
          </div>

          <div>
            <label htmlFor="issueDate" className="block text-sm font-medium text-gray-700">
              Issue Date *
            </label>
            <input
              type="date"
              id="issueDate"
              name="issueDate"
              value={formData.issueDate}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
              Due Date
            </label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
              Currency
            </label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="AUD">AUD - Australian Dollar</option>
            </select>
          </div>
        </div>

        {/* Invoice Items */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-3">Invoice Items</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description *
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity *
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price *
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tax Rate (%)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        required
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Item description"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                        required
                        min="1"
                        step="0.01"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="1"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                        required
                        min="0"
                        step="0.01"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={item.taxRate}
                        onChange={(e) => handleItemChange(index, 'taxRate', parseFloat(e.target.value))}
                        min="0"
                        step="0.01"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formData.currency} {item.amount.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length <= 1}
                        className={`${items.length <= 1 ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}`}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              + Add Item
            </button>
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Any additional notes for the client..."
              ></textarea>
            </div>

            <div>
              <label htmlFor="terms" className="block text-sm font-medium text-gray-700">
                Terms and Conditions
              </label>
              <textarea
                id="terms"
                name="terms"
                value={formData.terms}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Payment terms, delivery conditions, etc."
              ></textarea>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Invoice Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Subtotal:</span>
                <span className="text-sm font-medium">{formData.currency} {subtotal.toFixed(2)}</span>
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Discount:</span>
                  <div className="flex items-center">
                    <input
                      type="number"
                      name="discountRate"
                      value={formData.discountRate}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-16 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm mr-2"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
                <div className="flex justify-between mt-1">
                  <span></span>
                  <span className="text-sm font-medium">-{formData.currency} {discountAmount.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Tax:</span>
                  <div className="flex items-center">
                    <input
                      type="number"
                      name="taxRate"
                      value={formData.taxRate}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-16 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm mr-2"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
                <div className="flex justify-between mt-1">
                  <span></span>
                  <span className="text-sm font-medium">{formData.currency} {taxAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-base font-medium text-gray-900">Total:</span>
                  <span className="text-base font-medium text-gray-900">{formData.currency} {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save as Template */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="saveAsTemplate"
                name="saveAsTemplate"
                type="checkbox"
                checked={saveAsTemplate}
                onChange={(e) => setSaveAsTemplate(e.target.checked)}
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="saveAsTemplate" className="font-medium text-gray-700">
                Save as Template
              </label>
              <p className="text-gray-500">
                Save this invoice as a template for future use.
              </p>
            </div>
          </div>

          <div className="mt-3 ml-7">
            <label htmlFor="templateName" className="block text-sm font-medium text-gray-700">
              Template Name
            </label>
            <input
              type="text"
              id="templateName"
              name="templateName"
              value={formData.templateName}
              onChange={handleChange}
              disabled={!saveAsTemplate}
              className="mt-1 block w-full sm:w-1/2 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., Monthly Consulting Services"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <Link
            href="/dashboard/invoices"
            className="bg-gray-200 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </Link>
          <button
            type="submit"
            name="action"
            value="draft"
            disabled={loading}
            className={`${loading ? 'bg-gray-400' : 'bg-gray-600 hover:bg-gray-700'} py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
          >
            {loading ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            type="submit"
            name="action"
            value="final"
            disabled={loading}
            className={`${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewInvoice() {
  return (
    <Suspense fallback={<div className="bg-white shadow rounded-lg p-6 text-center py-10">
      <p className="text-gray-500">Loading...</p>
    </div>}>
      <NewInvoiceContent />
    </Suspense>
  );
}
