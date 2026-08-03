/* ============================================================
   SYSTEMHOME - Aplicación Principal
   Sistema Integral de Gestión Comercial y Técnica
   ============================================================ */

/* === CURRENT SESSION === */
let currentUser = null;

/* === AUTH SYSTEM === */
const Auth = {
  getCurrentUser() {
    if (currentUser) return currentUser;
    const stored = localStorage.getItem('sh_current_user');
    if (stored) {
      try {
        currentUser = JSON.parse(stored);
        return currentUser;
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  setCurrentUser(user) {
    currentUser = user;
    localStorage.setItem('sh_current_user', JSON.stringify(user));
  },

  clearCurrentUser() {
    currentUser = null;
    localStorage.removeItem('sh_current_user');
    localStorage.removeItem('sh_token');
  },

  getRoleLabel(role) {
    const value = (role || '').toLowerCase();
    if (value === 'cliente' || value === 'client') return 'Cliente';
    if (value === 'admin') return 'Administrador';
    if (value === 'gerente') return 'Gerente';
    if (value === 'supervisor') return 'Supervisor';
    if (value === 'tecnico') return 'Técnico';
    if (value === 'almacenista') return 'Almacenista';
    if (value === 'vendedor') return 'Vendedor';
    return 'Usuario';
  },

  isClientRole(user) {
    const value = (user?.role || '').toLowerCase();
    return value === 'cliente' || value === 'client';
  },

  handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    if (!username || !password) {
      errorEl.textContent = 'Por favor ingrese usuario y contraseña.';
      errorEl.style.display = 'block';
      return false;
    }

    const user = DB.authenticateUser(username, password);
    if (!user) {
      errorEl.textContent = 'Usuario o contraseña incorrectos.';
      errorEl.style.display = 'block';
      return false;
    }

    errorEl.style.display = 'none';
    this.setCurrentUser(user);
    this.login(user);
    return false;
  },

  login(user) {
    document.getElementById('loginPage').style.display = 'none';
    this.updateUserUI(user);

    if (this.isClientRole(user)) {
      document.getElementById('adminPortal').style.display = 'none';
      document.getElementById('clientPortal').style.display = 'flex';
      ClientPortal.init();
    } else {
      document.getElementById('adminPortal').style.display = 'flex';
      document.getElementById('clientPortal').style.display = 'none';
      App.init();
    }
  },

  logout() {
    if (!confirm('¿Cerrar sesión?')) return;
    this.clearCurrentUser();
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('adminPortal').style.display = 'none';
    document.getElementById('clientPortal').style.display = 'none';
    Auth.showLogin();
    Auth.updateLoginLogo();
  },

  updateUserUI(user) {
    const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
    const sidebarAvatar = document.getElementById('sidebarUserAvatar');
    const sidebarName = document.getElementById('sidebarUserName');
    const sidebarRole = document.getElementById('sidebarUserRole');
    const headerAvatar = document.getElementById('headerUserAvatar');
    const headerName = document.getElementById('headerUserName');
    const headerRole = document.getElementById('headerUserRole');
    const clientNameDisplay = document.getElementById('clientUserNameDisplay');
    const roleLabel = this.getRoleLabel(user.role);

    if (sidebarAvatar) sidebarAvatar.textContent = initial;
    if (sidebarName) sidebarName.textContent = user.name || user.username;
    if (sidebarRole) {
      sidebarRole.textContent = roleLabel;
      sidebarRole.className = 'user-role-badge ' + (this.isClientRole(user) ? 'role-client' : 'role-admin');
    }
    if (headerAvatar) headerAvatar.textContent = initial;
    if (headerName) headerName.textContent = user.name || user.username;
    if (headerRole) headerRole.textContent = this.isClientRole(user) ? 'Cliente' : 'SYSTEMHOME';
    if (clientNameDisplay) clientNameDisplay.textContent = user.name || user.username;
  },

  showRegister() {
    document.getElementById('loginFormContainer').style.display = 'none';
    document.getElementById('registerFormContainer').style.display = 'block';
    document.getElementById('registerError').style.display = 'none';
  },

  showLogin() {
    document.getElementById('loginFormContainer').style.display = 'block';
    document.getElementById('registerFormContainer').style.display = 'none';
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('loginForm').reset();
  },

  handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const errorEl = document.getElementById('registerError');

    if (!name || !email || !username || !password) {
      errorEl.textContent = 'Por favor complete todos los campos obligatorios.';
      errorEl.style.display = 'block';
      return false;
    }

    if (password.length < 6) {
      errorEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
      errorEl.style.display = 'block';
      return false;
    }

    if (password !== confirmPassword) {
      errorEl.textContent = 'Las contraseñas no coinciden.';
      errorEl.style.display = 'block';
      return false;
    }

    if (DB.isUsernameDuplicate(username)) {
      errorEl.textContent = 'El nombre de usuario ya está en uso. Elija otro.';
      errorEl.style.display = 'block';
      return false;
    }

    errorEl.style.display = 'none';

    const newUser = DB.addUser({
      username: username,
      password: password,
      name: name,
      email: email,
      phone: phone,
      role: 'cliente'
    });

    App.showToast('Cuenta creada exitosamente. Ahora puede iniciar sesión.', 'success');
    this.showLogin();
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').style.display = 'none';
    return false;
  },

  updateLoginLogo() {
    const logo = localStorage.getItem('sh_logo');
    const loginLogo = document.getElementById('loginLogoDisplay');
    if (loginLogo) {
      loginLogo.innerHTML = logo ? `<img src="${logo}" alt="SYSTEMHOME">` : '<img src="assets/LOGO.png" alt="SYSTEMHOME">';
    }
  }
};

/* === MAIN APP (Admin) === */
const App = {
  currentView: 'dashboard',

  init() {
    this.loadSettings();
    this.initNavigation();
    this.initModules();
    this.initLogoUpload();
    this.navigate('dashboard');
  },

  loadSettings() {
    const logo = localStorage.getItem('sh_logo') || 'assets/LOGO.png';
    if (logo) {
      document.querySelectorAll('.logo-placeholder, .client-logo-mini').forEach(el => {
        el.innerHTML = `<img src="${logo}" alt="SYSTEMHOME Logo">`;
      });
    }
    Auth.updateLoginLogo();
  },

  initNavigation() {
    const role = (Auth.getCurrentUser()?.role || '').toLowerCase();
    const allowedViews = {
      admin: ['dashboard', 'clients', 'budgets', 'workorders', 'inventory', 'maintenances', 'users', 'settings'],
      gerente: ['dashboard', 'clients', 'budgets', 'workorders', 'inventory', 'maintenances', 'users', 'settings'],
      supervisor: ['dashboard', 'clients', 'budgets', 'workorders', 'inventory', 'maintenances', 'settings'],
      tecnico: ['dashboard', 'workorders', 'maintenances', 'settings'],
      almacenista: ['dashboard', 'inventory', 'maintenances', 'settings'],
      vendedor: ['dashboard', 'clients', 'budgets', 'settings']
    };

    const allowed = allowedViews[role] || [];
    document.querySelectorAll('.nav-item').forEach(item => {
      const view = item.dataset.view;
      item.style.display = allowed.length && view && !allowed.includes(view) ? 'none' : '';
      item.addEventListener('click', (e) => {
        e.preventDefault();
        if (view) this.navigate(view);
      });
    });

    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('open');
      });
    }
  },

  initModules() {
    ClientsModule.init();
    BudgetsModule.init();
    WorkOrdersModule.init();
    InventoryModule.init();
    MaintenancesModule.init();
  },

  navigate(view) {
    this.currentView = view;

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === view);
    });

    // Show/hide sections
    document.querySelectorAll('.view-section').forEach(section => {
      section.classList.toggle('active', section.id === view + '-view');
    });

    // Update header
    const headerTitle = document.getElementById('headerTitle');
    const breadcrumb = document.getElementById('breadcrumb');

    const titles = {
      dashboard: { title: 'Panel de Control', bread: 'Inicio / Dashboard' },
      clients: { title: 'Clientes', bread: 'Gestión / Clientes' },
      budgets: { title: 'Presupuestos', bread: 'Gestión / Presupuestos' },
      workorders: { title: 'Órdenes de Trabajo', bread: 'Operaciones / Órdenes' },
      inventory: { title: 'Inventario', bread: 'Operaciones / Inventario' },
      maintenances: { title: 'Mantenimientos', bread: 'Operaciones / Mantenimientos' },
      users: { title: 'Usuarios del Sistema', bread: 'Sistema / Usuarios' },
      settings: { title: 'Configuración', bread: 'Sistema / Configuración' }
    };

    const info = titles[view] || { title: 'Sistema', bread: 'Inicio' };
    if (headerTitle) headerTitle.textContent = info.title;
    if (breadcrumb) breadcrumb.textContent = info.bread;

    // Refresh specific modules when navigating to them
    if (view === 'dashboard') this.renderDashboard();
    if (view === 'clients') ClientsModule.render();
    if (view === 'budgets') BudgetsModule.render();
    if (view === 'workorders') WorkOrdersModule.render();
    if (view === 'inventory') InventoryModule.render();
    if (view === 'maintenances') MaintenancesModule.render();
    if (view === 'users') this.renderUsers();
    if (view === 'settings') this.renderSettings();
  },

  renderDashboard() {
    const container = document.getElementById('dashboard-view');
    if (!container) return;

    const clients = DB.getClients();
    const budgets = DB.getBudgets();
    const orders = DB.getWorkOrders();
    const inventory = DB.getInventory();
    const maintenances = DB.getMaintenance();

    const activeClients = clients.filter(c => c.active).length;
    const approvedBudgets = budgets.filter(b => b.status === 'aprobado').length;
    const pendingOrders = orders.filter(o => o.status === 'pendiente').length;
    const inProgressOrders = orders.filter(o => o.status === 'ejecucion').length;
    const lowStock = inventory.filter(i => i.stock > 0 && i.stock <= 5).length;
    const pendingMaintenances = maintenances.filter(m => m.status === 'programado').length;

    // Recent activity
    const recentClients = clients.slice(-3).reverse();
    const recentOrders = orders.slice(-3).reverse();

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">👥</div>
          <div class="stat-info">
            <h4>Clientes Activos</h4>
            <div class="stat-number">${activeClients}</div>
            <div class="stat-label">Total: ${clients.length} registrados</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">✅</div>
          <div class="stat-info">
            <h4>Presupuestos Aprobados</h4>
            <div class="stat-number">${approvedBudgets}</div>
            <div class="stat-label">Total: ${budgets.length} creados</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon yellow">🔧</div>
          <div class="stat-info">
            <h4>Órdenes Activas</h4>
            <div class="stat-number">${pendingOrders + inProgressOrders}</div>
            <div class="stat-label">${pendingOrders} pendientes · ${inProgressOrders} en ejecución</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">📦</div>
          <div class="stat-info">
            <h4>Stock Bajo</h4>
            <div class="stat-number">${lowStock}</div>
            <div class="stat-label">Equipos con stock ≤ 5</div>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <h3>🕐 Últimos Clientes</h3>
            <button class="btn btn-sm btn-secondary" onclick="App.navigate('clients')">Ver todos</button>
          </div>
          <div class="card-body" style="padding:0 24px;">
            ${recentClients.length === 0 ? `
              <div style="text-align:center;padding:30px;color:var(--gray-400);">
                No hay clientes registrados aún.
              </div>
            ` : `
              <ul class="recent-list">
                ${recentClients.map(c => `
                  <li>
                    <div class="recent-icon">👤</div>
                    <div class="recent-info">
                      <strong>${this.escapeHtml(c.name)}</strong>
                      <span>${this.escapeHtml(c.phone || '')} · ${DB.formatDate(c.createdAt)}</span>
                    </div>
                    <span class="badge ${c.active ? 'badge-active' : 'badge-inactive'}">
                      <span class="dot"></span> ${c.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </li>
                `).join('')}
              </ul>
            `}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>🔧 Últimas Órdenes</h3>
            <button class="btn btn-sm btn-secondary" onclick="App.navigate('workorders')">Ver todas</button>
          </div>
          <div class="card-body" style="padding:0 24px;">
            ${recentOrders.length === 0 ? `
              <div style="text-align:center;padding:30px;color:var(--gray-400);">
                No hay órdenes de trabajo aún.
              </div>
            ` : `
              <ul class="recent-list">
                ${recentOrders.map(o => {
      const client = DB.getClient(o.clientId);
      const statMap = { pendiente: 'badge-pendiente', ejecucion: 'badge-ejecucion', completada: 'badge-completada' };
      const labelMap = { pendiente: 'Pendiente', ejecucion: 'En Ejecución', completada: 'Completada' };
      return `
                    <li>
                      <div class="recent-icon">🔧</div>
                      <div class="recent-info">
                        <strong>${this.escapeHtml(o.number)}</strong>
                        <span>${client ? this.escapeHtml(client.name) : 'N/A'} · ${DB.formatDate(o.createdAt)}</span>
                      </div>
                      <span class="badge ${statMap[o.status] || 'badge-pendiente'}">
                        <span class="dot"></span> ${labelMap[o.status] || o.status}
                      </span>
                    </li>
                  `;
    }).join('')}
              </ul>
            `}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>📋 Resumen del Sistema</h3>
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;">
            <div style="text-align:center;padding:16px;background:var(--primary-bg);border-radius:var(--radius-md);">
              <div style="font-size:28px;font-weight:700;color:var(--primary);">${clients.length}</div>
              <div style="font-size:13px;color:var(--gray-500);">Total Clientes</div>
            </div>
            <div style="text-align:center;padding:16px;background:var(--success-bg);border-radius:var(--radius-md);">
              <div style="font-size:28px;font-weight:700;color:var(--secondary);">${budgets.length}</div>
              <div style="font-size:13px;color:var(--gray-500);">Total Presupuestos</div>
            </div>
            <div style="text-align:center;padding:16px;background:var(--warning-bg);border-radius:var(--radius-md);">
              <div style="font-size:28px;font-weight:700;color:var(--accent);">${orders.length}</div>
              <div style="font-size:13px;color:var(--gray-500);">Total Órdenes</div>
            </div>
            <div style="text-align:center;padding:16px;background:var(--info-bg);border-radius:var(--radius-md);">
              <div style="font-size:28px;font-weight:700;color:var(--primary);">${inventory.length}</div>
              <div style="font-size:13px;color:var(--gray-500);">Equipos en Inventario</div>
            </div>
            <div style="text-align:center;padding:16px;background:var(--warning-bg);border-radius:var(--radius-md);">
              <div style="font-size:28px;font-weight:700;color:var(--accent);">${pendingMaintenances}</div>
              <div style="font-size:13px;color:var(--gray-500);">Mant. Programados</div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderUsers() {
    const container = document.getElementById('users-view');
    if (!container) return;

    const users = DB.getUsers();

    container.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <h3 style="font-size:16px;font-weight:600;">Usuarios del Sistema</h3>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-primary" onclick="App.showUserModal()">➕ Nuevo Usuario</button>
        </div>
      </div>
      <div class="card">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${users.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align:center;padding:40px;color:var(--gray-400);">
                    No hay usuarios registrados.
                  </td>
                </tr>
              ` : users.map(u => `
                <tr>
                  <td><strong>${this.escapeHtml(u.username)}</strong></td>
                  <td>${this.escapeHtml(u.name || '-')}</td>
                  <td>${this.escapeHtml(u.email || '-')}</td>
                  <td>
                    <span class="badge badge-enviado">
                      <span class="dot"></span> ${Auth.getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td>
                    <span class="badge ${u.active ? 'badge-active' : 'badge-inactive'}">
                      <span class="dot"></span> ${u.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div class="actions">
                      <button class="btn btn-sm btn-secondary" onclick="App.showUserModal(${u.id})">✏️</button>
                      <button class="btn btn-sm ${u.active ? 'btn-warning' : 'btn-success'}" onclick="App.toggleUserStatus(${u.id})">
                        ${u.active ? '🔒' : '🔓'}
                      </button>
                      ${u.id !== Auth.getCurrentUser().id ? `
                        <button class="btn btn-sm btn-danger" onclick="App.deleteUser(${u.id})">🗑️</button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  showUserModal(userId) {
    const user = userId ? DB.getUser(userId) : null;
    const isEditing = !!user;
    const currentUser = Auth.getCurrentUser();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
      <div class="modal" style="max-width:500px;">
        <div class="modal-header">
          <h3>${isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">
          <form id="userForm" onsubmit="return App.saveUser(event, ${userId || 'null'})">
            <div class="form-group">
              <label>Nombre de Usuario</label>
              <input type="text" id="userFormUsername" class="form-control" value="${isEditing ? this.escapeHtml(user.username) : ''}" ${isEditing && userId === currentUser.id ? 'readonly' : ''} required>
            </div>
            <div class="form-group">
              <label>Nombre Completo</label>
              <input type="text" id="userFormName" class="form-control" value="${isEditing ? this.escapeHtml(user.name || '') : ''}">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="userFormEmail" class="form-control" value="${isEditing ? this.escapeHtml(user.email || '') : ''}">
            </div>
            <div class="form-group">
              <label>Rol</label>
              <select id="userFormRole" class="form-control">
                <option value="vendedor" ${isEditing && user.role === 'vendedor' ? 'selected' : ''}>Vendedor</option>
                <option value="supervisor" ${isEditing && user.role === 'supervisor' ? 'selected' : ''}>Supervisor</option>
                <option value="tecnico" ${isEditing && user.role === 'tecnico' ? 'selected' : ''}>Técnico</option>
                <option value="almacenista" ${isEditing && user.role === 'almacenista' ? 'selected' : ''}>Almacenista</option>
                <option value="admin" ${isEditing && user.role === 'admin' ? 'selected' : ''}>Administrador</option>
                <option value="gerente" ${isEditing && user.role === 'gerente' ? 'selected' : ''}>Gerente</option>
                <option value="cliente" ${isEditing && user.role === 'cliente' ? 'selected' : ''}>Cliente</option>
              </select>
            </div>
            ${!isEditing ? `
              <div class="form-group">
                <label>Contraseña</label>
                <input type="password" id="userFormPassword" class="form-control" placeholder="Mínimo 6 caracteres" required minlength="6">
              </div>
            ` : `
              <div class="form-group">
                <label>Nueva Contraseña (dejar en blanco para mantener actual)</label>
                <input type="password" id="userFormPassword" class="form-control" placeholder="Nueva contraseña" minlength="6">
              </div>
            `}
            <div id="userFormError" class="login-error" style="display:none;"></div>
            <div class="modal-footer" style="padding:0;padding-top:16px;border:none;">
              <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
              <button type="submit" class="btn btn-primary">${isEditing ? 'Guardar Cambios' : 'Crear Usuario'}</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  saveUser(event, userId) {
    event.preventDefault();
    const username = document.getElementById('userFormUsername').value.trim();
    const name = document.getElementById('userFormName').value.trim();
    const email = document.getElementById('userFormEmail').value.trim();
    const role = document.getElementById('userFormRole').value;
    const password = document.getElementById('userFormPassword').value;
    const errorEl = document.getElementById('userFormError');

    if (!username) {
      errorEl.textContent = 'El nombre de usuario es obligatorio.';
      errorEl.style.display = 'block';
      return false;
    }

    if (userId) {
      // Editing existing user
      if (DB.isUsernameDuplicate(username, userId)) {
        errorEl.textContent = 'El nombre de usuario ya está en uso.';
        errorEl.style.display = 'block';
        return false;
      }
      const updateData = { username, name, email, role };
      if (password) {
        updateData.password = password;
      }
      DB.updateUser(userId, updateData);
      App.showToast('Usuario actualizado correctamente', 'success');
    } else {
      // New user
      if (DB.isUsernameDuplicate(username)) {
        errorEl.textContent = 'El nombre de usuario ya está en uso.';
        errorEl.style.display = 'block';
        return false;
      }
      if (!password || password.length < 6) {
        errorEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        errorEl.style.display = 'block';
        return false;
      }
      DB.addUserByAdmin({ username, name, email, role, password, phone: '' });
      App.showToast('Usuario creado correctamente', 'success');
    }

    // Close modal
    document.querySelector('.modal-overlay.show').remove();
    this.renderUsers();
    return false;
  },

  toggleUserStatus(userId) {
    const user = DB.getUser(userId);
    if (!user) return;
    const newActive = !user.active;
    const action = newActive ? 'activar' : 'desactivar';
    if (!confirm(`¿Está seguro de ${action} al usuario "${user.username}"?`)) return;
    DB.updateUser(userId, { active: newActive });
    App.showToast(`Usuario ${newActive ? 'activado' : 'desactivado'} correctamente`, 'success');
    this.renderUsers();
  },

  deleteUser(userId) {
    const user = DB.getUser(userId);
    if (!user) return;
    if (!confirm(`¿Está seguro de eliminar al usuario "${user.username}"?\n\nEsta acción no se puede deshacer.`)) return;
    DB.deleteUser(userId);
    App.showToast('Usuario eliminado correctamente', 'info');
    this.renderUsers();
  },

  renderSettings() {
    const container = document.getElementById('settings-view');
    if (!container) return;

    const logo = localStorage.getItem('sh_logo');

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>⚙️ Configuración del Sistema</h3>
        </div>
        <div class="card-body">
          <div style="max-width:600px;">
            <h4 style="font-size:15px;font-weight:600;color:var(--gray-700);margin-bottom:16px;">🏢 Logo de la Empresa</h4>
            <p style="font-size:13px;color:var(--gray-500);margin-bottom:16px;">
              Sube el logo de SYSTEMHOME para mostrarlo en la barra lateral. 
              Formatos recomendados: PNG o JPG, 200x200px máximo.
            </p>
            
            <div class="logo-upload-area" id="logoUploadArea">
              ${logo ? `<img src="${logo}" style="max-width:200px;max-height:200px;border-radius:var(--radius-sm);margin-bottom:10px;" alt="Logo actual">` : `
                <img src="assets/LOGO.png" style="max-width:200px;max-height:200px;border-radius:var(--radius-sm);margin-bottom:10px;" alt="SYSTEMHOME">
              `}
              <p>Haz clic para cambiar el logo <strong>SYSTEMHOME</strong></p>
            </div>
            <input type="file" id="logoFileInput" accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml" style="display:none;">
            
            ${logo ? `
              <button class="btn btn-sm btn-danger" onclick="App.removeLogo()" style="margin-top:12px;">
                🗑️ Eliminar Logo
              </button>
            ` : ''}

            <hr style="margin:30px 0;border:none;border-top:1px solid var(--gray-200);">

            <h4 style="font-size:15px;font-weight:600;color:var(--gray-700);margin-bottom:12px;">🔐 Datos de Acceso</h4>
            <p style="font-size:13px;color:var(--gray-500);margin-bottom:16px;">
              <strong>Administrador por defecto:</strong> Usuario: <code>admin</code> · Contraseña: <code>admin123</code>
            </p>
            <p style="font-size:13px;color:var(--gray-500);margin-bottom:16px;">
              Los usuarios se gestionan desde <a href="#" onclick="App.navigate('users');return false;">Usuarios del Sistema</a>.
            </p>

            <hr style="margin:30px 0;border:none;border-top:1px solid var(--gray-200);">

            <h4 style="font-size:15px;font-weight:600;color:var(--gray-700);margin-bottom:12px;">📋 Acerca de SYSTEMHOME</h4>
            <div style="font-size:13px;color:var(--gray-500);line-height:1.8;">
              <p><strong>Sistema Integral de Gestión Comercial y Técnica</strong></p>
              <p>Versión 3.0.0 - Con Base de Datos SQLite y Autenticación por Roles</p>
              <p>Empresa especializada en venta, instalación y mantenimiento de:</p>
              <p style="margin-top:4px;">
                📷 Cámaras de Vigilancia · ❄️ Aire Acondicionado · 🔔 Sistemas de Alarma<br>
                ⚡ Cercas Eléctricas · 📺 Video Portero · 🔌 Electricidad<br>
                🔗 Cableado Estructurado · 🌐 Redes e Internet
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    this.initLogoUpload();
  },

  initLogoUpload() {
    const uploadArea = document.getElementById('logoUploadArea');
    const fileInput = document.getElementById('logoFileInput');

    if (uploadArea && fileInput) {
      uploadArea.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target.result;
            localStorage.setItem('sh_logo', dataUrl);
            App.showToast('Logo actualizado correctamente', 'success');
            const placeholder = document.querySelector('.logo-placeholder');
            if (placeholder) {
              placeholder.innerHTML = `<img src="${dataUrl}" alt="SYSTEMHOME Logo">`;
            }
            if (App.currentView === 'settings') App.renderSettings();
          };
          reader.readAsDataURL(file);
        }
      });
    }
  },

  removeLogo() {
    if (confirm('¿Eliminar el logo de la empresa y volver al logo predeterminado?')) {
      localStorage.removeItem('sh_logo');
      const placeholders = document.querySelectorAll('.logo-placeholder, .client-logo-mini');
      placeholders.forEach(el => {
        el.innerHTML = `<img src="assets/LOGO.png" alt="SYSTEMHOME">`;
      });
      if (App.currentView === 'settings') App.renderSettings();
      App.showToast('Logo restablecido al predeterminado', 'info');
    }
  },

  exportData() {
    App.showToast('Los datos se guardan en la base de datos SQLite en el servidor', 'info');
  },

  resetData() {
    if (confirm('⚠️ ¿Está seguro de restablecer el sistema?\n\nEsta acción eliminará la base de datos actual y recreará los datos iniciales.\n\nEsta acción NO se puede deshacer.')) {
      if (confirm('¿Está realmente seguro? Toda la información será reemplazada.')) {
        if (confirm('Para restablecer la base de datos: ejecute "python backend/server.py --reset" en la terminal y reinicie el servidor.')) {
          App.showToast('Instrucción mostrada. Reinicie el servidor.', 'warning');
        }
      }
    }
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer') || this.createToastContainer();

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  },
};

// Initialize login page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Auth.updateLoginLogo();

  // Auto-login if session exists
  const user = Auth.getCurrentUser();
  if (user) {
    Auth.login(user);
  }
});