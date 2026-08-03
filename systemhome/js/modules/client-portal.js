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
            <div class="welcome-logo" id="clientWelcomeLogo">
                ${logo ? `<img src="${logo}" alt="SYSTEMHOME">` : 'SH'}
            </div>
            <h2>Bienvenido a SYSTEMHOME</h2>
            <p>
                Somos su aliado en soluciones tecnológicas para seguridad y confort.
                Explora nuestro catálogo de productos y servicios, o solicita una
                cotización personalizada para tu hogar o empresa.
            </p>
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

        // Catalog data - professional products
        const catalog = [
            // Cámaras
            { id: 1, name: 'Cámara HD 1080p Exterior', category: 'camaras', brand: 'Hikvision', model: 'DS-2CD1023G0-I', price: 450000, desc: 'Cámara IP Full HD 1080p con visión nocturna y resistencia IP67 para exterior.', icon: '📷', badge: 'Más vendido' },
            { id: 2, name: 'Cámara PTZ 360°', category: 'camaras', brand: 'Dahua', model: 'SD22204T-GN', price: 1250000, desc: 'Cámara PTZ con rotación 360°, zoom óptico 4x y seguimiento automático.', icon: '🔄', badge: 'Premium' },
            { id: 3, name: 'Cámara Inalámbrica WiFi', category: 'camaras', brand: 'EZViz', model: 'C8C Pro', price: 320000, desc: 'Cámara WiFi para interiores con audio bidireccional y detección inteligente.', icon: '📱', badge: null },
            // Alarmas
            { id: 4, name: 'Kit Alarma Residencial', category: 'alarma', brand: 'Honeywell', model: 'Lynx Touch', price: 890000, desc: 'Kit completo con panel táctil, sensores de puerta y movimiento, sirena.', icon: '🔔', badge: 'Popular' },
            { id: 5, name: 'Sensor de Movimiento', category: 'alarma', brand: 'Bosch', model: 'ISW-BPR1-WP', price: 145000, desc: 'Sensor infrarrojo pasivo con detección de mascotas y 12m de alcance.', icon: '👁️', badge: null },
            // Aire Acondicionado
            { id: 6, name: 'Aire Acondicionado Split 12000 BTU', category: 'ac', brand: 'Samsung', model: 'AR12RSFHBWK', price: 3450000, desc: 'Split frío/calor 12000 BTU con filtro anti-bacterias y control WiFi.', icon: '❄️', badge: 'Oferta' },
            { id: 7, name: 'Aire Acondicionado Inverter 24000 BTU', category: 'ac', brand: 'Midea', model: 'MSAGU-24HRFN1', price: 5200000, desc: 'Inverter eficiente para espacios grandes con ahorro de hasta 60% de energía.', icon: '❄️', badge: null },
            // Cercas Eléctricas
            { id: 8, name: 'Cerca Eléctrica 10m', category: 'cerca', brand: 'Intellibox', model: 'IB-2000', price: 780000, desc: 'Kit de cerca eléctrica para 10 metros con alarmas y sensor de corte.', icon: '⚡', badge: null },
            { id: 9, name: 'Cerca Eléctrica 20m + Sensor', category: 'cerca', brand: 'RoTEC', model: 'RT-5000', price: 1350000, desc: 'Sistema de cerca eléctrica con sensor perimetral y notificaciones al móvil.', icon: '⚡', badge: 'Recomendado' },
            // Video Portero
            { id: 10, name: 'Video Portero Táctil 7"', category: 'video', brand: 'Smanos', model: 'K1-Smart', price: 650000, desc: 'Pantalla táctil capacitiva 7", cámara HD nocturna y apertura remota.', icon: '📺', badge: null },
            { id: 11, name: 'Kit Video Portero 2 Cámaras', category: 'video', brand: 'COMMAX', model: 'CDV-70N', price: 890000, desc: 'Video portero con 2 cámaras, panel táctil y soporte para 2 monitores.', icon: '🏠', badge: null },
            // Cables y Accesorios
            { id: 12, name: 'Cable UTP Cat6 x100m', category: 'cable', brand: 'Belden', model: '7812ENH', price: 280000, desc: 'Cable de red UTP categoría 6 de alta velocidad para cableado estructurado.', icon: '🔌', badge: null },
            { id: 13, name: 'Cable Coaxial RG6 x50m', category: 'cable', brand: 'CommScope', model: 'RG6-U', price: 125000, desc: 'Cable coaxial para CCTV y señales de video de alta calidad.', icon: '📡', badge: null },
            { id: 14, name: 'Switch PoE 8 Puertos', category: 'accesorio', brand: 'TP-Link', model: 'TL-SG1005P', price: 350000, desc: 'Switch PoE+ 8 puertos Gigabit para alimentar cámaras y dispositivos de red.', icon: '🔀', badge: null },
            { id: 15, name: 'Kit Herramientas Instalación', category: 'herramienta', brand: 'Stanley', model: '56-695', price: 450000, desc: 'Kit profesional con ponchadora, crimpadora RJ45, pelacables y más.', icon: '🛠️', badge: null },
        ];

        const categories = [
            { id: 'camaras', label: '📷 Cámaras' },
            { id: 'alarma', label: '🔔 Alarmas' },
            { id: 'ac', label: '❄️ A/Acondicionado' },
            { id: 'cerca', label: '⚡ Cercas' },
            { id: 'video', label: '📺 Video Portero' },
            { id: 'cable', label: '🔌 Cables' },
            { id: 'accesorio', label: '🔧 Accesorios' },
            { id: 'herramienta', label: '🛠️ Herramientas' },
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

        return items.map(item => `
        <div class="catalog-item">
            <div class="catalog-item-img" style="background:linear-gradient(135deg, var(--gray-100), var(--gray-200));">
                ${item.badge ? `<span class="cat-badge">${item.badge}</span>` : ''}
                <span style="font-size:64px;">${item.icon}</span>
            </div>
            <div class="catalog-item-info">
                <h4>${this.escapeHtml(item.name)}</h4>
                <div class="item-brand">${this.escapeHtml(item.brand)} · ${this.escapeHtml(item.model)}</div>
                <div class="item-desc">${this.escapeHtml(item.desc)}</div>
                <div class="item-price">${DB.formatCurrency(item.price)}</div>
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
                    <label>Dirección del Servicio</label>
                    <input type="text" class="form-control" id="clientReqAddress" placeholder="Dirección donde se requiere el servicio">
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

    submitRequest() {
        const name = document.getElementById('clientReqName')?.value.trim();
        const phone = document.getElementById('clientReqPhone')?.value.trim();
        const service = document.getElementById('clientReqService')?.value;
        const desc = document.getElementById('clientRequestDesc')?.value.trim();

        if (!name) { App.showToast('Ingrese su nombre', 'warning'); return; }
        if (!phone) { App.showToast('Ingrese su teléfono', 'warning'); return; }
        if (!service) { App.showToast('Seleccione un tipo de servicio', 'warning'); return; }
        if (!desc) { App.showToast('Describa lo que necesita', 'warning'); return; }

        // Create a budget as a client request
        const budget = {
            clientId: null,
            clientName: name,
            clientPhone: phone,
            clientEmail: document.getElementById('clientReqEmail')?.value.trim() || '',
            clientAddress: document.getElementById('clientReqAddress')?.value.trim() || '',
            serviceType: service,
            description: desc,
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
                address: document.getElementById('clientReqAddress')?.value.trim() || '',
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