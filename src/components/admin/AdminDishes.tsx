import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  UploadCloud,
  Check,
  AlertTriangle,
  Layers,
  Search,
} from 'lucide-react';
import { categories as staticCategories } from '../../data/menu';
import { dishService } from '../../services/dishService';
import { MEASUREMENT_UNITS, getDishUnitConfig } from '../../data/units';
import { useLanguage } from '../../context/LanguageContext';
import type { AdminDish } from '../../types/admin';

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB limit for base64 storage

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeImage(file: File, maxPx = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = reject;
    img.src = url;
  });
}

interface DishFormData {
  name: string;
  categoryId: string;
  imagePreview: string;
  imageFile: File | null;
  defaultUnit: string;
}

const emptyForm = (): DishFormData => ({
  name: '',
  categoryId: staticCategories[0]?.id ?? '',
  imagePreview: '',
  imageFile: null,
  defaultUnit: 'Pieces',
});

export const AdminDishes: React.FC = () => {
  const { lang, dishName: getDishNameTa } = useLanguage();
  const isTa = lang === 'ta';

  const [activeTab, setActiveTab] = useState<'dishes' | 'units'>('dishes');
  const [adminDishes, setAdminDishes] = useState<AdminDish[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DishFormData>(emptyForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Unit configuration search
  const [unitSearch, setUnitSearch] = useState('');
  const [unitCategoryFilter, setUnitCategoryFilter] = useState('all');

  const allCategories = staticCategories.map((c) => ({ id: c.id, name: c.name }));

  useEffect(() => {
    setAdminDishes(dishService.getAll());
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError('');
    setShowForm(true);
  }

  function openEdit(dish: AdminDish) {
    setEditingId(dish.id);
    const unitCfg = dishService.getDishUnit(dish.id) || getDishUnitConfig(dish.categoryId);
    setForm({
      name: dish.name,
      categoryId: dish.categoryId,
      imagePreview: dish.image,
      imageFile: null,
      defaultUnit: dish.defaultUnit || unitCfg.defaultUnit,
    });
    setFormError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setFormError('');
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    setFormError('');
    try {
      const preview = file.size > MAX_IMAGE_SIZE
        ? await resizeImage(file)
        : await fileToBase64(file);
      setForm((f) => ({ ...f, imagePreview: preview, imageFile: file }));
    } catch {
      setFormError('Failed to load image. Try a different file.');
    }
  }

  async function handleSave() {
    setFormError('');
    if (!form.name.trim()) { setFormError('Dish name is required.'); return; }
    if (!form.categoryId) { setFormError('Please select a category.'); return; }
    if (!form.imagePreview) { setFormError('Please upload a dish image.'); return; }

    setSaving(true);
    try {
      if (editingId) {
        dishService.update(editingId, {
          name: form.name.trim(),
          categoryId: form.categoryId,
          image: form.imagePreview,
          defaultUnit: form.defaultUnit,
        });
        dishService.setUnitOverride(editingId, form.defaultUnit);
        showToast('Dish updated successfully.');
      } else {
        const added = dishService.add({
          name: form.name.trim(),
          categoryId: form.categoryId,
          image: form.imagePreview,
          defaultUnit: form.defaultUnit,
        });
        dishService.setUnitOverride(added.id, form.defaultUnit);
        showToast('Dish added successfully.');
      }
      setAdminDishes(dishService.getAll());
      closeForm();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: string) {
    dishService.delete(id);
    setAdminDishes(dishService.getAll());
    setDeleteConfirm(null);
    showToast('Dish deleted.');
  }

  function handleSetDishUnit(dishId: string, unit: string) {
    dishService.setUnitOverride(dishId, unit);
    setAdminDishes(dishService.getAll());
    showToast(`Unit updated to ${unit}`);
  }

  // All combined dishes for unit management
  const allDishesForUnits = useMemo(() => {
    const list: { id: string; name: string; categoryId: string; categoryName: string; defaultUnit: string }[] = [];
    staticCategories.forEach((cat) => {
      cat.items.forEach((item) => {
        const unitOverride = dishService.getDishUnit(item.id);
        const unitCfg = unitOverride || getDishUnitConfig(cat.id);
        list.push({
          id: item.id,
          name: item.name,
          categoryId: cat.id,
          categoryName: cat.name,
          defaultUnit: unitCfg.defaultUnit,
        });
      });
    });

    adminDishes.forEach((ad) => {
      const catName = staticCategories.find((c) => c.id === ad.categoryId)?.name || ad.categoryId;
      const unitOverride = dishService.getDishUnit(ad.id);
      const unitCfg = unitOverride || getDishUnitConfig(ad.categoryId);
      list.push({
        id: ad.id,
        name: ad.name,
        categoryId: ad.categoryId,
        categoryName: catName,
        defaultUnit: ad.defaultUnit || unitCfg.defaultUnit,
      });
    });

    let res = list;
    if (unitCategoryFilter !== 'all') {
      res = res.filter((d) => d.categoryId === unitCategoryFilter);
    }
    if (unitSearch.trim()) {
      const q = unitSearch.toLowerCase();
      res = res.filter((d) => {
        const enMatch = d.name.toLowerCase().includes(q);
        const taMatch = getDishNameTa(d.id, d.name).toLowerCase().includes(q);
        return enMatch || taMatch;
      });
    }

    return res;
  }, [adminDishes, unitCategoryFilter, unitSearch, getDishNameTa]);

  // Group admin dishes by category
  const grouped = allCategories
    .map((cat) => ({
      ...cat,
      dishes: adminDishes.filter((d) => d.categoryId === cat.id),
    }))
    .filter((g) => g.dishes.length > 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[200] bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm">
          <Check size={16} className="text-green-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {isTa ? 'உணவு வகைகள் & அளவீடுகள் மேலாண்மை' : 'Dish Management & Measurement Units'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isTa
              ? 'புதிய உணவுகளைச் சேர்க்கவும் மற்றும் ஒவ்வொரு உணவுக்கும் இயல்புநிலை அளவீட்டு அலகை (Units) கட்டமைக்கவும்'
              : 'Add custom dishes and configure default measurement units (kg, litres, cups, pieces) for each dish'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Tab Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs sm:text-sm font-semibold">
            <button
              onClick={() => setActiveTab('dishes')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'dishes' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {isTa ? 'நிர்வாக உணவுகள்' : 'Admin Dishes'}
            </button>
            <button
              onClick={() => setActiveTab('units')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'units' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {isTa ? 'அளவீட்டு அலகுகள் (Units)' : 'Dish Units Config'}
            </button>
          </div>

          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={18} />
            <span>{isTa ? 'உணவு சேர்' : 'Add Dish'}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ADMIN DISHES */}
      {activeTab === 'dishes' && (
        <>
          {grouped.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400">
              <Layers size={40} className="mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-semibold text-slate-700">No admin dishes added yet.</p>
              <p className="text-xs text-slate-400 mt-1">Built-in menu dishes are active on the website. Click "Add Dish" to add custom specialties.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <div key={group.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">{group.name}</h3>
                    <span className="text-xs font-semibold bg-orange-50 text-primary px-2.5 py-0.5 rounded-full">
                      {group.dishes.length} dish(es)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {group.dishes.map((dish) => (
                      <div key={dish.id} className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                        <div className="h-36 bg-slate-100 overflow-hidden relative">
                          <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                          <span className="absolute top-2 left-2 bg-orange-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
                            {dish.defaultUnit || 'Custom'}
                          </span>
                        </div>
                        <div className="p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">{dish.name}</p>
                            <span className="text-[11px] text-slate-400 font-mono">{dish.id}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(dish)} className="p-1.5 text-slate-500 hover:text-primary rounded-lg">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => setDeleteConfirm(dish.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB 2: MEASUREMENT UNITS CONFIGURATION (REQUIREMENT 2.6) */}
      {activeTab === 'units' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={isTa ? 'உணவுப் பெயரைத் தேடி அலகை மாற்றவும்...' : 'Search dish to change measurement unit (Coffee, Tea, Sweets, Rice…)'}
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <select
              value={unitCategoryFilter}
              onChange={(e) => setUnitCategoryFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="all">All Categories</option>
              {staticCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Dish Name</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Current Default Unit</th>
                  <th className="px-4 py-3 text-left">Change Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allDishesForUnits.slice(0, 50).map((dish) => {
                  const taName = getDishNameTa(dish.id, dish.name);
                  return (
                    <tr key={dish.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{dish.name}</p>
                        {taName && taName !== dish.name && (
                          <p className="text-xs text-slate-400">{taName}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{dish.categoryName}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-xs bg-orange-50 text-orange-900 border border-orange-200 px-2.5 py-1 rounded-md">
                          {dish.defaultUnit}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={dish.defaultUnit}
                          onChange={(e) => handleSetDishUnit(dish.id, e.target.value)}
                          className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                        >
                          {MEASUREMENT_UNITS.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.labelEn}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {allDishesForUnits.length > 50 && (
            <p className="text-center text-xs text-slate-400 pt-2">
              Showing top 50 matches. Use search above to find specific items.
            </p>
          )}
        </div>
      )}

      {/* Add / Edit Dish Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 overflow-hidden z-10 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                {editingId ? 'Edit Dish' : 'Add New Dish'}
              </h3>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-700 p-1">
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-4 flex items-center gap-2">
                <AlertTriangle size={14} /> {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dish Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="e.g. Special Badam Halwa"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {allCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Unit *</label>
                  <select
                    value={form.defaultUnit}
                    onChange={(e) => setForm((f) => ({ ...f, defaultUnit: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {MEASUREMENT_UNITS.map((u) => (
                      <option key={u.id} value={u.id}>{u.labelEn}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dish Image *
                </label>
                {form.imagePreview ? (
                  <div className="relative">
                    <img src={form.imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-xl border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, imagePreview: '', imageFile: null }))}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow border border-slate-200 text-slate-500 hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-primary hover:text-primary transition-colors cursor-pointer"
                  >
                    <UploadCloud size={24} />
                    <span className="text-xs font-medium">Click to upload dish photo</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </div>

              <div className="flex gap-3 pt-3">
                <button onClick={closeForm} className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Dish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
            <h3 className="font-semibold text-slate-900 mb-2">Delete Dish</h3>
            <p className="text-sm text-slate-600 mb-5">Are you sure you want to delete this custom dish?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
