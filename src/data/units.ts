export interface UnitDefinition {
  id: string;
  labelEn: string;
  labelTa: string;
  shortEn: string;
  shortTa: string;
  allowDecimals: boolean;
  step: string;
  min: number;
}

export const MEASUREMENT_UNITS: UnitDefinition[] = [
  { id: 'Kilograms', labelEn: 'Kilograms (kg)', labelTa: 'கிலோகிராம் (kg)', shortEn: 'kg', shortTa: 'கிலோ', allowDecimals: true, step: '0.1', min: 0.1 },
  { id: 'Litres', labelEn: 'Litres (L)', labelTa: 'லிட்டர் (L)', shortEn: 'L', shortTa: 'லிட்டர்', allowDecimals: true, step: '0.1', min: 0.1 },
  { id: 'Cups', labelEn: 'Cups', labelTa: 'கப்புகள்', shortEn: 'Cups', shortTa: 'கப்', allowDecimals: false, step: '1', min: 1 },
  { id: 'Pieces', labelEn: 'Pieces (Pcs)', labelTa: 'துண்டுகள் (Pcs)', shortEn: 'Pcs', shortTa: 'எண்ணிக்கை', allowDecimals: false, step: '1', min: 1 },
  { id: 'Boxes', labelEn: 'Boxes', labelTa: 'பெட்டிகள்', shortEn: 'Boxes', shortTa: 'பெட்டி', allowDecimals: false, step: '1', min: 1 },
  { id: 'Packets', labelEn: 'Packets', labelTa: 'பாக்கெட்டுகள்', shortEn: 'Pkts', shortTa: 'பாக்கெட்', allowDecimals: false, step: '1', min: 1 },
  { id: 'Portions', labelEn: 'Portions', labelTa: 'பங்குகள்', shortEn: 'Portions', shortTa: 'பங்கு', allowDecimals: false, step: '1', min: 1 },
  { id: 'Plates', labelEn: 'Plates', labelTa: 'தட்டுகள்', shortEn: 'Plates', shortTa: 'தட்டு', allowDecimals: false, step: '1', min: 1 },
];

/**
 * Suggested default unit and available unit options based on category.
 * Dishes can override this individually.
 */
export const CATEGORY_UNIT_SUGGESTIONS: Record<string, { defaultUnit: string; options: string[] }> = {
  beverages: {
    defaultUnit: 'Cups',
    options: ['Cups', 'Litres'],
  },
  'bonda-bajji': {
    defaultUnit: 'Pieces',
    options: ['Pieces', 'Kilograms', 'Packets'],
  },
  starters: {
    defaultUnit: 'Pieces',
    options: ['Pieces', 'Kilograms', 'Portions'],
  },
  'vada-varieties': {
    defaultUnit: 'Pieces',
    options: ['Pieces', 'Kilograms'],
  },
  'variety-rice': {
    defaultUnit: 'Kilograms',
    options: ['Kilograms', 'Portions'],
  },
  'meals-sides': {
    defaultUnit: 'Kilograms',
    options: ['Kilograms', 'Portions'],
  },
  'payasam-varieties': {
    defaultUnit: 'Litres',
    options: ['Litres', 'Cups'],
  },
  'indian-breads': {
    defaultUnit: 'Pieces',
    options: ['Pieces', 'Packets'],
  },
  'gravy-varieties': {
    defaultUnit: 'Litres',
    options: ['Litres', 'Portions', 'Kilograms'],
  },
  'halwa-sweets': {
    defaultUnit: 'Kilograms',
    options: ['Kilograms', 'Boxes', 'Pieces'],
  },
  sweets: {
    defaultUnit: 'Kilograms',
    options: ['Kilograms', 'Pieces', 'Boxes'],
  },
  tiffin: {
    defaultUnit: 'Pieces',
    options: ['Pieces', 'Portions', 'Plates'],
  },
  accompaniments: {
    defaultUnit: 'Litres',
    options: ['Litres', 'Kilograms', 'Portions'],
  },
  'special-counters': {
    defaultUnit: 'Portions',
    options: ['Portions', 'Cups', 'Pieces'],
  },
};

/**
 * Returns the recommended unit configuration for a dish
 */
export function getDishUnitConfig(categoryId?: string, customDefault?: string, customSupported?: string[]): {
  defaultUnit: string;
  options: string[];
} {
  if (customDefault && customSupported && customSupported.length > 0) {
    return {
      defaultUnit: customDefault,
      options: customSupported,
    };
  }

  const catConfig = categoryId ? CATEGORY_UNIT_SUGGESTIONS[categoryId] : undefined;
  if (catConfig) {
    return {
      defaultUnit: customDefault || catConfig.defaultUnit,
      options: customSupported && customSupported.length > 0 ? customSupported : catConfig.options,
    };
  }

  return {
    defaultUnit: customDefault || 'Kilograms',
    options: customSupported && customSupported.length > 0 ? customSupported : ['Kilograms', 'Pieces', 'Portions', 'Cups', 'Litres'],
  };
}

/**
 * Formats a quantity with its unit for clean display
 */
export function formatQuantityWithUnit(qty: number, unit: string, isTamil = false): string {
  const found = MEASUREMENT_UNITS.find(u => u.id.toLowerCase() === unit.toLowerCase() || u.shortEn.toLowerCase() === unit.toLowerCase());
  const label = found ? (isTamil ? found.shortTa : found.shortEn) : unit;
  return `${qty} ${label}`;
}
