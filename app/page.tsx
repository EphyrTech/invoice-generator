import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 border border-blue-200 mb-8">
            <span className="text-sm font-medium text-blue-800">✨ Professional Invoice Generator</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
            Create Beautiful
            <span className="block text-blue-600">PDF Invoices</span>
          </h1>

          <p className="text-xl text-slate-600 mb-12 max-w-3xl mx-auto">
            Generate professional, customizable PDF invoices for your business.
            Manage clients, templates, and business profiles all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all duration-200"
            >
              Get Started
            </Link>

            <Link
              href="/dashboard/invoices/new"
              className="px-8 py-4 bg-white text-slate-700 font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 hover:shadow-lg transition-all duration-200"
            >
              Create Invoice
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Business Profiles Card */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Business Profiles</h3>
            <p className="text-slate-600 mb-4 text-sm">
              Manage your business information and branding for professional invoices
            </p>
            <Link
              href="/dashboard/business-profiles"
              className="text-blue-600 font-medium hover:text-blue-700 text-sm"
            >
              Manage Profiles →
            </Link>
          </div>

          {/* Clients Card */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Client Management</h3>
            <p className="text-slate-600 mb-4 text-sm">
              Organize and manage your client database with detailed contact information
            </p>
            <Link
              href="/dashboard/clients"
              className="text-emerald-600 font-medium hover:text-emerald-700 text-sm"
            >
              Manage Clients →
            </Link>
          </div>

          {/* Invoices Card */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Invoice Creation</h3>
            <p className="text-slate-600 mb-4 text-sm">
              Create, edit, and generate professional PDF invoices with ease
            </p>
            <Link
              href="/dashboard/invoices"
              className="text-purple-600 font-medium hover:text-purple-700 text-sm"
            >
              Create Invoices →
            </Link>
          </div>

          {/* Templates Card */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Smart Templates</h3>
            <p className="text-slate-600 mb-4 text-sm">
              Save time with reusable invoice templates and automated calculations
            </p>
            <Link
              href="/dashboard/templates"
              className="text-amber-600 font-medium hover:text-amber-700 text-sm"
            >
              Manage Templates →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
