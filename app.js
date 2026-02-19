// ============================================
// CONFIGURACIÓN
// ============================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz7wW5GkeimTH0RSTxjL8ckv65whDLfasxW_1cebG9o4Yfj3Bjd8tONoBYGNvTMNeLBtg/exec';

// Estado global
let productos = [];
let pedidoActual = [];
let pedidosDelDia = [];
let cadetes = [];
let filtroBusqueda = '';
let filtroCategoria = 'Todas';

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('App inicializando...');
    try {
        window.addEventListener('hashchange', renderPage);
        renderPage();
    } catch (error) {
        console.error('Error fatal al iniciar:', error);
        alert('Error al iniciar la app: ' + error.message);
    }
});

// ============================================
// ROUTER & AUTH
// ============================================
function renderPage() {
    const page = location.hash.slice(1) || 'home';
    const container = document.getElementById('app-container');
    const headerTitle = document.getElementById('header-title');
    const btnBack = document.getElementById('btn-back');
    const btnLogout = document.getElementById('btn-logout');

    // (V9) Login Check
    // Si no está autenticado, forzar login
    if (!isAuthenticated() && page !== 'login') {
        location.hash = 'login';
        return;
    }

    // Si está en login pero ya autenticado, ir a home
    if (isAuthenticated() && page === 'login') {
        location.hash = 'home';
        return;
    }

    // Mostrar/ocultar botón de atrás
    if (page === 'home' || page === 'login') {
        btnBack.classList.add('hidden');
    } else {
        btnBack.classList.remove('hidden');
    }

    // Mostrar/ocultar botón de logout
    if (page === 'login') {
        btnLogout.classList.add('hidden');
    } else {
        btnLogout.classList.remove('hidden');
    }

    // Renderizar página correspondiente
    switch (page) {
        case 'login':
            headerTitle.textContent = 'Acceso Restringido 🔒';
            renderLogin(container);
            break;
        case 'home':
            headerTitle.textContent = 'Comanda Electrónica 🖥️';
            renderHome(container);
            break;
        case 'nuevo-pedido':
            headerTitle.textContent = 'Nuevo Pedido';
            renderNuevoPedido(container);
            break;
        case 'pedidos':
            headerTitle.textContent = 'Pedidos del Día';
            renderPedidos(container);
            break;
        case 'cerrar-caja':
            headerTitle.textContent = 'Cerrar Caja';
            renderCerrarCaja(container);
            break;
        case 'historial-cajas':
            headerTitle.textContent = 'Historial de Cajas';
            renderHistorialCajas(container);
            break;
        case 'gestionar-productos':
            headerTitle.textContent = 'Gestión de Productos';
            renderGestionProductos(container);
            break;
        default:
            renderHome(container);
    }
}

function volverAtras() {
    window.history.back();
}

// ============================================
// AUTHENTICATION LOGIC
// ============================================
const CRED_USER = 'b3BlcmFkb3I='; // operador (Base64)
const CRED_PASS = 'Y29tMDI2';     // com026 (Base64)
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas en ms

function isAuthenticated() {
    const auth = localStorage.getItem('comanda_auth') === 'true';
    const authTime = localStorage.getItem('comanda_auth_time');

    if (!auth || !authTime) return false;

    const now = new Date().getTime();
    if (now - parseInt(authTime) > SESSION_DURATION) {
        console.log('Sesión expirada');
        logout();
        return false;
    }

    return true;
}

function login() {
    const userInput = document.getElementById('login-user').value;
    const passInput = document.getElementById('login-pass').value;

    if (btoa(userInput) === CRED_USER && btoa(passInput) === CRED_PASS) {
        localStorage.setItem('comanda_auth', 'true');
        localStorage.setItem('comanda_auth_time', new Date().getTime().toString());
        location.hash = 'home';
    } else {
        showToast('Credenciales incorrectas');
    }
}

function logout() {
    localStorage.removeItem('comanda_auth');
    localStorage.removeItem('comanda_auth_time');
    location.hash = 'login';
}

// ============================================
// PANTALLA: LOGIN
// ============================================
function renderLogin(container) {
    hideLoading(); // Asegurar que no quede cargando infinito

    container.innerHTML = `
        <div class="card" style="max-width: 400px; margin: 2rem auto; text-align: center; padding: 2rem;">
            <div style="width: 80px; height: 80px; background: var(--primary-100); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                <i class="fas fa-user-lock" style="font-size: 2.5rem; color: var(--primary-600);"></i>
            </div>
            <h2 style="margin-bottom: 0.5rem;">Iniciar Sesión</h2>
            <p class="text-muted" style="margin-bottom: 2rem;">Sistema de Comanda</p>
            
            <div class="form-group" style="text-align: left;">
                <label class="form-label">Usuario</label>
                <input type="text" id="login-user" class="form-input" placeholder="Ingresá usuario">
            </div>
            
            <div class="form-group" style="text-align: left;">
                <label class="form-label">Contraseña</label>
                <input type="password" id="login-pass" class="form-input" placeholder="Ingresá contraseña">
            </div>
            
            <button class="btn btn-primary" onclick="login()" style="width: 100%; margin-top: 1rem;">
                Ingresar <i class="fas fa-arrow-right"></i>
            </button>
        </div>
    `;

    // Permitir Enter para login
    document.getElementById('login-pass').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            login();
        }
    });
}

function volverAtras() {
    window.history.back();
}

