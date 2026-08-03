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
