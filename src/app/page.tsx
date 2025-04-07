import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Invoice PDF Generator</h1>
        
        <p className="text-gray-600 mb-8 text-center">
          Generate professional PDF invoices for your business. You can be both the client and vendor.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
            <h2 className="text-xl font-semibold mb-4">Business Profiles</h2>
            <p className="text-gray-600 mb-4">
              Manage your business profiles to use as vendors on invoices.
            </p>
            <Link 
              href="/dashboard/business-profiles" 
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-center"
            >
              Manage Business Profiles
            </Link>
          </div>
          
          <div className="bg-green-50 p-6 rounded-lg border border-green-100">
            <h2 className="text-xl font-semibold mb-4">Clients</h2>
            <p className="text-gray-600 mb-4">
              Manage your clients, including your own business as a client.
            </p>
            <Link 
              href="/dashboard/clients" 
              className="block w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded text-center"
            >
              Manage Clients
            </Link>
          </div>
          
          <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
            <h2 className="text-xl font-semibold mb-4">Invoices</h2>
            <p className="text-gray-600 mb-4">
              Create, manage, and generate PDF invoices.
            </p>
            <Link 
              href="/dashboard/invoices" 
              className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded text-center"
            >
              Manage Invoices
            </Link>
          </div>
          
          <div className="bg-amber-50 p-6 rounded-lg border border-amber-100">
            <h2 className="text-xl font-semibold mb-4">Invoice Templates</h2>
            <p className="text-gray-600 mb-4">
              Create and manage reusable invoice templates.
            </p>
            <Link 
              href="/dashboard/templates" 
              className="block w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded text-center"
            >
              Manage Templates
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