// ============================================
// PANTALLA: HOME
// ============================================
function renderHome(container) {
    container.innerHTML = `
        <div class="welcome-card card mb-2" style="background: var(--gradient-primary); color: white; border: none;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-utensils" style="font-size: 1.75rem;"></i>
                </div>
                <div>
                    <h2 style="color: white; margin: 0; font-size: 1.5rem;">Bienvenido</h2>
                    <p style="margin: 0; opacity: 0.9;">Gestión inteligente de pedidos</p>
                </div>
            </div>
        </div>
        
        <div class="btn-grid">
            <button class="btn btn-primary" onclick="location.hash='nuevo-pedido'">
                <i class="fas fa-plus-circle"></i>
                Nuevo Pedido
            </button>
            <button class="btn btn-info" onclick="location.hash='pedidos'">
                <i class="fas fa-clipboard-list"></i>
                Pedidos del Día
            </button>
            <button class="btn btn-warning" onclick="location.hash='cerrar-caja'">
                <i class="fas fa-cash-register"></i>
                Cerrar Caja
            </button>
            <button class="btn btn-secondary" onclick="location.hash='historial-cajas'">
                <i class="fas fa-chart-line"></i>
                Historial de Cajas
            </button>
            <button class="btn btn-info" onclick="location.hash='gestionar-productos'" style="background: var(--gradient-dark); border: none;">
                <i class="fas fa-boxes"></i>
                Gestionar Productos
            </button>
            <button class="btn btn-light" disabled style="opacity: 0.6; cursor: not-allowed;">
                <i class="fas fa-chart-bar"></i>
                Métricas
                <div style="font-size: 0.75rem; margin-top: 2px; opacity: 0.7;">(Solo Plan Premium)</div>
            </button>
        </div>
    `;
}

// ============================================
// PANTALLA: NUEVO PEDIDO
// ============================================
async function renderNuevoPedido(container) {
    showLoading();

    if (productos.length === 0) {
        await cargarProductos();
    }

    hideLoading();

    const allCategories = [...new Set(productos.map(p => p.categoria))].sort();

    let html = `
        <div class="search-container mb-2" style="position: sticky; top: 0; background: var(--bg-body); z-index: 100; padding: 1rem 0;">
            <div class="form-group" style="margin-bottom: 1rem;">
                <div style="position: relative;">
                    <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--gray-400);"></i>
                    <input type="text" id="busquedaProducto" class="form-input" placeholder="Buscar producto..." value="${filtroBusqueda}" oninput="actualizarFiltroBusqueda(this.value)" style="padding-left: 38px;">
                </div>
            </div>
            
            <div class="categorias-scroll" style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem; scrollbar-width: none;">
                <button class="btn-filtro ${filtroCategoria === 'Todas' ? 'active' : ''}" onclick="filtrarCategoria('Todas')">Todas</button>
                ${allCategories.map(cat => `
                    <button class="btn-filtro ${filtroCategoria === cat ? 'active' : ''}" onclick="filtrarCategoria('${cat}')">${cat}</button>
                `).join('')}
            </div>
        </div>
        <div class="mb-2">
    `;

    // Filtrar productos
    const productosFiltrados = productos.filter(p => {
        const coincideNombre = p.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase());
        const coincideCat = filtroCategoria === 'Todas' || p.categoria === filtroCategoria;
        return coincideNombre && coincideCat;
    });

    const categorias = {};
    productosFiltrados.forEach(p => {
        if (!categorias[p.categoria]) {
            categorias[p.categoria] = [];
        }
        categorias[p.categoria].push(p);
    });

    for (const [categoria, prods] of Object.entries(categorias)) {
        html += `
            <h2 style="margin-top: 1.5rem;">
                <i class="fas fa-tag" style="font-size: 1.25rem;"></i>
                ${categoria}
            </h2>
        `;

        prods.forEach(producto => {
            const cantidad = getCantidadEnPedido(producto.id);
            html += `
                <div class="producto-item" style="flex-direction: column; align-items: stretch; gap: 0.75rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                        <div class="producto-info">
                            <div class="producto-nombre">${producto.nombre}</div>
                            <div class="producto-categoria">${producto.categoria}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div class="producto-precio">$${formatCurrency(producto.precio)}</div>
                            <div class="producto-actions">
                                <button class="btn-cantidad" onclick="cambiarCantidad('${producto.id}', -1)">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <span class="cantidad-display">${cantidad}</span>
                                <button class="btn-cantidad" onclick="cambiarCantidad('${producto.id}', 1)">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    ${cantidad > 0 ? `
                        <div class="producto-nota" style="margin-top: 2px;">
                            <input type="text" class="form-input" style="font-size: 0.875rem; padding: 0.5rem; background: var(--gray-50);" 
                                placeholder="📝 Agregar nota específica..." 
                                value="${pedidoActual.find(i => i.id === producto.id)?.nota || ''}"
                                onchange="actualizarNota('${producto.id}', this.value)">
                        </div>
                    ` : ''}
                </div>
            `;
        });
    }

    html += '</div>';

    const total = calcularTotal();
    const itemsCount = pedidoActual.reduce((sum, item) => sum + item.cantidad, 0);

    if (itemsCount > 0) {
        html += `
            <div class="resumen-pedido">
                <h3><i class="fas fa-shopping-cart"></i> Resumen del Pedido</h3>
                <div class="resumen-items">
                    ${pedidoActual.map(item => `
                        <div class="resumen-item" style="flex-direction: column; align-items: flex-start;">
                            <div style="display: flex; justify-content: space-between; width: 100%;">
                                <span>${item.cantidad}x ${item.producto}</span>
                                <span>$${formatCurrency(item.cantidad * item.precio)}</span>
                            </div>
                            ${item.nota ? `<small class="text-muted" style="font-style: italic; color: var(--primary-600);">Nota: ${item.nota}</small>` : ''}
                        </div>
                    `).join('')}
                </div>
                <div class="resumen-total">
                    <span>TOTAL</span>
                    <span>$${formatCurrency(total)}</span>
                </div>
            </div>
            
            <div class="card">
                <h3 style="margin-bottom: 1.25rem; font-size: 1.125rem;">
                    <i class="fas fa-user"></i> Datos del Cliente
                </h3>
                
                <div class="form-group">
                    <label class="form-label">Nombre del Cliente <span style="color: var(--danger-500);">*</span></label>
                    <input type="text" id="nombreCliente" class="form-input" placeholder="Nombre completo" required minlength="3">
                    <small class="text-muted" style="display: block; margin-top: 0.375rem; font-size: 0.8125rem;">Mínimo 3 caracteres</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-mobile-alt"></i> Celular (WhatsApp)</label>
                    <input type="tel" id="celularCliente" class="form-input" placeholder="Ej: 11 1234 5678">
                    <small class="text-muted" style="display: block; margin-top: 0.375rem; font-size: 0.8125rem;">Solo números, sin guiones ni espacios (opcional)</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-truck"></i> Tipo de Entrega</label>
                    <select id="tipoEntrega" class="form-select" onchange="toggleDomicilio()">
                        <option value="retira">🏠 Retira en el local</option>
                        <option value="envio">🚚 Requiere envío</option>
                    </select>
                </div>
                
                <div class="form-group hidden" id="domicilio-group">
                    <label class="form-label"><i class="fas fa-map-marker-alt"></i> Domicilio de Entrega</label>
                    <input type="text" id="domicilioCliente" class="form-input" placeholder="Calle y número">
                </div>
                
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-comment-alt"></i> Observaciones</label>
                    <textarea id="observaciones" class="form-textarea" placeholder="Ej: Sin cebolla, extra queso..."></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-credit-card"></i> Método de Pago</label>
                    <select id="metodoPago" class="form-select">
                        <option value="mercadopago"><i class="fas fa-qrcode"></i>📠 Mercado Pago</option>
                        <option value="efectivo"><i class="fas fa-money-bill-wave"></i>💵 Efectivo</option>
                        <option value="point">💳 POINT (Posnet)</option>
                    </select>
                </div>
                
                <button class="btn btn-primary" onclick="confirmarPedido()" style="margin-top: 1.5rem;">
                    <i class="fas fa-check-circle"></i>
                    Confirmar Pedido
                </button>
                <button class="btn btn-danger" onclick="cancelarPedido()">
                    <i class="fas fa-times-circle"></i>
                    Cancelar
                </button>
            </div>
        `;
    } else {
        html += `
            <div class="card text-center" style="padding: 3rem 2rem;">
                <div style="width: 80px; height: 80px; background: var(--gray-100); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                    <i class="fas fa-shopping-basket" style="font-size: 2.5rem; color: var(--gray-400);"></i>
                </div>
                <p class="text-muted" style="font-size: 1.125rem;">Agregá productos al pedido usando los botones +</p>
            </div>
        `;
    }

    container.innerHTML = html;
}

