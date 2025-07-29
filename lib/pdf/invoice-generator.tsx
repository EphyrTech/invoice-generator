import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image } from '@react-pdf/renderer';

// Define types for invoice data
export type InvoiceData = {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  status?: string; // Made optional since we don't want to display it
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  notes?: string;
  terms?: string;

  // Business profile (vendor)
  businessProfile: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    taxId?: string;
    logoUrl?: string;
  };

  // Client
  client: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    taxId?: string;
  };

  // Invoice items
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate?: number;
    taxAmount?: number;
  }[];
};

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 50,
    objectFit: 'contain',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  invoiceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoColumn: {
    flexDirection: 'column',
    width: '48%',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 10,
    marginBottom: 10,
  },
  table: {
    flexDirection: 'column',
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    borderBottomStyle: 'solid',
    paddingBottom: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    borderBottomStyle: 'solid',
    paddingTop: 8,
    paddingBottom: 8,
  },
  description: {
    width: '40%',
    fontSize: 10,
  },
  quantity: {
    width: '15%',
    fontSize: 10,
    textAlign: 'center',
  },
  unitPrice: {
    width: '15%',
    fontSize: 10,
    textAlign: 'right',
  },
  amount: {
    width: '15%',
    fontSize: 10,
    textAlign: 'right',
  },
  tax: {
    width: '15%',
    fontSize: 10,
    textAlign: 'right',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 5,
    paddingBottom: 5,
  },
  summaryLabel: {
    width: '20%',
    fontSize: 10,
    textAlign: 'right',
    paddingRight: 10,
  },
  summaryValue: {
    width: '15%',
    fontSize: 10,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#000000',
    borderTopStyle: 'solid',
  },
  totalLabel: {
    width: '20%',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
    paddingRight: 10,
  },
  totalValue: {
    width: '15%',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  footer: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    borderTopStyle: 'solid',
    paddingTop: 10,
  },
  notes: {
    fontSize: 10,
    marginBottom: 10,
  },
  terms: {
    fontSize: 10,
  },
});

// Create PDF Document component
const InvoicePDF: React.FC<{ data: InvoiceData }> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return `${data.currency} ${amount.toFixed(2)}`;
  };

  const formatAddress = (profile: any) => {
    const parts = [
      profile.address,
      profile.city,
      profile.state,
      profile.postalCode,
      profile.country,
    ].filter(Boolean);

    return parts.join(', ');
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={{ fontSize: 12 }}>{data.invoiceNumber}</Text>
          </View>
          {data.businessProfile.logoUrl && (
            <Image style={styles.logo} src={data.businessProfile.logoUrl} />
          )}
        </View>

        {/* Invoice Info */}
        <View style={styles.invoiceInfo}>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>From:</Text>
            <Text style={styles.infoValue}>{data.businessProfile.name}</Text>
            <Text style={styles.infoValue}>{formatAddress(data.businessProfile)}</Text>
            {data.businessProfile.email && (
              <Text style={styles.infoValue}>{data.businessProfile.email}</Text>
            )}
            {data.businessProfile.phone && (
              <Text style={styles.infoValue}>{data.businessProfile.phone}</Text>
            )}
            {data.businessProfile.taxId && (
              <Text style={styles.infoValue}>Tax ID: {data.businessProfile.taxId}</Text>
            )}
          </View>

          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Bill To:</Text>
            <Text style={styles.infoValue}>{data.client.name}</Text>
            <Text style={styles.infoValue}>{formatAddress(data.client)}</Text>
            {data.client.email && (
              <Text style={styles.infoValue}>{data.client.email}</Text>
            )}
            {data.client.phone && (
              <Text style={styles.infoValue}>{data.client.phone}</Text>
            )}
            {data.client.taxId && (
              <Text style={styles.infoValue}>Tax ID: {data.client.taxId}</Text>
            )}
          </View>
        </View>

        <View style={styles.invoiceInfo}>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Invoice Details:</Text>
            <Text style={styles.infoValue}>Issue Date: {data.issueDate}</Text>
            {data.dueDate && (
              <Text style={styles.infoValue}>Due Date: {data.dueDate}</Text>
            )}
          </View>
        </View>

        {/* Invoice Items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.description}>Description</Text>
            <Text style={styles.quantity}>Quantity</Text>
            <Text style={styles.unitPrice}>Unit Price</Text>
            <Text style={styles.tax}>Tax</Text>
            <Text style={styles.amount}>Amount</Text>
          </View>

          {data.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.description}>{item.description}</Text>
              <Text style={styles.quantity}>{item.quantity}</Text>
              <Text style={styles.unitPrice}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.tax}>
                {item.taxRate ? `${item.taxRate}%` : '-'}
              </Text>
              <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(data.subtotal)}</Text>
          </View>

          {data.discountRate > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount ({data.discountRate}%):</Text>
              <Text style={styles.summaryValue}>-{formatCurrency(data.discountAmount)}</Text>
            </View>
          )}

          {data.taxRate > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax ({data.taxRate}%):</Text>
              <Text style={styles.summaryValue}>{formatCurrency(data.taxAmount)}</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{formatCurrency(data.total)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {data.notes && (
            <View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>Notes:</Text>
              <Text style={styles.notes}>{data.notes}</Text>
            </View>
          )}

          {data.terms && (
            <View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>Terms and Conditions:</Text>
              <Text style={styles.terms}>{data.terms}</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
};

// Function to generate PDF
export const generateInvoicePDF = (data: InvoiceData) => {
  return <InvoicePDF data={data} />;
};

// Component for downloading PDF
export const InvoiceDownloadLink: React.FC<{
  data: InvoiceData;
  fileName?: string;
  children: React.ReactNode;
}> = ({ data, fileName, children }) => {
  const defaultFileName = `Invoice-${data.invoiceNumber}.pdf`;

  return (
    <PDFDownloadLink
      document={<InvoicePDF data={data} />}
      fileName={fileName || defaultFileName}
      style={{ textDecoration: 'none' }}
    >
      {children}
    </PDFDownloadLink>
  );
};
