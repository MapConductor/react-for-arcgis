export interface ArcGISFillStyle {
  color: number[];
  opacity: number;
}

const RGBA_RE = /^rgba\(\s*([+-]?\d*\.?\d+%?)\s*,\s*([+-]?\d*\.?\d+%?)\s*,\s*([+-]?\d*\.?\d+%?)\s*,\s*([+-]?\d*\.?\d+%?)\s*\)$/i;
const HEX_RGBA_RE = /^#([0-9a-f]{8})$/i;
const HEX_RGB_RE = /^#([0-9a-f]{6})$/i;

function clampOpacity(value: number): number {
  if (Number.isNaN(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

function alphaToOpacity(value: string): number {
  if (value.endsWith('%')) {
    return clampOpacity(parseFloat(value) / 100);
  }
  return clampOpacity(parseFloat(value));
}

export function toArcGISFillStyle(fillColor: string): ArcGISFillStyle {
  if (fillColor.trim().toLowerCase() === 'transparent') {
    return { color: [0, 0, 0], opacity: 0 };
  }

  const rgba = RGBA_RE.exec(fillColor);
  if (rgba) {
    return {
      color: [
        parseFloat(rgba[1]),
        parseFloat(rgba[2]),
        parseFloat(rgba[3]),
      ],
      opacity: alphaToOpacity(rgba[4]),
    };
  }

  const hex = HEX_RGBA_RE.exec(fillColor);
  if (hex) {
    const value = hex[1];
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    const alpha = parseInt(value.slice(6, 8), 16) / 255;
    return {
      color: [r, g, b],
      opacity: clampOpacity(alpha),
    };
  }

  const hexRgb = HEX_RGB_RE.exec(fillColor);
  if (hexRgb) {
    const value = hexRgb[1];
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return {
      color: [r, g, b],
      opacity: 1,
    };
  }

  return { color: [0, 0, 0], opacity: 1 };
}