function getCantidadEnPedido(productoId) {
    const item = pedidoActual.find(p => p.id === productoId);
    return item ? item.cantidad : 0;
}

function cambiarCantidad(productoId, delta) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;
    const itemIndex = pedidoActual.findIndex(p => p.id === productoId);

    if (itemIndex >= 0) {
        pedidoActual[itemIndex].cantidad += delta;

        if (pedidoActual[itemIndex].cantidad <= 0) {
            pedidoActual.splice(itemIndex, 1);
        }
    } else if (delta > 0) {
        pedidoActual.push({
            id: producto.id,
            producto: producto.nombre,
            cantidad: delta,
            precio: producto.precio
        });
    }

    renderPage();
}

function actualizarFiltroBusqueda(val) {
    filtroBusqueda = val;
    renderNuevoPedido(document.getElementById('app-container'));

    // Restaurar foco y posición del cursor
    const input = document.getElementById('busquedaProducto');
    if (input) {
        input.focus();
        input.setSelectionRange(val.length, val.length);
    }
}

function filtrarCategoria(cat) {
    filtroCategoria = cat;
    renderNuevoPedido(document.getElementById('app-container'));
}

function actualizarNota(productoId, nota) {
    const itemIndex = pedidoActual.findIndex(p => p.id === productoId);
    if (itemIndex >= 0) {
        pedidoActual[itemIndex].nota = nota;
    }
}

function calcularTotal() {
    return pedidoActual.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);
}

async function confirmarPedido() {
    const nombre = document.getElementById('nombreCliente').value.trim();
    const celular = document.getElementById('celularCliente').value.trim();
    const domicilio = document.getElementById('domicilioCliente').value.trim();
    const observaciones = document.getElementById('observaciones').value;
    const metodoPago = document.getElementById('metodoPago').value;
    const tipoEntrega = document.getElementById('tipoEntrega').value;
    const total = calcularTotal();

    if (pedidoActual.length === 0) {
        showToast('El pedido está vacío');
        return;
    }

    if (nombre.length < 3) {
        showToast('El nombre debe tener al menos 3 caracteres');
        return;
    }

    if (tipoEntrega === 'envio' && !domicilio) {
        showToast('Debés ingresar el domicilio de entrega');
        return;
    }

    if (celular && !/^\d{8,15}$/.test(celular.replace(/\s/g, ''))) {
        showToast('El celular debe contener solo números (mínimo 8)');
        return;
    }

    showLoading();

    try {
        const response = await apiPost({
            action: 'crear_pedido',
            items: pedidoActual,
            total: total,
            metodoPago: metodoPago,
            observaciones: observaciones,
            nombre: nombre,
            domicilio: domicilio,
            celular: celular,
            tipoEntrega: tipoEntrega
        });

        hideLoading();

        if (response.success) {
            if (metodoPago === 'mercadopago' && response.linkPago) {
                mostrarLinkPago(response);
            } else {
                showToast('✅ Pedido creado exitosamente');
                pedidoActual = [];
                location.hash = 'pedidos';
            }
        } else {
            showToast('Error al crear pedido: ' + response.error);
        }
    } catch (error) {
        hideLoading();
        showToast('Error de conexión: ' + error.message);
    }
}

function toggleDomicilio() {
    const tipo = document.getElementById('tipoEntrega').value;
    const domicilioGroup = document.getElementById('domicilio-group');

    if (tipo === 'envio') {
        domicilioGroup.classList.remove('hidden');
    } else {
        domicilioGroup.classList.add('hidden');
        document.getElementById('domicilioCliente').value = '';
    }
}

