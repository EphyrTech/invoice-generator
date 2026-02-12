import QRCode from 'qrcode';

export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 160,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}
