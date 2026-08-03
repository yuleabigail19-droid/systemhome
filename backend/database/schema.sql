CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role_id INTEGER REFERENCES roles(id),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  ruc TEXT UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  client_type TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by_user_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT UNIQUE NOT NULL,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  service_id INTEGER REFERENCES services(id),
  service_type TEXT,
  description TEXT,
  items TEXT,
  labor REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'borrador',
  source TEXT NOT NULL DEFAULT 'internal',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by_user_id INTEGER REFERENCES users(id),
  approved_at TEXT,
  approved_by_user_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS budget_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS technicians (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  specialty TEXT,
  phone TEXT,
  email TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS work_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT UNIQUE NOT NULL,
  budget_id INTEGER REFERENCES budgets(id),
  client_id INTEGER REFERENCES clients(id),
  service_id INTEGER REFERENCES services(id),
  service_type TEXT,
  technician_id INTEGER REFERENCES technicians(id),
  scheduled_date TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente',
  observations TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  closed_at TEXT,
  completed_by_user_id INTEGER REFERENCES users(id),
  closed_by_user_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS work_order_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  technician_id INTEGER NOT NULL REFERENCES technicians(id),
  assigned_at TEXT NOT NULL,
  assigned_by_user_id INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'assigned',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  model TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0,
  description TEXT,
  image_path TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  reference_type TEXT,
  reference_id INTEGER,
  notes TEXT,
  user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER REFERENCES clients(id),
  inventory_item_id INTEGER REFERENCES inventory_items(id),
  next_maintenance_date TEXT,
  maintenance_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'programado',
  description TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  performed_by_user_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS client_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL,
  description TEXT NOT NULL,
  related_type TEXT,
  related_id INTEGER,
  created_at TEXT NOT NULL,
  created_by_user_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL,
  description TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL,
  created_by_user_id INTEGER REFERENCES users(id)
);
