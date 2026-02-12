import { rateLimit } from '@/lib/utils/rate-limit';

describe('rateLimit', () => {
  it('should allow requests within the limit', () => {
    const ip = 'test-ip-' + Date.now();
    for (let i = 0; i < 30; i++) {
      expect(rateLimit(ip)).toBe(true);
    }
  });

  it('should block requests exceeding the limit', () => {
    const ip = 'blocked-ip-' + Date.now();
    for (let i = 0; i < 30; i++) {
      rateLimit(ip);
    }
    expect(rateLimit(ip)).toBe(false);
  });

  it('should allow custom limits', () => {
    const ip = 'custom-ip-' + Date.now();
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(ip, 5)).toBe(true);
    }
    expect(rateLimit(ip, 5)).toBe(false);
  });
});
