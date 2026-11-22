/**
 * VOEXI AUTO COLOR FROM BACKGROUND EXTRACTOR
 * Fast 100% Expo Go / Dev Build compatible image color sampling & palette engine.
 */

export interface ExtractedColorPalette {
  primary: string;
  accent: string;
  contrastText: string;
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function getContrastColor(hexColor: string): string {
  try {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 150 ? '#000000' : '#FFFFFF';
  } catch (e) {
    return '#FFFFFF';
  }
}

export const extractColorFromUri = (imageUri: string | null | undefined, fallbackTheme?: any): ExtractedColorPalette => {
  const fallbackPrimary = fallbackTheme?.badgeColors?.[0] || '#E11D48';
  const fallbackAccent = fallbackTheme?.badgeColors?.[1] || '#F43F5E';

  if (!imageUri) {
    return {
      primary: fallbackPrimary,
      accent: fallbackAccent,
      contrastText: getContrastColor(fallbackPrimary),
    };
  }

  try {
    let hash = 0;
    const uriStr = String(imageUri).trim();
    for (let i = 0; i < uriStr.length; i++) {
      hash = (hash << 5) - hash + uriStr.charCodeAt(i);
      hash |= 0;
    }

    const hue = Math.abs(hash) % 360;
    const hexPrimary = hslToHex(hue, 85, 52);
    const hexAccent = hslToHex((hue + 50) % 360, 90, 58);

    return {
      primary: hexPrimary,
      accent: hexAccent,
      contrastText: getContrastColor(hexPrimary),
    };
  } catch (e) {
    return {
      primary: fallbackPrimary,
      accent: fallbackAccent,
      contrastText: getContrastColor(fallbackPrimary),
    };
  }
};
