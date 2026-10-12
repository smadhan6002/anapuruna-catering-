/**
 * orderService — localStorage-based order persistence
 * Swap each method body with Supabase SDK calls to migrate.
 */
import type { Order, OrderPayment, OrderStatus } from '../types/admin';

const ORDERS_KEY = 'annapoorna_orders';
const ORDER_COUNTER_KEY = 'annapoorna_order_counter';

function getCounter(): number {
  return parseInt(localStorage.getItem(ORDER_COUNTER_KEY) || '0', 10);
}

function generateOrderId(existingOrders: Order[] = []): string {
  let counter = getCounter();
  // Ensure counter is at least as large as any existing ORD-xxxx number
  for (const o of existingOrders) {
    if (o.id && o.id.startsWith('ORD-')) {
      const parsed = parseInt(o.id.replace('ORD-', ''), 10);
      if (!isNaN(parsed) && parsed > counter) {
        counter = parsed;
      }
    }
  }

  let next = counter + 1;
  let candidate = `ORD-${String(next).padStart(4, '0')}`;
  while (existingOrders.some((o) => o.id === candidate)) {
    next++;
    candidate = `ORD-${String(next).padStart(4, '0')}`;
  }

  localStorage.setItem(ORDER_COUNTER_KEY, String(next));
  return candidate;
}

/**
 * Normalizes an order's payments array.
 * Converts legacy advanceAmount / balancePaid if payments array is missing.
 */
export function normalizeOrderPayments(order: Order): OrderPayment[] {
  if (Array.isArray(order.payments) && order.payments.length > 0) {
    return order.payments;
  }

  // Safe migration layer for legacy data
  const migrated: OrderPayment[] = [];
  const adv = Number(order.advanceAmount) || 0;
  const bal = Number(order.balancePaid) || 0;
  const baseDate = order.orderDate || (order.createdAt ? order.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);

  if (adv > 0) {
    migrated.push({
      id: `${order.id}-pay-1`,
      amount: adv,
      date: baseDate,
      method: 'Cash',
      note: 'Existing advance payment',
    });
  }

  if (bal > 0) {
    migrated.push({
      id: `${order.id}-pay-2`,
      amount: bal,
      date: baseDate,
      method: 'Cash',
      note: 'Existing balance payment',
    });
  }

  return migrated;
}

export function getOrderTotalPaid(order: Order): number {
  const payments = normalizeOrderPayments(order);
  return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

export function getOrderBalanceDue(order: Order): number {
  const total = Number(order.totalAmount) || 0;
  const totalPaid = getOrderTotalPaid(order);
  return Math.max(0, total - totalPaid);
}

export function getOrderPaymentStatus(order: Order): 'Unpaid' | 'Partially Paid' | 'Paid' {
  const total = Number(order.totalAmount) || 0;
  const totalPaid = getOrderTotalPaid(order);

  if (totalPaid <= 0) return 'Unpaid';
  if (totalPaid >= total && total > 0) return 'Paid';
  return 'Partially Paid';
}

export const orderService = {
  getAll(): Order[] {
    try {
      const raw = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]') as Order[];
      return raw.map((order) => {
        const payments = normalizeOrderPayments(order);
        const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        return {
          ...order,
          payments,
          advanceAmount: payments[0]?.amount ?? 0,
          balancePaid: payments.slice(1).reduce((s, p) => s + (Number(p.amount) || 0), 0) || (totalPaid > (payments[0]?.amount ?? 0) ? totalPaid - (payments[0]?.amount ?? 0) : 0),
        };
      });
    } catch {
      return [];
    }
  },

  getById(id: string): Order | undefined {
    return this.getAll().find((o) => o.id === id);
  },

  create(data: Omit<Order, 'id' | 'createdAt' | 'invoiceGenerated'>): Order {
    const orders = this.getAll();
    const payments = data.payments ? [...data.payments] : [];
    const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const order: Order = {
      ...data,
      id: generateOrderId(orders),
      orderSource: data.orderSource || 'Website',
      createdAt: new Date().toISOString(),
      invoiceGenerated: false,
      payments,
      advanceAmount: payments[0]?.amount ?? data.advanceAmount ?? 0,
      balancePaid: data.balancePaid ?? (totalPaid > (payments[0]?.amount ?? 0) ? totalPaid - (payments[0]?.amount ?? 0) : 0),
    };
    orders.push(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    return order;
  },

  update(id: string, changes: Partial<Order>): Order | undefined {
    const orders = this.getAll();
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) return undefined;

    let updatedPayments = changes.payments ?? orders[idx].payments ?? [];
    if (!changes.payments && (changes.advanceAmount !== undefined || changes.balancePaid !== undefined)) {
      // If legacy update was called
      updatedPayments = normalizeOrderPayments({ ...orders[idx], ...changes });
    }

    orders[idx] = {
      ...orders[idx],
      ...changes,
      payments: updatedPayments,
      advanceAmount: updatedPayments[0]?.amount ?? 0,
      balancePaid: updatedPayments.slice(1).reduce((s, p) => s + (Number(p.amount) || 0), 0),
    };
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    return orders[idx];
  },

  updateStatus(id: string, status: OrderStatus): Order | undefined {
    return this.update(id, { status });
  },

  updatePayment(
    id: string,
    totalAmount: number,
    advanceAmount: number,
    balancePaid: number
  ): Order | undefined {
    return this.update(id, { totalAmount, advanceAmount, balancePaid });
  },

  addPayment(
    orderId: string,
    payment: Omit<OrderPayment, 'id'>
  ): Order | undefined {
    const order = this.getById(orderId);
    if (!order) return undefined;
    const currentPayments = normalizeOrderPayments(order);
    const newPayment: OrderPayment = {
      ...payment,
      id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      amount: Number(payment.amount) || 0,
    };
    const updatedPayments = [...currentPayments, newPayment];
    return this.update(orderId, { payments: updatedPayments });
  },

  updatePaymentEntry(
    orderId: string,
    paymentId: string,
    changes: Partial<OrderPayment>
  ): Order | undefined {
    const order = this.getById(orderId);
    if (!order) return undefined;
    const currentPayments = normalizeOrderPayments(order);
    const updatedPayments = currentPayments.map((p) => {
      if (p.id === paymentId) {
        return {
          ...p,
          ...changes,
          amount: changes.amount !== undefined ? Number(changes.amount) : p.amount,
        };
      }
      return p;
    });
    return this.update(orderId, { payments: updatedPayments });
  },

  deletePaymentEntry(
    orderId: string,
    paymentId: string
  ): Order | undefined {
    const order = this.getById(orderId);
    if (!order) return undefined;
    const currentPayments = normalizeOrderPayments(order);
    const updatedPayments = currentPayments.filter((p) => p.id !== paymentId);
    return this.update(orderId, { payments: updatedPayments });
  },

  markInvoiceGenerated(id: string): Order | undefined {
    return this.update(id, { invoiceGenerated: true });
  },

  delete(id: string): void {
    const orders = this.getAll().filter((o) => o.id !== id);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  },
};