function mostrarLinkPago(pedidoData) {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="card text-center">
            <div style="width: 80px; height: 80px; background: var(--primary-100); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                <i class="fas fa-check-circle" style="font-size: 2.5rem; color: var(--primary-600);"></i>
            </div>
            <h2 style="justify-content: center; margin-bottom: 0.5rem;">Pedido Creado</h2>
            <p class="text-muted">ID: ${pedidoData.id}</p>
            
            <div class="qr-container">
                <h3><i class="fas fa-qrcode"></i> Escaneá el QR para pagar</h3>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pedidoData.linkPago)}" alt="QR Mercado Pago">
            </div>
            
            <p class="mb-1" style="font-weight: 600;">O copiá el link:</p>
            <input type="text" class="form-input mb-2" value="${pedidoData.linkPago}" readonly onclick="this.select()" style="text-align: center; font-family: monospace;">
            
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <button class="btn btn-primary" onclick="window.open('${pedidoData.linkPago}', '_blank')">
                    <i class="fas fa-external-link-alt"></i>
                    Abrir Mercado Pago
                </button>

                ${pedidoData.celular ? `
                    <button class="btn btn-success" onclick="enviarWhatsApp('${pedidoData.celular}', '${pedidoData.nombre}', '${pedidoData.linkPago}')" style="background: linear-gradient(135deg, #25D366 0%, #128C7E 100%); border: none;">
                        <i class="fab fa-whatsapp"></i>
                        Enviar por WhatsApp
                    </button>
                ` : ''}
                
                <button class="btn btn-secondary" onclick="pedidoActual = []; location.hash='pedidos'">
                    <i class="fas fa-clipboard-list"></i>
                    Ver Pedidos del Día
                </button>
            </div>
        </div>
    `;
}

function enviarWhatsApp(celular, nombre, link) {
    const telefono = celular.replace(/\D/g, '');
    const codigoPais = '54';
    const numeroCompleto = telefono.startsWith('54') ? telefono : codigoPais + telefono;
    const mensaje = `Hola ${nombre}! Te envío el link de pago de tu pedido: ${link}`;
    const url = `https://wa.me/${numeroCompleto}?text=${encodeURIComponent(mensaje)}`;

    window.open(url, '_blank');
}

function cancelarPedido() {
    if (confirm('¿Cancelar el pedido actual?')) {
        pedidoActual = [];
        location.hash = 'home';
    }
}

// ============================================
// PANTALLA: PEDIDOS DEL DÍA
// ============================================
async function renderPedidos(container) {
    showLoading();
    const fecha = getFechaHoy();

    try {
        const [pedidosResponse, cadetesResponse] = await Promise.all([
            apiGet('pedidos', { fecha }),
            apiGet('cadetes')
        ]);

        pedidosDelDia = pedidosResponse.pedidos || [];
        window.cadetes = cadetesResponse.cadetes || [];

        hideLoading();

        if (pedidosDelDia.length === 0) {
            container.innerHTML = `
                <div class="card text-center" style="padding: 3rem 2rem;">
                    <div style="width: 80px; height: 80px; background: var(--gray-100); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                        <i class="fas fa-inbox" style="font-size: 2.5rem; color: var(--gray-400);"></i>
                    </div>
                    <p class="text-muted" style="font-size: 1.125rem; margin-bottom: 1.5rem;">No hay pedidos para hoy</p>
                    <button class="btn btn-primary" onclick="location.hash='nuevo-pedido'">
                        <i class="fas fa-plus-circle"></i>
                        Crear Primer Pedido
                    </button>
                </div>
            `;
            return;
        }

        let html = '';

        pedidosDelDia.forEach(pedido => {
            const estadoBadge = `<span class="badge badge-${pedido.estado}"><i class="fas fa-circle" style="font-size: 0.5rem;"></i> ${pedido.estado.toUpperCase()}</span>`;
            const metodoBadge = `<span class="badge badge-${pedido.metodoPago}">${pedido.metodoPago === 'mercadopago' ? '<i class="fas fa-qrcode"></i> MP' : pedido.metodoPago === 'point' ? '💳 POINT' : '<i class="fas fa-money-bill"></i> Efectivo'}</span>`;
            const entregaBadge = `<span class="badge badge-${pedido.tipoEntrega === 'retira' ? 'blue' : 'orange'}" style="background: ${pedido.tipoEntrega === 'retira' ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' : 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)'}; color: ${pedido.tipoEntrega === 'retira' ? '#1e40af' : '#9a3412'};">${pedido.tipoEntrega === 'retira' ? '🏠 Retira' : '🚚 Envío'}</span>`;

            html += `
                <div class="card">
                    <div class="card-header">
                        <div>
                        <div class="card-title">
                            <i class="fas fa-receipt" style="color: var(--primary-600);"></i>
                            ${pedido.id}
                            <span style="font-size: 0.9em; font-weight: normal; color: var(--gray-500);">
                                - ${pedido.nombre || 'Cliente'}
                            </span>
                        </div>
                        <div class="card-subtitle"><i class="far fa-clock"></i> ${formatDateTime(pedido.fecha)}</div>
                        ${pedido.domicilio ? `<div style="font-size: 0.875em; margin-top: 0.5rem; color: var(--gray-600);"><i class="fas fa-map-marker-alt"></i> ${pedido.domicilio}</div>` : ''}
                        ${pedido.celular ? `<div style="font-size: 0.875em; margin-top: 0.25rem; color: var(--gray-600);"><i class="fas fa-phone"></i> ${pedido.celular}</div>` : ''}
                    </div>
                    <div style="text-align: right; display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end;">
                        ${estadoBadge}
                        ${metodoBadge}
                        ${entregaBadge}
                    </div>
                    </div>
                    <div class="card-body">
                        <strong style="color: var(--gray-700);"><i class="fas fa-list"></i> Items:</strong>
                        <ul style="margin: 0.75rem 0; padding-left: 1.5rem; color: var(--gray-600);">
                            ${pedido.items.map(item => `
                                <li style="margin-bottom: 0.375rem;">
                                    ${item.cantidad}x ${item.producto} - $${formatCurrency(item.cantidad * item.precio)}
                                    ${item.nota ? `<br><small style="font-style: italic; color: var(--primary-600); margin-left: 10px;">• ${item.nota}</small>` : ''}
                                </li>
                            `).join('')}
                        </ul>
                        ${pedido.observaciones ? `<p style="background: var(--gray-50); padding: 0.75rem; border-radius: var(--radius); margin-top: 0.75rem;"><strong><i class="fas fa-comment-alt"></i> Observaciones:</strong> ${pedido.observaciones}</p>` : ''}
                    ${pedido.tipoEntrega === 'envio' && pedido.cadete ? `<p style="background: var(--primary-50); padding: 0.75rem; border-radius: var(--radius); margin-top: 0.75rem;"><strong><i class="fas fa-user-tag"></i> Cadete:</strong> ${window.cadetes.find(c => c.id === pedido.cadete)?.nombre || pedido.cadete}</p>` : ''}
                </div>
                <div class="card-footer">
                    ${renderBotonesEstado(pedido)}
                    ${pedido.tipoEntrega === 'envio' && (pedido.estado === 'pagado' || (pedido.estado === 'pendiente' && pedido.metodoPago === 'efectivo')) ? `
                        <div style="display: inline-block; position: relative; margin-left: 10px;">
                            <i class="fas fa-motorcycle" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--primary-600); pointer-events: none; z-index: 1;"></i>
                            <select class="form-select" style="
                                display: inline-block; 
                                width: auto; 
                                min-width: 180px;
                                padding-left: 38px;
                                background: linear-gradient(135deg, var(--primary-50) 0%, var(--primary-100) 100%);
                                border: 2px solid var(--primary-200);
                                color: var(--primary-700);
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.2s ease;
                            " onchange="asignarCadete('${pedido.id}', this.value)" onmouseover="this.style.borderColor='var(--primary-400)'; this.style.background='linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%)'" onmouseout="this.style.borderColor='var(--primary-200)'; this.style.background='linear-gradient(135deg, var(--primary-50) 0%, var(--primary-100) 100%)'">
                                <option value="">${pedido.cadete ? '🔄 Cambiar cadete' : '👤 Asignar cadete'}</option>
                                ${window.cadetes.map(c => `<option value="${c.id}" ${pedido.cadete === c.id ? 'selected' : ''}>${c.nombre}</option>`).join('')}
                            </select>
                        </div>
                    ` : ''}
                    <button class="btn btn-small btn-secondary" onclick='imprimirPedido(${JSON.stringify(pedido)})'>
                        <i class="fas fa-print"></i> Imprimir
                    </button>
                </div>
                </div>
            `;
        });

        container.innerHTML = html;

    } catch (error) {
        hideLoading();
        showToast('Error al cargar pedidos: ' + error.message);
    }
}

