/* ============================================================
   SYSTEMHOME - Data Store (Backend API)
   ============================================================ */

const DB = {
  _baseUrl: '/api',
  _token: null,

  _getToken() {
    if (this._token) return this._token;
    const stored = localStorage.getItem('sh_token');
    if (stored) {
      this._token = stored;
      return stored;
    }
    return null;
  },

  _setToken(token) {
    this._token = token;
    if (token) localStorage.setItem('sh_token', token);
    else localStorage.removeItem('sh_token');
  },

  _request(method, path, body = null) {
    const token = this._getToken();
    const xhr = new XMLHttpRequest();
    xhr.open(method, this._baseUrl + path, false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(body ? JSON.stringify(body) : null);

    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        return xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch (e) {
        return {};
      }
    }

    if (xhr.status === 401 && path !== '/auth/login' && path !== '/auth/register') {
      localStorage.removeItem('sh_current_user');
      localStorage.removeItem('sh_token');
      this._token = null;
    }

    return null;
  },

  // --- Users / Authentication ---
  getUsers() {
    const result = this._request('GET', '/users');
    return result?.users || [];
  },

  saveUsers(users) {
    return users;
  },

  getUser(id) {
    const users = this.getUsers();
    return users.find(u => u.id === id) || null;
  },

  getUserByUsername(username) {
    const users = this.getUsers();
    return users.find(u => u.username === username) || null;
  },

  getNextUserId() {
    const users = this.getUsers();
    if (users.length === 0) return 1;
    return Math.max(...users.map(u => u.id)) + 1;
  },

  addUser(user) {
    const result = this._request('POST', '/auth/register', user);
    if (result?.token) this._setToken(result.token);
    return result?.user || null;
  },

  updateUser(id, data) {
    const result = this._request('PUT', `/users/${id}`, data);
    return result?.user || null;
  },

  deleteUser(id) {
    return this._request('DELETE', `/users/${id}`);
  },

  addUserByAdmin(data) {
    const result = this._request('POST', '/users', data);
    return result?.user || null;
  },

  isUsernameDuplicate(username, excludeId) {
    const result = this._request('GET', `/auth/check-username?username=${encodeURIComponent(username)}`);
    return result?.exists || false;
  },

  authenticateUser(username, password) {
    const result = this._request('POST', '/auth/login', { username, password });
    if (result?.token) this._setToken(result.token);
    return result?.user || null;
  },

  // --- Clients ---
  getClients() {
    const result = this._request('GET', '/clients');
    return result?.clients || [];
  },

  saveClients(clients) {
    return clients;
  },

  getNextClientId() {
    const clients = this.getClients();
    if (clients.length === 0) return 1;
    return Math.max(...clients.map(c => c.id)) + 1;
  },

  addClient(client) {
    const result = this._request('POST', '/clients', client);
    return result?.client || null;
  },

  updateClient(id, data) {
    const result = this._request('PUT', `/clients/${id}`, data);
    return result?.client || null;
  },

  deleteClient(id) {
    return this._request('DELETE', `/clients/${id}`);
  },

  getClient(id) {
    const clients = this.getClients();
    return clients.find(c => c.id === id) || null;
  },

  isClientDuplicate(field, value, excludeId) {
    const clients = this.getClients();
    return clients.some(c => c[field] === value && c.id !== excludeId);
  },

  // --- Budgets ---
  getBudgets() {
    const result = this._request('GET', '/budgets');
    return result?.budgets || [];
  },

  saveBudgets(budgets) {
    return budgets;
  },

  getNextBudgetId() {
    const budgets = this.getBudgets();
    if (budgets.length === 0) return 1;
    return Math.max(...budgets.map(b => b.id)) + 1;
  },

  addBudget(budget) {
    const result = this._request('POST', '/budgets', budget);
    return result?.budget || null;
  },

  updateBudget(id, data) {
    const result = this._request('PUT', `/budgets/${id}`, data);
    return result?.budget || null;
  },

  getBudget(id) {
    const budgets = this.getBudgets();
    return budgets.find(b => b.id === id) || null;
  },

  approveBudget(id) {
    const result = this._request('POST', `/budgets/${id}/approve`);
    return result?.budget || null;
  },

  rejectBudget(id) {
    const result = this._request('POST', `/budgets/${id}/reject`);
    return result?.budget || null;
  },

  exportBudget(id) {
    const token = this._getToken();
    const link = document.createElement('a');
    link.href = `${this._baseUrl}/budgets/${id}/export`;
    link.target = '_blank';
    if (token) link.href += `?token=${encodeURIComponent(token)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // --- Work Orders ---
  getWorkOrders() {
    const result = this._request('GET', '/workorders');
    return result?.workOrders || [];
  },

  saveWorkOrders(orders) {
    return orders;
  },

  getNextWorkOrderId() {
    const orders = this.getWorkOrders();
    if (orders.length === 0) return 1;
    return Math.max(...orders.map(o => o.id)) + 1;
  },

  addWorkOrder(order) {
    const result = this._request('POST', '/workorders', order);
    return result?.workOrder || null;
  },

  updateWorkOrder(id, data) {
    const result = this._request('PUT', `/workorders/${id}`, data);
    return result?.workOrder || null;
  },

  getWorkOrder(id) {
    const orders = this.getWorkOrders();
    return orders.find(o => o.id === id) || null;
  },

  startWorkOrder(id) {
    const result = this._request('POST', `/workorders/${id}/start`);
    return result?.workOrder || null;
  },

  completeWorkOrder(id, materials = []) {
    const result = this._request('POST', `/workorders/${id}/complete`, { materials });
    return result?.workOrder || null;
  },

  // --- Technicians ---
  getTechnicians() {
    const result = this._request('GET', '/technicians');
    return result?.technicians || [];
  },

  saveTechnicians(techs) {
    return techs;
  },

  getNextTechnicianId() {
    const techs = this.getTechnicians();
    if (techs.length === 0) return 1;
    return Math.max(...techs.map(t => t.id)) + 1;
  },

  addTechnician(tech) {
    return tech;
  },

  getAvailableTechnicians() {
    const techs = this.getTechnicians();
    return techs.filter(t => t.active);
  },

  // --- Inventory ---
  getInventory() {
    const result = this._request('GET', '/inventory');
    return result?.inventory || [];
  },

  saveInventory(items) {
    return items;
  },

  getNextInventoryId() {
    const items = this.getInventory();
    if (items.length === 0) return 1;
    return Math.max(...items.map(i => i.id)) + 1;
  },

  addInventoryItem(item) {
    const result = this._request('POST', '/inventory', item);
    return result?.inventoryItem || null;
  },

  updateInventoryItem(id, data) {
    const result = this._request('PUT', `/inventory/${id}`, data);
    return result?.inventoryItem || null;
  },

  uploadInventoryItemImage(itemId, file) {
    const token = this._getToken();
    const formData = new FormData();
    formData.append('image', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', this._baseUrl + `/inventory/${itemId}/image`, false);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        const response = JSON.parse(xhr.responseText);
        return response?.inventoryItem || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  getInventoryItem(id) {
    const items = this.getInventory();
    return items.find(i => i.id === id) || null;
  },

  isInventoryDuplicate(field, value, excludeId) {
    const items = this.getInventory();
    return items.some(i => i[field] === value && i.id !== excludeId);
  },

  deductStock(itemId, quantity) {
    const result = this._request('POST', '/inventory/movements', {
      itemId,
      movementType: 'salida',
      quantity,
      notes: 'Consumo desde sistema'
    });
    return !!result;
  },

  getInventoryMovements() {
    const result = this._request('GET', '/inventory/movements');
    return result?.movements || [];
  },

  getClientHistory(id) {
    const result = this._request('GET', `/clients/${id}/history`);
    return result || {};
  },

  getMaintenance() {
    const result = this._request('GET', '/maintenances');
    return result?.maintenances || [];
  },

  addMaintenance(data) {
    const result = this._request('POST', '/maintenances', data);
    return result?.maintenance || null;
  },

  updateMaintenance(id, data) {
    const result = this._request('PUT', `/maintenances/${id}`, data);
    return result?.maintenance || null;
  },

  // --- Utility ---
  formatCurrency(amount) {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-PY', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-PY', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
  }
};