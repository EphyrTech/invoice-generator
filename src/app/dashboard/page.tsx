import Link from 'next/link';

export default function Dashboard() {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
          <h2 className="text-lg font-semibold mb-2">Business Profiles</h2>
          <p className="text-gray-600 mb-4">Manage your business profiles</p>
          <Link 
            href="/dashboard/business-profiles" 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View Business Profiles →
          </Link>
        </div>
        
        <div className="bg-green-50 p-6 rounded-lg border border-green-100">
          <h2 className="text-lg font-semibold mb-2">Clients</h2>
          <p className="text-gray-600 mb-4">Manage your clients</p>
          <Link 
            href="/dashboard/clients" 
            className="text-green-600 hover:text-green-800 font-medium"
          >
            View Clients →
          </Link>
        </div>
        
        <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
          <h2 className="text-lg font-semibold mb-2">Invoices</h2>
          <p className="text-gray-600 mb-4">Create and manage invoices</p>
          <Link 
            href="/dashboard/invoices" 
            className="text-purple-600 hover:text-purple-800 font-medium"
          >
            View Invoices →
          </Link>
        </div>
        
        <div className="bg-amber-50 p-6 rounded-lg border border-amber-100">
          <h2 className="text-lg font-semibold mb-2">Templates</h2>
          <p className="text-gray-600 mb-4">Manage invoice templates</p>
          <Link 
            href="/dashboard/templates" 
            className="text-amber-600 hover:text-amber-800 font-medium"
          >
            View Templates →
          </Link>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link 
            href="/dashboard/invoices/new" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-center"
          >
            Create New Invoice
          </Link>
          <Link 
            href="/dashboard/templates/new" 
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded text-center"
          >
            Create New Template
          </Link>
        </div>
      </div>
    </div>
  );
}
