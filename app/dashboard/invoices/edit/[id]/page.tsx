"use client";

import Link from 'next/link';
import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

type BusinessProfile = {
  id: string;
  name: string;
};

type Client = {
  id: string;
  name: string;
};

type InvoiceItem = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
};

type Invoice = {
  id: string;
  invoice_number: string;
  business_profile_id: string;
  client_id: string;
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
  items: InvoiceItem[];
};

export default function EditInvoice({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [businessProfiles, setBusinessProfiles] = useState<BusinessProfile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unitPrice: 0, taxRate: 0, amount: 0 }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  
  const [formData, setFormData] = useState({
    businessProfileId: '',
    clientId: '',
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    dueDate: '',
    status: 'draft',
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

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch invoice data
        const invoiceResponse = await fetch(`/api/invoices/${params.id}`);
        if (!invoiceResponse.ok) {
          throw new Error('Failed to fetch invoice');
        }
        const invoiceData: Invoice = await invoiceResponse.json();
        
        // Set form data
        setFormData({
          businessProfileId: invoiceData.business_profile_id,
          clientId: invoiceData.client_id,
          invoiceNumber: invoiceData.invoice_number,
          issueDate: invoiceData.issue_date,
          dueDate: invoiceData.due_date || '',
          status: invoiceData.status,
          currency: invoiceData.currency,
          taxRate: invoiceData.tax_rate,
          discountRate: invoiceData.discount_rate,
          notes: invoiceData.notes || '',
          terms: invoiceData.terms || '',
          templateName: ''
        });
        
        // Set items
        if (invoiceData.items && invoiceData.items.length > 0) {
          setItems(invoiceData.items.map(item => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            amount: item.amount
          })));
        }
        
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
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Error loading data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [params.id]);
  
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
    setSaving(true);
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
      
      // Get the action value (draft or final)
      const form = e.currentTarget as HTMLFormElement;
      const actionButton = document.activeElement as HTMLButtonElement;
      const action = actionButton.value || 'draft';
      
      // Submit the invoice data to the API
      const response = await fetch(`/api/invoices/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          items: items.filter(item => item.description.trim() !== ''),
          saveAsTemplate,
          action
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update invoice');
      }
      
      // If saving as template
      if (saveAsTemplate && formData.templateName) {
        const templateResponse = await fetch('/api/templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.templateName,
            businessProfileId: formData.businessProfileId,
            clientId: formData.clientId,
            invoiceNumber: formData.invoiceNumber,
            taxRate: formData.taxRate,
            discountRate: formData.discountRate,
            notes: formData.notes,
            terms: formData.terms,
            currency: formData.currency,
            items: items.filter(item => item.description.trim() !== '')
          }),
        });
        
        if (!templateResponse.ok) {
          console.error('Failed to save as template, but invoice was updated');
        }
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
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center py-10">
        <p className="text-gray-500">Loading invoice...</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Edit Invoice</h1>
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
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-3">Invoice Details</h2>
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
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="draft">Draft</option>
                <option value="issued">Issued</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
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
                  <tr key={item.id || index}>
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
        <div className="bg-gray-50 p-6 rounded">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Invoice Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Subtotal:</span>
              <span className="text-sm font-medium">{formData.currency} {subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">Discount:</span>
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
              <span className="text-sm font-medium">-{formData.currency} {discountAmount.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">Tax:</span>
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
              <span className="text-sm font-medium">{formData.currency} {taxAmount.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between pt-2 mt-2 border-t border-gray-200">
              <span className="text-base font-medium text-gray-900">Total:</span>
              <span className="text-base font-medium text-gray-900">{formData.currency} {total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
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
        
        {/* Save as Template */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center mb-4">
            <input
              id="saveAsTemplate"
              name="saveAsTemplate"
              type="checkbox"
              checked={saveAsTemplate}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="saveAsTemplate" className="ml-2 block text-sm text-gray-900">
              Save as Template
            </label>
          </div>
          
          {saveAsTemplate && (
            <div className="mb-4">
              <label htmlFor="templateName" className="block text-sm font-medium text-gray-700">
                Template Name *
              </label>
              <input
                type="text"
                id="templateName"
                name="templateName"
                value={formData.templateName}
                onChange={handleChange}
                required={saveAsTemplate}
                className="mt-1 block w-full sm:w-1/2 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., Monthly Consulting Services"
              />
            </div>
          )}
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
            disabled={saving}
            className={`${saving ? 'bg-gray-400' : 'bg-gray-600 hover:bg-gray-700'} py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
          >
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            type="submit"
            name="action"
            value="final"
            disabled={saving}
            className={`${saving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {saving ? 'Saving...' : 'Update Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
