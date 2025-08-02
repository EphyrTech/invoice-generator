"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

type Template = {
  id: string;
  name: string;
  business_profile_id: string;
  client_id: string;
  created_at: string;
};

type BusinessProfile = {
  id: string;
  name: string;
};

type Client = {
  id: string;
  name: string;
};

export default function InvoiceTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [businessProfiles, setBusinessProfiles] = useState<Record<string, BusinessProfile>>({});
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch templates
        const templatesResponse = await fetch('/api/templates');
        if (!templatesResponse.ok) {
          throw new Error('Failed to fetch templates');
        }
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData);

        // Fetch business profiles
        const profilesResponse = await fetch('/api/business-profiles');
        if (!profilesResponse.ok) {
          throw new Error('Failed to fetch business profiles');
        }
        const profilesData = await profilesResponse.json();
        const profilesMap: Record<string, BusinessProfile> = {};
        profilesData.forEach((profile: BusinessProfile) => {
          profilesMap[profile.id] = profile;
        });
        setBusinessProfiles(profilesMap);

        // Fetch clients
        const clientsResponse = await fetch('/api/clients');
        if (!clientsResponse.ok) {
          throw new Error('Failed to fetch clients');
        }
        const clientsData = await clientsResponse.json();
        const clientsMap: Record<string, Client> = {};
        clientsData.forEach((client: Client) => {
          clientsMap[client.id] = client;
        });
        setClients(clientsMap);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Error loading data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      // Remove the deleted template from the state
      setTemplates(templates.filter(template => template.id !== id));
    } catch (err) {
      setError('Error deleting template. Please try again.');
      console.error(err);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoice Templates</h1>
        <Link
          href="/dashboard/templates/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
        >
          Create New Template
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

      {loading ? (
        <div className="text-center py-10">
          <p className="text-gray-500">Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500">No templates found. Create your first one!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Template Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business Profile
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templates.map((template) => (
                <tr key={template.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {template.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {businessProfiles[template.business_profile_id]?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {clients[template.client_id]?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(template.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/dashboard/invoices/new?templateId=${template.id}`} className="text-green-600 hover:text-green-900 mr-3">
                      Use
                    </Link>
                    <Link href={`/dashboard/templates/edit/${template.id}`} className="text-blue-600 hover:text-blue-900 mr-3">
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
