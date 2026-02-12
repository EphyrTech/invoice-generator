import React from 'react';
import type { InvoiceData } from '../invoice-generator';
import CleanTheme from './clean';

export type ThemeComponent = React.FC<{ data: InvoiceData }>;

const themes: Record<string, ThemeComponent> = {
  clean: CleanTheme,
};

export function getTheme(name: string): ThemeComponent {
  return themes[name] || themes.clean;
}

export function getThemeNames(): string[] {
  return Object.keys(themes);
}
