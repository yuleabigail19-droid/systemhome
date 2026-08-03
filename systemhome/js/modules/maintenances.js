/* ============================================================
   SYSTEMHOME - Módulo Mantenimientos (SH-M01)
   Programar mantenimientos preventivos y correctivos.
   Estados: programado, realizado, vencido.
   ============================================================ */

const MaintenancesModule = {
    currentMaintenanceId: null,

    init() {
        this.render();
    },

    render() {
        const container = document.getElementById('maintenances-view');
        if (!container) return;

        const maintenances = DB.getMaintenance();
        const clients = DB.getClients();
        const inventory = DB.getInventory();

        container.innerHTML = `
        <div class="toolbar">
            <div class="toolbar-left">
                <div class="search-box">
                    <span class="search-icon">🔍</span>
                    <input type="text" id="searchMaintenance" placeholder="Buscar mantenimiento por cliente o descripción...">
                </div>
                <select class="form-control" id="filterMaintenanceStatus" style="width:160px;">
                    <option value="all">Todos los estados</option>
                    <option value="programado">Programado</option>
                    <option value="realizado">Realizado</option>
                    <option value="vencido">Vencido</option>
                </select>
            </div>
            <div class="toolbar-right">
                <button class="btn btn-primary" onclick="MaintenancesModule.openModal()">
                    ➕ Programar Mantenimiento
                </button>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3>Mantenimientos</h3>
                <span style="font-size:13px;color:var(--gray-500);">Total: <strong>${maintenances.length}</strong></span>
            </div>
            <div class="card-body" style="padding:0;">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Cliente</th>
                                <th>Equipo</th>
                                <th>Tipo</th>
                                <th>Fecha Próx.</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="maintenancesTableBody">
                            ${this.renderTableRows(maintenances, clients, inventory)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Modal -->
        <div class="modal-overlay" id="maintenanceModal">
            <div class="modal">
                <div class="modal-header">
                    <h3 id="maintenanceModalTitle">Programar Mantenimiento</h3>
                    <button class="modal-close" onclick="MaintenancesModule.closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <form id="maintenanceForm" onsubmit="return false;">
                        <input type="hidden" id="maintenanceId" value="">

                        <div class="form-group">
                            <label class="required">Cliente</label>
                            <select class="form-control" id="maintenanceClient" required>
                                <option value="">Seleccionar cliente...</option>
                                ${clients.filter(c => c.active).map(c =>
                                    `<option value="${c.id}">${this.escapeHtml(c.name)} - ${this.escapeHtml(c.ruc || '')}</option>`
                                ).join('')}
                            </select>
                            <div class="form-error" id="err-maint-client">Seleccione un cliente</div>
                        </div>

                        <div class="form-group">
                            <label class="required">Equipo / Material</label>
                            <select class="form-control" id="maintenanceInventory" required>
                                <option value="">Seleccionar equipo...</option>
                                ${inventory.map(i =>
                                    `<option value="${i.id}">${this.escapeHtml(i.name)} - ${this.escapeHtml(i.brand || '')} ${this.escapeHtml(i.model || '')}</option>`
                                ).join('')}
                            </select>
                            <div class="form-error" id="err-maint-inventory">Seleccione un equipo</div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="required">Fecha Próximo Mantenimiento</label>
                                <input type="date" class="form-control" id="maintenanceDate" required>
                                <div class="form-error" id="err-maint-date">Seleccione una fecha</div>
                            </div>
                            <div class="form-group">
                                <label class="required">Tipo de Mantenimiento</label>
                                <select class="form-control" id="maintenanceType" required>
                                    <option value="">Seleccionar...</option>
                                    <option value="preventivo">Preventivo</option>
                                    <option value="correctivo">Correctivo</option>
                                </select>
                                <div class="form-error" id="err-maint-type">Seleccione un tipo</div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Descripción</label>
                            <textarea class="form-control" id="maintenanceDescription" placeholder="Detalle del mantenimiento a realizar..." rows="3"></textarea>
                        </div>

                        <div class="form-group">
                            <label>Notas</label>
                            <textarea class="form-control" id="maintenanceNotes" placeholder="Observaciones, resultados, etc..." rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="MaintenancesModule.closeModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="MaintenancesModule.save()">💾 Guardar Mantenimiento</button>
                </div>
            </div>
        </div>
    `;

        document.getElementById('searchMaintenance')?.addEventListener('input', () => this.filter());
        document.getElementById('filterMaintenanceStatus')?.addEventListener('change', () => this.filter());
    },

    renderTableRows(maintenances, clients, inventory) {
        if (maintenances.length === 0) {
            return `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--gray-500);">
                <div style="font-size:40px;margin-bottom:10px;">🛠️</div>
                No hay mantenimientos programados.
            </td></tr>`;
        }

        return maintenances.map((m, i) => {
            const client = clients.find(c => c.id === m.clientId);
            const item = inventory.find(inv => inv.id === m.inventoryItemId);
            const isOverdue = m.status === 'programado' && m.nextMaintenanceDate && new Date(m.nextMaintenanceDate) < new Date();
            const effectiveStatus = isOverdue ? 'vencido' : m.status;
            const statusLabel = { programado: 'Programado', realizado: 'Realizado', vencido: 'Vencido' };
            const statusClass = { programado: 'badge-enviado', realizado: 'badge-aprobado', vencido: 'badge-rechazado' };

            return `<tr>
                <td>${i + 1}</td>
                <td><strong>${client ? this.escapeHtml(client.name) : 'Eliminado'}</strong></td>
                <td>${item ? this.escapeHtml(item.name) : '-'}</td>
                <td>${m.maintenanceType === 'preventivo' ? '🛡️ Preventivo' : '🔧 Correctivo'}</td>
                <td>${DB.formatDate(m.nextMaintenanceDate)}</td>
                <td><span class="badge ${statusClass[effectiveStatus]}"><span class="dot"></span> ${statusLabel[effectiveStatus]}</span></td>
                <td>
                    <div class="actions">
                        <button class="btn btn-sm btn-secondary" onclick="MaintenancesModule.edit(${m.id})" title="Editar">✏️</button>
                        ${m.status === 'programado' ? `
                            <button class="btn btn-sm btn-success" onclick="MaintenancesModule.markDone(${m.id})" title="Marcar realizado">✅</button>
                        ` : ''}
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

    filter() {
        const search = (document.getElementById('searchMaintenance')?.value || '').toLowerCase();
        const statusFilter = document.getElementById('filterMaintenanceStatus')?.value || 'all';
        const clients = DB.getClients();
        const inventory = DB.getInventory();

        let maintenances = DB.getMaintenance();
        if (search) {
            maintenances = maintenances.filter(m => {
                const client = clients.find(c => c.id === m.clientId);
                return (client && client.name.toLowerCase().includes(search)) ||
                    (m.description && m.description.toLowerCase().includes(search));
            });
        }
        if (statusFilter !== 'all') {
            maintenances = maintenances.filter(m => {
                const isOverdue = m.status === 'programado' && m.nextMaintenanceDate && new Date(m.nextMaintenanceDate) < new Date();
                const effectiveStatus = isOverdue ? 'vencido' : m.status;
                return effectiveStatus === statusFilter;
            });
        }

        const tbody = document.getElementById('maintenancesTableBody');
        if (tbody) tbody.innerHTML = this.renderTableRows(maintenances, clients, inventory);
    },

    openModal(maintenanceId) {
        this.currentMaintenanceId = maintenanceId || null;
        const modal = document.getElementById('maintenanceModal');
        const title = document.getElementById('maintenanceModalTitle');

        if (maintenanceId) {
            const m = DB.getMaintenance().find(x => x.id === maintenanceId);
            if (!m) return;
            title.textContent = 'Editar Mantenimiento';
            document.getElementById('maintenanceId').value = m.id;
            document.getElementById('maintenanceClient').value = m.clientId || '';
            document.getElementById('maintenanceInventory').value = m.inventoryItemId || '';
            document.getElementById('maintenanceDate').value = m.nextMaintenanceDate ? m.nextMaintenanceDate.split('T')[0] : '';
            document.getElementById('maintenanceType').value = m.maintenanceType || '';
            document.getElementById('maintenanceDescription').value = m.description || '';
            document.getElementById('maintenanceNotes').value = m.notes || '';
        } else {
            title.textContent = 'Programar Mantenimiento';
            document.getElementById('maintenanceForm').reset();
            document.getElementById('maintenanceId').value = '';
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 30);
            document.getElementById('maintenanceDate').value = tomorrow.toISOString().split('T')[0];
        }

        document.querySelectorAll('.form-error').forEach(el => el.classList.remove('show'));
        document.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));
        modal.classList.add('show');
    },

    closeModal() {
        document.getElementById('maintenanceModal')?.classList.remove('show');
        this.currentMaintenanceId = null;
    },

    validate() {
        let valid = true;
        const fields = [
            { id: 'maintenanceClient', errId: 'err-maint-client' },
            { id: 'maintenanceInventory', errId: 'err-maint-inventory' },
            { id: 'maintenanceDate', errId: 'err-maint-date' },
            { id: 'maintenanceType', errId: 'err-maint-type' },
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

    save() {
        if (!this.validate()) return;

        const data = {
            clientId: parseInt(document.getElementById('maintenanceClient').value),
            inventoryItemId: parseInt(document.getElementById('maintenanceInventory').value),
            nextMaintenanceDate: document.getElementById('maintenanceDate').value,
            maintenanceType: document.getElementById('maintenanceType').value,
            description: document.getElementById('maintenanceDescription').value.trim(),
            notes: document.getElementById('maintenanceNotes').value.trim(),
            status: 'programado',
        };

        const id = parseInt(document.getElementById('maintenanceId').value);
        if (id) {
            DB.updateMaintenance(id, data);
            App.showToast('Mantenimiento actualizado correctamente', 'success');
        } else {
            DB.addMaintenance(data);
            App.showToast('Mantenimiento programado correctamente', 'success');
        }

        this.closeModal();
        this.render();
    },

    edit(id) {
        this.openModal(id);
    },

    markDone(id) {
        if (confirm('¿Registrar este mantenimiento como realizado?')) {
            const explanation = prompt('Notas / resultado del mantenimiento realizado:');
            DB.updateMaintenance(id, { status: 'realizado', notes: explanation || '' });
            App.showToast('Mantenimiento registrado como realizado', 'success');
            this.render();
        }
    },
};