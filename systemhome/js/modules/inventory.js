/* ============================================================
   SYSTEMHOME - Módulo Inventario (SH-I01)
   Registrar equipos con nombre, categoría, marca, modelo,
   stock disponible y precio. Validar duplicados.
   Descontar stock al usar en orden de trabajo.
   ============================================================ */

const InventoryModule = {
    currentItemId: null,

    init() {
        this.render();
    },

    render() {
        const container = document.getElementById('inventory-view');
        if (!container) return;

        const items = DB.getInventory();

        container.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="searchInventory" placeholder="Buscar equipo por nombre, marca o modelo...">
          </div>
          <select class="form-control" id="filterInventoryCategory" style="width:180px;">
            <option value="all">Todas las categorías</option>
            <option value="camara">Cámaras</option>
            <option value="alarma">Alarmas</option>
            <option value="ac">Aire Acondicionado</option>
            <option value="cerca">Cerca Eléctrica</option>
            <option value="video">Video Portero</option>
            <option value="cable">Cables</option>
            <option value="accesorio">Accesorios</option>
            <option value="herramienta">Herramientas</option>
            <option value="otro">Otros</option>
          </select>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-secondary" onclick="InventoryModule.openImageManager()" title="Gestionar imágenes">
            🖼️ Gestionar Imágenes
          </button>
          <button class="btn btn-primary" onclick="InventoryModule.openModal()">
            ➕ Nuevo Equipo
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Inventario de Equipos</h3>
          <span style="font-size:13px;color:var(--gray-500);">Total: <strong>${items.length}</strong> equipos</span>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Imagen</th>
                  <th>Categoría</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>Stock</th>
                  <th>Precio</th>
                  <th>Catálogo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="inventoryTableBody">
                ${this.renderTableRows(items)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <div class="modal-overlay" id="inventoryModal">
        <div class="modal">
          <div class="modal-header">
            <h3 id="inventoryModalTitle">Nuevo Equipo</h3>
            <button class="modal-close" onclick="InventoryModule.closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <form id="inventoryForm" onsubmit="return false;">
              <input type="hidden" id="inventoryId" value="">
              
              <div class="form-row">
                <div class="form-group">
                  <label class="required">Nombre del Equipo</label>
                  <input type="text" class="form-control" id="invName" placeholder="Ej: Cámara HD 1080p" required>
                  <div class="form-error" id="err-inv-name">Campo obligatorio</div>
                </div>
                <div class="form-group">
                  <label class="required">Categoría</label>
                  <select class="form-control" id="invCategory" required>
                    <option value="">Seleccionar...</option>
                    <option value="camara">Cámaras</option>
                    <option value="alarma">Alarmas</option>
                    <option value="ac">Aire Acondicionado</option>
                    <option value="cerca">Cerca Eléctrica</option>
                    <option value="video">Video Portero</option>
                    <option value="cable">Cables</option>
                    <option value="accesorio">Accesorios</option>
                    <option value="herramienta">Herramientas</option>
                    <option value="otro">Otros</option>
                  </select>
                  <div class="form-error" id="err-inv-category">Campo obligatorio</div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Marca</label>
                  <input type="text" class="form-control" id="invBrand" placeholder="Ej: Hikvision">
                </div>
                <div class="form-group">
                  <label>Modelo</label>
                  <input type="text" class="form-control" id="invModel" placeholder="Ej: DS-2CD1023G0-I">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="required">Stock Disponible</label>
                  <input type="number" class="form-control" id="invStock" value="0" min="0" required>
                  <div class="form-error" id="err-inv-stock">Ingrese un valor válido</div>
                </div>
                <div class="form-group">
                  <label class="required">Precio Unitario (GS)</label>
                  <input type="number" class="form-control" id="invPrice" value="0" min="0" required>
                  <div class="form-error" id="err-inv-price">Ingrese un valor válido</div>
                </div>
              </div>

              <div class="form-group">
                <label>Descripción</label>
                <textarea class="form-control" id="invDescription" placeholder="Características adicionales..." rows="3"></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Etiqueta / Badge (Catálogo)</label>
                  <input type="text" class="form-control" id="invBadge" placeholder="Ej: Más vendido, Oferta, Premium, Popular...">
                  <div class="form-note" style="font-size:12px;color:var(--gray-500);margin-top:6px;">Etiqueta que se muestra en el catálogo del portal de cliente.</div>
                </div>
                <div class="form-group">
                  <label>Mostrar en Catálogo</label>
                  <select class="form-control" id="invShowInCatalog">
                    <option value="1">✅ Sí, mostrar en catálogo</option>
                    <option value="0">❌ No mostrar en catálogo</option>
                  </select>
                  <div class="form-note" style="font-size:12px;color:var(--gray-500);margin-top:6px;">Controla si este producto aparece en el portal de cliente.</div>
                </div>
              </div>

              <div class="form-group">
                <label>Imagen del Equipo</label>
                <input type="file" class="form-control" id="invImage" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp" />
                <div class="image-preview" id="invImagePreviewContainer">
                  <img id="invImagePreview" src="" alt="Vista previa" style="display:none; max-width:100%; height:auto; margin-top:10px; border-radius:8px; border:1px solid #ddd;" />
                </div>
                <div class="form-note" style="font-size:12px;color:var(--gray-500);margin-top:6px;">Sube una imagen para que el equipo se muestre en el catálogo.</div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="InventoryModule.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="InventoryModule.save()">💾 Guardar Equipo</button>
          </div>
        </div>
      </div>
    `;

        /* Image manager modal (hidden by default) */
        container.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="imageManagerModal" style="display:none;">
        <div class="modal">
          <div class="modal-header">
            <h3>Gestionar Imágenes de Inventario</h3>
            <button class="modal-close" onclick="InventoryModule.closeImageManager()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Seleccionar imágenes (múltiples)</label>
              <input type="file" id="bulkImageFiles" accept="image/*" multiple />
              <div class="form-note" style="margin-top:8px;color:var(--gray-500);">Seleccione varias imágenes y asigne cada una a un equipo.</div>
            </div>
            <div id="bulkImageList" style="max-height:300px;overflow:auto;margin-top:12px;"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="InventoryModule.closeImageManager()">Cerrar</button>
            <button class="btn btn-primary" onclick="InventoryModule.uploadAllImages()">Subir todas</button>
          </div>
        </div>
      </div>
        `);

        document.getElementById('searchInventory')?.addEventListener('input', () => this.filter());
        document.getElementById('filterInventoryCategory')?.addEventListener('change', () => this.filter());
        document.getElementById('invImage')?.addEventListener('change', (event) => this.updateImagePreview(event.target));
        document.getElementById('bulkImageFiles')?.addEventListener('change', (e) => this.handleBulkFilesChange(e.target.files));
    },

    renderTableRows(items) {
        if (items.length === 0) {
            return `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--gray-500);">
        <div style="font-size:40px;margin-bottom:10px;">📦</div>
        No hay equipos registrados en el inventario.
      </td></tr>`;
        }

        const getCategoryLabel = (cat) => {
            const map = {
                camara: '📷 Cámaras', alarma: '🔔 Alarmas', ac: '❄️ A/Acond.',
                cerca: '⚡ Cerca Eléc.', video: '📺 Video Portero',
                cable: '🔌 Cables', accesorio: '🔧 Accesorios',
                herramienta: '🛠️ Herramientas', otro: '📦 Otros'
            };
            return map[cat] || cat;
        };

        return items.map((item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${this.escapeHtml(item.name)}</strong></td>
        <td>${item.imageUrl ? `<img src="${item.imageUrl}" alt="${this.escapeHtml(item.name)}" style="max-width:60px;max-height:40px;border-radius:6px;object-fit:cover;">` : '—'}</td>
        <td>${getCategoryLabel(item.category)}</td>
        <td>${this.escapeHtml(item.brand || '-')}</td>
        <td>${this.escapeHtml(item.model || '-')}</td>
        <td>
          <span class="badge ${item.stock > 10 ? 'badge-active' : item.stock > 0 ? 'badge-enviado' : 'badge-rechazado'}">
            <span class="dot"></span> ${item.stock}
          </span>
        </td>
        <td><strong>${DB.formatCurrency(item.price || 0)}</strong></td>
        <td>
          ${item.showInCatalog ? 
            `<span class="badge badge-active"><span class="dot"></span> ${item.badge ? this.escapeHtml(item.badge) : 'Visible'}</span>` : 
            `<span class="badge badge-rechazado"><span class="dot"></span> Oculto</span>`}
        </td>
        <td>
            <div class="actions">
            <button class="btn btn-sm btn-secondary" onclick="InventoryModule.edit(${item.id})" title="Editar">✏️</button>
            <button class="btn btn-sm btn-secondary" onclick="InventoryModule.openImageForItem(${item.id})" title="Editar imagen">🖼️</button>
            <button class="btn btn-sm btn-danger" onclick="InventoryModule.confirmDelete(${item.id})" title="Eliminar">🗑️</button>
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

    filter() {
        const search = (document.getElementById('searchInventory')?.value || '').toLowerCase();
        const catFilter = document.getElementById('filterInventoryCategory')?.value || 'all';

        let items = DB.getInventory();
        if (search) {
            items = items.filter(i =>
                (i.name && i.name.toLowerCase().includes(search)) ||
                (i.brand && i.brand.toLowerCase().includes(search)) ||
                (i.model && i.model.toLowerCase().includes(search))
            );
        }
        if (catFilter !== 'all') {
            items = items.filter(i => i.category === catFilter);
        }

        const tbody = document.getElementById('inventoryTableBody');
        if (tbody) tbody.innerHTML = this.renderTableRows(items);
    },

    openModal(itemId) {
        this.currentItemId = itemId || null;
        const modal = document.getElementById('inventoryModal');
        const title = document.getElementById('inventoryModalTitle');

        if (itemId) {
            const item = DB.getInventoryItem(itemId);
            if (!item) return;
            title.textContent = 'Editar Equipo';
            document.getElementById('inventoryId').value = item.id;
            document.getElementById('invName').value = item.name || '';
            document.getElementById('invCategory').value = item.category || '';
            document.getElementById('invBrand').value = item.brand || '';
            document.getElementById('invModel').value = item.model || '';
            document.getElementById('invStock').value = item.stock || 0;
            document.getElementById('invPrice').value = item.price || 0;
            document.getElementById('invDescription').value = item.description || '';
            document.getElementById('invBadge').value = item.badge || '';
            document.getElementById('invShowInCatalog').value = item.showInCatalog ? '1' : '0';
            document.getElementById('invImage').value = '';
            this.setImagePreview(item.imageUrl || null);
        } else {
            title.textContent = 'Nuevo Equipo';
            document.getElementById('inventoryForm').reset();
            document.getElementById('inventoryId').value = '';
            document.getElementById('invStock').value = 0;
            document.getElementById('invPrice').value = 0;
            document.getElementById('invBadge').value = '';
            document.getElementById('invShowInCatalog').value = '1';
            document.getElementById('invImage').value = '';
            this.setImagePreview(null);
        }

        document.querySelectorAll('.form-error').forEach(el => el.classList.remove('show'));
        document.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));
        modal.classList.add('show');
    },

    closeModal() {
        document.getElementById('inventoryModal')?.classList.remove('show');
        this.currentItemId = null;
    },

    validate() {
        let valid = true;

        const fields = [
            { id: 'invName', errId: 'err-inv-name' },
            { id: 'invCategory', errId: 'err-inv-category' },
            { id: 'invStock', errId: 'err-inv-stock' },
            { id: 'invPrice', errId: 'err-inv-price' },
        ];

        fields.forEach(f => {
            const el = document.getElementById(f.id);
            const err = document.getElementById(f.errId);
            const val = el ? el.value.trim() : '';

            if (!val || (f.id === 'invStock' && parseInt(val) < 0) || (f.id === 'invPrice' && parseFloat(val) < 0)) {
                valid = false;
                if (el) el.classList.add('error');
                if (err) err.classList.add('show');
            } else {
                if (el) el.classList.remove('error');
                if (err) err.classList.remove('show');
            }
        });

        // Validate duplicate name
        const name = document.getElementById('invName')?.value.trim();
        const excludeId = parseInt(document.getElementById('inventoryId')?.value) || null;
        if (name && DB.isInventoryDuplicate('name', name, excludeId)) {
            valid = false;
            const el = document.getElementById('invName');
            const err = document.getElementById('err-inv-name');
            if (el) el.classList.add('error');
            if (err) { err.textContent = 'Ya existe un equipo con este nombre'; err.classList.add('show'); }
        }

        return valid;
    },

    save() {
        if (!this.validate()) return;

        const data = {
            name: document.getElementById('invName').value.trim(),
            category: document.getElementById('invCategory').value,
            brand: document.getElementById('invBrand').value.trim(),
            model: document.getElementById('invModel').value.trim(),
            stock: parseInt(document.getElementById('invStock').value) || 0,
            price: parseFloat(document.getElementById('invPrice').value) || 0,
            description: document.getElementById('invDescription').value.trim(),
            badge: document.getElementById('invBadge')?.value.trim() || '',
            showInCatalog: document.getElementById('invShowInCatalog')?.value === '1',
        };

        const id = parseInt(document.getElementById('inventoryId').value);
        const imageInput = document.getElementById('invImage');
        let savedItem = null;

        if (id) {
            savedItem = DB.updateInventoryItem(id, data);
            if (!savedItem) {
                App.showToast('No se pudo actualizar el equipo', 'error');
                return;
            }
            App.showToast('Equipo actualizado correctamente', 'success');
        } else {
            savedItem = DB.addInventoryItem(data);
            if (!savedItem) {
                App.showToast('No se pudo registrar el equipo', 'error');
                return;
            }
            App.showToast('Equipo registrado en inventario', 'success');
        }

        if (savedItem && imageInput?.files?.length) {
            const uploaded = DB.uploadInventoryItemImage(savedItem.id, imageInput.files[0]);
            if (uploaded) {
                savedItem = uploaded;
                App.showToast('Imagen cargada correctamente', 'success');
            } else {
                App.showToast('No se pudo cargar la imagen', 'error');
            }
        }

        this.closeModal();
        this.render();
    },

    edit(id) {
        this.openModal(id);
    },

    /* ---------- Image manager functions ---------- */
    openImageManager() {
      const modal = document.getElementById('imageManagerModal');
      if (!modal) return;
      // prepare list
      document.getElementById('bulkImageList').innerHTML = '';
      document.getElementById('bulkImageFiles').value = '';
      modal.style.display = 'flex';
    },

    closeImageManager() {
      const modal = document.getElementById('imageManagerModal');
      if (!modal) return;
      modal.style.display = 'none';
    },

    handleBulkFilesChange(files) {
      const list = document.getElementById('bulkImageList');
      if (!list) return;
      const items = DB.getInventory();
      list.innerHTML = '';
      Array.from(files).forEach((file, idx) => {
        const row = document.createElement('div');
        row.className = 'bulk-image-row';
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';
        row.style.padding = '8px 6px';
        row.style.borderBottom = '1px solid var(--gray-100)';

        const thumb = document.createElement('img');
        thumb.src = URL.createObjectURL(file);
        thumb.style.width = '60px';
        thumb.style.height = '40px';
        thumb.style.objectFit = 'cover';
        thumb.style.borderRadius = '6px';

        const select = document.createElement('select');
        select.style.flex = '1';
        select.className = 'form-control';
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = '-- Asignar a equipo --';
        select.appendChild(emptyOpt);
        items.forEach(it => {
          const opt = document.createElement('option');
          opt.value = it.id;
          opt.textContent = `${it.id} — ${it.name}`;
          select.appendChild(opt);
        });

        const btnRemove = document.createElement('button');
        btnRemove.className = 'btn btn-sm btn-danger';
        btnRemove.textContent = 'Quitar';
        btnRemove.onclick = () => { row.remove(); };

        row.appendChild(thumb);
        row.appendChild(select);
        row.appendChild(btnRemove);
        // attach file object for upload
        row._file = file;
        list.appendChild(row);
      });
    },

    uploadAllImages() {
      const list = document.getElementById('bulkImageList');
      if (!list) return;
      const rows = Array.from(list.children);
      if (rows.length === 0) { App.showToast('No hay imágenes seleccionadas', 'warning'); return; }
      let anyFailed = false;
      rows.forEach(row => {
        const sel = row.querySelector('select');
        const file = row._file;
        const itemId = sel ? sel.value : null;
        if (!itemId) return; // skip
        const uploaded = DB.uploadInventoryItemImage(parseInt(itemId), file);
        if (!uploaded) anyFailed = true;
      });
      if (anyFailed) App.showToast('Algunas imágenes no se cargaron correctamente', 'warning');
      else App.showToast('Todas las imágenes se han cargado', 'success');
      this.closeImageManager();
      this.render();
    },

    updateImagePreview(input) {
        if (!input || !input.files || !input.files[0]) {
            this.setImagePreview(null);
            return;
        }
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            this.setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    },

    setImagePreview(src) {
        const img = document.getElementById('invImagePreview');
        if (!img) return;
        if (src) {
            img.src = src;
            img.style.display = 'block';
        } else {
            img.src = '';
            img.style.display = 'none';
        }
    },

    confirmDelete(id) {
        const item = DB.getInventoryItem(id);
        if (!item) return;

        if (confirm(`¿Eliminar "${item.name}" del inventario?`)) {
            // Instead of hard delete, can set stock to 0
            DB.updateInventoryItem(id, { stock: 0 });
            App.showToast('Stock del equipo puesto a 0', 'warning');
            this.render();
        }
    },

    openImageForItem(itemId) {
      // prompt file selection and upload directly for a single item
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files && input.files[0];
        if (!file) return;
        App.showToast('Subiendo imagen...', 'info');
        const uploaded = DB.uploadInventoryItemImage(itemId, file);
        if (uploaded) {
          App.showToast('Imagen actualizada', 'success');
          this.render();
        } else {
          App.showToast('Error al subir imagen', 'error');
        }
      };
      input.click();
    },
};