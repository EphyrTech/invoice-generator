import { pgTable, text, timestamp, real, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './auth-schema';

export const businessProfiles = pgTable('business_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  country: text('country'),
  taxId: text('tax_id'),
  logoUrl: text('logo_url'),
  defaultShowLogo: boolean('default_show_logo').default(false),
  defaultShowStatus: boolean('default_show_status').default(false),
  defaultPdfTheme: text('default_pdf_theme').default('clean'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  country: text('country'),
  taxId: text('tax_id'),
  notes: text('notes'),
  isBusinessProfile: boolean('is_business_profile').default(false),
  businessProfileId: text('business_profile_id')
    .references(() => businessProfiles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  businessProfileId: text('business_profile_id')
    .notNull()
    .references(() => businessProfiles.id, { onDelete: 'restrict' }),
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'restrict' }),
  invoiceNumber: text('invoice_number').notNull(),
  issueDate: text('issue_date').notNull(),
  dueDate: text('due_date'),
  status: text('status').notNull().default('draft'),
  subtotal: real('subtotal').notNull().default(0),
  taxRate: real('tax_rate').default(0),
  taxAmount: real('tax_amount').default(0),
  discountRate: real('discount_rate').default(0),
  discountAmount: real('discount_amount').default(0),
  total: real('total').notNull().default(0),
  notes: text('notes'),
  terms: text('terms'),
  currency: text('currency').default('USD'),
  isRecurring: boolean('is_recurring').default(false),
  recurringInterval: text('recurring_interval'),
  nextIssueDate: text('next_issue_date'),
  publicToken: text('public_token').unique(),
  showLogoPublic: boolean('show_logo_public').default(false),
  showStatusPublic: boolean('show_status_public').default(false),
  pdfTheme: text('pdf_theme').default('clean'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const invoiceItems = pgTable('invoice_items', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: real('quantity').notNull().default(1),
  unitPrice: real('unit_price').notNull().default(0),
  amount: real('amount').notNull().default(0),
  taxRate: real('tax_rate').default(0),
  taxAmount: real('tax_amount').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const businessProfilesRelations = relations(businessProfiles, ({ many }) => ({
  invoices: many(invoices),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  businessProfile: one(businessProfiles, {
    fields: [invoices.businessProfileId],
    references: [businessProfiles.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

// Invoice Templates
export const invoiceTemplates = pgTable('invoice_templates', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  businessProfileId: text('business_profile_id')
    .notNull()
    .references(() => businessProfiles.id, { onDelete: 'restrict' }),
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'restrict' }),
  invoiceNumber: text('invoice_number'),
  issueDate: text('issue_date'),
  dueDate: text('due_date'),
  status: text('status').default('draft'),
  taxRate: real('tax_rate').default(0),
  discountRate: real('discount_rate').default(0),
  notes: text('notes'),
  terms: text('terms'),
  currency: text('currency').default('USD'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const invoiceTemplateItems = pgTable('invoice_template_items', {
  id: text('id').primaryKey(),
  templateId: text('template_id')
    .notNull()
    .references(() => invoiceTemplates.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: real('quantity').notNull().default(1),
  unitPrice: real('unit_price').notNull().default(0),
  taxRate: real('tax_rate').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Template Relations
export const invoiceTemplatesRelations = relations(invoiceTemplates, ({ one, many }) => ({
  businessProfile: one(businessProfiles, {
    fields: [invoiceTemplates.businessProfileId],
    references: [businessProfiles.id],
  }),
  client: one(clients, {
    fields: [invoiceTemplates.clientId],
    references: [clients.id],
  }),
  items: many(invoiceTemplateItems),
}));

export const invoiceTemplateItemsRelations = relations(invoiceTemplateItems, ({ one }) => ({
  template: one(invoiceTemplates, {
    fields: [invoiceTemplateItems.templateId],
    references: [invoiceTemplates.id],
  }),
}));
