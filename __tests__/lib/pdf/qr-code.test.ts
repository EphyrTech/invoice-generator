import { generateQrDataUrl } from '@/lib/pdf/qr-code';

describe('QR Code Generation', () => {
  it('should generate a base64 PNG data URL', async () => {
    const url = 'https://example.com/i/abc123';
    const dataUrl = await generateQrDataUrl(url);

    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(dataUrl.length).toBeGreaterThan(100);
  });

  it('should generate different QR codes for different URLs', async () => {
    const url1 = await generateQrDataUrl('https://example.com/i/abc');
    const url2 = await generateQrDataUrl('https://example.com/i/xyz');

    expect(url1).not.toEqual(url2);
  });
});