function renderBotonesEstado(pedido) {
    let botones = '';
    if (pedido.estado === 'pendiente') {
        botones += `
            <button class="btn btn-small btn-primary" onclick="cambiarEstado('${pedido.id}', 'pagado')">
                <i class="fas fa-check"></i> Pagado
            </button>
            <button class="btn btn-small btn-danger" onclick="cambiarEstado('${pedido.id}', 'cancelado')">
                <i class="fas fa-times"></i> Cancelar
            </button>
        `;

        if (pedido.linkPago) {
            botones += `
                <button class="btn btn-small btn-info" onclick="window.open('${pedido.linkPago}', '_blank')">
                    <i class="fas fa-link"></i> Link MP
                </button>
            `;
        }
    } else if (pedido.estado === 'pagado') {
        botones += `
            <button class="btn btn-small btn-primary" onclick="cambiarEstado('${pedido.id}', 'entregado')">
                <i class="fas fa-box"></i> Entregado
            </button>
        `;
    }

    return botones;
}

async function cambiarEstado(pedidoId, nuevoEstado) {
    showLoading();
    try {
        const response = await apiPost({
            action: 'actualizar_estado',
            id: pedidoId,
            estado: nuevoEstado
        });

        hideLoading();

        if (response.success) {
            showToast(`Estado actualizado a: ${nuevoEstado}`);
            const container = document.getElementById('app-container');
            renderPedidos(container);
        } else {
            showToast('Error al actualizar estado');
        }
    } catch (error) {
        hideLoading();
        showToast('Error: ' + error.message);
    }
}

async function asignarCadete(pedidoId, cadeteId) {
    if (!cadeteId) return;

    showLoading();
    try {
        const response = await apiPost({
            action: 'asignar_cadete',
            pedidoId: pedidoId,
            cadeteId: cadeteId
        });

        hideLoading();

        if (response.success) {
            showToast('✅ Cadete asignado correctamente');
            const container = document.getElementById('app-container');
            renderPedidos(container);
        } else {
            showToast('Error al asignar cadete');
        }
    } catch (error) {
        hideLoading();
        showToast('Error: ' + error.message);
    }
}


