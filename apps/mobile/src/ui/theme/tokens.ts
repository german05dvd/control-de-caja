/**
 * Constantes de diseño en TypeScript. Son el espejo de variables.css: la prueba tokens.test.ts
 * comprueba que ambos coinciden, para que no se desincronicen.
 */

export const PHI = 1.618034;
export const PHI_ROOT = 1.27202; // √φ
export const PHI_INVERSE = 0.618034;

/** Paleta base dada por el equipo. */
export const BASE_PALETTE = {
  celadon50: '#f5faf7',
  celadon100: '#e3f0ea',
  celadon200: '#c9e7d3',
  celadon300: '#ace1af',
  mist300: '#9bb7c9',
} as const;

/** Tonos profundos derivados: luminosidad del color base × φ^-n. */
export const DERIVED_PALETTE = {
  celadon500: '#41b448',
  celadon700: '#286f2c',
  celadon800: '#19451b',
  celadon900: '#0f2b11',
  mist500: '#4d758f',
  mist700: '#304858',
  mist800: '#1d2d37',
  mist900: '#121c22',
} as const;

export const BASE_FONT_PX = 16;

/** Tamaño de letra para un paso de la escala (cada paso multiplica por √φ). */
export function fontSizePx(step: number, basePx: number = BASE_FONT_PX): number {
  return basePx * PHI_ROOT ** step;
}

/** Pasos de la escala tipográfica respecto al cuerpo de texto. */
export const FONT_STEPS = {
  caption: -1,
  body: 0,
  lead: 1,
  title: 2,
  display: 3,
} as const;

/** Espaciado y radios: serie de Fibonacci en píxeles. */
export const FIBONACCI_PX = [3, 5, 8, 13, 21, 34, 55, 89] as const;

function channelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

/** Relación de contraste WCAG entre dos colores hexadecimales (de 1 a 21). */
export function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}
