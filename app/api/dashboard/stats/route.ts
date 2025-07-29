import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, clients, invoiceTemplates, businessProfiles } from '@/lib/db/schema/invoice-schema';
import { sql, eq, and, gte } from 'drizzle-orm';

export async function GET() {
  try {
    // Skip database operations during build time
    if (process.env.SKIP_BUILD_STATIC_GENERATION === 'true') {
      return NextResponse.json({
        totalInvoices: 0,
        activeClients: 0,
        templates: 0,
        businessProfiles: 0,
        monthlyRevenue: 0,
        pendingInvoices: 0,
        paidInvoices: 0,
        recentInvoices: []
      });
    }

    // Get total invoices count
    const totalInvoicesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoices);
    const totalInvoices = totalInvoicesResult[0]?.count || 0;

    // Get active clients count (assuming all clients are active for now)
    const activeClientsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(clients);
    const activeClients = activeClientsResult[0]?.count || 0;

    // Get templates count
    const templatesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoiceTemplates);
    const templates = templatesResult[0]?.count || 0;

    // Get business profiles count
    const businessProfilesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(businessProfiles);
    const businessProfilesCount = businessProfilesResult[0]?.count || 0;

    // Calculate this month's revenue
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    const monthlyRevenueResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${invoices.total}), 0)`
      })
      .from(invoices)
      .where(
        and(
          gte(invoices.createdAt, firstDayOfMonth),
          eq(invoices.status, 'paid')
        )
      );

    const monthlyRevenue = monthlyRevenueResult[0]?.total || 0;

    // Get recent invoices for additional context
    const recentInvoicesResult = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        totalAmount: invoices.total,
        createdAt: invoices.createdAt
      })
      .from(invoices)
      .orderBy(sql`${invoices.createdAt} DESC`)
      .limit(5);

    // Get pending invoices count
    const pendingInvoicesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(eq(invoices.status, 'pending'));
    const pendingInvoices = pendingInvoicesResult[0]?.count || 0;

    // Get paid invoices count
    const paidInvoicesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(eq(invoices.status, 'paid'));
    const paidInvoices = paidInvoicesResult[0]?.count || 0;

    return NextResponse.json({
      totalInvoices,
      activeClients,
      templates,
      businessProfiles: businessProfilesCount,
      monthlyRevenue,
      pendingInvoices,
      paidInvoices,
      recentInvoices: recentInvoicesResult
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
