const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const { db, initSchema, seedData } = require('./db');

const app = express();
const port = process.env.PORT || 3000;
const jwtSecret = process.env.JWT_SECRET || 'dev-secret';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..', 'systemhome')));

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) token = req.query.token || '';
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function hasRole(req, roles = []) {
  if (!req.user) return false;
  return roles.includes(req.user.role);
}

function requireRole(roles = []) {
  return function (req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'No autorizado' });
    next();
  };
}

function formatUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.full_name,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role_name || 'cliente',
    roleId: user.role_id,
    active: !!user.active,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

function formatClient(client) {
  return {
    id: client.id,
    name: client.name,
    ruc: client.ruc,
    address: client.address,
    phone: client.phone,
    email: client.email,
    type: client.client_type,
    active: !!client.active,
    createdAt: client.created_at,
    updatedAt: client.updated_at,
    createdByUserId: client.created_by_user_id
  };
}

function formatBudget(row) {
  return {
    id: row.id,
    number: row.number,
    clientId: row.client_id,
    serviceId: row.service_id,
    serviceType: row.service_type || row.service_name || 'otro',
    description: row.description,
    items: row.items ? JSON.parse(row.items) : [],
    labor: row.labor || 0,
    discount: row.discount || 0,
    total: row.total || 0,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByUserId: row.created_by_user_id,
    approvedAt: row.approved_at,
    approvedByUserId: row.approved_by_user_id
  };
}

function formatWorkOrder(row) {
  return {
    id: row.id,
    number: row.number,
    budgetId: row.budget_id,
    clientId: row.client_id,
    serviceId: row.service_id,
    serviceType: row.service_type || 'otro',
    technicianId: row.technician_id,
    scheduledDate: row.scheduled_date,
    priority: row.priority,
    description: row.description,
    status: row.status,
    observations: row.observations ? JSON.parse(row.observations) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    closedAt: row.closed_at,
    completedByUserId: row.completed_by_user_id,
    closedByUserId: row.closed_by_user_id
  };
}

function formatInventoryItem(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    brand: row.brand,
    model: row.model,
    stock: row.stock,
    price: row.price,
    description: row.description,
    badge: row.badge || null,
    showInCatalog: !!row.show_in_catalog,
    active: !!row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function formatMaintenance(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    inventoryItemId: row.inventory_item_id,
    nextMaintenanceDate: row.next_maintenance_date,
    maintenanceType: row.maintenance_type,
    status: row.status,
    description: row.description,
    notes: row.notes,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    performedByUserId: row.performed_by_user_id
  };
}

function ensureNumber(number, fallback = 'PR-0001') {
  if (number) return number;
  const count = db.prepare('SELECT COUNT(*) as count FROM budgets').get().count + 1;
  return `PR-${String(count).padStart(4, '0')}`;
}

function ensureOrderNumber(number, fallback = 'OT-0001') {
  if (number) return number;
  const count = db.prepare('SELECT COUNT(*) as count FROM work_orders').get().count + 1;
  return `OT-${String(count).padStart(4, '0')}`;
}

app.get('/api/health', (req, res) => res.json({ ok: true, message: 'SYSTEMHOME API funcionando' }));

app.get('/api/auth/check-username', (req, res) => {
  const { username } = req.query;
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  res.json({ exists: !!existing });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Credenciales incompletas' });

  const user = db.prepare(`
    SELECT u.*, r.name as role_name
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    WHERE u.username = ?
  `).get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  if (!user.active) return res.status(403).json({ error: 'Usuario inactivo' });

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role_name }, jwtSecret, { expiresIn: '8h' });
  res.json({ token, user: formatUser(user) });
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, name, email, phone } = req.body;
  if (!username || !password || !name) return res.status(400).json({ error: 'Datos incompletos' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Usuario ya existe' });

  const roleId = db.prepare("SELECT id FROM roles WHERE name = 'cliente'").get().id;
  const now = new Date().toISOString();
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, email, phone, role_id, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(username, hash, name, email || '', phone || '', roleId, now, now);

  const user = db.prepare(`SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?`).get(result.lastInsertRowid);
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role_name }, jwtSecret, { expiresIn: '8h' });
  res.status(201).json({ token, user: formatUser(user) });
});

app.get('/api/me', authMiddleware, (req, res) => {
  const user = db.prepare(`SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?`).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ user: formatUser(user) });
});

app.get('/api/roles', authMiddleware, (req, res) => {
  const roles = db.prepare('SELECT id, name, description FROM roles ORDER BY id').all();
  res.json({ roles });
});

