import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { initializeDatabaseWithSQL } from '@/lib/db/init-db-sql';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Invoice PDF Generator',
  description: 'Generate PDF invoices for your business',
};

// Initialize the database when the app starts
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  initializeDatabaseWithSQL().catch(console.error);
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}
