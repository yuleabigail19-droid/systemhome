# SYSTEMHOME - Sistema Integral de Gestión Comercial y Técnica

## 1. Nombre del Proyecto

**SYSTEMHOME** - Sistema Web Integral de Gestión para empresas de seguridad, climatización y tecnología.

## 2. Descripción

SYSTEMHOME es un sistema web integral de gestión empresarial diseñado para empresas especializadas en:
- Cámaras de Vigilancia
- Sistemas de Alarma
- Aire Acondicionado
- Cercas Eléctricas
- Video Portero
- Electricidad
- Cableado Estructurado
- Redes e Internet

El sistema permite gestionar clientes, presupuestos, órdenes de trabajo, técnicos, inventario, mantenimientos e historiales completos, todo con control de acceso por roles.

## 3. Tecnologías Utilizadas

### Backend
- **Python 3.12** con **Flask** (backend principal)
- **SQLite** (base de datos relacional)
- JWT (autenticación por tokens)
- FPDF (generación de PDFs)

### Frontend
- **HTML5** + **CSS3** (diseño responsive moderno)
- **JavaScript** puro (vanilla JS, sin framework)
- Font Awesome / Emojis para iconografía
- Google Fonts (Inter)

### Backup (opcional)
- Node.js con Express (versión alternativa del backend)

## 4. Requisitos para Ejecutar el Sistema

- **Python 3.10+** instalado
- Navegador web moderno (Chrome, Firefox, Edge)

Opcional:
- Node.js 18+ (solo si desea usar la versión alternativa con Express)

## 5. Instalación de Dependencias

### Backend Python (principal)

```bash
pip install -r requirements.txt
```

Las dependencias son:
- `flask==3.1.3` - Framework web
- `fpdf==1.7.2` - Generación de PDFs

### Backend Node.js (opcional/alternativo)

```bash
npm install
```

## 6. Configuración de la Base de Datos

El sistema utiliza **SQLite** como base de datos relacional. La base de datos se crea automáticamente en:
```
backend/database/systemhome.sqlite
```

Las tablas se crean automáticamente al iniciar el servidor desde el archivo:
```
backend/database/schema.sql
```

### Tablas del sistema:
- `roles` - Roles de usuario
- `permissions` - Permisos del sistema
- `role_permissions` - Relación roles-permisos
- `users` - Usuarios del sistema
- `clients` - Clientes
- `services` - Servicios ofrecidos
- `budgets` - Presupuestos
- `budget_items` - Líneas detalle del presupuesto
- `technicians` - Técnicos
- `work_orders` - Órdenes de trabajo
- `work_order_assignments` - Asignaciones de técnicos
- `inventory_items` - Equipos y materiales
- `inventory_movements` - Movimientos de inventario
- `maintenances` - Programación de mantenimientos
- `client_history` - Historial de clientes
- `order_history` - Historial de órdenes

## 7. Configuración del Archivo .env

Cree un archivo `.env` en la raíz del proyecto con:

```
PORT=3000
JWT_SECRET=su-secreto-seguro-aqui
DB_PATH=./backend/database/systemhome.sqlite
FRONTEND_URL=http://localhost:3000
```

También se incluye un archivo `.env.example` como plantilla de referencia.

## 8. Creación de Tablas o Ejecución de Migraciones

Las tablas se crean automáticamente la primera vez que se inicia el servidor. No se requiere ejecutar migraciones manualmente.

Para **resetear** la base de datos (eliminar y recrear):

```bash
python backend/server.py --reset
```

## 9. Inserción de Datos Iniciales

El sistema crea automáticamente datos de prueba (seed) la primera vez que se inicia:

- 7 roles de usuario
- 10 permisos del sistema
- 7 usuarios de prueba
- 8 servicios (Cámaras, Alarmas, A/A, etc.)
- 3 técnicos de ejemplo
- 3 equipos en inventario
- 1 cliente de ejemplo con presupuesto y orden vinculada

## 10. Cómo Iniciar el Backend