app.get('/api/users', authMiddleware, requireRole(['admin','gerente']), (req, res) => {
  const rows = db.prepare(`SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON r.id = u.role_id ORDER BY u.id`).all();
  res.json({ users: rows.map(formatUser) });
});

app.post('/api/users', authMiddleware, requireRole(['admin','gerente']), (req, res) => {
  const { username, password, name, email, phone, role = 'vendedor' } = req.body;
  const roleRow = db.prepare('SELECT id FROM roles WHERE name = ?').get(role);
  if (!roleRow) return res.status(400).json({ error: 'Rol inválido' });
  const now = new Date().toISOString();
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, email, phone, role_id, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(username, hash, name, email || '', phone || '', roleRow.id, now, now);
  const user = db.prepare(`SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?`).get(result.lastInsertRowid);
  res.status(201).json({ user: formatUser(user) });
});

app.get('/api/clients', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM clients ORDER BY id DESC').all();
  res.json({ clients: rows.map(formatClient) });
});

app.post('/api/clients', authMiddleware, (req, res) => {
  const { name, ruc, address, phone, email, type, active = true } = req.body;
  if (!name || !ruc || !type) return res.status(400).json({ error: 'Datos incompletos' });
  const existing = db.prepare('SELECT id FROM clients WHERE ruc = ?').get(ruc);
  if (existing) return res.status(409).json({ error: 'RUC/CI duplicado' });
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO clients (name, ruc, address, phone, email, client_type, active, created_at, updated_at, created_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, ruc, address || '', phone || '', email || '', type, active ? 1 : 0, now, now, req.user.id);

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
  db.prepare('INSERT INTO client_history (client_id, entry_type, description, created_at, created_by_user_id) VALUES (?, ?, ?, ?, ?)').run(client.id, 'cliente_creado', 'Cliente creado en el sistema', now, req.user.id);
  res.status(201).json({ client: formatClient(client) });
});

