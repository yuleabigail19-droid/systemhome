/* ============================================================
   SYSTEMHOME - Módulo Órdenes de Trabajo (SH-O01, SH-O02, SH-O03, SH-O04)
   SH-O01: Generar orden desde presupuesto aprobado.
   SH-O02: Asignar técnico disponible. Actualizar estado.
   SH-O03: Cierre de orden con materiales consumidos y firma.
   SH-O04: Historial de órdenes con filtros y detalle completo.
   ============================================================ */

const WorkOrdersModule = {
    currentOrderId: null,
    observations: [],
    closureMaterials: [],

    init() {
        this.render();
        this.ensureTechs();
    },

    ensureTechs() {
        // Seed some technicians if none exist
        if (DB.getTechnicians().length === 0) {
            const techs = [
                { name: 'Carlos Mendoza', phone: '(0981) 123-456', specialty: 'Cámaras, Alarmas', email: 'carlos@systemhome.com' },
                { name: 'Ana López', phone: '(0981) 789-012', specialty: 'A/Acondicionado, Electricidad', email: 'ana@systemhome.com' },
                { name: 'Pedro Ramírez', phone: '(0981) 345-678', specialty: 'Redes, Cableado', email: 'pedro@systemhome.com' },
            ];
            techs.forEach(t => DB.addTechnician(t));
        }
    },

    render() {
        const container = document.getElementById('workorders-view');
        if (!container) return;

        const orders = DB.getWorkOrders();
        const clients = DB.getClients();
        const techs = DB.getTechnicians();

        container.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="searchOrder" placeholder="Buscar orden por N° o cliente...">
          </div>
          <select class="form-control" id="filterOrderStatus" style="width:170px;">
            <option value="all">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="ejecucion">En Ejecución</option>
            <option value="completada">Completada</option>
          </select>
          <select class="form-control" id="filterOrderTech" style="width:170px;">
            <option value="all">Todos los técnicos</option>
            ${techs.map(t => `<option value="${t.id}">${this.escapeHtml(t.name)}</option>`).join('')}
          </select>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-secondary" onclick="WorkOrdersModule.exportHistory()">📄 Exportar Historial</button>
          <button class="btn btn-primary" onclick="WorkOrdersModule.openModal()">
            ➕ Nueva Orden
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Órdenes de Trabajo</h3>
          <span style="font-size:13px;color:var(--gray-500);">Total: <strong>${orders.length}</strong></span>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th>Técnico</th>
                  <th>Prioridad</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="ordersTableBody">
                ${this.renderTableRows(orders, clients, techs)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <div class="modal-overlay" id="orderModal">
        <div class="modal modal-lg">
          <div class="modal-header">
            <h3 id="orderModalTitle">Nueva Orden de Trabajo</h3>
            <button class="modal-close" onclick="WorkOrdersModule.closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <form id="orderForm" onsubmit="return false;">
              <input type="hidden" id="orderId" value="">
              
              <div class="form-row">
                <div class="form-group">
                  <label class="required">Presupuesto Aprobado</label>
                  <select class="form-control" id="orderBudget" required>
                    <option value="">Seleccionar presupuesto aprobado...</option>
                    ${DB.getBudgets().filter(b => b.status === 'aprobado').map(b => {
            const client = clients.find(c => c.id === b.clientId);
            return `<option value="${b.id}">${b.number} - ${client ? this.escapeHtml(client.name) : 'N/A'} - ${DB.formatCurrency(b.total)}</option>`;
        }).join('')}
                  </select>
                  <div class="form-error" id="err-order-budget">Seleccione un presupuesto</div>
                </div>
                <div class="form-group">
                  <label class="required">Técnico Responsable</label>
                  <select class="form-control" id="orderTechnician" required>
                    <option value="">Seleccionar técnico...</option>
                    ${techs.filter(t => t.active).map(t =>
            `<option value="${t.id}">${this.escapeHtml(t.name)} - ${this.escapeHtml(t.specialty || '')}</option>`
        ).join('')}
                  </select>
                  <div class="form-error" id="err-order-tech">Seleccione un técnico</div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="required">Tipo de Servicio</label>
                  <select class="form-control" id="orderService" required>
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
                  <div class="form-error" id="err-order-service">Seleccione un servicio</div>
                </div>
                <div class="form-group">
                  <label class="required">Prioridad</label>
                  <select class="form-control" id="orderPriority" required>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="required">Fecha Programada</label>
                  <input type="date" class="form-control" id="orderDate" required>
                  <div class="form-error" id="err-order-date">Seleccione una fecha</div>
                </div>
                <div class="form-group">
                  <label>Estado</label>
                  <select class="form-control" id="orderStatus">
                    <option value="pendiente">Pendiente</option>
                    <option value="ejecucion">En Ejecución</option>
                    <option value="completada">Completada</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="required">Descripción del Trabajo</label>
                <textarea class="form-control" id="orderDescription" placeholder="Describa detalladamente los trabajos a realizar..." rows="4" required></textarea>
                <div class="form-error" id="err-order-desc">Ingrese una descripción</div>
              </div>

              <div class="form-group" id="observationGroup" style="display:none;">
                <label>Observaciones del Técnico</label>
                <textarea class="form-control" id="orderObservations" placeholder="Registre observaciones del trabajo realizado..." rows="3"></textarea>
                <button class="btn btn-sm btn-secondary" onclick="WorkOrdersModule.addObservation()" style="margin-top:8px;">➕ Agregar Observación</button>
                <div id="observationsList" style="margin-top:8px;"></div>
              </div>

              <div class="form-group" id="closureGroup" style="display:none;">
                <label>📦 Materiales Utilizados (SH-O03)</label>
                <div style="background:var(--gray-50);border-radius:var(--radius-md);padding:14px;margin-bottom:12px;">
                  <div class="form-row">
                    <div class="form-group" style="margin-bottom:8px;">
                      <label>Material</label>
                      <select class="form-control" id="closureMaterialSelect">
                        <option value="">Seleccionar material del inventario...</option>
                        ${DB.getInventory().filter(i => i.stock > 0).map(i =>
            `<option value="${i.id}">${this.escapeHtml(i.name)} - Stock: ${i.stock}</option>`
        ).join('')}
                      </select>
                    </div>
                    <div class="form-group" style="margin-bottom:8px;">
                      <label>Cantidad</label>
                      <input type="number" class="form-control" id="closureMaterialQty" value="1" min="1">
                    </div>
                  </div>
                  <button class="btn btn-sm btn-secondary" onclick="WorkOrdersModule.addClosureMaterial()">➕ Agregar Material</button>
                </div>
                <div id="closureMaterialsList" style="margin-top:8px;"></div>
              </div>

              <div class="form-group" id="signatureGroup" style="display:none;">
                <label>✍️ Confirmación del Cliente</label>
                <input type="text" class="form-control" id="closureClientName" placeholder="Nombre del cliente que confirma la entrega">
                <input type="text" class="form-control" id="closureClientSignature" placeholder="Firma del cliente (texto)" style="margin-top:8px;">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="WorkOrdersModule.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="WorkOrdersModule.save()">💾 Guardar Orden</button>
          </div>
        </div>
      </div>

      <!-- Detail Modal -->
      <div class="modal-overlay" id="orderDetailModal">
        <div class="modal modal-lg">
          <div class="modal-header">
            <h3 id="orderDetailTitle">Detalle de Orden</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').classList.remove('show')">✕</button>
          </div>
          <div class="modal-body" id="orderDetailBody"></div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').classList.remove('show')">Cerrar</button>
          </div>
        </div>
      </div>
    `;

        // Bind events
        document.getElementById('searchOrder')?.addEventListener('input', () => this.filter());
        document.getElementById('filterOrderStatus')?.addEventListener('change', () => this.filter());
        document.getElementById('filterOrderTech')?.addEventListener('change', () => this.filter());
        document.getElementById('orderStatus')?.addEventListener('change', (e) => {
            const obsGroup = document.getElementById('observationGroup');
            const closureGroup = document.getElementById('closureGroup');
            const signatureGroup = document.getElementById('signatureGroup');
            if (obsGroup) obsGroup.style.display = e.target.value === 'completada' ? 'block' : 'none';
            if (closureGroup) closureGroup.style.display = e.target.value === 'completada' ? 'block' : 'none';
            if (signatureGroup) signatureGroup.style.display = e.target.value === 'completada' ? 'block' : 'none';
        });
        document.getElementById('orderBudget')?.addEventListener('change', (e) => {
            this.onBudgetChange(e.target.value);
        });

        // Set default date to tomorrow
        const dateInput = document.getElementById('orderDate');
        if (dateInput) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateInput.value = tomorrow.toISOString().split('T')[0];
        }
    },

    onBudgetChange(budgetId) {
        if (!budgetId) return;
        const budget = DB.getBudget(parseInt(budgetId));
        if (budget) {
            const serviceSelect = document.getElementById('orderService');
            if (serviceSelect && budget.serviceType) {
                serviceSelect.value = budget.serviceType;
            }
            const descEl = document.getElementById('orderDescription');
            if (descEl && budget.description) {
                descEl.value = budget.description;
            }
        }
    },

    renderTableRows(orders, clients, techs) {
        if (orders.length === 0) {
            return `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--gray-500);">
        <div style="font-size:40px;margin-bottom:10px;">🔧</div>
        No hay órdenes de trabajo registradas.
      </td></tr>`;
        }

        const getStatusBadge = (status) => {
            const map = {
                pendiente: 'badge-pendiente',
                ejecucion: 'badge-ejecucion',
                completada: 'badge-completada'
            };
            const labels = { pendiente: 'Pendiente', ejecucion: 'En Ejecución', completada: 'Completada' };
            return `<span class="badge ${map[status] || 'badge-pendiente'}"><span class="dot"></span> ${labels[status] || status}</span>`;
        };

        const getPriorityLabel = (p) => {
            const icons = { normal: '🔵', alta: '🟡', urgente: '🔴' };
            return `${icons[p] || '🔵'} ${p ? p.charAt(0).toUpperCase() + p.slice(1) : 'Normal'}`;
        };

        return orders.map(o => {
            const client = clients.find(c => c.id === o.clientId);
            const tech = techs.find(t => t.id === o.technicianId);
            return `<tr>
          <td><strong>${this.escapeHtml(o.number)}</strong></td>
          <td>${client ? this.escapeHtml(client.name) : 'Eliminado'}</td>
          <td>${this.getServiceLabel(o.serviceType)}</td>
          <td>${tech ? this.escapeHtml(tech.name) : 'Sin asignar'}</td>
          <td>${getPriorityLabel(o.priority)}</td>
          <td>${DB.formatDate(o.scheduledDate)}</td>
          <td>${getStatusBadge(o.status)}</td>
          <td>
            <div class="actions">
              <button class="btn btn-sm btn-secondary" onclick="WorkOrdersModule.viewDetail(${o.id})" title="Ver detalle">👁️</button>
              <button class="btn btn-sm btn-secondary" onclick="WorkOrdersModule.edit(${o.id})" title="Editar">✏️</button>
              ${o.status === 'pendiente' ? `<button class="btn btn-sm btn-primary" onclick="WorkOrdersModule.start(${o.id})" title="Iniciar">▶️</button>` : ''}
              ${o.status === 'ejecucion' ? `<button class="btn btn-sm btn-success" onclick="WorkOrdersModule.complete(${o.id})" title="Completar">✅</button>` : ''}
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
            camaras: 'Cámaras', alarma: 'Alarmas', ac: 'A/Acond.',
            cerca: 'Cerca Eléc.', video: 'Video Portero',
            electricidad: 'Electricidad', cableado: 'Cableado',
            redes: 'Redes/Internet', otro: 'Otro'
        };
        return map[type] || type;
    },

    filter() {
        const search = (document.getElementById('searchOrder')?.value || '').toLowerCase();
        const statusFilter = document.getElementById('filterOrderStatus')?.value || 'all';
        const techFilter = document.getElementById('filterOrderTech')?.value || 'all';
        const clients = DB.getClients();

        let orders = DB.getWorkOrders();
        if (search) {
            orders = orders.filter(o => {
                const client = clients.find(c => c.id === o.clientId);
                return (o.number && o.number.toLowerCase().includes(search)) ||
                    (client && client.name.toLowerCase().includes(search));
            });
        }
        if (statusFilter !== 'all') {
            orders = orders.filter(o => o.status === statusFilter);
        }
        if (techFilter !== 'all') {
            orders = orders.filter(o => o.technicianId === parseInt(techFilter));
        }

        const tbody = document.getElementById('ordersTableBody');
        if (tbody) tbody.innerHTML = this.renderTableRows(orders, clients, DB.getTechnicians());
    },

    openModal(orderId) {
        this.currentOrderId = orderId || null;
        this.observations = [];
        this.closureMaterials = [];

        const modal = document.getElementById('orderModal');
        const title = document.getElementById('orderModalTitle');
        const obsGroup = document.getElementById('observationGroup');
        const closureGroup = document.getElementById('closureGroup');
        const signatureGroup = document.getElementById('signatureGroup');

        if (orderId) {
            const order = DB.getWorkOrder(orderId);
            if (!order) return;
            title.textContent = `Editar ${order.number}`;
            document.getElementById('orderId').value = order.id;
            document.getElementById('orderBudget').value = order.budgetId || '';
            document.getElementById('orderTechnician').value = order.technicianId || '';
            document.getElementById('orderService').value = order.serviceType || '';
            document.getElementById('orderPriority').value = order.priority || 'normal';
            document.getElementById('orderDate').value = order.scheduledDate ? order.scheduledDate.split('T')[0] : '';
            document.getElementById('orderStatus').value = order.status || 'pendiente';
            document.getElementById('orderDescription').value = order.description || '';
            this.observations = order.observations || [];
            this.renderObservations();

            if (obsGroup) obsGroup.style.display = order.status === 'completada' ? 'block' : 'none';
            if (closureGroup) closureGroup.style.display = order.status === 'completada' ? 'block' : 'none';
            if (signatureGroup) signatureGroup.style.display = order.status === 'completada' ? 'block' : 'none';
        } else {
            title.textContent = 'Nueva Orden de Trabajo';
            document.getElementById('orderForm').reset();
            document.getElementById('orderId').value = '';
            document.getElementById('orderPriority').value = 'normal';
            document.getElementById('orderStatus').value = 'pendiente';
            if (obsGroup) obsGroup.style.display = 'none';
            if (closureGroup) closureGroup.style.display = 'none';
            if (signatureGroup) signatureGroup.style.display = 'none';
            this.observations = [];
            this.renderObservations();

            // Default date tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateInput = document.getElementById('orderDate');
            if (dateInput) dateInput.value = tomorrow.toISOString().split('T')[0];
        }

        document.querySelectorAll('.form-error').forEach(el => el.classList.remove('show'));
        document.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));
        modal.classList.add('show');
    },

    closeModal() {
        document.getElementById('orderModal')?.classList.remove('show');
        this.currentOrderId = null;
        this.observations = [];
        this.closureMaterials = [];
    },

    validate() {
        let valid = true;
        const fields = [
            { id: 'orderBudget', errId: 'err-order-budget' },
            { id: 'orderTechnician', errId: 'err-order-tech' },
            { id: 'orderService', errId: 'err-order-service' },
            { id: 'orderDate', errId: 'err-order-date' },
            { id: 'orderDescription', errId: 'err-order-desc' },
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

        return valid;
    },

    addObservation() {
        const text = document.getElementById('orderObservations')?.value.trim();
        if (!text) {
            App.showToast('Escriba una observación', 'warning');
            return;
        }
        this.observations.push({
            text,
            date: new Date().toISOString(),
            author: 'Admin'
        });
        document.getElementById('orderObservations').value = '';
        this.renderObservations();
        App.showToast('Observación agregada', 'success');
    },

    renderObservations() {
        const list = document.getElementById('observationsList');
        if (!list) return;

        if (this.observations.length === 0) {
            list.innerHTML = '';
            return;
        }

        list.innerHTML = this.observations.map((obs, i) => `
      <div style="background:var(--gray-50);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:6px;
                  border-left:3px solid var(--primary);font-size:13px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <strong>${this.escapeHtml(obs.author)}</strong>
          <span style="color:var(--gray-400);font-size:11px;">${DB.formatDateTime(obs.date)}</span>
        </div>
        <p style="color:var(--gray-700);">${this.escapeHtml(obs.text)}</p>
        <button class="btn btn-sm btn-danger" onclick="WorkOrdersModule.removeObservation(${i})" style="padding:2px 8px;font-size:11px;margin-top:4px;">🗑️</button>
      </div>
    `).join('');
    },

    removeObservation(index) {
        this.observations.splice(index, 1);
        this.renderObservations();
    },

    // ====== SH-O03: Closure Materials ======
    addClosureMaterial() {
        const select = document.getElementById('closureMaterialSelect');
        const qtyInput = document.getElementById('closureMaterialQty');
        const itemId = parseInt(select?.value);
        const qty = parseInt(qtyInput?.value) || 1;

        if (!itemId) {
            App.showToast('Seleccione un material', 'warning');
            return;
        }

        const item = DB.getInventoryItem(itemId);
        if (!item) {
            App.showToast('Material no encontrado', 'error');
            return;
        }

        if (qty <= 0 || qty > item.stock) {
            App.showToast(`Stock insuficiente. Disponible: ${item.stock}`, 'error');
            return;
        }

        this.closureMaterials.push({ itemId, quantity: qty, name: item.name });
        this.renderClosureMaterials();
        if (qtyInput) qtyInput.value = '1';
        if (select) select.value = '';
        App.showToast('Material agregado', 'success');
    },

    renderClosureMaterials() {
        const list = document.getElementById('closureMaterialsList');
        if (!list) return;

        if (this.closureMaterials.length === 0) {
            list.innerHTML = '';
            return;
        }

        list.innerHTML = this.closureMaterials.map((mat, i) => `
      <div style="background:var(--gray-50);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:6px;
                  border-left:3px solid var(--secondary);font-size:13px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong>${this.escapeHtml(mat.name)}</strong>
          <span style="color:var(--gray-500);"> × ${mat.quantity}</span>
        </div>
        <button class="btn btn-sm btn-danger" onclick="WorkOrdersModule.removeClosureMaterial(${i})" style="padding:2px 8px;font-size:11px;">🗑️</button>
      </div>
    `).join('');
    },

    removeClosureMaterial(index) {
        this.closureMaterials.splice(index, 1);
        this.renderClosureMaterials();
    },

    save() {
        if (!this.validate()) return;

        const budgetId = parseInt(document.getElementById('orderBudget').value);
        const budget = DB.getBudget(budgetId);
        const orderId = parseInt(document.getElementById('orderId').value);
        const isCompleting = document.getElementById('orderStatus').value === 'completada';

        const data = {
            budgetId: budgetId,
            clientId: budget ? budget.clientId : null,
            technicianId: parseInt(document.getElementById('orderTechnician').value),
            serviceType: document.getElementById('orderService').value,
            priority: document.getElementById('orderPriority').value,
            scheduledDate: document.getElementById('orderDate').value,
            status: document.getElementById('orderStatus').value,
            description: document.getElementById('orderDescription').value.trim(),
            observations: this.observations,
        };

        if (orderId) {
            DB.updateWorkOrder(orderId, data);
            App.showToast('Orden actualizada correctamente', 'success');
        } else {
            DB.addWorkOrder(data);
            App.showToast('Orden de trabajo creada correctamente', 'success');
        }

        // If completing a new order, close it with materials
        if (isCompleting && this.closureMaterials.length > 0) {
            const clientName = document.getElementById('closureClientName')?.value.trim() || '';
            const signature = document.getElementById('closureClientSignature')?.value.trim() || '';
            const finalOrder = DB.getWorkOrders()[0];
            if (finalOrder) {
                DB.completeWorkOrder(finalOrder.id, this.closureMaterials);
                App.showToast('Orden cerrada con materiales descontados del inventario', 'success');
            }
        }

        this.closeModal();
        this.render();
    },

    edit(id) {
        this.openModal(id);
    },

    start(id) {
        if (confirm('¿Iniciar esta orden de trabajo?')) {
            DB.startWorkOrder(id);
            App.showToast('Orden en ejecución', 'success');
            this.render();
        }
    },

    complete(id) {
        const order = DB.getWorkOrder(id);
        if (!order) return;

        // Open modal with status set to completion
        this.openModal(id);
        document.getElementById('orderStatus').value = 'completada';
        const obsGroup = document.getElementById('observationGroup');
        const closureGroup = document.getElementById('closureGroup');
        const signatureGroup = document.getElementById('signatureGroup');
        if (obsGroup) obsGroup.style.display = 'block';
        if (closureGroup) closureGroup.style.display = 'block';
        if (signatureGroup) signatureGroup.style.display = 'block';
        App.showToast('Complete los datos y guarde para cerrar la orden', 'info');
    },

    // ====== SH-O04: Detail & History ======
    viewDetail(id) {
        const order = DB.getWorkOrder(id);
        if (!order) return;
        const client = DB.getClient(order.clientId);
        const tech = DB.getTechnicians().find(t => t.id === order.technicianId);
        const budget = DB.getBudget(order.budgetId);

        const modal = document.getElementById('orderDetailModal');
        const title = document.getElementById('orderDetailTitle');
        const body = document.getElementById('orderDetailBody');

        title.textContent = `Detalle de ${order.number}`;

        const statusMap = { pendiente: 'badge-pendiente', ejecucion: 'badge-ejecucion', completada: 'badge-completada' };
        const statusLabel = { pendiente: 'Pendiente', ejecucion: 'En Ejecución', completada: 'Completada' };

        body.innerHTML = `
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:20px;">
            <div style="background:var(--gray-50);border-radius:var(--radius-md);padding:14px;">
              <strong style="font-size:12px;color:var(--gray-500);display:block;">Cliente</strong>
              <span>${client ? this.escapeHtml(client.name) : 'N/A'}</span>
            </div>
            <div style="background:var(--gray-50);border-radius:var(--radius-md);padding:14px;">
              <strong style="font-size:12px;color:var(--gray-500);display:block;">Técnico</strong>
              <span>${tech ? this.escapeHtml(tech.name) : 'Sin asignar'}</span>
            </div>
            <div style="background:var(--gray-50);border-radius:var(--radius-md);padding:14px;">
              <strong style="font-size:12px;color:var(--gray-500);display:block;">Servicio</strong>
              <span>${this.getServiceLabel(order.serviceType)}</span>
            </div>
            <div style="background:var(--gray-50);border-radius:var(--radius-md);padding:14px;">
              <strong style="font-size:12px;color:var(--gray-500);display:block;">Prioridad</strong>
              <span>${order.priority || 'normal'}</span>
            </div>
            <div style="background:var(--gray-50);border-radius:var(--radius-md);padding:14px;">
              <strong style="font-size:12px;color:var(--gray-500);display:block;">Fecha Programada</strong>
              <span>${DB.formatDate(order.scheduledDate)}</span>
            </div>
            <div style="background:var(--gray-50);border-radius:var(--radius-md);padding:14px;">
              <strong style="font-size:12px;color:var(--gray-500);display:block;">Estado</strong>
              <span class="badge ${statusMap[order.status]}"><span class="dot"></span> ${statusLabel[order.status]}</span>
            </div>
          </div>

          <div style="margin-bottom:20px;">
            <strong style="font-size:13px;color:var(--gray-700);display:block;margin-bottom:6px;">Descripción del Trabajo</strong>
            <p style="font-size:14px;color:var(--gray-700);background:var(--gray-50);padding:14px;border-radius:var(--radius-md);">${this.escapeHtml(order.description || 'Sin descripción')}</p>
          </div>

          ${budget ? `
            <div style="margin-bottom:20px;">
              <strong style="font-size:13px;color:var(--gray-700);display:block;margin-bottom:6px;">Presupuesto Vinculado</strong>
              <p style="font-size:14px;color:var(--gray-700);background:var(--gray-50);padding:14px;border-radius:var(--radius-md);">
                ${this.escapeHtml(budget.number)} - Total: ${DB.formatCurrency(budget.total)}
              </p>
            </div>
          ` : ''}

          <div style="margin-bottom:20px;">
            <strong style="font-size:13px;color:var(--gray-700);display:block;margin-bottom:6px;">Observaciones del Técnico</strong>
            ${(order.observations || []).length === 0 ? `
              <p style="font-size:14px;color:var(--gray-500);">Sin observaciones registradas.</p>
            ` : `
              ${order.observations.map(obs => `
                <div style="background:var(--gray-50);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:6px;border-left:3px solid var(--primary);font-size:13px;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <strong>${this.escapeHtml(obs.author)}</strong>
                    <span style="color:var(--gray-400);font-size:11px;">${DB.formatDateTime(obs.date)}</span>
                  </div>
                  <p style="color:var(--gray-700);">${this.escapeHtml(obs.text)}</p>
                </div>
              `).join('')}
            `}
          </div>

          ${order.closedAt ? `
            <div style="background:var(--success-bg);border-radius:var(--radius-md);padding:14px;text-align:center;">
              <strong style="color:var(--secondary-dark);">✅ Orden cerrada el ${DB.formatDateTime(order.closedAt)}</strong>
            </div>
          ` : ''}
        `;

        modal.classList.add('show');
    },

    exportHistory() {
        const orders = DB.getWorkOrders();
        const clients = DB.getClients();
        const techs = DB.getTechnicians();

        let text = '=== HISTORIAL DE ÓRDENES DE TRABAJO - SYSTEMHOME ===\n';
        text += `Generado: ${new Date().toLocaleString('es-PY')}\n`;
        text += `Total de órdenes: ${orders.length}\n\n`;

        orders.forEach((o, i) => {
            const client = clients.find(c => c.id === o.clientId);
            const tech = techs.find(t => t.id === o.technicianId);
            text += `--- Orden ${i + 1}: ${o.number} ---\n`;
            text += `Cliente: ${client ? client.name : 'N/A'}\n`;
            text += `Técnico: ${tech ? tech.name : 'Sin asignar'}\n`;
            text += `Servicio: ${o.serviceType || 'N/A'}\n`;
            text += `Prioridad: ${o.priority || 'normal'}\n`;
            text += `Fecha: ${DB.formatDate(o.scheduledDate)}\n`;
            text += `Estado: ${o.status}\n`;
            text += `Descripción: ${o.description || ''}\n`;
            text += `Creada: ${DB.formatDateTime(o.createdAt)}\n`;
            if (o.closedAt) text += `Cerrada: ${DB.formatDateTime(o.closedAt)}\n`;
            text += '\n';
        });

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `historial_ordenes_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        App.showToast('Historial de órdenes exportado', 'success');
    },
};