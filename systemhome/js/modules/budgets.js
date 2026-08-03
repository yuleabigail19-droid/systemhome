/* ============================================================
   SYSTEMHOME - Módulo Presupuestos (SH-A02)
   Gestión de presupuestos con servicio, materiales,
   mano de obra y total. Vinculación al cliente.
   Control de estados: borrador, enviado, aprobado, rechazado.
   ============================================================ */

const BudgetsModule = {
    currentBudgetId: null,
    editingIndex: null,

    init() {
        this.render();
    },

    render() {
        const container = document.getElementById('budgets-view');
        if (!container) return;

        const budgets = DB.getBudgets();
        const clients = DB.getClients();

        container.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="searchBudget" placeholder="Buscar presupuesto por N° o cliente...">
          </div>
          <select class="form-control" id="filterBudgetStatus" style="width:160px;">
            <option value="all">Todos los estados</option>
            <option value="borrador">Borrador</option>
            <option value="enviado">Enviado</option>
            <option value="aprobado">Aprobado</option>
            <option value="rechazado">Rechazado</option>
          </select>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-primary" onclick="BudgetsModule.openModal()">
            ➕ Nuevo Presupuesto
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Presupuestos</h3>
          <span style="font-size:13px;color:var(--gray-500);">Total: <strong>${budgets.length}</strong></span>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th>Total</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="budgetsTableBody">
                ${this.renderTableRows(budgets, clients)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <div class="modal-overlay" id="budgetModal">
        <div class="modal modal-lg">
          <div class="modal-header">
            <h3 id="budgetModalTitle">Nuevo Presupuesto</h3>
            <button class="modal-close" onclick="BudgetsModule.closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <form id="budgetForm" onsubmit="return false;">
              <input type="hidden" id="budgetId" value="">
              
              <div class="form-row">
                <div class="form-group">
                  <label class="required">Cliente</label>
                  <select class="form-control" id="budgetClient" required>
                    <option value="">Seleccionar cliente...</option>
                    ${clients.filter(c => c.active).map(c =>
            `<option value="${c.id}">${this.escapeHtml(c.name)} - ${this.escapeHtml(c.ruc || '')}</option>`
        ).join('')}
                  </select>
                  <div class="form-error" id="err-budget-client">Seleccione un cliente</div>
                </div>
                <div class="form-group">
                  <label class="required">Tipo de Servicio</label>
                  <select class="form-control" id="budgetService" required>
                    <option value="">Seleccionar...</option>
                    <option value="camaras">Cámaras de Vigilancia</option>
                    <option value="alarma">Sistemas de Alarma</option>
                    <option value="ac">Aire Acondicionado</option>
                    <option value="cerca">Cerca Eléctrica</option>
                    <option value="video">Video Portero</option>
                    <option value="electricidad">Electricidad</option>
                    <option value="cableado">Cableado Estructurado</option>
                    <option value="redes">Redes e Internet</option>
                    <option value="otro">Otro</option>
                  </select>
                  <div class="form-error" id="err-budget-service">Seleccione un servicio</div>
                </div>
              </div>

              <div class="form-group">
                <label>Descripción del Servicio</label>
                <textarea class="form-control" id="budgetDescription" placeholder="Describa los trabajos a realizar..." rows="3"></textarea>
              </div>

              <div style="margin-top:20px;margin-bottom:16px;">
                <h4 style="font-size:14px;font-weight:600;color:var(--gray-700);margin-bottom:12px;">📋 Líneas del Presupuesto</h4>
                
                <div style="background:var(--gray-50);border-radius:var(--radius-md);padding:16px;margin-bottom:16px;">
                  <div class="form-row-3">
                    <div class="form-group">
                      <label>Concepto</label>
                      <input type="text" class="form-control" id="itemConcept" placeholder="Ej: Cámara HD 1080p">
                    </div>
                    <div class="form-group">
                      <label>Cantidad</label>
                      <input type="number" class="form-control" id="itemQty" value="1" min="1">
                    </div>
                    <div class="form-group">
                      <label>Precio Unit. (GS)</label>
                      <input type="number" class="form-control" id="itemPrice" value="0" min="0">
                    </div>
                  </div>
                  <button class="btn btn-sm btn-secondary" onclick="BudgetsModule.addItem()" style="margin-top:4px;">➕ Agregar línea</button>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th style="width:50%;">Concepto</th>
                      <th>Cant.</th>
                      <th>Precio Unit.</th>
                      <th>Subtotal</th>
                      <th style="width:50px;"></th>
                    </tr>
                  </thead>
                  <tbody id="budgetItemsBody">
                  </tbody>
                </table>
              </div>

              <div class="form-row-3">
                <div class="form-group">
                  <label>Mano de Obra (GS)</label>
                  <input type="number" class="form-control" id="budgetLabor" value="0" min="0">
                </div>
                <div class="form-group">
                  <label>Descuento (GS)</label>
                  <input type="number" class="form-control" id="budgetDiscount" value="0" min="0">
                </div>
                <div class="form-group">
                  <label style="font-size:16px;font-weight:700;color:var(--primary);">Total: <span id="budgetTotalDisplay">0</span> GS</label>
                  <input type="hidden" id="budgetTotal" value="0">
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="BudgetsModule.closeModal()">Cancelar</button>
            <button class="btn btn-secondary" onclick="BudgetsModule.saveDraft()">📄 Guardar Borrador</button>
            <button class="btn btn-primary" onclick="BudgetsModule.saveAndSend()">📨 Guardar y Enviar</button>
          </div>
        </div>
      </div>
    `;

        document.getElementById('searchBudget')?.addEventListener('input', () => this.filter());
        document.getElementById('filterBudgetStatus')?.addEventListener('change', () => this.filter());
    },

    budgetItems: [],

    renderTableRows(budgets, clients) {
        if (budgets.length === 0) {
            return `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--gray-500);">
        <div style="font-size:40px;margin-bottom:10px;">📋</div>
        No hay presupuestos registrados.
      </td></tr>`;
        }

        const getStatusBadge = (status) => {
            const map = {
                borrador: 'badge-borrador',
                enviado: 'badge-enviado',
                aprobado: 'badge-aprobado',
                rechazado: 'badge-rechazado'
            };
            return `<span class="badge ${map[status] || 'badge-borrador'}"><span class="dot"></span> ${status.charAt(0).toUpperCase() + status.slice(1)
                }</span>`;
        };

        return budgets.map(b => {
            const client = clients.find(c => c.id === b.clientId);
            return `<tr>
          <td><strong>${this.escapeHtml(b.number)}</strong></td>
          <td>${client ? this.escapeHtml(client.name) : 'Eliminado'}</td>
          <td>${this.getServiceLabel(b.serviceType)}</td>
          <td><strong>${DB.formatCurrency(b.total || 0)}</strong></td>
          <td>${DB.formatDate(b.createdAt)}</td>
          <td>${getStatusBadge(b.status)}</td>
          <td>
            <div class="actions">
              <button class="btn btn-sm btn-secondary" onclick="BudgetsModule.edit(${b.id})" title="Editar">✏️</button>
              <button class="btn btn-sm btn-secondary" onclick="BudgetsModule.view(${b.id})" title="Ver">👁️</button>
              ${b.status === 'borrador' ? `<button class="btn btn-sm btn-primary" onclick="BudgetsModule.send(${b.id})" title="Enviar">📨</button>` : ''}
              ${b.status === 'enviado' ? `<button class="btn btn-sm btn-success" onclick="BudgetsModule.approve(${b.id})" title="Aprobar">✅</button>` : ''}
              ${b.status === 'enviado' ? `<button class="btn btn-sm btn-danger" onclick="BudgetsModule.reject(${b.id})" title="Rechazar">❌</button>` : ''}
            </div>
          </td>
        </tr>`;
        }).join('');
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    getServiceLabel(type) {
        const map = {
            camaras: 'Cámaras',
            alarma: 'Alarmas',
            ac: 'A/Acondicionado',
            cerca: 'Cerca Eléctrica',
            video: 'Video Portero',
            electricidad: 'Electricidad',
            cableado: 'Cableado Estruct.',
            redes: 'Redes/Internet',
            otro: 'Otro'
        };
        return map[type] || type;
    },

    filter() {
        const search = (document.getElementById('searchBudget')?.value || '').toLowerCase();
        const statusFilter = document.getElementById('filterBudgetStatus')?.value || 'all';
        const clients = DB.getClients();

        let budgets = DB.getBudgets();
        if (search) {
            budgets = budgets.filter(b => {
                const client = clients.find(c => c.id === b.clientId);
                return (b.number && b.number.toLowerCase().includes(search)) ||
                    (client && client.name.toLowerCase().includes(search));
            });
        }
        if (statusFilter !== 'all') {
            budgets = budgets.filter(b => b.status === statusFilter);
        }

        const tbody = document.getElementById('budgetsTableBody');
        if (tbody) tbody.innerHTML = this.renderTableRows(budgets, clients);
    },

    calculateTotal() {
        const itemsTotal = this.budgetItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
        const labor = parseFloat(document.getElementById('budgetLabor')?.value) || 0;
        const discount = parseFloat(document.getElementById('budgetDiscount')?.value) || 0;
        const total = itemsTotal + labor - discount;
        const display = document.getElementById('budgetTotalDisplay');
        if (display) display.textContent = total.toLocaleString('es-PY');
        document.getElementById('budgetTotal').value = total;
        return total;
    },

    addItem() {
        const concept = document.getElementById('itemConcept')?.value.trim();
        const qty = parseInt(document.getElementById('itemQty')?.value) || 1;
        const price = parseFloat(document.getElementById('itemPrice')?.value) || 0;

        if (!concept) {
            App.showToast('Ingrese un concepto para la línea', 'warning');
            return;
        }

        this.budgetItems.push({ concept, qty, price });
        this.renderItems();
        this.calculateTotal();

        // Clear inputs
        document.getElementById('itemConcept').value = '';
        document.getElementById('itemQty').value = '1';
        document.getElementById('itemPrice').value = '0';
    },

    removeItem(index) {
        this.budgetItems.splice(index, 1);
        this.renderItems();
        this.calculateTotal();
    },

    renderItems() {
        const tbody = document.getElementById('budgetItemsBody');
        if (!tbody) return;

        if (this.budgetItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--gray-400);padding:20px;">
            No hay líneas agregadas. Agregue conceptos arriba.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.budgetItems.map((item, i) => `
      <tr>
        <td>${this.escapeHtml(item.concept)}</td>
        <td>${item.qty}</td>
        <td>${DB.formatCurrency(item.price)}</td>
        <td><strong>${DB.formatCurrency(item.qty * item.price)}</strong></td>
        <td><button class="btn btn-sm btn-danger" onclick="BudgetsModule.removeItem(${i})">🗑️</button></td>
      </tr>
    `).join('');
    },

    openModal(budgetId) {
        this.currentBudgetId = budgetId || null;
        this.budgetItems = [];

        const modal = document.getElementById('budgetModal');
        const title = document.getElementById('budgetModalTitle');

        if (budgetId) {
            const budget = DB.getBudget(budgetId);
            if (!budget) return;
            title.textContent = `Editar Presupuesto ${budget.number}`;
            document.getElementById('budgetId').value = budget.id;
            document.getElementById('budgetClient').value = budget.clientId;
            document.getElementById('budgetService').value = budget.serviceType || '';
            document.getElementById('budgetDescription').value = budget.description || '';
            document.getElementById('budgetLabor').value = budget.labor || 0;
            document.getElementById('budgetDiscount').value = budget.discount || 0;
            this.budgetItems = budget.items || [];
            this.renderItems();
            this.calculateTotal();
        } else {
            title.textContent = 'Nuevo Presupuesto';
            document.getElementById('budgetForm').reset();
            document.getElementById('budgetId').value = '';
            this.budgetItems = [];
            this.renderItems();
            this.calculateTotal();
        }

        document.querySelectorAll('.form-error').forEach(el => el.classList.remove('show'));
        document.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));
        modal.classList.add('show');
    },

    closeModal() {
        document.getElementById('budgetModal')?.classList.remove('show');
        this.currentBudgetId = null;
        this.budgetItems = [];
    },

    validate() {
        let valid = true;
        const fields = [
            { id: 'budgetClient', errId: 'err-budget-client' },
            { id: 'budgetService', errId: 'err-budget-service' },
        ];

        fields.forEach(f => {
            const el = document.getElementById(f.id);
            const err = document.getElementById(f.errId);
            if (!el || !el.value) {
                valid = false;
                if (el) el.classList.add('error');
                if (err) err.classList.add('show');
            } else {
                if (el) el.classList.remove('error');
                if (err) err.classList.remove('show');
            }
        });

        return valid;
    },

    getFormData() {
        return {
            clientId: parseInt(document.getElementById('budgetClient').value),
            serviceType: document.getElementById('budgetService').value,
            description: document.getElementById('budgetDescription').value.trim(),
            items: this.budgetItems,
            labor: parseFloat(document.getElementById('budgetLabor').value) || 0,
            discount: parseFloat(document.getElementById('budgetDiscount').value) || 0,
            total: parseFloat(document.getElementById('budgetTotal').value) || 0,
        };
    },

    saveDraft() {
        if (!this.validate()) return;
        const data = this.getFormData();
        data.status = 'borrador';

        const id = parseInt(document.getElementById('budgetId').value);
        if (id) {
            DB.updateBudget(id, data);
            App.showToast('Presupuesto actualizado', 'success');
        } else {
            DB.addBudget(data);
            App.showToast('Presupuesto guardado como borrador', 'success');
        }
        this.closeModal();
        this.render();
    },

    saveAndSend() {
        if (!this.validate()) return;
        const data = this.getFormData();
        data.status = 'enviado';

        const id = parseInt(document.getElementById('budgetId').value);
        if (id) {
            DB.updateBudget(id, data);
            App.showToast('Presupuesto actualizado y enviado', 'success');
        } else {
            DB.addBudget(data);
            App.showToast('Presupuesto creado y enviado al cliente', 'success');
        }
        this.closeModal();
        this.render();
    },

    edit(id) {
        this.openModal(id);
    },

    view(id) {
        const budget = DB.getBudget(id);
        if (!budget) return;
        const client = DB.getClient(budget.clientId);
        App.showToast(`Presupuesto ${budget.number} - Total: ${DB.formatCurrency(budget.total)}`, 'info');
    },

    send(id) {
        if (confirm('¿Enviar este presupuesto al cliente?')) {
            DB.updateBudget(id, { status: 'enviado' });
            App.showToast('Presupuesto enviado al cliente', 'success');
            this.render();
        }
    },

    approve(id) {
        if (confirm('¿Aprobar este presupuesto? Podrá generar una orden de trabajo.')) {
            DB.updateBudget(id, { status: 'aprobado' });
            App.showToast('Presupuesto aprobado', 'success');
            this.render();
        }
    },

    reject(id) {
        if (confirm('¿Rechazar este presupuesto?')) {
            DB.updateBudget(id, { status: 'rechazado' });
            App.showToast('Presupuesto rechazado', 'warning');
            this.render();
        }
    },
};