app.put('/api/clients/:id', authMiddleware, (req, res) => {
  const clientId = Number(req.params.id);
  const { name, ruc, address, phone, email, type, active = true } = req.body;
  const current = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
  if (!current) return res.status(404).json({ error: 'Cliente no encontrado' });
  const existing = db.prepare('SELECT id FROM clients WHERE ruc = ? AND id != ?').get(ruc, clientId);
  if (existing) return res.status(409).json({ error: 'RUC/CI duplicado' });
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE clients SET name = ?, ruc = ?, address = ?, phone = ?, email = ?, client_type = ?, active = ?, updated_at = ? WHERE id = ?
  `).run(name, ruc, address || '', phone || '', email || '', type, active ? 1 : 0, now, clientId);
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
  db.prepare('INSERT INTO client_history (client_id, entry_type, description, created_at, created_by_user_id) VALUES (?, ?, ?, ?, ?)').run(client.id, 'cliente_actualizado', 'Cliente actualizado en el sistema', now, req.user.id);
  res.json({ client: formatClient(client) });
});

app.delete('/api/clients/:id', authMiddleware, (req, res) => {
  const clientId = Number(req.params.id);
  db.prepare('DELETE FROM clients WHERE id = ?').run(clientId);
  res.json({ ok: true });
});

app.get('/api/clients/:id/history', authMiddleware, (req, res) => {
  const clientId = Number(req.params.id);
  const history = db.prepare('SELECT * FROM client_history WHERE client_id = ? ORDER BY created_at DESC').all(clientId);
  const budgets = db.prepare('SELECT * FROM budgets WHERE client_id = ? ORDER BY created_at DESC').all(clientId);
  const orders = db.prepare('SELECT * FROM work_orders WHERE client_id = ? ORDER BY created_at DESC').all(clientId);
  const maintenances = db.prepare('SELECT * FROM maintenances WHERE client_id = ? ORDER BY created_at DESC').all(clientId);
  res.json({ history, budgets, orders, maintenances });
});

app.get('/api/services', authMiddleware, (req, res) => {
  const services = db.prepare('SELECT * FROM services WHERE active = 1').all();
  res.json({ services });
});

app.get('/api/budgets', authMiddleware, (req, res) => {
  const rows = db.prepare(`SELECT b.*, s.name as service_name FROM budgets b LEFT JOIN services s ON s.id = b.service_id ORDER BY b.id DESC`).all();
  res.json({ budgets: rows.map(formatBudget) });
});

app.post('/api/budgets', authMiddleware, (req, res) => {
  const { clientId, serviceType, description, items = [], labor = 0, discount = 0, total = 0, status = 'borrador', source = 'internal' } = req.body;
  const now = new Date().toISOString();
  const number = ensureNumber();
  const service = db.prepare('SELECT id FROM services WHERE name = ?').get(serviceType) || db.prepare('SELECT id FROM services WHERE id = ?').get(serviceType);
  const result = db.prepare(`
    INSERT INTO budgets (number, client_id, service_id, service_type, description, items, labor, discount, total, status, source, created_at, updated_at, created_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(number, clientId || null, service ? service.id : null, serviceType || 'otro', description || '', JSON.stringify(items), labor, discount, total, status, source, now, now, req.user.id);

  const budget = db.prepare(`SELECT b.*, s.name as service_name FROM budgets b LEFT JOIN services s ON s.id = b.service_id WHERE b.id = ?`).get(result.lastInsertRowid);
  res.status(201).json({ budget: formatBudget(budget) });
});

app.put('/api/budgets/:id', authMiddleware, (req, res) => {
  const budgetId = Number(req.params.id);
  const { clientId, serviceType, description, items = [], labor = 0, discount = 0, total = 0, status = 'borrador', source = 'internal' } = req.body;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE budgets SET client_id = ?, service_type = ?, description = ?, items = ?, labor = ?, discount = ?, total = ?, status = ?, source = ?, updated_at = ? WHERE id = ?
  `).run(clientId || null, serviceType || 'otro', description || '', JSON.stringify(items), labor, discount, total, status, source, now, budgetId);
  const budget = db.prepare(`SELECT b.*, s.name as service_name FROM budgets b LEFT JOIN services s ON s.id = b.service_id WHERE b.id = ?`).get(budgetId);
  res.json({ budget: formatBudget(budget) });
});

app.post('/api/budgets/:id/approve', authMiddleware, requireRole(['admin','gerente','supervisor','vendedor']), (req, res) => {
  const budgetId = Number(req.params.id);
  const now = new Date().toISOString();
  db.prepare(`UPDATE budgets SET status = 'aprobado', approved_at = ?, approved_by_user_id = ? WHERE id = ?`).run(now, req.user.id, budgetId);
  const budget = db.prepare(`SELECT b.*, s.name as service_name FROM budgets b LEFT JOIN services s ON s.id = b.service_id WHERE b.id = ?`).get(budgetId);
  res.json({ budget: formatBudget(budget) });
});

app.post('/api/budgets/:id/reject', authMiddleware, requireRole(['admin','gerente','supervisor','vendedor']), (req, res) => {
  const budgetId = Number(req.params.id);
  db.prepare("UPDATE budgets SET status = 'rechazado' WHERE id = ?").run(budgetId);
  const budget = db.prepare(`SELECT b.*, s.name as service_name FROM budgets b LEFT JOIN services s ON s.id = b.service_id WHERE b.id = ?`).get(budgetId);
  res.json({ budget: formatBudget(budget) });
});

app.get('/api/budgets/:id/export', authMiddleware, (req, res) => {
  const budgetId = Number(req.params.id);
  const budget = db.prepare(`SELECT b.*, s.name as service_name FROM budgets b LEFT JOIN services s ON s.id = b.service_id WHERE b.id = ?`).get(budgetId);
  if (!budget) return res.status(404).json({ error: 'Presupuesto no encontrado' });
  const doc = new PDFDocument({ margin: 36 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=presupuesto-${budget.number}.pdf`);
  doc.pipe(res);
  doc.fontSize(22).text(`Presupuesto ${budget.number}`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Estado: ${budget.status}`);
  doc.text(`Cliente: ${budget.client_id || 'Sin cliente'}`);
  doc.text(`Servicio: ${budget.service_type || 'Sin servicio'}`);
  doc.text(`Total: ${budget.total}`);
  doc.moveDown();
  doc.text('Detalle:');
  const items = JSON.parse(budget.items || '[]');
  items.forEach((item, idx) => doc.text(`${idx + 1}. ${item.concept} x${item.quantity} - ${item.subtotal}`));
  doc.end();
});

app.get('/api/technicians', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM technicians ORDER BY id').all();
  res.json({ technicians: rows });
});

app.get('/api/workorders', authMiddleware, (req, res) => {
  const rows = db.prepare(`SELECT w.*, s.name as service_name FROM work_orders w LEFT JOIN services s ON s.id = w.service_id ORDER BY w.id DESC`).all();
  res.json({ workOrders: rows.map(formatWorkOrder) });
});

app.post('/api/workorders', authMiddleware, (req, res) => {
  const { budgetId, technicianId, serviceType, priority = 'normal', scheduledDate, description, status = 'pendiente', observations = [] } = req.body;
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(budgetId);
  if (!budget || budget.status !== 'aprobado') return res.status(400).json({ error: 'Solo se pueden crear órdenes desde presupuestos aprobados' });
  const now = new Date().toISOString();
  const number = ensureOrderNumber();
  const result = db.prepare(`
    INSERT INTO work_orders (number, budget_id, client_id, service_id, service_type, technician_id, scheduled_date, priority, description, status, observations, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(number, budget.id, budget.client_id, null, serviceType || budget.service_type || 'otro', technicianId || null, scheduledDate || now, priority, description || '', status, JSON.stringify(observations), now, now);

  const order = db.prepare(`SELECT w.*, s.name as service_name FROM work_orders w LEFT JOIN services s ON s.id = w.service_id WHERE w.id = ?`).get(result.lastInsertRowid);
  db.prepare('INSERT INTO work_order_assignments (work_order_id, technician_id, assigned_at, assigned_by_user_id) VALUES (?, ?, ?, ?)').run(order.id, technicianId || null, now, req.user.id);
  db.prepare('INSERT INTO order_history (work_order_id, entry_type, description, details, created_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)').run(order.id, 'orden_creada', 'Orden de trabajo creada', description || '', now, req.user.id);
  res.status(201).json({ workOrder: formatWorkOrder(order) });
});

app.put('/api/workorders/:id', authMiddleware, (req, res) => {
  const orderId = Number(req.params.id);
  const { technicianId, serviceType, priority = 'normal', scheduledDate, description, status = 'pendiente', observations = [] } = req.body;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE work_orders SET technician_id = ?, service_type = ?, priority = ?, scheduled_date = ?, description = ?, status = ?, observations = ?, updated_at = ? WHERE id = ?
  `).run(technicianId || null, serviceType || 'otro', priority, scheduledDate || null, description || '', status, JSON.stringify(observations), now, orderId);
  const order = db.prepare(`SELECT w.*, s.name as service_name FROM work_orders w LEFT JOIN services s ON s.id = w.service_id WHERE w.id = ?`).get(orderId);
  db.prepare('INSERT INTO order_history (work_order_id, entry_type, description, details, created_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)').run(order.id, 'orden_actualizada', 'Orden de trabajo actualizada', JSON.stringify({ status }), now, req.user.id);
  res.json({ workOrder: formatWorkOrder(order) });
});

app.post('/api/workorders/:id/start', authMiddleware, (req, res) => {
  const orderId = Number(req.params.id);
  const now = new Date().toISOString();
  db.prepare("UPDATE work_orders SET status = 'ejecucion', updated_at = ? WHERE id = ?").run(now, orderId);
  const order = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(orderId);
  db.prepare('INSERT INTO order_history (work_order_id, entry_type, description, details, created_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)').run(order.id, 'orden_iniciada', 'Orden iniciada por el técnico', 'En ejecución', now, req.user.id);
  res.json({ workOrder: formatWorkOrder(order) });
});

app.post('/api/workorders/:id/complete', authMiddleware, (req, res) => {
  const orderId = Number(req.params.id);
  const { materials = [] } = req.body;
  const now = new Date().toISOString();
  const order = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(orderId);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

  const activeMaterials = materials.length ? materials : [{ itemId: 1, quantity: 1 }];
  for (const material of activeMaterials) {
    const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(material.itemId || 1);
    if (item && item.stock >= (material.quantity || 1)) {
      db.prepare('UPDATE inventory_items SET stock = stock - ? WHERE id = ?').run(material.quantity || 1, item.id);
      db.prepare('INSERT INTO inventory_movements (item_id, movement_type, quantity, reference_type, reference_id, notes, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(item.id, 'salida', material.quantity || 1, 'work_order', order.id, 'Consumo desde cierre de orden', req.user.id, now);
    }
  }

  db.prepare("UPDATE work_orders SET status = 'completada', completed_at = ?, closed_at = ?, updated_at = ? WHERE id = ?").run(now, now, now, orderId);
  db.prepare('INSERT INTO order_history (work_order_id, entry_type, description, details, created_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)').run(order.id, 'orden_completada', 'Orden cerrada', 'Trabajo finalizado', now, req.user.id);
  const updatedOrder = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(orderId);
  res.json({ workOrder: formatWorkOrder(updatedOrder) });
});

// Public catalog endpoint (no auth required - for client portal)
app.get('/api/catalog', (req, res) => {
  const rows = db.prepare('SELECT * FROM inventory_items WHERE active = 1 AND show_in_catalog = 1 AND stock > 0 ORDER BY id DESC').all();
  res.json({ catalog: rows.map(formatInventoryItem) });
});

app.get('/api/inventory', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM inventory_items WHERE active = 1 ORDER BY id DESC').all();
  res.json({ inventory: rows.map(formatInventoryItem) });
});

app.post('/api/inventory', authMiddleware, requireRole(['admin','gerente','almacenista']), (req, res) => {
  const { name, category, brand, model, stock = 0, price = 0, description = '', badge = '', showInCatalog = true } = req.body;
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO inventory_items (name, category, brand, model, stock, price, description, badge, show_in_catalog, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(name, category || 'otro', brand || '', model || '', stock, price, description, badge || '', showInCatalog ? 1 : 0, now, now);
  const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ inventoryItem: formatInventoryItem(item) });
});

app.put('/api/inventory/:id', authMiddleware, requireRole(['admin','gerente','almacenista']), (req, res) => {
  const itemId = Number(req.params.id);
  const { name, category, brand, model, stock = 0, price = 0, description = '', badge = '', showInCatalog = true } = req.body;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE inventory_items SET name = ?, category = ?, brand = ?, model = ?, stock = ?, price = ?, description = ?, badge = ?, show_in_catalog = ?, updated_at = ? WHERE id = ?
  `).run(name, category || 'otro', brand || '', model || '', stock, price, description, badge || '', showInCatalog ? 1 : 0, now, itemId);
  const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(itemId);
  res.json({ inventoryItem: formatInventoryItem(item) });
});

app.delete('/api/inventory/:id', authMiddleware, requireRole(['admin','gerente','almacenista']), (req, res) => {
  const itemId = Number(req.params.id);
  db.prepare('UPDATE inventory_items SET active = 0 WHERE id = ?').run(itemId);
  res.json({ ok: true });
});

app.get('/api/inventory/movements', authMiddleware, (req, res) => {
  const rows = db.prepare(`SELECT im.*, ii.name FROM inventory_movements im JOIN inventory_items ii ON ii.id = im.item_id ORDER BY im.id DESC`).all();
  res.json({ movements: rows });
});

app.post('/api/inventory/movements', authMiddleware, requireRole(['admin','gerente','almacenista']), (req, res) => {
  const { itemId, movementType, quantity, notes = '' } = req.body;
  const now = new Date().toISOString();
  db.prepare('INSERT INTO inventory_movements (item_id, movement_type, quantity, notes, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(itemId, movementType, quantity, notes, req.user.id, now);
  if (movementType === 'entrada') {
    db.prepare('UPDATE inventory_items SET stock = stock + ? WHERE id = ?').run(quantity, itemId);
  } else if (movementType === 'salida') {
    db.prepare('UPDATE inventory_items SET stock = stock - ? WHERE id = ?').run(quantity, itemId);
  }
  res.status(201).json({ ok: true });
});

app.get('/api/maintenances', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM maintenances ORDER BY id DESC').all();
  res.json({ maintenances: rows.map(formatMaintenance) });
});

app.post('/api/maintenances', authMiddleware, requireRole(['admin','gerente','supervisor']), (req, res) => {
  const { clientId, inventoryItemId, nextMaintenanceDate, maintenanceType, status = 'programado', description, notes } = req.body;
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO maintenances (client_id, inventory_item_id, next_maintenance_date, maintenance_type, status, description, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(clientId || null, inventoryItemId || null, nextMaintenanceDate || null, maintenanceType, status, description || '', notes || '', now);
  const maintenance = db.prepare('SELECT * FROM maintenances WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ maintenance: formatMaintenance(maintenance) });
});

app.put('/api/maintenances/:id', authMiddleware, requireRole(['admin','gerente','supervisor']), (req, res) => {
  const maintenanceId = Number(req.params.id);
  const { status, notes } = req.body;
  const now = new Date().toISOString();
  db.prepare('UPDATE maintenances SET status = ?, notes = ?, completed_at = ? WHERE id = ?').run(status || 'programado', notes || '', status === 'realizado' ? now : null, maintenanceId);
  const maintenance = db.prepare('SELECT * FROM maintenances WHERE id = ?').get(maintenanceId);
  res.json({ maintenance: formatMaintenance(maintenance) });
});

app.get('/api/summary', authMiddleware, (req, res) => {
  const clients = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
  const budgets = db.prepare('SELECT COUNT(*) as count FROM budgets').get().count;
  const orders = db.prepare('SELECT COUNT(*) as count FROM work_orders').get().count;
  const inventory = db.prepare('SELECT COUNT(*) as count FROM inventory_items').get().count;
  res.json({ summary: { clients, budgets, orders, inventory } });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'systemhome', 'index.html'));
});

initSchema();
seedData();

app.listen(port, () => {
  console.log(`SYSTEMHOME API listening on http://localhost:${port}`);
});
