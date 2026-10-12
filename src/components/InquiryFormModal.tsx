import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { generateWhatsAppLink } from '../utils/whatsapp';
import { orderService } from '../services/orderService';
import { customerService } from '../services/customerService';
import type { OrderItem } from '../types/admin';

interface InquiryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InquiryFormModal: React.FC<InquiryFormModalProps> = ({ isOpen, onClose }) => {
  const { cartItems, guestCount, foodQuantities, clearCart } = useCart();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    eventAddress: '',
    eventType: '',
    eventDate: '',
    notes: ''
  });

  const [orderId, setOrderId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    if (errors[e.target.name]) {
      setErrors(prev => { const n = { ...prev }; delete n[e.target.name]; return n; });
    }
  };

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = t.nameRequired;
    if (!formData.phone.trim()) errs.phone = t.phoneRequired;
    else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\s/g, ''))) errs.phone = t.phoneInvalid;
    if (!formData.eventAddress.trim()) errs.eventAddress = t.addressRequired;
    if (!formData.eventDate) errs.eventDate = t.dateRequired;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Save order to localStorage via orderService
    const orderItems: OrderItem[] = cartItems.map((item) => ({
      dishId: item.id,
      dishName: item.name,   // snapshot — safe even if dish is later renamed/deleted
      categoryId: item.categoryId,
    }));

    // Find or create customer record
    const customer = customerService.findOrCreateFromOrder({
      customerName: formData.name.trim(),
      mobile: formData.phone.replace(/\s/g, ''),
      notes: formData.notes.trim() || undefined,
      preferredLanguage: t.lang === 'ta' ? 'ta' : 'en',
    });

    const order = orderService.create({
      customerId: customer.id,
      customerName: formData.name.trim(),
      mobile: formData.phone.replace(/\s/g, ''),
      orderSource: 'Website',
      eventAddress: formData.eventAddress.trim(),
      eventType: formData.eventType.trim(),
      orderDate: formData.eventDate,
      items: orderItems,
      guestCount,
      foodQuantities, // Include food quantities in the order
      totalAmount: 0,
      advanceAmount: 0,
      balancePaid: 0,
      payments: [],
      status: 'Pending',
      notes: formData.notes.trim(),
    });

    setOrderId(order.id);
    setSubmitted(true);

    // Also send via WhatsApp
    const url = generateWhatsAppLink(order, t);
    window.open(url, '_blank');

    clearCart();
  };

  if (submitted && orderId) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{t.orderPlaced}</h2>
          <p className="text-slate-600 text-sm mb-4">
            {t.orderSuccess}
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 mb-6">
            <p className="text-xs text-orange-700 font-medium">{t.yourOrderId}</p>
            <p className="text-xl font-bold text-primary mt-0.5">{orderId}</p>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            {t.done}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-5 sm:p-6 overflow-y-auto max-h-[90vh] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900">{t.yourDetails}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 -mr-2"
            aria-label="Close form"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">{t.name} *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">{t.phone} *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${errors.phone ? 'border-red-400' : 'border-gray-300'}`}
              placeholder={t.phonePlaceholder}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">{t.eventAddress} *</label>
            <input
              type="text"
              name="eventAddress"
              value={formData.eventAddress}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${errors.eventAddress ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.eventAddress && <p className="text-red-500 text-xs mt-1">{errors.eventAddress}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">{t.eventType}</label>
            <input
              type="text"
              name="eventType"
              value={formData.eventType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">{t.eventDate} *</label>
            <input
              type="date"
              name="eventDate"
              value={formData.eventDate}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${errors.eventDate ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.eventDate && <p className="text-red-500 text-xs mt-1">{errors.eventDate}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">{t.additionalNotes}</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={(e) => handleChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              placeholder={t.notePlaceholder}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-[#E5A985] hover:bg-[#d49975] text-white py-3 rounded-lg font-medium transition-colors mt-2"
            >
              {t.sendWhatsApp}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

