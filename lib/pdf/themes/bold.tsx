import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { InvoiceData } from '../invoice-generator';

const ACCENT = '#1a56db';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  headerBar: {
    backgroundColor: ACCENT,
    padding: 20,
    marginBottom: 20,
    marginLeft: -30,
    marginRight: -30,
    marginTop: -30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
  },
  invoiceNumber: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  logo: {
    width: 120,
    height: 50,
    objectFit: 'contain',
  },
  divider: {
    height: 3,
    backgroundColor: ACCENT,
    marginTop: 15,
    marginBottom: 15,
  },
  invoiceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoColumn: {
    flexDirection: 'column',
    width: '48%',
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
    color: ACCENT,
  },
  infoValue: {
    fontSize: 10,
    marginBottom: 4,
    color: '#333333',
  },
  table: {
    flexDirection: 'column',
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: ACCENT,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 5,
    paddingRight: 5,
  },
  tableHeaderText: {
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderBottomStyle: 'solid',
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 5,
    paddingRight: 5,
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
    fontFamily: 'Helvetica-Bold',
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
    borderTopWidth: 3,
    borderTopColor: ACCENT,
    borderTopStyle: 'solid',
  },
  totalLabel: {
    width: '20%',
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    paddingRight: 10,
    color: ACCENT,
  },
  totalValue: {
    width: '15%',
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    color: ACCENT,
  },
  footer: {
    marginTop: 30,
    paddingTop: 10,
  },
  footerLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
    color: ACCENT,
  },
  notes: {
    fontSize: 10,
    marginBottom: 10,
    color: '#333333',
  },
  terms: {
    fontSize: 10,
    color: '#333333',
  },
});

const BoldTheme: React.FC<{ data: InvoiceData }> = ({ data }) => {
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
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
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

        <View style={styles.divider} />

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
            <Text style={[styles.description, styles.tableHeaderText]}>Description</Text>
            <Text style={[styles.quantity, styles.tableHeaderText]}>Quantity</Text>
            <Text style={[styles.unitPrice, styles.tableHeaderText]}>Unit Price</Text>
            <Text style={[styles.tax, styles.tableHeaderText]}>Tax</Text>
            <Text style={[styles.amount, styles.tableHeaderText]}>Amount</Text>
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
        <View style={styles.divider} />
        <View style={styles.footer}>
          {data.notes && (
            <View>
              <Text style={styles.footerLabel}>Notes:</Text>
              <Text style={styles.notes}>{data.notes}</Text>
            </View>
          )}

          {data.terms && (
            <View>
              <Text style={styles.footerLabel}>Terms and Conditions:</Text>
              <Text style={styles.terms}>{data.terms}</Text>
            </View>
          )}
        </View>

        {/* QR Code */}
        {data.qrCodeDataUrl && (
          <View style={{ position: 'absolute', bottom: 30, right: 30, alignItems: 'center' }}>
            <Image src={data.qrCodeDataUrl} style={{ width: 80, height: 80 }} />
            <Text style={{ fontSize: 7, color: '#999999', marginTop: 2 }}>Scan to view online</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default BoldTheme;
