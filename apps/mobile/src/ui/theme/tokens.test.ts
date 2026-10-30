import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  BASE_PALETTE,
  DERIVED_PALETTE,
  FIBONACCI_PX,
  FONT_STEPS,
  PHI,
  PHI_INVERSE,
  PHI_ROOT,
  contrastRatio,
  fontSizePx,
} from './tokens';

const css = readFileSync(new URL('./variables.css', import.meta.url), 'utf8');

describe('proporción áurea', () => {
  it('PHI_ROOT es la raíz cuadrada de φ y PHI_INVERSE su inverso', () => {
    expect(PHI_ROOT ** 2).toBeCloseTo(PHI, 3);
    expect(PHI * PHI_INVERSE).toBeCloseTo(1, 5);
  });

  it('el título es φ veces el cuerpo de texto', () => {
    const ratio = fontSizePx(FONT_STEPS.title) / fontSizePx(FONT_STEPS.body);
    expect(ratio).toBeCloseTo(PHI, 3);
  });

  it('cada paso de la escala tipográfica multiplica por √φ', () => {
    const steps = [
      FONT_STEPS.caption,
      FONT_STEPS.body,
      FONT_STEPS.lead,
      FONT_STEPS.title,
      FONT_STEPS.display,
    ];
    for (let i = 1; i < steps.length; i += 1) {
      const current = fontSizePx(steps[i] as number);
      const previous = fontSizePx(steps[i - 1] as number);
      expect(current / previous).toBeCloseTo(PHI_ROOT, 5);
    }
  });

  it('el texto más pequeño no baja de 12 px', () => {
    expect(fontSizePx(FONT_STEPS.caption)).toBeGreaterThanOrEqual(12);
  });

  it('la serie de espaciado es de Fibonacci y su cociente tiende a φ', () => {
    for (let i = 2; i < FIBONACCI_PX.length; i += 1) {
      expect(FIBONACCI_PX[i]).toBe(
        (FIBONACCI_PX[i - 1] as number) + (FIBONACCI_PX[i - 2] as number),
      );
    }
    const last = FIBONACCI_PX[FIBONACCI_PX.length - 1] as number;
    const beforeLast = FIBONACCI_PX[FIBONACCI_PX.length - 2] as number;
    expect(Math.abs(last / beforeLast - PHI)).toBeLessThan(0.01);
  });
});

describe('variables.css coincide con tokens.ts', () => {
  it('declara las constantes áureas', () => {
    expect(css).toContain(`--phi: ${PHI}`);
    expect(css).toContain(`--phi-root: ${PHI_ROOT}`);
    expect(css).toContain(`--phi-inverse: ${PHI_INVERSE}`);
  });

  it('contiene todos los colores de la paleta base y derivada', () => {
    for (const hex of [...Object.values(BASE_PALETTE), ...Object.values(DERIVED_PALETTE)]) {
      expect(css).toContain(hex);
    }
  });
});

describe('contraste accesible (WCAG)', () => {
  it('el texto principal sobre el fondo y las superficies supera 7:1', () => {
    const text = DERIVED_PALETTE.celadon800;
    for (const surface of [
      BASE_PALETTE.celadon50,
      BASE_PALETTE.celadon100,
      BASE_PALETTE.celadon200,
      BASE_PALETTE.celadon300,
    ]) {
      expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(7);
    }
  });

  it('el texto secundario supera 4,5:1 sobre fondo y superficies claras', () => {
    const text = DERIVED_PALETTE.mist700;
    for (const surface of [
      BASE_PALETTE.celadon50,
      BASE_PALETTE.celadon100,
      BASE_PALETTE.celadon200,
      BASE_PALETTE.celadon300,
    ]) {
      expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('los tonos base NO sirven como texto sobre el fondo (por eso se derivan tonos profundos)', () => {
    expect(contrastRatio(BASE_PALETTE.celadon300, BASE_PALETTE.celadon50)).toBeLessThan(4.5);
    expect(contrastRatio(BASE_PALETTE.mist300, BASE_PALETTE.celadon50)).toBeLessThan(4.5);
  });
});
