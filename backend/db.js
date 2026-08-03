const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database', 'systemhome.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

function run(sql, params = []) {
  return db.prepare(sql).run(params);
}

function get(sql, params = []) {
  return db.prepare(sql).get(params);
}

function all(sql, params = []) {
  return db.prepare(sql).all(params);
}

function initSchema() {
  db.exec(`
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
  `);
}

function seedData() {
  const now = new Date().toISOString();
  const roleCount = db.prepare('SELECT COUNT(*) as count FROM roles').get().count;
  if (roleCount === 0) {
    db.exec(`
      INSERT INTO roles (name, description) VALUES
      ('admin', 'Administrador del sistema'),
      ('gerente', 'Gerente general'),
      ('supervisor', 'Supervisor de operaciones'),
      ('tecnico', 'Técnico de campo'),
      ('almacenista', 'Encargado de inventario'),
      ('vendedor', 'Vendedor comercial'),
      ('cliente', 'Cliente del portal');
    `);

    db.exec(`
      INSERT INTO permissions (key, description) VALUES
      ('clients.read', 'Ver clientes'),
      ('clients.write', 'Gestionar clientes'),
      ('budgets.read', 'Ver presupuestos'),
      ('budgets.write', 'Gestionar presupuestos'),
      ('orders.read', 'Ver órdenes'),
      ('orders.write', 'Gestionar órdenes'),
      ('inventory.read', 'Ver inventario'),
      ('inventory.write', 'Gestionar inventario'),
      ('maintenance.read', 'Ver mantenimientos'),
      ('maintenance.write', 'Gestionar mantenimientos');
    `);

    const roles = all('SELECT id, name FROM roles');
    const permissions = all('SELECT id, key FROM permissions');
    const roleMap = Object.fromEntries(roles.map(r => [r.name, r.id]));
    const permMap = Object.fromEntries(permissions.map(p => [p.key, p.id]));

    const rolePerms = {
      admin: ['clients.read','clients.write','budgets.read','budgets.write','orders.read','orders.write','inventory.read','inventory.write','maintenance.read','maintenance.write'],
      gerente: ['clients.read','clients.write','budgets.read','budgets.write','orders.read','orders.write','inventory.read','inventory.write','maintenance.read','maintenance.write'],
      supervisor: ['clients.read','budgets.read','budgets.write','orders.read','orders.write','inventory.read','inventory.write','maintenance.read','maintenance.write'],
      tecnico: ['orders.read','orders.write','maintenance.read','maintenance.write'],
      almacenista: ['inventory.read','inventory.write','maintenance.read'],
      vendedor: ['clients.read','budgets.read','budgets.write','orders.read'],
      cliente: ['clients.read']
    };

    for (const [roleName, permissionKeys] of Object.entries(rolePerms)) {
      const roleId = roleMap[roleName];
      for (const permissionKey of permissionKeys) {
        const permissionId = permMap[permissionKey];
        if (roleId && permissionId) {
          run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, permissionId]);
        }
      }
    }
  }

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const bcrypt = require('bcryptjs');
    const passwordHash = bcrypt.hashSync('admin123', 10);
    run('INSERT INTO users (username, password_hash, full_name, email, phone, role_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, (SELECT id FROM roles WHERE name = ?), 1, ?, ?)', ['admin', passwordHash, 'Administrador', 'admin@systemhome.com', '0981 000 000', 'admin', now, now]);
    run('INSERT INTO users (username, password_hash, full_name, email, phone, role_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, (SELECT id FROM roles WHERE name = ?), 1, ?, ?)', ['gerente', bcrypt.hashSync('gerente123', 10), 'Gerente', 'gerente@systemhome.com', '0981 111 111', 'gerente', now, now]);
    run('INSERT INTO users (username, password_hash, full_name, email, phone, role_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, (SELECT id FROM roles WHERE name = ?), 1, ?, ?)', ['supervisor', bcrypt.hashSync('supervisor123', 10), 'Supervisor', 'supervisor@systemhome.com', '0981 222 222', 'supervisor', now, now]);
    run('INSERT INTO users (username, password_hash, full_name, email, phone, role_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, (SELECT id FROM roles WHERE name = ?), 1, ?, ?)', ['tecnico', bcrypt.hashSync('tecnico123', 10), 'Técnico', 'tecnico@systemhome.com', '0981 333 333', 'tecnico', now, now]);
    run('INSERT INTO users (username, password_hash, full_name, email, phone, role_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, (SELECT id FROM roles WHERE name = ?), 1, ?, ?)', ['almacenista', bcrypt.hashSync('almacenista123', 10), 'Almacenista', 'almacenista@systemhome.com', '0981 444 444', 'almacenista', now, now]);
    run('INSERT INTO users (username, password_hash, full_name, email, phone, role_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, (SELECT id FROM roles WHERE name = ?), 1, ?, ?)', ['vendedor', bcrypt.hashSync('vendedor123', 10), 'Vendedor', 'vendedor@systemhome.com', '0981 555 555', 'vendedor', now, now]);
    run('INSERT INTO users (username, password_hash, full_name, email, phone, role_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, (SELECT id FROM roles WHERE name = ?), 1, ?, ?)', ['cliente', bcrypt.hashSync('cliente123', 10), 'Cliente', 'cliente@systemhome.com', '0981 666 666', 'cliente', now, now]);
  }

  const serviceCount = db.prepare('SELECT COUNT(*) as count FROM services').get().count;
  if (serviceCount === 0) {
    db.exec(`
      INSERT INTO services (name, description, active) VALUES
      ('Cámaras de Vigilancia', 'Instalación y mantenimiento de cámaras', 1),
      ('Sistemas de Alarma', 'Sistemas de alarma y monitoreo', 1),
      ('Aire Acondicionado', 'Instalaciones y mantenimiento de aires', 1),
      ('Cerca Eléctrica', 'Cercas perimetrales y sistemas de seguridad', 1),
      ('Video Portero', 'Video porteros y accesos', 1),
      ('Electricidad', 'Instalaciones eléctricas', 1),
      ('Cableado Estructurado', 'Cableado y redes', 1),
      ('Redes e Internet', 'Redes y conectividad', 1);
    `);
  }

  const technicianCount = db.prepare('SELECT COUNT(*) as count FROM technicians').get().count;
  if (technicianCount === 0) {
    db.exec(`
      INSERT INTO technicians (name, specialty, phone, email, active, created_at, updated_at) VALUES
      ('Carlos Mendoza', 'Cámaras y alarmas', '0981 123 456', 'carlos@systemhome.com', 1, '${now}', '${now}'),
      ('Ana López', 'Aire acondicionado y electricidad', '0981 789 012', 'ana@systemhome.com', 1, '${now}', '${now}'),
      ('Pedro Ramírez', 'Redes y cableado', '0981 345 678', 'pedro@systemhome.com', 1, '${now}', '${now}');
    `);
  }

  const inventoryCount = db.prepare('SELECT COUNT(*) as count FROM inventory_items').get().count;
  if (inventoryCount === 0) {
    db.exec(`
      INSERT INTO inventory_items (name, category, brand, model, stock, price, description, active, created_at, updated_at) VALUES
      ('Cámara HD 1080p', 'camaras', 'Hikvision', 'DS-2CD1023G0-I', 10, 450000, 'Cámara exterior HD', 1, '${now}', '${now}'),
      ('Kit Alarma Residencial', 'alarmas', 'Honeywell', 'Lynx Touch', 5, 890000, 'Panel y sensores', 1, '${now}', '${now}'),
      ('Aire Split 12000 BTU', 'ac', 'Samsung', 'AR12', 4, 3450000, 'Aire acondicionado residencial', 1, '${now}', '${now}');
    `);
  }

  const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
  if (clientCount === 0) {
    const adminUserId = db.prepare("SELECT id FROM users WHERE username = 'admin'").get().id;
    const clientId = run('INSERT INTO clients (name, ruc, address, phone, email, client_type, active, created_at, updated_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)', ['María Gómez', '1234567-8', 'Av. Mcal. López 100', '0981 010 101', 'maria@example.com', 'persona', now, now, adminUserId]).lastInsertRowid;

    const serviceId = db.prepare("SELECT id FROM services WHERE name = 'Cámaras de Vigilancia'").get().id;
    const budgetId = run('INSERT INTO budgets (number, client_id, service_id, service_type, description, items, labor, discount, total, status, source, created_at, updated_at, created_by_user_id, approved_at, approved_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['PR-0001', clientId, serviceId, 'camaras', 'Instalación de 4 cámaras', JSON.stringify([{ concept: 'Instalación', quantity: 1, unit_price: 2500000, subtotal: 2500000 }]), 500000, 0, 3000000, 'aprobado', 'internal', now, now, adminUserId, now, adminUserId]).lastInsertRowid;

    const technicianId = db.prepare('SELECT id FROM technicians ORDER BY id LIMIT 1').get().id;
    const orderId = run('INSERT INTO work_orders (number, budget_id, client_id, service_id, service_type, technician_id, scheduled_date, priority, description, status, observations, created_at, updated_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['OT-0001', budgetId, clientId, serviceId, 'camaras', technicianId, now, 'alta', 'Instalación inicial de cámaras', 'pendiente', 'Pendiente de ejecución', now, now, null]).lastInsertRowid;

    run('INSERT INTO client_history (client_id, entry_type, description, related_type, related_id, created_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [clientId, 'cliente_creado', 'Cliente creado en el sistema', 'client', clientId, now, adminUserId]);
    run('INSERT INTO order_history (work_order_id, entry_type, description, details, created_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)', [orderId, 'orden_creada', 'Orden de trabajo creada', 'Pendiente de ejecución', now, adminUserId]);
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  initSchema,
  seedData,
};
