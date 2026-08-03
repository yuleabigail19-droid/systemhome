import base64
import hashlib
import hmac
import json
import os
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory

load_dotenv()

from db import get_connection, init_db

BASE_DIR = Path(__file__).resolve().parent.parent
SYSTEMHOME_DIR = BASE_DIR / 'systemhome'
UPLOAD_DIR = BASE_DIR / 'uploads'
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
SECRET = os.environ.get('JWT_SECRET', 'dev-secret-systemhome-2026')

app = Flask(__name__, static_folder=str(SYSTEMHOME_DIR), static_url_path='')


# ---------- Helpers ----------
def now_iso():
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def make_token(user_id: int, username: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'username': username,
        'role': role,
        'exp': (datetime.now(timezone.utc) + timedelta(hours=8)).timestamp(),
    }
    payload_json = json.dumps(payload, separators=(',', ':'), sort_keys=True)
    sig = hmac.new(SECRET.encode('utf-8'), payload_json.encode('utf-8'), hashlib.sha256).hexdigest()
    return base64.b64encode(f'{payload_json}|{sig}'.encode('utf-8')).decode('utf-8')


def verify_token(token: str):
    if not token:
        return None
    try:
        raw = base64.b64decode(token.encode('utf-8')).decode('utf-8')
    except Exception:
        return None
    payload_json, sig = raw.split('|', 1)
    expected_sig = hmac.new(SECRET.encode('utf-8'), payload_json.encode('utf-8'), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        return None
    payload = json.loads(payload_json)
    if payload.get('exp', 0) < datetime.now(timezone.utc).timestamp():
        return None
    return payload


def current_user():
    token = request.headers.get('Authorization', '')
    if token.startswith('Bearer '):
        token = token[7:]
    elif request.args.get('token'):
        token = request.args.get('token')
    if not token:
        return None
    payload = verify_token(token)
    if not payload:
        return None
    conn = get_connection()
    try:
        row = conn.execute('SELECT u.id, u.username, u.full_name, u.email, u.phone, u.active, u.created_at, u.updated_at, u.role_id, r.name AS role_name FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?', (payload['user_id'],)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def require_auth():
    user = current_user()
    if not user:
        return None
    return user


def require_role(*roles):
    user = require_auth()
    if not user:
        return None, (jsonify({'error': 'No autenticado'}), 401)
    if roles and user['role_name'] not in roles:
        return None, (jsonify({'error': 'No autorizado'}), 403)
    return user, None


def format_user(row):
    return {
        'id': row['id'],
        'username': row['username'],
        'name': row['full_name'],
        'fullName': row['full_name'],
        'email': row['email'],
        'phone': row['phone'],
        'role': row['role_name'] or 'cliente',
        'roleId': row['role_id'],
        'active': bool(row['active']),
        'createdAt': row['created_at'],
        'updatedAt': row['updated_at'],
    }


def format_client(row):
    return {
        'id': row['id'],
        'name': row['name'],
        'ruc': row['ruc'],
        'address': row['address'],
        'phone': row['phone'],
        'email': row['email'],
        'type': row['client_type'],
        'active': bool(row['active']),
        'createdAt': row['created_at'],
        'updatedAt': row['updated_at'],
        'createdByUserId': row['created_by_user_id'],
    }


def format_budget(row):
    return {
        'id': row['id'],
        'number': row['number'],
        'clientId': row['client_id'],
        'serviceId': row['service_id'],
        'serviceType': row['service_type'] or row['service_name'] or 'otro',
        'description': row['description'],
        'items': json.loads(row['items'] or '[]'),
        'labor': row['labor'] or 0,
        'discount': row['discount'] or 0,
        'total': row['total'] or 0,
        'status': row['status'],
        'source': row['source'],
        'createdAt': row['created_at'],
        'updatedAt': row['updated_at'],
        'createdByUserId': row['created_by_user_id'],
        'approvedAt': row['approved_at'],
        'approvedByUserId': row['approved_by_user_id'],
    }


def format_work_order(row):
    observations = []
    try:
        observations = json.loads(row['observations'] or '[]')
        if not isinstance(observations, list):
            observations = []
    except (json.JSONDecodeError, TypeError):
        observations = []
    return {
        'id': row['id'],
        'number': row['number'],
        'budgetId': row['budget_id'],
        'clientId': row['client_id'],
        'serviceId': row['service_id'],
        'serviceType': row['service_type'] or 'otro',
        'technicianId': row['technician_id'],
        'scheduledDate': row['scheduled_date'],
        'priority': row['priority'],
        'description': row['description'],
        'status': row['status'],
        'observations': observations,
        'createdAt': row['created_at'],
        'updatedAt': row['updated_at'],
        'completedAt': row['completed_at'],
        'closedAt': row['closed_at'],
        'completedByUserId': row['completed_by_user_id'],
        'closedByUserId': row['closed_by_user_id'],
    }


def format_inventory_item(row):
    return {
        'id': row['id'],
        'name': row['name'],
        'category': row['category'],
        'brand': row['brand'],
        'model': row['model'],
        'stock': row['stock'],
        'price': row['price'],
        'description': row['description'],
        'badge': row['badge'] if 'badge' in row.keys() else None,
        'showInCatalog': bool(row['show_in_catalog']) if 'show_in_catalog' in row.keys() else True,
        'imagePath': row['image_path'],
        'imageUrl': f'/uploads/{row["image_path"]}' if row['image_path'] else None,
        'active': bool(row['active']),
        'createdAt': row['created_at'],
        'updatedAt': row['updated_at'],
    }


def format_maintenance(row):
    return {
        'id': row['id'],
        'clientId': row['client_id'],
        'inventoryItemId': row['inventory_item_id'],
        'nextMaintenanceDate': row['next_maintenance_date'],
        'maintenanceType': row['maintenance_type'],
        'status': row['status'],
        'description': row['description'],
        'notes': row['notes'],
        'createdAt': row['created_at'],
        'completedAt': row['completed_at'],
        'performedByUserId': row['performed_by_user_id'],
    }


# ---------- Routes ----------
@app.get('/api/health')
def health():
    return jsonify({'ok': True, 'message': 'SYSTEMHOME API funcionando'})


@app.get('/api/auth/check-username')
def check_username():
    username = (request.args.get('username') or '').strip()
    conn = get_connection()
    try:
        row = conn.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone()
        return jsonify({'exists': bool(row)})
    finally:
        conn.close()


@app.post('/api/auth/login')
def login():
    payload = request.get_json(silent=True) or {}
    username = (payload.get('username') or '').strip()
    password = payload.get('password') or ''
    if not username or not password:
        return jsonify({'error': 'Credenciales incompletas'}), 400
    conn = get_connection()
    try:
        row = conn.execute('SELECT u.id, u.username, u.full_name, u.email, u.phone, u.active, u.created_at, u.updated_at, u.role_id, u.password_hash, r.name AS role_name FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.username = ?', (username,)).fetchone()
        if not row or row['active'] != 1 or row['password_hash'] != hash_password(password):
            return jsonify({'error': 'Credenciales inválidas'}), 401
        token = make_token(row['id'], row['username'], row['role_name'])
        return jsonify({'token': token, 'user': format_user(row)})
    finally:
        conn.close()


@app.post('/api/auth/register')
def register():
    payload = request.get_json(silent=True) or {}
    username = (payload.get('username') or '').strip()
    password = payload.get('password') or ''
    name = (payload.get('name') or '').strip()
    email = (payload.get('email') or '').strip()
    phone = (payload.get('phone') or '').strip()
    if not username or not password or not name:
        return jsonify({'error': 'Datos incompletos'}), 400
    conn = get_connection()
    try:
        exists = conn.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone()
        if exists:
            return jsonify({'error': 'Usuario ya existe'}), 409
        role_id = conn.execute("SELECT id FROM roles WHERE name = 'cliente'").fetchone()['id']
        now = now_iso()
        cur = conn.execute('INSERT INTO users (username, password_hash, full_name, email, phone, role_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)', (username, hash_password(password), name, email, phone, role_id, now, now))
        user_row = conn.execute('SELECT u.id, u.username, u.full_name, u.email, u.phone, u.active, u.created_at, u.updated_at, u.role_id, r.name AS role_name FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?', (cur.lastrowid,)).fetchone()
        token = make_token(user_row['id'], user_row['username'], user_row['role_name'])
        conn.commit()
        return jsonify({'token': token, 'user': format_user(user_row)}), 201
    finally:
        conn.close()


@app.get('/api/me')
def me():
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    return jsonify({'user': format_user(user)})


@app.get('/api/roles')
def roles():
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    conn = get_connection()
    try:
        rows = conn.execute('SELECT id, name, description FROM roles ORDER BY id').fetchall()
        return jsonify({'roles': [dict(r) for r in rows]})
    finally:
        conn.close()


@app.get('/api/users')
def users():
    user, error = require_role('admin', 'gerente')
    if error:
        return error
    conn = get_connection()
    try:
        rows = conn.execute('SELECT u.id, u.username, u.full_name, u.email, u.phone, u.active, u.created_at, u.updated_at, u.role_id, r.name AS role_name FROM users u LEFT JOIN roles r ON r.id = u.role_id ORDER BY u.id').fetchall()
        return jsonify({'users': [format_user(r) for r in rows]})
    finally:
        conn.close()


@app.get('/api/clients')
def clients():
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    conn = get_connection()
    try:
        rows = conn.execute('SELECT * FROM clients ORDER BY id DESC').fetchall()
        return jsonify({'clients': [format_client(r) for r in rows]})
    finally:
        conn.close()


@app.post('/api/clients')
def create_client():
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    payload = request.get_json(silent=True) or {}
    name = (payload.get('name') or '').strip()
    ruc = (payload.get('ruc') or '').strip()
    address = (payload.get('address') or '').strip()
    phone = (payload.get('phone') or '').strip()
    email = (payload.get('email') or '').strip()
    client_type = (payload.get('type') or '').strip()
    active = payload.get('active', True)
    if not name or not ruc or not client_type:
        return jsonify({'error': 'Datos incompletos'}), 400
    conn = get_connection()
    try:
        if conn.execute('SELECT id FROM clients WHERE ruc = ?', (ruc,)).fetchone():
            return jsonify({'error': 'RUC/CI duplicado'}), 409
        now = now_iso()
        cur = conn.execute('INSERT INTO clients (name, ruc, address, phone, email, client_type, active, created_at, updated_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (name, ruc, address, phone, email, client_type, 1 if active else 0, now, now, user['id']))
        conn.execute('INSERT INTO client_history (client_id, entry_type, description, created_at, created_by_user_id) VALUES (?, ?, ?, ?, ?)', (cur.lastrowid, 'cliente_creado', 'Cliente creado en el sistema', now, user['id']))
        conn.commit()
        row = conn.execute('SELECT * FROM clients WHERE id = ?', (cur.lastrowid,)).fetchone()
        return jsonify({'client': format_client(row)}), 201
    finally:
        conn.close()


@app.put('/api/clients/<int:client_id>')
def update_client(client_id):
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    payload = request.get_json(silent=True) or {}
    name = (payload.get('name') or '').strip()
    ruc = (payload.get('ruc') or '').strip()
    address = (payload.get('address') or '').strip()
    phone = (payload.get('phone') or '').strip()
    email = (payload.get('email') or '').strip()
    client_type = (payload.get('type') or '').strip()
    active = payload.get('active', True)
    conn = get_connection()
    try:
        current = conn.execute('SELECT id FROM clients WHERE id = ?', (client_id,)).fetchone()
        if not current:
            return jsonify({'error': 'Cliente no encontrado'}), 404
        if conn.execute('SELECT id FROM clients WHERE ruc = ? AND id != ?', (ruc, client_id)).fetchone():
            return jsonify({'error': 'RUC/CI duplicado'}), 409
        now = now_iso()
        conn.execute('UPDATE clients SET name = ?, ruc = ?, address = ?, phone = ?, email = ?, client_type = ?, active = ?, updated_at = ? WHERE id = ?', (name, ruc, address, phone, email, client_type, 1 if active else 0, now, client_id))
        conn.execute('INSERT INTO client_history (client_id, entry_type, description, created_at, created_by_user_id) VALUES (?, ?, ?, ?, ?)', (client_id, 'cliente_actualizado', 'Cliente actualizado en el sistema', now, user['id']))
        conn.commit()
        row = conn.execute('SELECT * FROM clients WHERE id = ?', (client_id,)).fetchone()
        return jsonify({'client': format_client(row)})
    finally:
        conn.close()


@app.delete('/api/clients/<int:client_id>')
def delete_client(client_id):
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    conn = get_connection()
    try:
        conn.execute('DELETE FROM clients WHERE id = ?', (client_id,))
        conn.commit()
        return jsonify({'ok': True})
    finally:
        conn.close()


@app.get('/api/clients/<int:client_id>/history')
def client_history(client_id):
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    conn = get_connection()
    try:
        history = [dict(r) for r in conn.execute('SELECT * FROM client_history WHERE client_id = ? ORDER BY created_at DESC', (client_id,)).fetchall()]
        budgets = [dict(r) for r in conn.execute('SELECT * FROM budgets WHERE client_id = ? ORDER BY created_at DESC', (client_id,)).fetchall()]
        orders = [dict(r) for r in conn.execute('SELECT * FROM work_orders WHERE client_id = ? ORDER BY created_at DESC', (client_id,)).fetchall()]
        maintenances = [dict(r) for r in conn.execute('SELECT * FROM maintenances WHERE client_id = ? ORDER BY created_at DESC', (client_id,)).fetchall()]
        return jsonify({'history': history, 'budgets': budgets, 'orders': orders, 'maintenances': maintenances})
    finally:
        conn.close()


@app.get('/api/services')
def services():
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    conn = get_connection()
    try:
        rows = conn.execute('SELECT * FROM services WHERE active = 1').fetchall()
        return jsonify({'services': [dict(r) for r in rows]})
    finally:
        conn.close()


@app.get('/api/budgets')
def budgets():
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    conn = get_connection()
    try:
        rows = conn.execute('SELECT b.*, s.name AS service_name FROM budgets b LEFT JOIN services s ON s.id = b.service_id ORDER BY b.id DESC').fetchall()
        return jsonify({'budgets': [format_budget(r) for r in rows]})
    finally:
        conn.close()


@app.post('/api/budgets')
def create_budget():
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    payload = request.get_json(silent=True) or {}
    client_id = payload.get('clientId')
    service_type = payload.get('serviceType') or 'otro'
    description = payload.get('description') or ''
    items = payload.get('items') or []
    labor = payload.get('labor') or 0
    discount = payload.get('discount') or 0
    total = payload.get('total') or 0
    status = payload.get('status') or 'borrador'
    source = payload.get('source') or 'internal'
    conn = get_connection()
    try:
        service_row = conn.execute('SELECT id FROM services WHERE name = ? OR id = ?', (service_type, service_type)).fetchone()
        if service_row and service_row['id']:
            service_id = service_row['id']
        else:
            service_id = None
        number = f"PR-{(conn.execute('SELECT COUNT(*) AS count FROM budgets').fetchone()['count'] + 1):04d}"
        now = now_iso()
        cur = conn.execute('INSERT INTO budgets (number, client_id, service_id, service_type, description, items, labor, discount, total, status, source, created_at, updated_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (number, client_id, service_id, service_type, description, json.dumps(items), labor, discount, total, status, source, now, now, user['id']))
        conn.commit()
        row = conn.execute('SELECT b.*, s.name AS service_name FROM budgets b LEFT JOIN services s ON s.id = b.service_id WHERE b.id = ?', (cur.lastrowid,)).fetchone()
        return jsonify({'budget': format_budget(row)}), 201
    finally:
        conn.close()


@app.put('/api/budgets/<int:budget_id>')
def update_budget(budget_id):
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    payload = request.get_json(silent=True) or {}
    client_id = payload.get('clientId')
    service_type = payload.get('serviceType') or 'otro'
    description = payload.get('description') or ''
    items = payload.get('items') or []
    labor = payload.get('labor') or 0
    discount = payload.get('discount') or 0
    total = payload.get('total') or 0
    status = payload.get('status') or 'borrador'
    source = payload.get('source') or 'internal'
    conn = get_connection()
    try:
        conn.execute('UPDATE budgets SET client_id = ?, service_type = ?, description = ?, items = ?, labor = ?, discount = ?, total = ?, status = ?, source = ?, updated_at = ? WHERE id = ?', (client_id, service_type, description, json.dumps(items), labor, discount, total, status, source, now_iso(), budget_id))
        conn.commit()
        row = conn.execute('SELECT b.*, s.name AS service_name FROM budgets b LEFT JOIN services s ON s.id = b.service_id WHERE b.id = ?', (budget_id,)).fetchone()
        return jsonify({'budget': format_budget(row)})
    finally:
        conn.close()


@app.post('/api/budgets/<int:budget_id>/approve')
def approve_budget(budget_id):
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    conn = get_connection()
    try:
        conn.execute("UPDATE budgets SET status = 'aprobado', approved_at = ?, approved_by_user_id = ? WHERE id = ?", (now_iso(), user['id'], budget_id))
        conn.commit()
        row = conn.execute('SELECT b.*, s.name AS service_name FROM budgets b LEFT JOIN services s ON s.id = b.service_id WHERE b.id = ?', (budget_id,)).fetchone()
        return jsonify({'budget': format_budget(row)})
    finally:
        conn.close()


@app.post('/api/budgets/<int:budget_id>/reject')
def reject_budget(budget_id):
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    conn = get_connection()
    try:
        conn.execute("UPDATE budgets SET status = 'rechazado' WHERE id = ?", (budget_id,))
        conn.commit()
        row = conn.execute('SELECT b.*, s.name AS service_name FROM budgets b LEFT JOIN services s ON s.id = b.service_id WHERE b.id = ?', (budget_id,)).fetchone()
        return jsonify({'budget': format_budget(row)})
    finally:
        conn.close()


@app.get('/api/budgets/<int:budget_id>/export')
def export_budget(budget_id):
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    conn = get_connection()
    try:
        row = conn.execute('SELECT b.*, s.name AS service_name FROM budgets b LEFT JOIN services s ON s.id = b.service_id WHERE b.id = ?', (budget_id,)).fetchone()
        if not row:
            return jsonify({'error': 'Presupuesto no encontrado'}), 404
        from io import BytesIO
        from fpdf import FPDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font('Arial', 'B', 16)
        pdf.cell(0, 10, f'Presupuesto {row["number"]}', ln=True)
        pdf.set_font('Arial', '', 12)
        pdf.cell(0, 8, f'Estado: {row["status"]}', ln=True)
        pdf.cell(0, 8, f'Servicio: {row["service_type"]}', ln=True)
        pdf.cell(0, 8, f'Total: {row["total"]}', ln=True)
        pdf.multi_cell(0, 8, f'Descripción: {row["description"]}')
        items = json.loads(row['items'] or '[]')
        if items:
            pdf.ln(2)
            pdf.cell(0, 8, 'Detalle:', ln=True)
            for item in items:
                pdf.multi_cell(0, 6, f"- {item.get('concept')} x{item.get('quantity')} - {item.get('subtotal')}")
        buffer = BytesIO()
        pdf.output(buffer)
        buffer.seek(0)
        return app.response_class(buffer.getvalue(), mimetype='application/pdf', headers={'Content-Disposition': f'attachment; filename=presupuesto-{row["number"]}.pdf'})
    finally:
        conn.close()


@app.get('/api/technicians')
def technicians():
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    conn = get_connection()
    try:
        rows = conn.execute('SELECT * FROM technicians ORDER BY id').fetchall()
        return jsonify({'technicians': [dict(r) for r in rows]})
    finally:
        conn.close()


@app.get('/api/workorders')
def workorders():
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    conn = get_connection()
    try:
        rows = conn.execute('SELECT w.*, s.name AS service_name FROM work_orders w LEFT JOIN services s ON s.id = w.service_id ORDER BY w.id DESC').fetchall()
        return jsonify({'workOrders': [format_work_order(r) for r in rows]})
    finally:
        conn.close()


@app.post('/api/workorders')
def create_work_order():
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    payload = request.get_json(silent=True) or {}
    budget_id = payload.get('budgetId')
    technician_id = payload.get('technicianId')
    service_type = payload.get('serviceType') or 'otro'
    priority = payload.get('priority') or 'normal'
    scheduled_date = payload.get('scheduledDate') or now_iso()
    description = payload.get('description') or ''
    status = payload.get('status') or 'pendiente'
    observations = payload.get('observations') or []
    conn = get_connection()
    try:
        budget = conn.execute('SELECT * FROM budgets WHERE id = ?', (budget_id,)).fetchone()
        if not budget or budget['status'] != 'aprobado':
            return jsonify({'error': 'Solo se pueden crear órdenes desde presupuestos aprobados'}), 400
        number = f"OT-{(conn.execute('SELECT COUNT(*) AS count FROM work_orders').fetchone()['count'] + 1):04d}"
        now = now_iso()
        cur = conn.execute('INSERT INTO work_orders (number, budget_id, client_id, service_id, service_type, technician_id, scheduled_date, priority, description, status, observations, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (number, budget_id, budget['client_id'], None, service_type, technician_id, scheduled_date, priority, description, status, json.dumps(observations), now, now))
        conn.execute('INSERT INTO work_order_assignments (work_order_id, technician_id, assigned_at, assigned_by_user_id) VALUES (?, ?, ?, ?)', (cur.lastrowid, technician_id, now, user['id']))
        conn.execute('INSERT INTO order_history (work_order_id, entry_type, description, details, created_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)', (cur.lastrowid, 'orden_creada', 'Orden creada', description, now, user['id']))
        conn.commit()
        row = conn.execute('SELECT w.*, s.name AS service_name FROM work_orders w LEFT JOIN services s ON s.id = w.service_id WHERE w.id = ?', (cur.lastrowid,)).fetchone()
        return jsonify({'workOrder': format_work_order(row)}), 201
    finally:
        conn.close()


@app.put('/api/workorders/<int:order_id>')
def update_work_order(order_id):
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    payload = request.get_json(silent=True) or {}
    technician_id = payload.get('technicianId')
    service_type = payload.get('serviceType') or 'otro'
    priority = payload.get('priority') or 'normal'
    scheduled_date = payload.get('scheduledDate') or None
    description = payload.get('description') or ''
    status = payload.get('status') or 'pendiente'
    observations = payload.get('observations') or []
    conn = get_connection()
    try:
        conn.execute('UPDATE work_orders SET technician_id = ?, service_type = ?, priority = ?, scheduled_date = ?, description = ?, status = ?, observations = ?, updated_at = ? WHERE id = ?', (technician_id, service_type, priority, scheduled_date, description, status, json.dumps(observations), now_iso(), order_id))
        conn.commit()
        row = conn.execute('SELECT w.*, s.name AS service_name FROM work_orders w LEFT JOIN services s ON s.id = w.service_id WHERE w.id = ?', (order_id,)).fetchone()
        return jsonify({'workOrder': format_work_order(row)})
    finally:
        conn.close()


@app.post('/api/workorders/<int:order_id>/start')
def start_work_order(order_id):
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    conn = get_connection()
    try:
        conn.execute("UPDATE work_orders SET status = 'ejecucion', updated_at = ? WHERE id = ?", (now_iso(), order_id))
        conn.execute('INSERT INTO order_history (work_order_id, entry_type, description, details, created_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)', (order_id, 'orden_iniciada', 'Orden iniciada', 'En ejecución', now_iso(), user['id']))
        conn.commit()
        row = conn.execute('SELECT * FROM work_orders WHERE id = ?', (order_id,)).fetchone()
        return jsonify({'workOrder': format_work_order(row)})
    finally:
        conn.close()


@app.post('/api/workorders/<int:order_id>/complete')
def complete_work_order(order_id):
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    payload = request.get_json(silent=True) or {}
    materials = payload.get('materials') or []
    conn = get_connection()
    try:
        order = conn.execute('SELECT * FROM work_orders WHERE id = ?', (order_id,)).fetchone()
        if not order:
            return jsonify({'error': 'Orden no encontrada'}), 404
        now = now_iso()
        if not materials:
            materials = [{'itemId': 1, 'quantity': 1}]
        for material in materials:
            item_id = material.get('itemId') or 1
            qty = material.get('quantity') or 1
            item = conn.execute('SELECT * FROM inventory_items WHERE id = ? AND active = 1', (item_id,)).fetchone()
            if item and item['stock'] >= qty:
                conn.execute('UPDATE inventory_items SET stock = stock - ? WHERE id = ?', (qty, item_id))
                conn.execute('INSERT INTO inventory_movements (item_id, movement_type, quantity, reference_type, reference_id, notes, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', (item_id, 'salida', qty, 'work_order', order_id, 'Consumo desde cierre de orden', user['id'], now))
        conn.execute("UPDATE work_orders SET status = 'completada', completed_at = ?, closed_at = ?, updated_at = ? WHERE id = ?", (now, now, now, order_id))
        conn.execute('INSERT INTO order_history (work_order_id, entry_type, description, details, created_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)', (order_id, 'orden_completada', 'Orden cerrada', 'Trabajo finalizado', now, user['id']))
        conn.commit()
        row = conn.execute('SELECT * FROM work_orders WHERE id = ?', (order_id,)).fetchone()
        return jsonify({'workOrder': format_work_order(row)})
    finally:
        conn.close()


@app.get('/api/catalog')
def catalog():
    conn = get_connection()
    try:
        rows = conn.execute('SELECT * FROM inventory_items WHERE active = 1 AND show_in_catalog = 1 AND stock > 0 ORDER BY id DESC').fetchall()
        return jsonify({'catalog': [format_inventory_item(r) for r in rows]})
    finally:
        conn.close()


@app.get('/api/inventory')
def inventory():
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    conn = get_connection()
    try:
        rows = conn.execute('SELECT * FROM inventory_items WHERE active = 1 ORDER BY id DESC').fetchall()
        return jsonify({'inventory': [format_inventory_item(r) for r in rows]})
    finally:
        conn.close()


@app.post('/api/inventory')
def create_inventory_item():
    user, error = require_role('admin', 'gerente', 'almacenista')
    if error:
        return error
    payload = request.get_json(silent=True) or {}
    name = (payload.get('name') or '').strip()
    category = payload.get('category') or 'otro'
    brand = payload.get('brand') or ''
    model = payload.get('model') or ''
    stock = payload.get('stock', 0)
    price = payload.get('price', 0)
    description = payload.get('description') or ''
    badge = payload.get('badge') or ''
    show_in_catalog = 1 if payload.get('showInCatalog', True) else 0
    conn = get_connection()
    try:
        cur = conn.execute('INSERT INTO inventory_items (name, category, brand, model, stock, price, description, badge, show_in_catalog, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)', (name, category, brand, model, stock, price, description, badge, show_in_catalog, now_iso(), now_iso()))
        conn.commit()
        row = conn.execute('SELECT * FROM inventory_items WHERE id = ?', (cur.lastrowid,)).fetchone()
        return jsonify({'inventoryItem': format_inventory_item(row)}), 201
    finally:
        conn.close()


@app.put('/api/inventory/<int:item_id>')
def update_inventory_item(item_id):
    user, error = require_role('admin', 'gerente', 'almacenista')
    if error:
        return error
    payload = request.get_json(silent=True) or {}
    name = (payload.get('name') or '').strip()
    category = payload.get('category') or 'otro'
    brand = payload.get('brand') or ''
    model = payload.get('model') or ''
    stock = payload.get('stock', 0)
    price = payload.get('price', 0)
    description = payload.get('description') or ''
    badge = payload.get('badge') or ''
    show_in_catalog = 1 if payload.get('showInCatalog', True) else 0
    conn = get_connection()
    try:
        conn.execute('UPDATE inventory_items SET name = ?, category = ?, brand = ?, model = ?, stock = ?, price = ?, description = ?, badge = ?, show_in_catalog = ?, updated_at = ? WHERE id = ?', (name, category, brand, model, stock, price, description, badge, show_in_catalog, now_iso(), item_id))
        conn.commit()
        row = conn.execute('SELECT * FROM inventory_items WHERE id = ?', (item_id,)).fetchone()
        return jsonify({'inventoryItem': format_inventory_item(row)})
    finally:
        conn.close()


@app.post('/api/inventory/<int:item_id>/image')
def upload_inventory_image(item_id):
    user, error = require_role('admin', 'gerente', 'almacenista')
    if error:
        return error
    if 'image' not in request.files:
        return jsonify({'error': 'Imagen no recibida'}), 400
    file = request.files['image']
    if not file or file.filename == '':
        return jsonify({'error': 'Archivo inválido'}), 400
    ext = Path(file.filename).suffix.lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
        return jsonify({'error': 'Formato de imagen no válido'}), 400
    filename = f'{uuid.uuid4().hex}{ext}'
    item_dir = UPLOAD_DIR / 'inventory'
    item_dir.mkdir(parents=True, exist_ok=True)
    save_path = item_dir / filename
    file.save(str(save_path))
    image_path = f'inventory/{filename}'
    conn = get_connection()
    try:
        conn.execute('UPDATE inventory_items SET image_path = ? WHERE id = ?', (image_path, item_id))
        conn.commit()
        row = conn.execute('SELECT * FROM inventory_items WHERE id = ?', (item_id,)).fetchone()
        return jsonify({'inventoryItem': format_inventory_item(row)})
    finally:
        conn.close()


@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(str(UPLOAD_DIR), filename)


@app.delete('/api/inventory/<int:item_id>')
def delete_inventory_item(item_id):
    user, error = require_role('admin', 'gerente', 'almacenista')
    if error:
        return error
    conn = get_connection()
    try:
        conn.execute('UPDATE inventory_items SET active = 0 WHERE id = ?', (item_id,))
        conn.commit()
        return jsonify({'ok': True})
    finally:
        conn.close()


@app.get('/api/inventory/movements')
def inventory_movements():
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    conn = get_connection()
    try:
        rows = conn.execute('SELECT im.*, ii.name FROM inventory_movements im JOIN inventory_items ii ON ii.id = im.item_id ORDER BY im.id DESC').fetchall()
        return jsonify({'movements': [dict(r) for r in rows]})
    finally:
        conn.close()


@app.post('/api/inventory/movements')
def create_inventory_movement():
    user, error = require_role('admin', 'gerente', 'almacenista')
    if error:
        return error
    payload = request.get_json(silent=True) or {}
    item_id = payload.get('itemId')
    movement_type = payload.get('movementType')
    quantity = payload.get('quantity', 0)
    notes = payload.get('notes', '')
    conn = get_connection()
    try:
        conn.execute('INSERT INTO inventory_movements (item_id, movement_type, quantity, notes, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', (item_id, movement_type, quantity, notes, user['id'], now_iso()))
        if movement_type == 'entrada':
            conn.execute('UPDATE inventory_items SET stock = stock + ? WHERE id = ?', (quantity, item_id))
        elif movement_type == 'salida':
            conn.execute('UPDATE inventory_items SET stock = stock - ? WHERE id = ?', (quantity, item_id))
        conn.commit()
        return jsonify({'ok': True}), 201
    finally:
        conn.close()


@app.get('/api/maintenances')
def maintenances():
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    conn = get_connection()
    try:
        rows = conn.execute('SELECT * FROM maintenances ORDER BY id DESC').fetchall()
        return jsonify({'maintenances': [format_maintenance(r) for r in rows]})
    finally:
        conn.close()


@app.post('/api/maintenances')
def create_maintenance():
    user, error = require_role('admin', 'gerente', 'supervisor')
    if error:
        return error
    payload = request.get_json(silent=True) or {}
    client_id = payload.get('clientId')
    inventory_item_id = payload.get('inventoryItemId')
    next_maintenance_date = payload.get('nextMaintenanceDate')
    maintenance_type = payload.get('maintenanceType')
    status = payload.get('status') or 'programado'
    description = payload.get('description') or ''
    notes = payload.get('notes') or ''
    conn = get_connection()
    try:
        cur = conn.execute('INSERT INTO maintenances (client_id, inventory_item_id, next_maintenance_date, maintenance_type, status, description, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', (client_id, inventory_item_id, next_maintenance_date, maintenance_type, status, description, notes, now_iso()))
        conn.commit()
        row = conn.execute('SELECT * FROM maintenances WHERE id = ?', (cur.lastrowid,)).fetchone()
        return jsonify({'maintenance': format_maintenance(row)}), 201
    finally:
        conn.close()


@app.put('/api/maintenances/<int:maintenance_id>')
def update_maintenance(maintenance_id):
    user, error = require_role('admin', 'gerente', 'supervisor')
    if error:
        return error
    payload = request.get_json(silent=True) or {}
    status = payload.get('status') or 'programado'
    notes = payload.get('notes') or ''
    conn = get_connection()
    try:
        conn.execute('UPDATE maintenances SET status = ?, notes = ?, completed_at = ? WHERE id = ?', (status, notes, now_iso() if status == 'realizado' else None, maintenance_id))
        conn.commit()
        row = conn.execute('SELECT * FROM maintenances WHERE id = ?', (maintenance_id,)).fetchone()
        return jsonify({'maintenance': format_maintenance(row)})
    finally:
        conn.close()


@app.get('/api/summary')
def summary():
    user = require_auth()
    if not user:
        return jsonify({'error': 'No autenticado'}), 401
    conn = get_connection()
    try:
        clients = conn.execute('SELECT COUNT(*) AS count FROM clients').fetchone()['count']
        budgets = conn.execute('SELECT COUNT(*) AS count FROM budgets').fetchone()['count']
        orders = conn.execute('SELECT COUNT(*) AS count FROM work_orders').fetchone()['count']
        inventory = conn.execute('SELECT COUNT(*) AS count FROM inventory_items').fetchone()['count']
        return jsonify({'summary': {'clients': clients, 'budgets': budgets, 'orders': orders, 'inventory': inventory}})
    finally:
        conn.close()


@app.get('/api/users/<int:user_id>')
def get_user(user_id):
    user, error = require_role('admin', 'gerente')
    if error:
        return error
    conn = get_connection()
    try:
        row = conn.execute('SELECT u.*, r.name AS role_name FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?', (user_id,)).fetchone()
        if not row:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        return jsonify({'user': format_user(row)})
    finally:
        conn.close()


@app.post('/api/users')
def create_user():
    user, error = require_role('admin', 'gerente')
    if error:
        return error
    payload = request.get_json(silent=True) or {}
    username = (payload.get('username') or '').strip()
    password = payload.get('password') or ''
    name = (payload.get('name') or '').strip()
    email = (payload.get('email') or '').strip()
    phone = (payload.get('phone') or '').strip()
    role = (payload.get('role') or 'vendedor').lower()
    if not username or not password or not name:
        return jsonify({'error': 'Datos incompletos'}), 400
    conn = get_connection()
    try:
        if conn.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone():
            return jsonify({'error': 'Usuario ya existe'}), 409
        role_row = conn.execute('SELECT id, name FROM roles WHERE name = ?', (role,)).fetchone()
        if not role_row:
            return jsonify({'error': f'Rol inválido: {role}'}), 400
        now = now_iso()
        cur = conn.execute('INSERT INTO users (username, password_hash, full_name, email, phone, role_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)', (username, hash_password(password), name, email, phone, role_row['id'], now, now))
        row = conn.execute('SELECT u.*, r.name AS role_name FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?', (cur.lastrowid,)).fetchone()
        conn.commit()
        return jsonify({'user': format_user(row)}), 201
    finally:
        conn.close()


@app.put('/api/users/<int:user_id>')
def update_user(user_id):
    user, error = require_role('admin', 'gerente')
    if error:
        return error
    payload = request.get_json(silent=True) or {}
    username = (payload.get('username') or '').strip()
    name = (payload.get('name') or '').strip()
    email = (payload.get('email') or '').strip()
    phone = (payload.get('phone') or '').strip()
    role = (payload.get('role') or '').lower()
    active = payload.get('active', True)
    password = payload.get('password') or ''
    conn = get_connection()
    try:
        current = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        if not current:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        if username and conn.execute('SELECT id FROM users WHERE username = ? AND id != ?', (username, user_id)).fetchone():
            return jsonify({'error': 'Usuario ya existe'}), 409
        now = now_iso()
        if password:
            conn.execute('UPDATE users SET username = ?, full_name = ?, email = ?, phone = ?, password_hash = ?, active = ?, updated_at = ? WHERE id = ?', (username or current['username'], name or current['full_name'], email or '', phone or '', hash_password(password), 1 if active else 0, now, user_id))
        else:
            conn.execute('UPDATE users SET username = ?, full_name = ?, email = ?, phone = ?, active = ?, updated_at = ? WHERE id = ?', (username or current['username'], name or current['full_name'], email or '', phone or '', 1 if active else 0, now, user_id))
        if role:
            role_row = conn.execute('SELECT id FROM roles WHERE name = ?', (role,)).fetchone()
            if role_row:
                conn.execute('UPDATE users SET role_id = ? WHERE id = ?', (role_row['id'], user_id))
        conn.commit()
        row = conn.execute('SELECT u.*, r.name AS role_name FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?', (user_id,)).fetchone()
        return jsonify({'user': format_user(row)})
    finally:
        conn.close()


@app.delete('/api/users/<int:user_id>')
def delete_user(user_id):
    user, error = require_role('admin', 'gerente')
    if error:
        return error
    conn = get_connection()
    try:
        conn.execute('DELETE FROM users WHERE id = ?', (user_id,))
        conn.commit()
        return jsonify({'ok': True})
    finally:
        conn.close()


@app.route('/')
def index():
    return send_from_directory(str(SYSTEMHOME_DIR), 'index.html')


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(str(SYSTEMHOME_DIR), path)


if __name__ == '__main__':
    import sys
    if '--reset' in sys.argv:
        db_file = os.environ.get('DB_PATH', str(Path(__file__).resolve().parent / 'database' / 'systemhome.sqlite'))
        if Path(db_file).exists():
            Path(db_file).unlink()
            print(f'Base de datos eliminada: {db_file}')
    init_db()
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 3000)), debug=True)