function imprimirPedido(pedido) {
    const ventanaImpresion = window.open('', '_blank', 'width=300,height=600');

    const itemsHTML = pedido.items.map(item => `
        <tr>
            <td>${item.cantidad}x</td>
            <td>${item.producto}</td>
            <td style="text-align: right;">$${formatCurrency(item.cantidad * item.precio)}</td>
        </tr>
        ${item.nota ? `
        <tr>
            <td></td>
            <td colspan="2" style="font-size: 10px; font-style: italic; color: #444; padding-left: 5px;">- ${item.nota}</td>
        </tr>
        ` : ''}
    `).join('');

    const metodoPagoTexto = pedido.metodoPago === 'mercadopago' ? 'Mercado Pago' :
        pedido.metodoPago === 'point' ? 'POINT (Posnet)' : 'Efectivo';

    ventanaImpresion.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Pedido ${pedido.id}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Courier New', monospace;
                    padding: 10px;
                    font-size: 12px;
                    max-width: 280px;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 10px;
                    margin-bottom: 10px;
                }
                .header h1 { font-size: 18px; margin-bottom: 5px; }
                .header p { font-size: 10px; }
                .section { margin-bottom: 15px; }
                .section-title {
                    font-weight: bold;
                    border-bottom: 1px solid #000;
                    margin-bottom: 5px;
                    padding-bottom: 3px;
                }
                table { width: 100%; margin-bottom: 10px; }
                td { padding: 2px 0; }
                .total {
                    border-top: 2px solid #000;
                    padding-top: 8px;
                    margin-top: 8px;
                    font-size: 14px;
                    font-weight: bold;
                    text-align: right;
                }
                .footer {
                    border-top: 2px dashed #000;
                    padding-top: 10px;
                    margin-top: 15px;
                    text-align: center;
                    font-size: 10px;
                }
                @media print {
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>COMANDA DIGITAL</h1>
                <p>Sistema de Pedidos</p>
            </div>
            
            <div class="section">
                <div class="section-title">PEDIDO: ${pedido.id}</div>
                <p>Fecha: ${formatDateTime(pedido.fecha)}</p>
                <p>Estado: ${pedido.estado.toUpperCase()}</p>
            </div>
            
            <div class="section">
                <div class="section-title">CLIENTE</div>
                <p><strong>${pedido.nombre || 'Sin nombre'}</strong></p>
                ${pedido.celular ? `<p>Tel: ${pedido.celular}</p>` : ''}
                ${pedido.domicilio ? `<p>Dir: ${pedido.domicilio}</p>` : ''}
            </div>
            
            <div class="section">
                <div class="section-title">ITEMS</div>
                <table>
                    ${itemsHTML}
                </table>
            </div>
            
            ${pedido.observaciones ? `
            <div class="section">
                <div class="section-title">OBSERVACIONES</div>
                <p>${pedido.observaciones}</p>
            </div>
            ` : ''}
            
            <div class="section">
                <div class="section-title">PAGO</div>
                <p>Método: ${metodoPagoTexto}</p>
                <div class="total">TOTAL: $${formatCurrency(pedido.total)}</div>
            </div>
            
            <div class="footer">
                <p>¡Gracias por su compra!</p>
                <p>www.synergydev.com.ar</p>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `);

    ventanaImpresion.document.close();
}

// ============================================
// PANTALLA: CERRAR CAJA
// ============================================
async function renderCerrarCaja(container) {
    showLoading();
    const fecha = getFechaHoy();

    try {
        const response = await apiGet('pedidos', { fecha });
        const pedidos = response.pedidos || [];

        hideLoading();

        let totalMP = 0;
        let totalEfectivo = 0;
        let totalPoint = 0;
        let cantidadPedidos = 0;

        pedidos.forEach(pedido => {
            if (pedido.estado === 'pagado' || pedido.estado === 'entregado') {
                cantidadPedidos++;
                if (pedido.metodoPago === 'mercadopago') {
                    totalMP += pedido.total;
                } else if (pedido.metodoPago === 'efectivo') {
                    totalEfectivo += pedido.total;
                } else if (pedido.metodoPago === 'point') {
                    totalPoint += pedido.total;
                }
            }
        });

        const totalGeneral = totalMP + totalEfectivo + totalPoint;

        // Guardar en variable global para calcularDiferencia
        window.totalGeneralCaja = totalGeneral;

        container.innerHTML = `
            <div class="card">
                <h2 style="margin-bottom: 0.5rem;">
                    <i class="fas fa-calculator"></i> Resumen del Día
                </h2>
                <p class="text-muted mb-2" style="font-size: 0.9375rem;">${formatDate(new Date())}</p>
                
                <div class="table-responsive">
                    <table>
                        <tr>
                            <th><i class="fas fa-list"></i> Concepto</th>
                            <th style="text-align: right;"><i class="fas fa-dollar-sign"></i> Monto</th>
                        </tr>
                        <tr>
                            <td><i class="fas fa-qrcode" style="color: var(--secondary-600);"></i>📠 Mercado Pago</td>
                            <td style="text-align: right;"><strong>$${formatCurrency(totalMP)}</strong></td>
                        </tr>
                        <tr>
                            <td><i class="fas fa-money-bill-wave" style="color: var(--primary-600);"></i>💵 Efectivo</td>
                            <td style="text-align: right;"><strong>$${formatCurrency(totalEfectivo)}</strong></td>
                        </tr>
                        <tr>
                            <td>💳 POINT (Posnet)</td>
                            <td style="text-align: right;"><strong>$${formatCurrency(totalPoint)}</strong></td>
                        </tr>
                        <tr style="background: var(--primary-50);">
                            <td><strong><i class="fas fa-coins"></i> TOTAL</strong></td>
                            <td style="text-align: right;"><strong style="color: var(--primary-600); font-size: 1.25rem;">$${formatCurrency(totalGeneral)}</strong></td>
                        </tr>
                        <tr>
                            <td><i class="fas fa-shopping-bag"></i> Cantidad de pedidos</td>
                            <td style="text-align: right;"><strong>${cantidadPedidos}</strong></td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <div class="card" style="border-left: 4px solid var(--warning-500);">
                <h3 style="margin-bottom: 1rem;">
                    <i class="fas fa-cash-register"></i> Dinero Real en Caja
                </h3>
                <div class="form-group">
                    <label class="form-label">💵 Dinero Real Contado ($)</label>
                    <input type="number" id="dineroReal" class="form-input" placeholder="Ingresá el dinero real en caja" min="0" step="0.01" oninput="calcularDiferencia()">
                    <small class="text-muted" style="display: block; margin-top: 0.375rem; font-size: 0.8125rem;">
                        Ingresá el monto total que contaste físicamente en la caja
                    </small>
                </div>
                
                <div id="diferencia-container" class="hidden" style="padding: 1rem; border-radius: var(--radius-md); margin-top: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600;">Diferencia:</span>
                        <span id="diferencia-monto" style="font-size: 1.25rem; font-weight: 800;"></span>
                    </div>
                </div>
            </div>
            
            <button class="btn btn-warning mt-2" onclick="confirmarCierreCaja()">
                <i class="fas fa-lock"></i>
                Confirmar Cierre de Caja
            </button>
            
            <button class="btn btn-secondary" onclick="location.hash='historial-cajas'">
                <i class="fas fa-history"></i>
                Ver Historial
            </button>
        `;

    } catch (error) {
        hideLoading();
        showToast('Error: ' + error.message);
    }
}

function calcularDiferencia() {
    const dineroReal = parseFloat(document.getElementById('dineroReal').value) || 0;
    const diferencia = dineroReal - window.totalGeneralCaja;
    const container = document.getElementById('diferencia-container');
    const montoSpan = document.getElementById('diferencia-monto');

    if (dineroReal > 0) {
        container.classList.remove('hidden');
        montoSpan.textContent = `$${formatCurrency(Math.abs(diferencia))}`;

        if (diferencia === 0) {
            container.style.background = 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)';
            container.style.color = '#065f46';
            montoSpan.style.color = '#065f46';
        } else if (diferencia > 0) {
            container.style.background = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
            container.style.color = '#92400e';
            montoSpan.style.color = '#92400e';
            montoSpan.textContent = `+$${formatCurrency(diferencia)} (Sobrante)`;
        } else {
            container.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
            container.style.color = '#991b1b';
            montoSpan.style.color = '#991b1b';
            montoSpan.textContent = `-$${formatCurrency(Math.abs(diferencia))} (Faltante)`;
        }
    } else {
        container.classList.add('hidden');
    }
}

async function confirmarCierreCaja() {
    const dineroReal = parseFloat(document.getElementById('dineroReal').value) || 0;

    if (dineroReal === 0) {
        showToast('Por favor ingresá el dinero real en caja');
        return;
    }

    const diferencia = dineroReal - window.totalGeneralCaja;
    let mensaje = '¿Confirmar cierre de caja del día?';

    if (diferencia !== 0) {
        if (diferencia > 0) {
            mensaje += `\n\n⚠️ SOBRANTE: $${formatCurrency(diferencia)}`;
        } else {
            mensaje += `\n\n⚠️ FALTANTE: $${formatCurrency(Math.abs(diferencia))}`;
        }
    } else {
        mensaje += '\n\n✅ Caja cuadrada (sin diferencias)';
    }

    if (!confirm(mensaje)) return;

    showLoading();

    try {
        const response = await apiPost({
            action: 'cerrar_caja',
            dineroReal: dineroReal
        });

        hideLoading();

        if (response.success) {
            let alertMsg = `✅ Caja cerrada exitosamente\n\nTotal Sistema: $${formatCurrency(response.totalGeneral)}\nDinero Real: $${formatCurrency(dineroReal)}\nPedidos: ${response.cantidadPedidos}`;

            if (diferencia !== 0) {
                alertMsg += `\n\nDiferencia: $${formatCurrency(Math.abs(diferencia))} ${diferencia > 0 ? '(Sobrante)' : '(Faltante)'}`;
            }

            alert(alertMsg);
            location.hash = 'historial-cajas';
        } else {
            showToast('Error al cerrar caja');
        }
    } catch (error) {
        hideLoading();
        showToast('Error: ' + error.message);
    }
}

// ============================================
// PANTALLA: HISTORIAL DE CAJAS
// ============================================
async function renderHistorialCajas(container) {
    showLoading();
    try {
        const response = await apiGet('cajas');
        const cajas = response.cajas || [];

        hideLoading();

        if (cajas.length === 0) {
            container.innerHTML = `
                <div class="card text-center" style="padding: 3rem 2rem;">
                    <div style="width: 80px; height: 80px; background: var(--gray-100); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                        <i class="fas fa-archive" style="font-size: 2.5rem; color: var(--gray-400);"></i>
                    </div>
                    <p class="text-muted" style="font-size: 1.125rem;">No hay cajas cerradas aún</p>
                </div>
            `;
            return;
        }

        let html = '<div class="table-responsive"><table>';
        html += `
            <tr>
                <th><i class="far fa-calendar"></i> Fecha</th>
                <th><i class="fas fa-qrcode"></i> MP</th>
                <th><i class="fas fa-money-bill"></i> Efectivo</th>
                <th>💳 POINT</th>
                <th><i class="fas fa-coins"></i> Total</th>
                <th>💵 Real</th>
                <th>📊 Dif.</th>
                <th><i class="fas fa-shopping-bag"></i> Pedidos</th>
            </tr>
        `;

        cajas.forEach(caja => {
            const diferencia = (caja.diferencia || 0);
            let diferenciaStyle = '';
            let diferenciaText = '$' + formatCurrency(Math.abs(diferencia));

            if (diferencia === 0) {
                diferenciaStyle = 'color: #065f46; font-weight: 700;';
                diferenciaText = '✓';
            } else if (diferencia > 0) {
                diferenciaStyle = 'color: #92400e; font-weight: 700;';
                diferenciaText = '+$' + formatCurrency(diferencia);
            } else {
                diferenciaStyle = 'color: #991b1b; font-weight: 700;';
                diferenciaText = '-$' + formatCurrency(Math.abs(diferencia));
            }

            html += `
                <tr>
                    <td>${formatDate(new Date(caja.fecha))}</td>
                    <td>$${formatCurrency(caja.totalMercadoPago || 0)}</td>
                    <td>$${formatCurrency(caja.totalEfectivo || 0)}</td>
                    <td>$${formatCurrency(caja.totalPoint || 0)}</td>
                    <td><strong style="color: var(--primary-600);">$${formatCurrency(caja.totalGeneral)}</strong></td>
                    <td>$${formatCurrency(caja.dineroReal || 0)}</td>
                    <td style="${diferenciaStyle}">${diferenciaText}</td>
                    <td>${caja.cantidadPedidos}</td>
                </tr>
            `;
        });

        html += '</table></div>';

        container.innerHTML = html;

    } catch (error) {
        hideLoading();
        showToast('Error: ' + error.message);
    }
}

// ============================================
// PANTALLA: GESTIÓN DE PRODUCTOS
// ============================================
async function renderGestionProductos(container) {
    showLoading();
    try {
        const response = await apiGet('productos_admin');
        const todosProductos = response.productos || [];

        productos = todosProductos.filter(p => p.activo);

        hideLoading();

        let html = `
            <div class="mb-2">
                <button class="btn btn-primary" onclick="mostrarFormularioProducto()">
                    <i class="fas fa-plus-circle"></i>
                    Nuevo Producto
                </button>
            </div>
            
            <div id="formulario-producto" class="card mb-2 hidden" style="border-left: 4px solid var(--primary-600);">
                <h3 id="form-titulo" style="margin-bottom: 1.25rem;">
                    <i class="fas fa-box"></i> Nuevo Producto
                </h3>
                <input type="hidden" id="prod-id">
                
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-tag"></i> Nombre</label>
                    <input type="text" id="prod-nombre" class="form-input" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-folder"></i> Categoría</label>
                    <input type="text" id="prod-categoria" class="form-input" list="categorias-list" required>
                    <datalist id="categorias-list">
                        <option value="Bebidas calientes">
                        <option value="Bebidas frías">
                        <option value="Panadería">
                        <option value="Comidas">
                        <option value="Postres">
                    </datalist>
                </div>
                
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-dollar-sign"></i> Precio ($)</label>
                    <input type="number" id="prod-precio" class="form-input" required min="0">
                </div>
                
                <div class="form-group">
                    <label class="form-label" style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="prod-activo" checked style="width: auto;">
                        <i class="fas fa-check-circle" style="color: var(--primary-600);"></i> Activo
                    </label>
                </div>
                
                <div style="display: flex; gap: 0.75rem;">
                    <button class="btn btn-success" onclick="guardarProducto()" style="flex: 1;">
                        <i class="fas fa-save"></i> Guardar
                    </button>
                    <button class="btn btn-secondary" onclick="ocultarFormularioProducto()" style="flex: 1;">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                </div>
            </div>

            <div class="table-responsive">
                <table>
                    <tr>
                        <th><i class="fas fa-box"></i> Nombre</th>
                        <th><i class="fas fa-dollar-sign"></i> Precio</th>
                        <th><i class="fas fa-toggle-on"></i> Estado</th>
                        <th><i class="fas fa-cog"></i> Acción</th>
                    </tr>
        `;

        todosProductos.forEach(prod => {
            const estadoClass = prod.activo ? 'badge-pagado' : 'badge-cancelado';
            const estadoTexto = prod.activo ? 'Activo' : 'Inactivo';

            html += `
                <tr>
                    <td>
                        <div style="font-weight: 700; color: var(--gray-800);">${prod.nombre}</div>
                        <div style="font-size: 0.8125em; color: var(--gray-500);">${prod.categoria}</div>
                    </td>
                    <td><strong style="color: var(--primary-600);">$${formatCurrency(prod.precio)}</strong></td>
                    <td><span class="badge ${estadoClass}"><i class="fas fa-circle" style="font-size: 0.4rem;"></i> ${estadoTexto}</span></td>
                    <td>
                        <button class="btn btn-small btn-info" onclick='editarProducto(${JSON.stringify(prod)})'>
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</table></div>';
        container.innerHTML = html;

    } catch (error) {
        hideLoading();
        showToast('Error al cargar productos: ' + error.message);
    }
}

