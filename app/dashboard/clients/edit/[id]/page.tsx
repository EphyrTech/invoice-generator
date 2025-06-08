"use client";

import Link from 'next/link';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

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
  notes: string | null;
  is_business_profile: boolean;
  business_profile_id: string | null;
};

type BusinessProfile = {
  id: string;
  name: string;
};

export default function EditClient({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [businessProfiles, setBusinessProfiles] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    taxId: '',
    notes: '',
    isBusinessProfile: false,
    businessProfileId: ''
  });

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch client data
        const clientResponse = await fetch(`/api/clients/${params.id}`);
        if (!clientResponse.ok) {
          throw new Error('Failed to fetch client');
        }
        const clientData: Client = await clientResponse.json();
        
        setFormData({
          name: clientData.name,
          email: clientData.email || '',
          phone: clientData.phone || '',
          address: clientData.address || '',
          city: clientData.city || '',
          state: clientData.state || '',
          postalCode: clientData.postal_code || '',
          country: clientData.country || '',
          taxId: clientData.tax_id || '',
          notes: clientData.notes || '',
          isBusinessProfile: clientData.is_business_profile,
          businessProfileId: clientData.business_profile_id || ''
        });
        
        // Fetch business profiles
        const profilesResponse = await fetch('/api/business-profiles');
        if (!profilesResponse.ok) {
          throw new Error('Failed to fetch business profiles');
        }
        const profilesData = await profilesResponse.json();
        setBusinessProfiles(profilesData);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Error loading data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [params.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.name) {
        throw new Error('Client name is required');
      }

      // Submit the client data to the API
      const response = await fetch(`/api/clients/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update client');
      }
      
      // Redirect to clients list
      router.push('/dashboard/clients');
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
        <p className="text-gray-500">Loading client...</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Edit Client</h1>
        <Link 
          href="/dashboard/clients" 
          className="text-blue-600 hover:text-blue-800"
        >
          Back to Clients
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
      
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Client Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Client Name"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="client@example.com"
            />
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              type="text"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="+1 (555) 123-4567"
            />
          </div>
          
          <div className="md:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Address
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="123 Client St"
            />
          </div>
          
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="City"
            />
          </div>
          
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700">
              State / Province
            </label>
            <input
              type="text"
              id="state"
              name="state"
              value={formData.state}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="State"
            />
          </div>
          
          <div>
            <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
              Postal Code
            </label>
            <input
              type="text"
              id="postalCode"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="12345"
            />
          </div>
          
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">
              Country
            </label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Country"
            />
          </div>
          
          <div>
            <label htmlFor="taxId" className="block text-sm font-medium text-gray-700">
              Tax ID / VAT Number
            </label>
            <input
              type="text"
              id="taxId"
              name="taxId"
              value={formData.taxId}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Tax ID"
            />
          </div>
          
          <div className="md:col-span-2">
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
              placeholder="Additional notes about this client..."
            ></textarea>
          </div>
          
          <div className="md:col-span-2">
            <div className="flex items-center">
              <input
                id="isBusinessProfile"
                name="isBusinessProfile"
                type="checkbox"
                checked={formData.isBusinessProfile}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isBusinessProfile" className="ml-2 block text-sm text-gray-900">
                This client is one of my business profiles
              </label>
            </div>
          </div>
          
          {formData.isBusinessProfile && (
            <div>
              <label htmlFor="businessProfileId" className="block text-sm font-medium text-gray-700">
                Select Business Profile
              </label>
              <select
                id="businessProfileId"
                name="businessProfileId"
                value={formData.businessProfileId}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select a business profile</option>
                {businessProfiles.map(profile => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3">
          <Link
            href="/dashboard/clients"
            className="bg-gray-200 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className={`${saving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
