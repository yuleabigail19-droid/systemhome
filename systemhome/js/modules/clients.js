/* ============================================================
   SYSTEMHOME - Módulo Clientess (SH-A01, SH-A03)
   SH-A01: Registro de clientes con nombre, RUC/CI, dirección,
           teléfono, correo y tipo de cliente.
   Validación de campos obligatorios. Estado activo/inactivo.
   SH-A03: Historial completo del cliente con órdenes,
           presupuestos, mantenimientos y pagos. Filtros.
   ============================================================ */

const ClientsModule = {
    currentClientId: null,

    init() {
        this.render();
        this.bindEvents();
    },

    render() {
        const container = document.getElementById('clients-view');
        if (!container) return;

        const clients = DB.getClients();

        container.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="searchClient" placeholder="Buscar cliente por nombre, RUC o teléfono...">
          </div>
          <select class="form-control" id="filterClientStatus" style="width:160px;">
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-primary" onclick="ClientsModule.openModal()">
            ➕ Nuevo Cliente
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Clientes Registrados</h3>
          <span style="font-size:13px;color:var(--gray-500);">Total: <strong>${clients.length}</strong></span>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre / Razón Social</th>
                  <th>RUC/CI</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="clientsTableBody">
                ${this.renderTableRows(clients)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <div class="modal-overlay" id="clientModal">
        <div class="modal">
          <div class="modal-header">
            <h3 id="clientModalTitle">Nuevo Cliente</h3>
            <button class="modal-close" onclick="ClientsModule.closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <form id="clientForm" onsubmit="return false;">
              <input type="hidden" id="clientId" value="">
              <div class="form-row">
                <div class="form-group">
                  <label class="required">Nombre / Razón Social</label>
                  <input type="text" class="form-control" id="clientName" placeholder="Ej: Juan Pérez" required>
                  <div class="form-error" id="err-name">Campo obligatorio</div>
                </div>
                <div class="form-group">
                  <label class="required">RUC / CI</label>
                  <input type="text" class="form-control" id="clientRuc" placeholder="Ej: 1234567-8" required>
                  <div class="form-error" id="err-ruc">Campo obligatorio</div>
                </div>
              </div>
              <div class="form-group">
                <label>Dirección</label>
                <input type="text" class="form-control" id="clientAddress" placeholder="Ej: Av. Principal 123">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="required">Teléfono</label>
                  <input type="text" class="form-control" id="clientPhone" placeholder="Ej: (021) 123-456" required>
                  <div class="form-error" id="err-phone">Campo obligatorio</div>
                </div>
                <div class="form-group">
                  <label>Correo Electrónico</label>
                  <input type="email" class="form-control" id="clientEmail" placeholder="Ej: cliente@email.com">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="required">Tipo de Cliente</label>
                  <select class="form-control" id="clientType" required>
                    <option value="">Seleccionar...</option>
                    <option value="persona">Persona Física</option>
                    <option value="juridica">Persona Jurídica</option>
                    <option value="empresa">Empresa</option>
                  </select>
                  <div class="form-error" id="err-type">Campo obligatorio</div>
                </div>
                <div class="form-group">
                  <label>Estado</label>
                  <div class="form-check" style="margin-top:10px;">
                    <input type="checkbox" id="clientActive" checked>
                    <label style="margin:0;font-weight:400;">Cliente Activo</label>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="ClientsModule.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="ClientsModule.save()">💾 Guardar Cliente</button>
          </div>
        </div>
      </div>
    `;

        // Bind search and filter
        document.getElementById('searchClient')?.addEventListener('input', () => this.filter());
        document.getElementById('filterClientStatus')?.addEventListener('change', () => this.filter());
    },

    renderTableRows(clients) {
        if (clients.length === 0) {
            return `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--gray-500);">
        <div style="font-size:40px;margin-bottom:10px;">👤</div>
        No hay clientes registrados. ¡Crea el primero!
      </td></tr>`;
        }

        return clients.map((c, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${this.escapeHtml(c.name)}</strong></td>
        <td>${this.escapeHtml(c.ruc || '-')}</td>
        <td>${this.escapeHtml(c.phone || '-')}</td>
        <td>${this.escapeHtml(c.email || '-')}</td>
        <td>${this.getTypeLabel(c.type)}</td>
        <td><span class="badge ${c.active ? 'badge-active' : 'badge-inactive'}">
          <span class="dot"></span> ${c.active ? 'Activo' : 'Inactivo'}
        </span></td>
        <td>
          <div class="actions">
            <button class="btn btn-sm btn-secondary" onclick="ClientsModule.edit(${c.id})" title="Editar">✏️</button>
            <button class="btn btn-sm btn-info" onclick="ClientsModule.showHistory(${c.id})" title="Ver historial">📜</button>
            <button class="btn btn-sm btn-${c.active ? 'warning' : 'success'}" 
              onclick="ClientsModule.toggleStatus(${c.id})" title="${c.active ? 'Desactivar' : 'Activar'}">
              ${c.active ? '🔴' : '🟢'}
            </button>
            <button class="btn btn-sm btn-danger" onclick="ClientsModule.confirmDelete(${c.id})" title="Eliminar">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    getTypeLabel(type) {
        const labels = { persona: 'Persona Física', juridica: 'Persona Jurídica', empresa: 'Empresa' };
        return labels[type] || type || '-';
    },

    filter() {
        const search = (document.getElementById('searchClient')?.value || '').toLowerCase();
        const statusFilter = document.getElementById('filterClientStatus')?.value || 'all';

        let clients = DB.getClients();

        if (search) {
            clients = clients.filter(c =>
                (c.name && c.name.toLowerCase().includes(search)) ||
                (c.ruc && c.ruc.toLowerCase().includes(search)) ||
                (c.phone && c.phone.toLowerCase().includes(search)) ||
                (c.email && c.email.toLowerCase().includes(search))
            );
        }

        if (statusFilter === 'active') {
            clients = clients.filter(c => c.active);
        } else if (statusFilter === 'inactive') {
            clients = clients.filter(c => !c.active);
        }

        const tbody = document.getElementById('clientsTableBody');
        if (tbody) {
            tbody.innerHTML = this.renderTableRows(clients);
        }
    },

    openModal(clientId) {
        this.currentClientId = clientId || null;
        const modal = document.getElementById('clientModal');
        const title = document.getElementById('clientModalTitle');

        if (clientId) {
            const client = DB.getClient(clientId);
            if (!client) return;
            title.textContent = 'Editar Cliente';
            document.getElementById('clientId').value = client.id;
            document.getElementById('clientName').value = client.name || '';
            document.getElementById('clientRuc').value = client.ruc || '';
            document.getElementById('clientAddress').value = client.address || '';
            document.getElementById('clientPhone').value = client.phone || '';
            document.getElementById('clientEmail').value = client.email || '';
            document.getElementById('clientType').value = client.type || '';
            document.getElementById('clientActive').checked = client.active !== false;
        } else {
            title.textContent = 'Nuevo Cliente';
            document.getElementById('clientForm').reset();
            document.getElementById('clientId').value = '';
            document.getElementById('clientActive').checked = true;
        }

        // Clear errors
        document.querySelectorAll('.form-error').forEach(el => el.classList.remove('show'));
        document.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));

        modal.classList.add('show');
    },

    closeModal() {
        document.getElementById('clientModal')?.classList.remove('show');
        this.currentClientId = null;
    },

    validate() {
        let valid = true;

        const fields = [
            { id: 'clientName', errId: 'err-name', label: 'Nombre' },
            { id: 'clientRuc', errId: 'err-ruc', label: 'RUC/CI' },
            { id: 'clientPhone', errId: 'err-phone', label: 'Teléfono' },
            { id: 'clientType', errId: 'err-type', label: 'Tipo de cliente' },
        ];

        fields.forEach(f => {
            const el = document.getElementById(f.id);
            const err = document.getElementById(f.errId);
            const val = el ? el.value.trim() : '';

            if (!val) {
                valid = false;
                if (el) el.classList.add('error');
                if (err) err.classList.add('show');
            } else {
                if (el) el.classList.remove('error');
                if (err) err.classList.remove('show');
            }
        });

        // Validate RUC uniqueness
        const ruc = document.getElementById('clientRuc')?.value.trim();
        const excludeId = parseInt(document.getElementById('clientId')?.value) || null;
        if (ruc && DB.isClientDuplicate('ruc', ruc, excludeId)) {
            valid = false;
            const el = document.getElementById('clientRuc');
            const err = document.getElementById('err-ruc');
            if (el) el.classList.add('error');
            if (err) { err.textContent = 'Este RUC/CI ya está registrado'; err.classList.add('show'); }
        }

        return valid;
    },

    save() {
        if (!this.validate()) return;

        const data = {
            name: document.getElementById('clientName').value.trim(),
            ruc: document.getElementById('clientRuc').value.trim(),
            address: document.getElementById('clientAddress').value.trim(),
            phone: document.getElementById('clientPhone').value.trim(),
            email: document.getElementById('clientEmail').value.trim(),
            type: document.getElementById('clientType').value,
            active: document.getElementById('clientActive').checked,
        };

        const id = parseInt(document.getElementById('clientId').value);

        if (id) {
            DB.updateClient(id, data);
            App.showToast('Cliente actualizado correctamente', 'success');
        } else {
            DB.addClient(data);
            App.showToast('Cliente registrado correctamente', 'success');
        }

        this.closeModal();
        this.render();
    },

    edit(id) {
        this.openModal(id);
    },

    toggleStatus(id) {
        const client = DB.getClient(id);
        if (client) {
            DB.updateClient(id, { active: !client.active });
            App.showToast(`Cliente ${client.active ? 'desactivado' : 'activado'} correctamente`, 'success');
            this.render();
        }
    },

    confirmDelete(id) {
        const client = DB.getClient(id);
        if (!client) return;

        if (confirm(`¿Estás seguro de eliminar a "${client.name}"? Esta acción no se puede deshacer.`)) {
            DB.deleteClient(id);
            App.showToast('Cliente eliminado', 'warning');
            this.render();
        }
    },

    // ==================== SH-A03: Historical del Cliente ====================
    showHistory(clientId) {
        const client = DB.getClient(clientId);
        if (!client) return;

        // Fetch history data
        const historyData = DB.getClientHistory(clientId);
        const budgets = (historyData.budgets || []).map(b => ({ ...b, type: 'presupuesto' }));
        const orders = (historyData.orders || []).map(o => ({ ...o, type: 'orden' }));
        const maintenances = (historyData.maintenances || []).map(m => ({ ...m, type: 'mantenimiento' }));
        const historyEvents = (historyData.history || []).map(h => ({
            ...h,
            date: h.created_at,
            type: 'evento'
        }));

        const allItems = [...budgets, ...orders, ...maintenances, ...historyEvents]
            .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));

        const modal = document.createElement('div');
        modal.className = 'modal-overlay show';
        modal.innerHTML = `
      <div class="modal modal-lg" style="max-width:900px;">
        <div class="modal-header">
          <h3>📜 Historial de Cliente: ${this.escapeHtml(client.name)}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div style="background:var(--gray-50);border-radius:var(--radius-md);padding:16px;margin-bottom:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
            <div>
              <strong style="font-size:12px;color:var(--gray-500);display:block;">RUC/CI</strong>
              <span>${this.escapeHtml(client.ruc || '-')}</span>
            </div>
            <div>
              <strong style="font-size:12px;color:var(--gray-500);display:block;">Teléfono</strong>
              <span>${this.escapeHtml(client.phone || '-')}</span>
            </div>
            <div>
              <strong style="font-size:12px;color:var(--gray-500);display:block;">Correo</strong>
              <span>${this.escapeHtml(client.email || '-')}</span>
            </div>
            <div>
              <strong style="font-size:12px;color:var(--gray-500);display:block;">Dirección</strong>
              <span>${this.escapeHtml(client.address || '-')}</span>
            </div>
            <div>
              <strong style="font-size:12px;color:var(--gray-500);display:block;">Tipo</strong>
              <span>${this.getTypeLabel(client.type)}</span>
            </div>
            <div>
              <strong style="font-size:12px;color:var(--gray-500);display:block;">Registrado</strong>
              <span>${DB.formatDate(client.createdAt)}</span>
            </div>
          </div>

          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
            <select class="form-control" id="historyFilterType" style="width:200px;">
              <option value="all">Todos los registros</option>
              <option value="presupuesto">Presupuestos</option>
              <option value="orden">Órdenes de Trabajo</option>
              <option value="mantenimiento">Mantenimientos</option>
              <option value="evento">Eventos del sistema</option>
            </select>
            <input type="date" class="form-control" id="historyFilterDate" style="width:180px;" title="Filtrar desde fecha">
          </div>

          <div id="historyTableContainer">
            ${this.renderHistoryTable(allItems)}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
        </div>
      </div>
    `;
        document.body.appendChild(modal);

        // Bind filter
        document.getElementById('historyFilterType')?.addEventListener('change', () => this.filterHistory());
        document.getElementById('historyFilterDate')?.addEventListener('change', () => this.filterHistory());
    },

    renderHistoryTable(items) {
        if (items.length === 0) {
            return `<div style="text-align:center;padding:40px;color:var(--gray-500);">
                <div style="font-size:36px;margin-bottom:10px;">📭</div>
                No hay registros en el historial de este cliente.
            </div>`;
        }

        return `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Referencia / Descripción</th>
              <th>Detalle</th>
              <th>Fecha</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => {
            const iconMap = { presupuesto: '📋', orden: '🔧', mantenimiento: '🛠️', evento: '📝' };
            const statusMap = {
                borrador: 'badge-borrador', enviado: 'badge-enviado',
                aprobado: 'badge-aprobado', rechazado: 'badge-rechazado',
                pendiente: 'badge-pendiente', ejecucion: 'badge-ejecucion',
                completada: 'badge-completada', programado: 'badge-enviado',
                realizado: 'badge-aprobado', vencido: 'badge-rechazado'
            };
            const labelMap = {
                borrador: 'Borrador', enviado: 'Enviado',
                aprobado: 'Aprobado', rechazado: 'Rechazado',
                pendiente: 'Pendiente', ejecucion: 'En Ejecución',
                completada: 'Completada', programado: 'Programado',
                realizado: 'Realizado', vencido: 'Vencido'
            };
            const typeLabel = { presupuesto: 'Presupuesto', orden: 'Orden', mantenimiento: 'Mantenimiento', evento: 'Evento' };
            const status = item.status || (item.entry_type === 'cliente_creado' ? 'completada' : 'enviado');
            const description = item.description || item.number || '';
            const date = item.created_at || item.date || item.createdAt || '';
            return `
              <tr>
                <td>
                  <span class="badge badge-enviado">
                    <span class="dot"></span> ${iconMap[item.type] || '📝'} ${typeLabel[item.type] || item.type}
                  </span>
                </td>
                <td><strong>${this.escapeHtml(description)}</strong></td>
                <td style="font-size:13px;color:var(--gray-500);">${this.escapeHtml(item.details || item.notes || '')}</td>
                <td>${DB.formatDateTime(date)}</td>
                <td>
                  ${item.type === 'evento' ? '-' : `
                    <span class="badge ${statusMap[status] || 'badge-enviado'}">
                      <span class="dot"></span> ${labelMap[status] || status}
                    </span>
                  `}
                </td>
              </tr>
            `;
        }).join('')}
          </tbody>
        </table>
      </div>
    `;
    },

    filterHistory() {
        const typeFilter = document.getElementById('historyFilterType')?.value || 'all';
        const dateFilter = document.getElementById('historyFilterDate')?.value;

        // Fetch data again (need client ID)
        const clientId = this.currentClientId;
        if (!clientId) return;

        const historyData = DB.getClientHistory(clientId);
        let items = [
            ...(historyData.budgets || []).map(b => ({ ...b, type: 'presupuesto' })),
            ...(historyData.orders || []).map(o => ({ ...o, type: 'orden' })),
            ...(historyData.maintenances || []).map(m => ({ ...m, type: 'mantenimiento' })),
            ...(historyData.history || []).map(h => ({ ...h, date: h.created_at, type: 'evento' })),
        ].sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));

        if (typeFilter !== 'all') {
            items = items.filter(i => i.type === typeFilter);
        }

        if (dateFilter) {
            const filterDate = new Date(dateFilter);
            items = items.filter(i => {
                const d = new Date(i.created_at || i.date || i.createdAt || '');
                return d >= filterDate;
            });
        }

        const container = document.getElementById('historyTableContainer');
        if (container) {
            container.innerHTML = this.renderHistoryTable(items);
        }
    },
};