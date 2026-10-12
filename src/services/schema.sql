-- ==========================================================
-- ANAPURUNA CATERING DATABASE MIGRATION SCRIPT
-- PostgreSQL / Supabase Schema Definition
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  mobile VARCHAR(20) NOT NULL UNIQUE,
  alternative_mobile VARCHAR(20),
  email VARCHAR(255),
  birthday DATE,
  anniversary_date DATE,
  preferred_language VARCHAR(10) DEFAULT 'ta',
  marketing_consent BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
CREATE INDEX IF NOT EXISTS idx_customers_consent ON customers(marketing_consent);

-- 2. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(32) PRIMARY KEY,
  customer_id VARCHAR(32) REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  alternative_mobile VARCHAR(20),
  order_source VARCHAR(50) DEFAULT 'Website',
  event_address TEXT NOT NULL,
  event_type VARCHAR(100),
  order_date DATE NOT NULL,
  delivery_time VARCHAR(50),
  guest_count INTEGER,
  total_amount NUMERIC(12, 2) DEFAULT 0,
  advance_amount NUMERIC(12, 2) DEFAULT 0,
  balance_paid NUMERIC(12, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Pending',
  notes TEXT,
  admin_notes TEXT,
  invoice_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(order_source);

-- 3. ORDER ITEMS TABLE (With measurement units & snapshots)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(32) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  dish_id VARCHAR(50) NOT NULL,
  dish_name VARCHAR(255) NOT NULL,
  category_id VARCHAR(100) NOT NULL,
  quantity NUMERIC(10, 2),
  unit VARCHAR(50),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 4. ORDER PAYMENTS TABLE (Split payments & installments)
CREATE TABLE IF NOT EXISTS order_payments (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(32) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  date DATE NOT NULL,
  method VARCHAR(50) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(order_id);

-- 5. DISHES TABLE (Admin added dishes & custom unit overrides)
CREATE TABLE IF NOT EXISTS dishes (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id VARCHAR(100) NOT NULL,
  image TEXT,
  is_admin_added BOOLEAN DEFAULT FALSE,
  default_unit VARCHAR(50),
  supported_units TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CAMPAIGNS & GREETINGS TABLE
CREATE TABLE IF NOT EXISTS campaigns (
  id VARCHAR(32) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  language VARCHAR(10) NOT NULL,
  message_template TEXT NOT NULL,
  recipient_filter VARCHAR(50) NOT NULL,
  recipient_ids TEXT[],
  recipient_count INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'Ready',
  channel VARCHAR(50) DEFAULT 'whatsapp_direct',
  notes TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Allow public to place orders and read menu items
CREATE POLICY "Public read dishes" ON dishes FOR SELECT USING (true);
CREATE POLICY "Public insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert order items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert customers" ON customers FOR INSERT WITH CHECK (true);

-- Allow authenticated admin users full access
CREATE POLICY "Admin all customers" ON customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin all orders" ON orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin all order_items" ON order_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin all order_payments" ON order_payments FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin all dishes" ON dishes FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin all campaigns" ON campaigns FOR ALL TO authenticated USING (true);
