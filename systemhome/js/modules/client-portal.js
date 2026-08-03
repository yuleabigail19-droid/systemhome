/* ============================================================
   SYSTEMHOME - Portal del Cliente
   Bienvenida con logo, catálogo de productos/servicios,
   y solicitudes de servicio
   ============================================================ */

const ClientPortal = {
    currentView: 'welcome',

    init() {
        this.render();
    },

    render() {
        this.renderWelcome();
        this.renderCatalog();
        this.renderRequests();
    },

    navigate(view) {
        this.currentView = view;
        document.querySelectorAll('.client-section').forEach(s => s.classList.remove('active'));
        const section = document.getElementById('client-' + view + '-view');
        if (section) section.classList.add('active');

        document.querySelectorAll('.client-nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.clientview === view);
        });
    },

    renderWelcome() {
        const container = document.getElementById('client-welcome-view');
        if (!container) return;

        const logo = localStorage.getItem('sh_logo');

        container.innerHTML = `
        <div class="client-welcome">
            <div class="welcome-logo" id="clientWelcomeLogo" style="width:180px;height:180px;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, var(--primary), var(--primary-dark));border-radius:50%;box-shadow:0 8px 24px rgba(0,0,0,0.15);overflow:hidden;">
                ${logo ? `<img src="${logo}" alt="SYSTEMHOME" style="width:100%;height:100%;object-fit:cover;">` : '<span style="font-size:48px;font-weight:800;color:white;">SH</span>'}
            </div>
            <h2 style="font-size:28px;font-weight:800;color:var(--gray-900);margin-bottom:12px;">Bienvenido a SYSTEMHOME</h2>
            <p style="font-size:16px;line-height:1.7;color:var(--gray-600);max-width:700px;margin:0 auto 8px;">
                Somos una empresa dedicada a brindar <strong>soluciones integrales en seguridad, tecnología y servicios eléctricos</strong>,
                ofreciendo productos de calidad e instalaciones profesionales para proteger tu hogar, negocio o empresa.
            </p>
            <div style="margin-top:16px;display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
                <a href="tel:64595762" class="btn btn-primary" style="gap:8px;">
                    📞 <strong>64595762</strong>
                </a>
                <button class="btn btn-secondary" onclick="ClientPortal.navigate('catalog')" style="gap:8px;">
                    🛒 Ver Catálogo
                </button>
            </div>
        </div>

        <div class="client-services-grid">
            <div class="client-service-card">
                <div class="service-icon">📷</div>
                <h4>Cámaras de Vigilancia</h4>
                <p>Sistemas de videovigilancia HD, IP, inalámbricas y grabación 24/7 para tu protección.</p>
            </div>
            <div class="client-service-card">
                <div class="service-icon">❄️</div>
                <h4>Aire Acondicionado</h4>
                <p>Venta e instalación de equipos de aire acondicionado residencial y comercial.</p>
            </div>
            <div class="client-service-card">
                <div class="service-icon">🔔</div>
                <h4>Sistemas de Alarma</h4>
                <p>Alarmas contra intrusos, sensores de movimiento y monitoreo inteligente.</p>
            </div>
            <div class="client-service-card">
                <div class="service-icon">⚡</div>
                <h4>Cercas Eléctricas</h4>
                <p>Cercas de seguridad perimetral con sensores y alertas en tiempo real.</p>
            </div>
            <div class="client-service-card">
                <div class="service-icon">📺</div>
                <h4>Video Portero</h4>
                <p>Sistemas de video portero con pantalla táctil, audio bidireccional y acceso remoto.</p>
            </div>
            <div class="client-service-card">
                <div class="service-icon">🔌</div>
                <h4>Electricidad</h4>
                <p>Instalaciones eléctricas residenciales, comerciales e industriales.</p>
            </div>
            <div class="client-service-card">
                <div class="service-icon">🔗</div>
                <h4>Cableado Estructurado</h4>
                <p>Cableado profesional para datos, voz, video y redes corporativas.</p>
            </div>
            <div class="client-service-card">
                <div class="service-icon">🌐</div>
                <h4>Redes e Internet</h4>
                <p>Redes WiFi, fibra óptica, servidores e infraestructura de conectividad.</p>
            </div>
        </div>
        `;
    },

    renderCatalog() {
        const container = document.getElementById('client-catalog-view');
        if (!container) return;

        // Get catalog from inventory (admin-controlled)
        const catalog = DB.getCatalog();

        const categories = [
            { id: 'camara', label: '📷 Cámaras' },
            { id: 'alarma', label: '🔔 Alarmas' },
            { id: 'ac', label: '❄️ A/Acondicionado' },
            { id: 'cerca', label: '⚡ Cercas' },
            { id: 'video', label: '📺 Video Portero' },
            { id: 'cable', label: '🔌 Cables' },
            { id: 'accesorio', label: '🔧 Accesorios' },
            { id: 'herramienta', label: '🛠️ Herramientas' },
            { id: 'otro', label: '📦 Otros' },
        ];

        const currentCat = this.currentCatalogFilter || 'all';

        container.innerHTML = `
        <div class="catalog-header">
            <h2>📦 Catálogo de Productos</h2>
            <p>Explora nuestra amplia gama de productos para seguridad, confort y conectividad.</p>
        </div>

        <div class="catalog-categories" id="catalogCategories">
            <button class="catalog-cat-btn ${currentCat === 'all' ? 'active' : ''}" onclick="ClientPortal.filterCatalog('all')">Todos</button>
            ${categories.map(c => `
                <button class="catalog-cat-btn ${currentCat === c.id ? 'active' : ''}" 
                        onclick="ClientPortal.filterCatalog('${c.id}')">${c.label}</button>
            `).join('')}
        </div>

        <div class="catalog-grid" id="catalogGrid">
            ${this.renderCatalogItems(catalog, currentCat)}
        </div>
        `;
    },

    currentCatalogFilter: 'all',

    filterCatalog(category) {
        this.currentCatalogFilter = category;
        this.renderCatalog();
    },

    renderCatalogItems(catalog, filter) {
        let items = filter === 'all' ? catalog : catalog.filter(i => i.category === filter);

        if (items.length === 0) {
            return `<div style="text-align:center;padding:60px 20px;color:var(--gray-500);grid-column:1/-1;">
                <div style="font-size:40px;margin-bottom:12px;">📭</div>
                <h3 style="margin-bottom:6px;">No hay productos en esta categoría</h3>
                <p style="font-size:14px;">Pronto estaremos agregando más productos.</p>
            </div>`;
        }

        const categoryIcons = {
            camara: '📷', alarma: '🔔', ac: '❄️', cerca: '⚡',
            video: '📺', cable: '🔌', accesorio: '🔧', herramienta: '🛠️', otro: '📦'
        };

        return items.map(item => `
        <div class="catalog-item">
            <div class="catalog-item-img" style="background:linear-gradient(135deg, var(--gray-100), var(--gray-200));">
                ${item.badge ? `<span class="cat-badge">${this.escapeHtml(item.badge)}</span>` : ''}
                ${item.imageUrl ? 
                    `<img src="${item.imageUrl}" alt="${this.escapeHtml(item.name)}" style="max-width:100%;max-height:120px;object-fit:cover;border-radius:8px;">` : 
                    `<span style="font-size:64px;">${categoryIcons[item.category] || '📦'}</span>`}
            </div>
            <div class="catalog-item-info">
                <h4>${this.escapeHtml(item.name)}</h4>
                <div class="item-brand">${this.escapeHtml(item.brand || '')}${item.model ? ' · ' + this.escapeHtml(item.model) : ''}</div>
                <div class="item-desc">${this.escapeHtml(item.description || '')}</div>
                <div class="item-price">${DB.formatCurrency(item.price || 0)}</div>
                <div class="item-cta">
                    <button class="btn btn-sm btn-primary" onclick="ClientPortal.requestProduct('${this.escapeHtml(item.name)}')">
                        📝 Solicitar Cotización
                    </button>
                </div>
            </div>
        </div>
        `).join('');
    },

    requestProduct(productName) {
        this.navigate('requests');
        // Pre-fill the description
        const desc = document.getElementById('clientRequestDesc');
        if (desc) {
            desc.value = `Cotización para: ${productName}\n\n`;
            desc.focus();
        }
        App.showToast(`Cotización solicitada para: ${productName}`, 'info');
    },

    renderRequests() {
        const container = document.getElementById('client-requests-view');
        if (!container) return;

        const requests = DB.getBudgets().filter(b => b.source === 'client').reverse();

        container.innerHTML = `
        <div style="margin-bottom:24px;">
            <h2 style="font-size:22px;font-weight:700;color:var(--gray-900);">📝 Solicitar Servicio</h2>
            <p style="font-size:14px;color:var(--gray-500);margin-top:4px;">
                Complete el formulario para solicitar una cotización o servicio personalizado.
            </p>
        </div>

        <div class="client-request-form">
            <h3>Nueva Solicitud</h3>
            <form id="clientRequestForm" onsubmit="return false;">
                <div class="form-row">
                    <div class="form-group">
                        <label class="required">Nombre Completo</label>
                        <input type="text" class="form-control" id="clientReqName" placeholder="Su nombre completo" required>
                    </div>
                    <div class="form-group">
                        <label class="required">Teléfono / Celular</label>
                        <input type="text" class="form-control" id="clientReqPhone" placeholder="Ej: (0981) 123-456" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Correo Electrónico</label>
                        <input type="email" class="form-control" id="clientReqEmail" placeholder="correo@ejemplo.com">
                    </div>
                    <div class="form-group">
                        <label class="required">Tipo de Servicio</label>
                        <select class="form-control" id="clientReqService" required>
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
                    </div>
                </div>
                <div class="form-group">
                    <label class="required">Descripción de lo que necesita</label>
                    <textarea class="form-control" id="clientRequestDesc" rows="4" 
                        placeholder="Describa detalladamente el servicio o producto que necesita..." required></textarea>
                </div>
                <div class="form-group">
                    <label>📍 Ubicación del Servicio</label>
                    <div style="display:flex;gap:8px;margin-bottom:8px;">
                        <input type="text" class="form-control" id="clientReqAddress" placeholder="Dirección (calle, número, referencia)" style="flex:1;">
                        <button type="button" class="btn btn-secondary" onclick="ClientPortal.getLocation()" title="Usar mi ubicación actual" style="white-space:nowrap;">
                            📍 Usar mi ubicación
                        </button>
                    </div>
                    <input type="text" class="form-control" id="clientReqLocation" placeholder="Pegar enlace de Google Maps o coordenadas (opcional)" style="margin-bottom:8px;">
                    <div id="locationPreview" style="display:none;margin-top:8px;padding:10px;background:var(--gray-50);border-radius:8px;border:1px solid var(--gray-200);font-size:13px;color:var(--gray-600);"></div>
                    <div class="form-note" style="font-size:12px;color:var(--gray-500);margin-top:6px;">Puedes usar tu ubicación actual o pegar un enlace de Google Maps para que sepamos exactamente dónde ir.</div>
                </div>
                <button class="btn btn-primary btn-lg" onclick="ClientPortal.submitRequest()" style="width:100%;justify-content:center;">
                    📨 Enviar Solicitud
                </button>
            </form>
        </div>

        <h3 style="font-size:16px;font-weight:600;color:var(--gray-700);margin-bottom:14px;">📋 Mis Solicitudes Anteriores</h3>
        <div class="requests-list">
            ${requests.length === 0 ? `
                <div style="text-align:center;padding:40px;color:var(--gray-500);background:white;border-radius:var(--radius-md);border:1px solid var(--gray-200);">
                    <div style="font-size:36px;margin-bottom:10px;">📭</div>
                    <p>Aún no has realizado ninguna solicitud.</p>
                </div>
            ` : requests.map(r => `
                <div class="request-card">
                    <div class="request-info">
                        <h4>${this.escapeHtml(r.description ? r.description.substring(0, 60) + '...' : 'Solicitud #' + r.id)}</h4>
                        <p>${DB.formatDate(r.createdAt)} · ${this.getServiceLabel(r.serviceType)}</p>
                    </div>
                    <div class="request-status">
                        <span class="badge ${r.status === 'aprobado' ? 'badge-aprobado' : r.status === 'rechazado' ? 'badge-rechazado' : r.status === 'enviado' ? 'badge-enviado' : 'badge-borrador'}">
                            <span class="dot"></span> ${r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                    </div>
                </div>
            `).join('')}
        </div>
        `;
    },

    getLocation() {
        if (!navigator.geolocation) {
            App.showToast('Tu navegador no soporta geolocalización', 'warning');
            return;
        }
        App.showToast('Obteniendo tu ubicación...', 'info');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                const locInput = document.getElementById('clientReqLocation');
                if (locInput) locInput.value = mapsUrl;
                const preview = document.getElementById('locationPreview');
                if (preview) {
                    preview.style.display = 'block';
                    preview.innerHTML = `✅ Ubicación obtenida:<br><strong>Lat:</strong> ${lat.toFixed(6)}, <strong>Lng:</strong> ${lng.toFixed(6)}<br><a href="${mapsUrl}" target="_blank" style="color:var(--primary);">Ver en Google Maps</a>`;
                }
                App.showToast('✅ Ubicación obtenida correctamente', 'success');
            },
            (error) => {
                let msg = 'No se pudo obtener la ubicación';
                if (error.code === 1) msg = 'Permiso denegado. Activa la ubicación en tu navegador.';
                else if (error.code === 2) msg = 'Ubicación no disponible. Intenta de nuevo.';
                else if (error.code === 3) msg = 'Tiempo de espera agotado. Intenta de nuevo.';
                App.showToast(msg, 'warning');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    },

    submitRequest() {
        const name = document.getElementById('clientReqName')?.value.trim();
        const phone = document.getElementById('clientReqPhone')?.value.trim();
        const service = document.getElementById('clientReqService')?.value;
        const desc = document.getElementById('clientRequestDesc')?.value.trim();
        const address = document.getElementById('clientReqAddress')?.value.trim() || '';
        const location = document.getElementById('clientReqLocation')?.value.trim() || '';

        if (!name) { App.showToast('Ingrese su nombre', 'warning'); return; }
        if (!phone) { App.showToast('Ingrese su teléfono', 'warning'); return; }
        if (!service) { App.showToast('Seleccione un tipo de servicio', 'warning'); return; }
        if (!desc) { App.showToast('Describa lo que necesita', 'warning'); return; }

        // Combine address and location into description
        let fullDesc = desc;
        if (address) fullDesc += `\n\n📍 Dirección: ${address}`;
        if (location) fullDesc += `\n🗺️ Ubicación: ${location}`;

        // Create a budget as a client request
        const budget = {
            clientId: null,
            clientName: name,
            clientPhone: phone,
            clientEmail: document.getElementById('clientReqEmail')?.value.trim() || '',
            clientAddress: address,
            clientLocation: location,
            serviceType: service,
            description: fullDesc,
            items: [{ concept: desc, qty: 1, price: 0 }],
            labor: 0,
            discount: 0,
            total: 0,
            status: 'borrador',
            source: 'client',
        };

        // Create a client record if not exists
        const existingClient = DB.getClients().find(c => c.phone === phone);
        if (!existingClient) {
            DB.addClient({
                name: name,
                phone: phone,
                email: document.getElementById('clientReqEmail')?.value.trim() || '',
                address: address,
                ruc: '',
                type: 'persona',
            });
        }

        DB.addBudget(budget);
        App.showToast('✅ Solicitud enviada correctamente. Nos pondremos en contacto pronto.', 'success');
        document.getElementById('clientRequestForm')?.reset();
        this.renderRequests();
    },

    getServiceLabel(type) {
        const map = {
            camaras: '📷 Cámaras', alarma: '🔔 Alarmas', ac: '❄️ A/Acond.',
            cerca: '⚡ Cerca Eléc.', video: '📺 Video Portero',
            electricidad: '🔌 Electricidad', cableado: '🔗 Cableado',
            redes: '🌐 Redes/Internet', otro: '📋 Otro'
        };
        return map[type] || type;
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
};