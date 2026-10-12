/**
 * dishService — manages admin-added dishes in localStorage
 * Built-in (menu.ts) dishes are read-only from code.
 * Admin-added dishes are persisted here and merged at runtime.
 */
import type { AdminDish } from '../types/admin';

const DISHES_KEY = 'annapoorna_admin_dishes';
const DISH_COUNTER_KEY = 'annapoorna_dish_counter';

function getDishCounter(): number {
  return parseInt(localStorage.getItem(DISH_COUNTER_KEY) || '0', 10);
}

function generateDishId(): string {
  const n = getDishCounter() + 1;
  localStorage.setItem(DISH_COUNTER_KEY, String(n));
  return `adm-${String(n).padStart(4, '0')}`;
}

const UNIT_OVERRIDES_KEY = 'annapoorna_dish_unit_overrides';

export interface DishUnitOverride {
  defaultUnit: string;
  supportedUnits?: string[];
}

export const dishService = {
  getAll(): AdminDish[] {
    try {
      return JSON.parse(localStorage.getItem(DISHES_KEY) || '[]') as AdminDish[];
    } catch {
      return [];
    }
  },

  add(data: Omit<AdminDish, 'id' | 'isAdminAdded'>): AdminDish {
    const dishes = this.getAll();
    const dish: AdminDish = {
      ...data,
      id: generateDishId(),
      isAdminAdded: true,
    };
    dishes.push(dish);
    localStorage.setItem(DISHES_KEY, JSON.stringify(dishes));
    return dish;
  },

  update(id: string, changes: Partial<Omit<AdminDish, 'id' | 'isAdminAdded'>>): AdminDish | undefined {
    const dishes = this.getAll();
    const idx = dishes.findIndex((d) => d.id === id);
    if (idx === -1) return undefined;
    dishes[idx] = { ...dishes[idx], ...changes };
    localStorage.setItem(DISHES_KEY, JSON.stringify(dishes));
    return dishes[idx];
  },

  delete(id: string): void {
    const dishes = this.getAll().filter((d) => d.id !== id);
    localStorage.setItem(DISHES_KEY, JSON.stringify(dishes));
  },

  getUnitOverrides(): Record<string, DishUnitOverride> {
    try {
      return JSON.parse(localStorage.getItem(UNIT_OVERRIDES_KEY) || '{}');
    } catch {
      return {};
    }
  },

  setUnitOverride(dishId: string, defaultUnit: string, supportedUnits?: string[]): void {
    const overrides = this.getUnitOverrides();
    overrides[dishId] = { defaultUnit, supportedUnits };
    localStorage.setItem(UNIT_OVERRIDES_KEY, JSON.stringify(overrides));
  },

  getDishUnit(dishId: string): DishUnitOverride | undefined {
    // Check admin dish first
    const adminDish = this.getAll().find((d) => d.id === dishId);
    if (adminDish?.defaultUnit) {
      return {
        defaultUnit: adminDish.defaultUnit,
        supportedUnits: adminDish.supportedUnits,
      };
    }
    const overrides = this.getUnitOverrides();
    return overrides[dishId];
  },
};