```bash
python backend/server.py
```

El servidor se iniciará en: `http://localhost:3000`

También puede ejecutar:
```bash
python -m backend.server
```

### Iniciar el backend con Node.js (opcional):
```bash
node backend/server.js
```

## 11. Cómo Iniciar el Frontend

El frontend es servido automáticamente por el backend. Simplemente abra:

```
http://localhost:3000
```

No requiere configuración adicional. El frontend se sirve desde la carpeta `systemhome/`.

## 12. Usuarios de Prueba

| Usuario      | Contraseña     | Rol           |
|--------------|---------------|---------------|
| `admin`      | `admin123`    | Administrador |
| `gerente`    | `gerente123`  | Gerente       |
| `supervisor` | `supervisor123` | Supervisor  |
| `tecnico`    | `tecnico123`  | Técnico       |
| `almacenista`| `almacenista123` | Almacenista |
| `vendedor`   | `vendedor123` | Vendedor      |
| `cliente`    | `cliente123`  | Cliente       |
 
## Cambios recientes (agosto 2026)

Se han añadido mejoras visuales y de gestión de imágenes en el inventario:

- Paleta y estilo más profesional con tonos azules (archivo: `systemhome/css/style.css`).
- Login con estilo renovado y fondo en gama azul, usando el logo del proyecto.
- Inventario: miniaturas en la lista, vista previa al editar y soporte de imágenes por item.
- Gestión de imágenes en masa: modal para subir varias imágenes y asignarlas a equipos.
- Subida individual de imagen directamente desde la fila del inventario (botón 🖼️).
- Backend guarda las imágenes en `backend/uploads/inventory/` y las sirve vía `/uploads/<ruta>`.

Recomendación de uso: subir las imágenes directamente al sistema (no depender de URLs externas) para garantizar que no se borren.

## Cómo probar localmente (rápido)

1. Instalar dependencias Python:

```bash
pip install -r requirements.txt
```

2. Iniciar el servidor (crea/seed la base de datos automáticamente):

```bash
python backend/server.py
```

3. Abrir en el navegador:

```
http://localhost:3000
```

4. Probar endpoints básicos desde la terminal (ejemplo):

```bash
python tools/api_check.py
```

5. En la sección Inventario del panel puedes:
	- Crear/editar equipos y subir una imagen en el formulario.
	- Hacer click en 🖼️ en la fila para asignar una imagen individualmente.
	- Abrir "Gestionar Imágenes" para cargar varias imágenes y asignarlas a equipos.

## Documentación adicional

Si deseas, puedo:

- Añadir validación de tamaño/ratio de imagen y generar miniaturas al subir.
- Implementar eliminación segura de imágenes cuando un equipo se borre (opcional).
- Preparar un script `push-to-github.ps1` para inicializar el repo y subir a tu URL remota.


## 13. Estructura del Proyecto

```
SYSTEMHOME/
├── backend/
│   ├── database/
│   │   ├── schema.sql          # Esquema SQL de la base de datos
│   │   └── systemhome.sqlite   # Base de datos SQLite (se genera automáticamente)
│   ├── db.py                   # Conexión y seed de datos (Python)
│   ├── db.js                   # Conexión y seed de datos (Node.js)
│   ├── server.py               # API Flask (backend principal)
│   └── server.js               # API Express (backend alternativo)
├── systemhome/
│   ├── index.html              # Página principal del sistema
│   ├── assets/
│   │   ├── LOGO.png            # Logo de la empresa
│   │   └── logo.svg            # Logo SVG (respaldo)
│   ├── css/
│   │   └── style.css           # Estilos del sistema
│   └── js/
│       ├── app.js              # Aplicación principal y navegación
│       ├── data.js             # Cliente API (conexión con backend)
│       └── modules/
│           ├── clients.js      # Módulo de clientes + historial
│           ├── budgets.js      # Módulo de presupuestos
│           ├── workorders.js   # Módulo de órdenes de trabajo
│           ├── inventory.js    # Módulo de inventario
│           ├── maintenances.js # Módulo de mantenimientos
│           └── client-portal.js# Portal del cliente
├── .env                        # Variables de entorno (local)
├── .env.example                # Plantilla de variables de entorno
├── .gitignore                  # Archivos ignorados por git
├── package.json                # Dependencias Node.js
├── requirements.txt            # Dependencias Python
└── README.md                   # Este archivo
```

