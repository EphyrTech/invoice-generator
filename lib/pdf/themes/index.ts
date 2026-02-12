import React from 'react';
import type { InvoiceData } from '../invoice-generator';
import CleanTheme from './clean';
import ClassicTheme from './classic';
import BoldTheme from './bold';
import CompactTheme from './compact';

export type ThemeComponent = React.FC<{ data: InvoiceData }>;

const themes: Record<string, ThemeComponent> = {
  clean: CleanTheme,
  classic: ClassicTheme,
  bold: BoldTheme,
  compact: CompactTheme,
};

export function getTheme(name: string): ThemeComponent {
  return themes[name] || themes.clean;
}

export function getThemeNames(): string[] {
  return Object.keys(themes);
}
