import os
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = os.environ.get('DB_PATH', str(BASE_DIR / 'database' / 'systemhome.sqlite'))
SCHEMA_PATH = BASE_DIR / 'database' / 'schema.sql'


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def init_db():
    conn = get_connection()
    try:
        schema_sql = SCHEMA_PATH.read_text(encoding='utf-8')
        conn.executescript(schema_sql)
        conn.commit()
        ensure_inventory_image_column(conn)
        seed_default_data(conn)
    finally:
        conn.close()


def ensure_inventory_image_column(conn):
    columns = [row['name'] for row in conn.execute("PRAGMA table_info(inventory_items)").fetchall()]
    if 'image_path' not in columns:
        conn.execute('ALTER TABLE inventory_items ADD COLUMN image_path TEXT')
        conn.commit()


def seed_default_data(conn):
    role_count = conn.execute('SELECT COUNT(*) AS count FROM roles').fetchone()['count']
    if role_count == 0:
        conn.executescript('''
            INSERT INTO roles (name, description) VALUES
            ('admin', 'Administrador del sistema'),
            ('gerente', 'Gerente general'),
            ('supervisor', 'Supervisor de operaciones'),
            ('tecnico', 'Técnico de campo'),
            ('almacenista', 'Encargado de inventario'),
            ('vendedor', 'Vendedor comercial'),
            ('cliente', 'Cliente del portal');

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
        ''')

        roles = {row['name']: row['id'] for row in conn.execute('SELECT id, name FROM roles').fetchall()}
        perms = {row['key']: row['id'] for row in conn.execute('SELECT id, key FROM permissions').fetchall()}
        role_perms = {
            'admin': ['clients.read','clients.write','budgets.read','budgets.write','orders.read','orders.write','inventory.read','inventory.write','maintenance.read','maintenance.write'],
            'gerente': ['clients.read','clients.write','budgets.read','budgets.write','orders.read','orders.write','inventory.read','inventory.write','maintenance.read','maintenance.write'],
            'supervisor': ['clients.read','budgets.read','budgets.write','orders.read','orders.write','inventory.read','inventory.write','maintenance.read','maintenance.write'],
            'tecnico': ['orders.read','orders.write','maintenance.read','maintenance.write'],
            'almacenista': ['inventory.read','inventory.write','maintenance.read'],
            'vendedor': ['clients.read','budgets.read','budgets.write','orders.read'],
            'cliente': ['clients.read']
        }
        for role_name, perm_keys in role_perms.items():
            role_id = roles.get(role_name)
            if not role_id:
                continue
            for perm_key in perm_keys:
                perm_id = perms.get(perm_key)
                if perm_id:
                    conn.execute('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', (role_id, perm_id))

    user_count = conn.execute('SELECT COUNT(*) AS count FROM users').fetchone()['count']
    if user_count == 0:
        import hashlib
        def pw(value):
            return hashlib.sha256(value.encode('utf-8')).hexdigest()
        now = __import__('datetime').datetime.utcnow().isoformat()
        conn.execute("INSERT INTO users (username, password_hash, full_name, email, phone, role_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, (SELECT id FROM roles WHERE name = 'admin'), 1, ?, ?)", ('admin', pw('admin123'), 'Administrador', 'admin@systemhome.com', '0981 000 000', now, now))
        conn.execute("INSERT INTO users (username, password_hash, full_name, email, phone, role_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, (SELECT id FROM roles WHERE name = 'gerente'), 1, ?, ?)", ('gerente', pw('gerente123'), 'Gerente', 'gerente@systemhome.com', '0981 111 111', now, now))
        conn.execute("INSERT INTO users (username, password_hash, full_name, email, phone, role_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, (SELECT id FROM roles WHERE name = 'supervisor'), 1, ?, ?)", ('supervisor', pw('supervisor123'), 'Supervisor', 'supervisor@systemhome.com', '0981 222 222', now, now))
        conn.execute("INSERT INTO users (username, password_hash, full_name, email, phone, role_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, (SELECT id FROM roles WHERE name = 'tecnico'), 1, ?, ?)", ('tecnico', pw('tecnico123'), 'Técnico', 'tecnico@systemhome.com', '0981 333 333', now, now))
        conn.execute("INSERT INTO users (username, password_hash, full_name, email, phone, role_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, (SELECT id FROM roles WHERE name = 'almacenista'), 1, ?, ?)", ('almacenista', pw('almacenista123'), 'Almacenista', 'almacenista@systemhome.com', '0981 444 444', now, now))
        conn.execute("INSERT INTO users (username, password_hash, full_name, email, phone, role_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, (SELECT id FROM roles WHERE name = 'vendedor'), 1, ?, ?)", ('vendedor', pw('vendedor123'), 'Vendedor', 'vendedor@systemhome.com', '0981 555 555', now, now))
        conn.execute("INSERT INTO users (username, password_hash, full_name, email, phone, role_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, (SELECT id FROM roles WHERE name = 'cliente'), 1, ?, ?)", ('cliente', pw('cliente123'), 'Cliente', 'cliente@systemhome.com', '0981 666 666', now, now))

    service_count = conn.execute('SELECT COUNT(*) AS count FROM services').fetchone()['count']
    if service_count == 0:
        conn.executescript('''
            INSERT INTO services (name, description, active) VALUES
            ('Cámaras de Vigilancia', 'Instalación y mantenimiento de cámaras', 1),
            ('Sistemas de Alarma', 'Sistemas de alarma y monitoreo', 1),
            ('Aire Acondicionado', 'Instalaciones y mantenimiento de aires', 1),
            ('Cerca Eléctrica', 'Cercas perimetrales y sistemas de seguridad', 1),
            ('Video Portero', 'Video porteros y accesos', 1),
            ('Electricidad', 'Instalaciones eléctricas', 1),
            ('Cableado Estructurado', 'Cableado y redes', 1),
            ('Redes e Internet', 'Redes y conectividad', 1);
        ''')

    technician_count = conn.execute('SELECT COUNT(*) AS count FROM technicians').fetchone()['count']
    if technician_count == 0:
        now = __import__('datetime').datetime.utcnow().isoformat()
        conn.executescript(f"""
            INSERT INTO technicians (name, specialty, phone, email, active, created_at, updated_at) VALUES
            ('Carlos Mendoza', 'Cámaras y alarmas', '0981 123 456', 'carlos@systemhome.com', 1, '{now}', '{now}'),
            ('Ana López', 'Aire acondicionado y electricidad', '0981 789 012', 'ana@systemhome.com', 1, '{now}', '{now}'),
            ('Pedro Ramírez', 'Redes y cableado', '0981 345 678', 'pedro@systemhome.com', 1, '{now}', '{now}');
        """)

    inventory_count = conn.execute('SELECT COUNT(*) AS count FROM inventory_items').fetchone()['count']
    if inventory_count == 0:
        now = __import__('datetime').datetime.utcnow().isoformat()
        conn.executescript(f"""
            INSERT INTO inventory_items (name, category, brand, model, stock, price, description, active, created_at, updated_at) VALUES
            ('Cámara HD 1080p', 'camaras', 'Hikvision', 'DS-2CD1023G0-I', 10, 450000, 'Cámara exterior HD', 1, '{now}', '{now}'),
            ('Kit Alarma Residencial', 'alarmas', 'Honeywell', 'Lynx Touch', 5, 890000, 'Panel y sensores', 1, '{now}', '{now}'),
            ('Aire Split 12000 BTU', 'ac', 'Samsung', 'AR12', 4, 3450000, 'Aire acondicionado residencial', 1, '{now}', '{now}');
        """)

    client_count = conn.execute('SELECT COUNT(*) AS count FROM clients').fetchone()['count']
    if client_count == 0:
        now = __import__('datetime').datetime.utcnow().isoformat()
        admin_user = conn.execute("SELECT id FROM users WHERE username = 'admin'").fetchone()
        if admin_user:
            client_id = conn.execute('''
                INSERT INTO clients (name, ruc, address, phone, email, client_type, active, created_at, updated_at, created_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
            ''', ('María Gómez', '1234567-8', 'Av. Mcal. López 100', '0981 010 101', 'maria@example.com', 'persona', now, now, admin_user['id'])).lastrowid
            service_id = conn.execute("SELECT id FROM services WHERE name = 'Cámaras de Vigilancia'").fetchone()['id']
            budget_id = conn.execute('''
                INSERT INTO budgets (number, client_id, service_id, service_type, description, items, labor, discount, total, status, source, created_at, updated_at, created_by_user_id, approved_at, approved_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', ('PR-0001', client_id, service_id, 'camaras', 'Instalación de 4 cámaras', '[{"concept": "Instalación", "quantity": 1, "unit_price": 2500000, "subtotal": 2500000}]', 500000, 0, 3000000, 'aprobado', 'internal', now, now, admin_user['id'], now, admin_user['id'])).lastrowid
            technician_id = conn.execute('SELECT id FROM technicians ORDER BY id LIMIT 1').fetchone()['id']
            order_id = conn.execute('''
                INSERT INTO work_orders (number, budget_id, client_id, service_id, service_type, technician_id, scheduled_date, priority, description, status, observations, created_at, updated_at, completed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', ('OT-0001', budget_id, client_id, service_id, 'camaras', technician_id, now, 'alta', 'Instalación inicial de cámaras', 'pendiente', 'Pendiente de ejecución', now, now, None)).lastrowid
            conn.execute('INSERT INTO client_history (client_id, entry_type, description, related_type, related_id, created_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)', (client_id, 'cliente_creado', 'Cliente creado en el sistema', 'client', client_id, now, admin_user['id']))
            conn.execute('INSERT INTO order_history (work_order_id, entry_type, description, details, created_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)', (order_id, 'orden_creada', 'Orden de trabajo creada', 'Pendiente de ejecución', now, admin_user['id']))
        conn.commit()
