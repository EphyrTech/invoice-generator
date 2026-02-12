import React from 'react';
import { getTheme, getThemeNames } from '@/lib/pdf/themes';

describe('PDF Themes', () => {
  it('should return all 4 theme names', () => {
    expect(getThemeNames()).toEqual(['clean', 'classic', 'bold', 'compact']);
  });

  it('should return a component for each theme', () => {
    for (const name of getThemeNames()) {
      const Theme = getTheme(name);
      expect(Theme).toBeDefined();
      expect(typeof Theme).toBe('function');
    }
  });

  it('should fall back to clean for unknown theme name', () => {
    const fallback = getTheme('nonexistent');
    const clean = getTheme('clean');
    expect(fallback).toBe(clean);
  });
});