function mostrarFormularioProducto(producto = null) {
    const form = document.getElementById('formulario-producto');
    const titulo = document.getElementById('form-titulo');
    document.getElementById('prod-id').value = producto ? producto.id : '';
    document.getElementById('prod-nombre').value = producto ? producto.nombre : '';
    document.getElementById('prod-categoria').value = producto ? producto.categoria : '';
    document.getElementById('prod-precio').value = producto ? producto.precio : '';
    document.getElementById('prod-activo').checked = producto ? producto.activo : true;

    titulo.innerHTML = producto ? '<i class="fas fa-edit"></i> Editar Producto' : '<i class="fas fa-plus-circle"></i> Nuevo Producto';
    form.classList.remove('hidden');
    form.scrollIntoView({ behavior: 'smooth' });
}

function ocultarFormularioProducto() {
    document.getElementById('formulario-producto').classList.add('hidden');
}

function editarProducto(producto) {
    mostrarFormularioProducto(producto);
}

async function guardarProducto() {
    const id = document.getElementById('prod-id').value;
    const nombre = document.getElementById('prod-nombre').value.trim();
    const categoria = document.getElementById('prod-categoria').value.trim();
    const precio = document.getElementById('prod-precio').value;
    const activo = document.getElementById('prod-activo').checked;

    if (!nombre || !categoria || !precio) {
        showToast('Completá todos los campos obligatorios');
        return;
    }

    showLoading();

    try {
        const response = await apiPost({
            action: 'gestionar_producto',
            id: id || null,
            nombre: nombre,
            categoria: categoria,
            precio: Number(precio),
            activo: activo
        });

        hideLoading();

        if (response.success) {
            showToast(response.message || 'Producto guardado');
            ocultarFormularioProducto();
            renderGestionProductos(document.getElementById('app-container'));
        } else {
            showToast('Error: ' + response.error);
        }
    } catch (error) {
        hideLoading();
        showToast('Error de conexión: ' + error.message);
    }
}

// ============================================
// API CLIENT
// ============================================
async function apiGet(path, params = {}) {
    const targetUrl = new URL(APPS_SCRIPT_URL);
    targetUrl.searchParams.append('path', path);
    targetUrl.searchParams.append('_t', new Date().getTime());

    for (const key in params) {
        targetUrl.searchParams.append(key, params[key]);
    }

    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl.toString())}`;

    const response = await fetch(proxyUrl);

    if (!response.ok) {
        throw new Error('Error en la petición');
    }

    return await response.json();
}

async function apiPost(data) {
    // Agregar timestamp para evitar caché del proxy
    const targetUrl = new URL(APPS_SCRIPT_URL);
    targetUrl.searchParams.append('_t', new Date().getTime());

    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl.toString())}`;

    const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error('Error en la petición');
    }

    return await response.json();
}

async function cargarProductos() {
    try {
        const response = await apiGet('productos');
        productos = response.productos || [];
    } catch (error) {
        showToast('Error al cargar productos: ' + error.message);
    }
}

// ============================================
// HELPERS
// ============================================
function formatCurrency(amount) {
    return amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(date) {
    return date.toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateTime(date) {
    const d = new Date(date);
    return d.toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getFechaHoy() {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}