## 14. Comandos para GitHub

### Inicializar repositorio y hacer commit:

```bash
# Inicializar repositorio git
git init

# Agregar todos los archivos
git add .

# Crear commit inicial
git commit -m "Sistema SYSTEMHOME - Gestión Integral v3.0"

# Conectar con repositorio remoto
git remote add origin https://github.com/yuleabigail19-droid/systemhome.git

# Subir al repositorio
git push -u origin master
```

O si prefiere usar `main` como rama principal:

```bash
git branch -M main
git push -u origin main
```

## 15. Dónde se Almacenan los Datos

Todos los datos del sistema se almacenan de forma permanente en la base de datos SQLite:

```
backend/database/systemhome.sqlite
```

### Verificar que los datos se guardan:

1. **Inicie el servidor**: `python backend/server.py`
2. **Abra el navegador**: `http://localhost:3000`
3. **Inicie sesión** con `admin` / `admin123`
4. **Cree un cliente** en el módulo Clientes
5. Para verificar que se guardó en la BD:

**Opción A** - Con la API:
```bash
curl -H "Authorization: Bearer TU_TOKEN" http://localhost:3000/api/clients
```

**Opción B** - Con Python (directo a la BD):
```python
import sqlite3
conn = sqlite3.connect('backend/database/systemhome.sqlite')
rows = conn.execute('SELECT * FROM clients ORDER BY id DESC LIMIT 5').fetchall()
print(rows)  # Verá los clientes guardados
conn.close()
```

**Opción C** - Con el navegador:
- Inicie sesión en el sistema
- Vaya a Clientes → verá los clientes creados que se cargan desde la BD

## 16. Funcionalidades Implementadas por Historia de Usuario

### Sprint 1 - Completado ✅
- **SH-A01**: Registro de clientes con validación anti-duplicados
- **SH-A02**: Gestión de presupuestos con cálculo automático y exportación PDF
- **SH-O01**: Creación de órdenes desde presupuestos aprobados
- **SH-O02**: Asignación de técnicos y control de estados
- **SH-I01**: Inventario básico con descuento automático de stock

### Funcionalidades Adicionales ✅
- **SH-A03**: Historial completo del cliente con filtros
- **SH-O03**: Cierre de orden con materiales y firma del cliente
- **SH-O04**: Historial de órdenes con filtros y exportación
- **SH-I02**: Control de movimientos de inventario
- **SH-M01**: Programación de mantenimientos

## 17. Reglas de Negocio Implementadas

✅ Solo se genera orden desde presupuesto aprobado
✅ Un técnico se asigna a una orden a la vez
✅ El inventario se descuenta automáticamente al usar materiales
✅ No se permite salida con stock cero
✅ Las órdenes completadas conservan todo su historial
✅ No se duplican clientes con el mismo CI/RUC
✅ Los presupuestos rechazados no generan órdenes
✅ Los cambios importantes quedan registrados
✅ Control de acceso por roles

## 18. Roles y Permisos

| Módulo | Admin | Gerente | Supervisor | Técnico | Almacenista | Vendedor |
|--------|-------|---------|------------|---------|-------------|----------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Clientes | ✅ | ✅ | ✅ | - | - | ✅ |
| Presupuestos | ✅ | ✅ | ✅ | - | - | ✅ |
| Órdenes | ✅ | ✅ | ✅ | ✅ | - | - |
| Inventario | ✅ | ✅ | ✅ | - | ✅ | - |
| Mantenimientos | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Usuarios | ✅ | ✅ | - | - | - | - |
| Configuración | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
 
