-- CoreInventory Database Schema (PostgreSQL)
-- This is auto-run on server start via config/db.js

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  unit_of_measure VARCHAR(50) DEFAULT 'unit',
  reorder_level INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS receipts (
  id SERIAL PRIMARY KEY,
  supplier_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft','waiting','ready','done','cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS receipt_items (
  id SERIAL PRIMARY KEY,
  receipt_id INTEGER REFERENCES receipts(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS deliveries (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft','picking','packing','done','cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_items (
  id SERIAL PRIMARY KEY,
  delivery_id INTEGER REFERENCES deliveries(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS stock_moves (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  move_type VARCHAR(50) NOT NULL CHECK (move_type IN ('receipt','delivery','internal_transfer','adjustment')),
  source_location VARCHAR(255),
  destination_location VARCHAR(255),
  reference_id INTEGER,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  counted_quantity INTEGER NOT NULL,
  system_quantity INTEGER NOT NULL,
  difference INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 0,
  UNIQUE(product_id, location_id)
);

-- Seed data
INSERT INTO categories (name) VALUES ('Electronics') ON CONFLICT DO NOTHING;
INSERT INTO categories (name) VALUES ('Furniture') ON CONFLICT DO NOTHING;
INSERT INTO categories (name) VALUES ('Office Supplies') ON CONFLICT DO NOTHING;
INSERT INTO categories (name) VALUES ('Raw Materials') ON CONFLICT DO NOTHING;

INSERT INTO warehouses (id, name, location) VALUES (1, 'Main Warehouse', 'Building A, Industrial Area') ON CONFLICT (id) DO NOTHING;
INSERT INTO warehouses (id, name, location) VALUES (2, 'Secondary Warehouse', 'Building B, Downtown') ON CONFLICT (id) DO NOTHING;

INSERT INTO locations (id, warehouse_id, name) VALUES (1, 1, 'Zone A') ON CONFLICT (id) DO NOTHING;
INSERT INTO locations (id, warehouse_id, name) VALUES (2, 1, 'Zone B') ON CONFLICT (id) DO NOTHING;
INSERT INTO locations (id, warehouse_id, name) VALUES (3, 1, 'Zone C') ON CONFLICT (id) DO NOTHING;
INSERT INTO locations (id, warehouse_id, name) VALUES (4, 2, 'Zone X') ON CONFLICT (id) DO NOTHING;
INSERT INTO locations (id, warehouse_id, name) VALUES (5, 2, 'Zone Y') ON CONFLICT (id) DO NOTHING;
