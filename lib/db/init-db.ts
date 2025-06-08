import { db, runMigrations } from './index';
import { businessProfiles, clients, invoices, invoiceItems, invoiceTemplates, invoiceTemplateItems } from './schema/invoice-schema';
import { users } from './schema/auth-schema';
import { v4 as uuidv4 } from 'uuid';

export async function initializeDatabase() {
  try {
    // Run migrations if in development
    await runMigrations();
    
    // Create a default user if none exists
    const existingUsers = await db.query.users.findMany({
      limit: 1,
    });
    
    if (existingUsers.length === 0) {
      const userId = uuidv4();
      
      // Insert default user
      await db.insert(users).values({
        id: userId,
        name: 'Demo User',
        email: 'demo@example.com',
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Insert default business profile
      const businessProfileId = uuidv4();
      await db.insert(businessProfiles).values({
        id: businessProfileId,
        userId: userId,
        name: 'My Company',
        email: 'info@mycompany.com',
        phone: '+1 (555) 123-4567',
        address: '123 Business St',
        city: 'City',
        state: 'State',
        postalCode: '12345',
        country: 'USA',
        taxId: '123456789',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Insert default client
      const clientId = uuidv4();
      await db.insert(clients).values({
        id: clientId,
        userId: userId,
        name: 'Client Company',
        email: 'contact@clientcompany.com',
        phone: '+1 (555) 987-6543',
        address: '456 Client Ave',
        city: 'City',
        state: 'State',
        postalCode: '54321',
        country: 'USA',
        taxId: '987654321',
        isBusinessProfile: false,
        businessProfileId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Insert a client that is also a business profile
      const ownBusinessClientId = uuidv4();
      await db.insert(clients).values({
        id: ownBusinessClientId,
        userId: userId,
        name: 'My Company (as Client)',
        email: 'info@mycompany.com',
        phone: '+1 (555) 123-4567',
        address: '123 Business St',
        city: 'City',
        state: 'State',
        postalCode: '12345',
        country: 'USA',
        taxId: '123456789',
        isBusinessProfile: true,
        businessProfileId: businessProfileId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Insert a sample invoice
      const invoiceId = uuidv4();
      await db.insert(invoices).values({
        id: invoiceId,
        userId: userId,
        businessProfileId: businessProfileId,
        clientId: clientId,
        invoiceNumber: 'INV-001',
        issueDate: '2023-04-01',
        dueDate: '2023-05-01',
        status: 'paid',
        subtotal: 1200,
        taxRate: 10,
        taxAmount: 120,
        discountRate: 0,
        discountAmount: 0,
        total: 1320,
        notes: 'Thank you for your business!',
        terms: 'Payment due within 30 days.',
        currency: 'USD',
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Insert invoice items
      await db.insert(invoiceItems).values([
        {
          id: uuidv4(),
          invoiceId: invoiceId,
          description: 'Consulting Services',
          quantity: 10,
          unitPrice: 100,
          amount: 1000,
          taxRate: 10,
          taxAmount: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          invoiceId: invoiceId,
          description: 'Software License',
          quantity: 1,
          unitPrice: 200,
          amount: 200,
          taxRate: 10,
          taxAmount: 20,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      
      // Insert a sample invoice template
      const templateId = uuidv4();
      await db.insert(invoiceTemplates).values({
        id: templateId,
        userId: userId,
        name: 'Monthly Consulting Services',
        businessProfileId: businessProfileId,
        clientId: clientId,
        invoiceNumber: 'INV-{YEAR}{MONTH}-{NUMBER}',
        taxRate: 10,
        discountRate: 0,
        notes: 'Thank you for your business!',
        terms: 'Payment due within 30 days.',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Insert template items
      await db.insert(invoiceTemplateItems).values([
        {
          id: uuidv4(),
          templateId: templateId,
          description: 'Consulting Services',
          quantity: 10,
          unitPrice: 100,
          taxRate: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      
      console.log('Database initialized with sample data');
    } else {
      console.log('Database already contains data, skipping initialization');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}
