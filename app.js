// ============================================
// CONFIGURACIÓN
// ============================================
// NOTA IMPORTANTE: Reemplaza esta URL por la URL real donde subiste tu api.php en Hostinger
// Ejemplo: 'https://midominio.com/api.php' o 'https://micuenta.hostinger.com/api.php'
const APPS_SCRIPT_URL = 'https://synergydev.com.ar/PScomanda/api.php';

// ============================================
// BANNER CONFIGURABLE — Cambiar según cliente
// ============================================
const BANNER_CONFIG = {
    // Tipo: 'gradient', 'image', o 'none'
    type: 'image',
    // Si type es 'image', poner la URL aquí:
    imageUrl: 'https://synergydev.com.ar/Img/bannerej.webp',
    // Gradiente de fondo (si type es 'gradient'):
    gradient: 'linear-gradient(135deg, #008C94 0%, #00b4b4 40%, #0ea5e9 100%)',
    // Overlay oscuro sobre la imagen (si type es 'image'):
    overlay: 'linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 100%)',
    // Texto del banner:
    title: '¡Bienvenido Puro Sabor!',
    subtitle: 'Gestión inteligente de pedidos',
    // Ícono (Font Awesome class):
    icon: 'fas fa-store'
};

// Estado global
let productos = [];
let pedidoActual = [];
let pedidosDelDia = [];
let cadetes = [];
let filtroBusqueda = '';
let filtroCategoria = 'Todas';
let clockInterval = null;
let operacionesPendientes = 0; // Contador global para sincronización

// ============================================
// THEME SYSTEM
// ============================================
function initTheme() {
    const saved = localStorage.getItem('comanda_theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    updateThemeIcon();
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('comanda_theme', next);
    updateThemeIcon();

    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.content = next === 'dark' ? '#0c1220' : '#008C94';
    }
}

function updateThemeIcon() {
    const btn = document.getElementById('btn-theme');
    if (!btn) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.innerHTML = isDark
        ? '<i class="fas fa-sun"></i>'
        : '<i class="fas fa-moon"></i>';
    btn.title = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('App inicializando...');
    try {
        initTheme();
        window.addEventListener('hashchange', renderPage);

        // Protección contra cierre accidental (V11)
        window.addEventListener('beforeunload', (e) => {
            if (operacionesPendientes > 0) {
                e.preventDefault();
                e.returnValue = ''; // Muestra diálogo estándar del navegador
            }
        });

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

    // Limpiar clock interval si existe
    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }

    // Asegurar que el body vuelva a poder hacer scroll (por si quedó bloqueado por el carrito)
    document.body.style.overflow = '';

    // (V9) Login Check
    if (!isAuthenticated() && page !== 'login') {
        location.hash = 'login';
        return;
    }

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

    // Renderizar página con transición
    switch (page) {
        case 'login':
            headerTitle.textContent = 'Acceso Restringido 🔒';
            renderLogin(container);
            break;
        case 'home':
            headerTitle.textContent = 'Comanda Digital';
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

async function login() {
    const userInput = document.getElementById('login-user').value.trim();
    const passInput = document.getElementById('login-pass').value.trim();

    if (!userInput || !passInput) {
        showToast('Completá ambos campos', 'error');
        return;
    }

    const btnLogin = document.querySelector('.login-card .btn-primary');
    const originalText = btnLogin.innerHTML;
    btnLogin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando...';
    btnLogin.disabled = true;

    try {
        const response = await apiPost({
            action: 'login',
            username: userInput,
            password: passInput
        });

        if (response.success) {
            localStorage.setItem('comanda_auth', 'true');
            localStorage.setItem('comanda_auth_time', new Date().getTime().toString());
            localStorage.setItem('comanda_rol', response.rol);
            showToast('✅ Bienvenido al sistema', 'success');
            location.hash = 'home';
        } else {
            showToast(response.error || 'Credenciales incorrectas', 'error');
            shakeLoginCard();
        }
    } catch (error) {
        showToast('Error de conexión: ' + error.message, 'error');
        shakeLoginCard();
    } finally {
        btnLogin.innerHTML = originalText;
        btnLogin.disabled = false;
    }
}

function shakeLoginCard() {
    const card = document.querySelector('.login-card');
    if (card) {
        card.style.animation = 'none';
        card.offsetHeight; // trigger reflow
        card.style.animation = 'shake 0.4s ease-in-out';
    }
}

function logout() {
    localStorage.removeItem('comanda_auth');
    localStorage.removeItem('comanda_auth_time');
    location.hash = 'login';
}

// ============================================
// HELPERS: SALUDO Y RELOJ
// ============================================
function getSaludo() {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) return { text: 'Buenos días ☀️', emoji: '☀️' };
    if (hora >= 12 && hora < 19) return { text: 'Buenas tardes 🌤️', emoji: '🌤️' };
    return { text: 'Buenas noches 🌙', emoji: '🌙' };
}

function getTimeString() {
    return new Date().toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

function getDateString() {
    return new Date().toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function startClock() {
    const updateClock = () => {
        const timeEl = document.getElementById('live-time');
        const dateEl = document.getElementById('live-date');
        if (timeEl) timeEl.textContent = getTimeString();
        if (dateEl) dateEl.textContent = getDateString();
    };
    updateClock();
    clockInterval = setInterval(updateClock, 1000);
}

// ============================================
// PANTALLA: LOGIN
// ============================================
function renderLogin(container) {
    hideLoading();

    container.innerHTML = `
        <div class="login-wrapper">
            <div class="login-card">
                <div class="login-icon">
                    <i class="fas fa-lock"></i>
                </div>
                <h2>Iniciar Sesión</h2>
                <p class="login-subtitle">Acceso al sistema de comanda</p>
                
                <div class="form-group" style="text-align: left;">
                    <label class="form-label"><i class="fas fa-user" style="margin-right: 0.375rem; color: var(--primary-600);"></i>Usuario</label>
                    <input type="text" id="login-user" class="form-input" placeholder="Ingresá tu usuario" autocomplete="username">
                </div>
                
                <div class="form-group" style="text-align: left;">
                    <label class="form-label"><i class="fas fa-key" style="margin-right: 0.375rem; color: var(--primary-600);"></i>Contraseña</label>
                    <input type="password" id="login-pass" class="form-input" placeholder="Ingresá tu contraseña" autocomplete="current-password">
                </div>
                
                <button class="btn btn-primary" onclick="login()" style="margin-top: 0.5rem;">
                    Ingresar <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        </div>
    `;

    // Shake animation keyframe (injected once)
    if (!document.getElementById('shake-style')) {
        const style = document.createElement('style');
        style.id = 'shake-style';
        style.textContent = `
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                20% { transform: translateX(-8px); }
                40% { transform: translateX(8px); }
                60% { transform: translateX(-6px); }
                80% { transform: translateX(6px); }
            }
        `;
        document.head.appendChild(style);
    }

    // Enter key para login
    const passInput = document.getElementById('login-pass');
    if (passInput) {
        passInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') login();
        });
    }
    const userInput = document.getElementById('login-user');
    if (userInput) {
        userInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') document.getElementById('login-pass').focus();
        });
    }
}

// ============================================
// PANTALLA: HOME — Rediseñada
// ============================================
function renderHome(container) {
    const saludo = getSaludo();

    // Banner HTML
    let bannerHTML = '';
    if (BANNER_CONFIG.type !== 'none') {
        const bgStyle = BANNER_CONFIG.type === 'image'
            ? `background-image: url('${BANNER_CONFIG.imageUrl}'); background-size: cover; background-position: center;`
            : `background: ${BANNER_CONFIG.gradient};`;
        const overlayStyle = BANNER_CONFIG.type === 'image'
            ? `background: ${BANNER_CONFIG.overlay};`
            : '';
        bannerHTML = `
            <div class="home-banner">
                <div class="home-banner-bg" style="${bgStyle}"></div>
                ${overlayStyle ? `<div class="home-banner-overlay" style="${overlayStyle}"></div>` : ''}
                <div class="home-banner-content">
                    ${BANNER_CONFIG.icon ? `<i class="${BANNER_CONFIG.icon}" style="font-size: 1.75rem; margin-bottom: 0.5rem; opacity: 0.9;"></i>` : ''}
                    <h3>${BANNER_CONFIG.title}</h3>
                    <p>${BANNER_CONFIG.subtitle}</p>
                </div>
            </div>
        `;
    }

    const menuItems = [
        {
            hash: 'nuevo-pedido',
            icon: 'fas fa-plus',
            bg: 'var(--gradient-primary)',
            label: 'Nuevo Pedido',
            desc: 'Crear un pedido',
            colorClass: 'card--primary'
        },
        {
            hash: 'pedidos',
            icon: 'fas fa-clipboard-list',
            bg: 'var(--gradient-secondary)',
            label: 'Pedidos del Día',
            desc: 'Ver y gestionar',
            colorClass: 'card--blue'
        },
        {
            hash: 'cerrar-caja',
            icon: 'fas fa-cash-register',
            bg: 'var(--gradient-warning)',
            label: 'Cerrar Caja',
            desc: 'Balance del día',
            colorClass: 'card--amber'
        },
        {
            hash: 'historial-cajas',
            icon: 'fas fa-chart-line',
            bg: 'var(--gradient-dark)',
            label: 'Historial',
            desc: 'Cajas cerradas',
            colorClass: 'card--dark'
        },
        {
            hash: 'gestionar-productos',
            icon: 'fas fa-boxes',
            bg: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
            label: 'Productos',
            desc: 'ABM completo',
            colorClass: 'card--primary'
        },
        {
            hash: null,
            icon: 'fas fa-chart-bar',
            bg: 'var(--gradient-dark)',
            label: 'Métricas',
            desc: 'Plan Premium',
            colorClass: 'card--disabled',
            disabled: true
        }
    ];

    const cardsHTML = menuItems.map((item, i) => {
        const delay = (i * 60) + 100;
        const clickHandler = item.disabled ? '' : `onclick="location.hash='${item.hash}'"`;
        const disabledClass = item.disabled ? 'card--disabled' : '';
        return `
            <div class="home-card ${item.colorClass} ${disabledClass} stagger-item" 
                 style="animation-delay: ${delay}ms" ${clickHandler}>
                <div class="card-icon" style="background: ${item.bg};">
                    <i class="${item.icon}"></i>
                </div>
                <span class="card-label">${item.label}</span>
                <span class="card-desc">${item.desc}</span>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="page-transition">
            ${bannerHTML}

            <div class="home-clock-bar">
                <div class="clock-greeting">
                    <span class="greeting-text">${saludo.text}</span>
                    <span class="greeting-sub">Sistema de comanda</span>
                </div>
                <div class="clock-time">
                    <span class="time-display" id="live-time">${getTimeString()}</span>
                    <span class="date-display" id="live-date">${getDateString()}</span>
                </div>
            </div>

            <div class="home-grid">
                ${cardsHTML}
            </div>
        </div>
    `;

    startClock();
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
        <div class="page-transition">
        <div class="search-container mb-2" style="position: sticky; top: 0; z-index: 100; padding: 1rem;">
            <div class="form-group" style="margin-bottom: 0.75rem;">
                <div style="position: relative;">
                    <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
                    <input type="text" id="busquedaProducto" class="form-input" placeholder="Buscar producto..." value="${filtroBusqueda}" oninput="actualizarFiltroBusqueda(this.value)" style="padding-left: 38px;">
                </div>
            </div>
            
            <div class="categorias-wrapper" style="display: flex; align-items: center; gap: 0.5rem;">
                <button class="scroll-btn" onclick="document.getElementById('categoriasScroll').scrollBy({left: -100, behavior: 'smooth'})">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <div class="categorias-scroll" id="categoriasScroll" style="flex: 1;">
                    <button class="btn-filtro ${filtroCategoria === 'Todas' ? 'active' : ''}" onclick="filtrarCategoria('Todas')">Todas</button>
                    ${allCategories.map(cat => `
                        <button class="btn-filtro ${filtroCategoria === cat ? 'active' : ''}" onclick="filtrarCategoria('${cat}')">${cat}</button>
                    `).join('')}
                </div>
                <button class="scroll-btn" onclick="document.getElementById('categoriasScroll').scrollBy({left: 100, behavior: 'smooth'})">
                    <i class="fas fa-chevron-right"></i>
                </button>
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
            <h2 style="margin-top: 1.25rem;">
                <i class="fas fa-tag" style="font-size: 1.125rem;"></i>
                ${categoria}
            </h2>
        `;

        prods.forEach(producto => {
            const cantidad = getCantidadEnPedido(producto.id);
            html += `
                <div class="producto-item" id="item-${producto.id}" style="flex-direction: column; align-items: stretch; gap: 0.625rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                        <div class="producto-info">
                            <div class="producto-nombre">${producto.nombre}</div>
                            <div class="producto-categoria">${producto.categoria}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div class="producto-precio">$${formatCurrency(producto.precio)}</div>
                            <div class="producto-actions">
                                <button class="btn-cantidad" onclick="cambiarCantidad('${producto.id}', -1)">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <span class="cantidad-display" id="qty-${producto.id}">${cantidad}</span>
                                <button class="btn-cantidad" onclick="cambiarCantidad('${producto.id}', 1)">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div id="nota-container-${producto.id}">
                        ${cantidad > 0 ? `
                            <div class="producto-nota" style="margin-top: 2px;">
                                <input type="text" class="form-input" style="font-size: 0.8125rem; padding: 0.5rem; background: var(--bg-hover);" 
                                    placeholder="📝 Agregar nota específica..." 
                                    value="${pedidoActual.find(i => i.id === producto.id)?.nota || ''}"
                                    oninput="actualizarNota('${producto.id}', this.value)">
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
    }

    html += '</div>';
    html += '</div>';

    // Floating cart button and drawer markup
    html += `
        <button class="floating-cart-btn" id="floatingCartBtn" style="display: none;" onclick="abrirCarrito()">
            <i class="fas fa-shopping-cart"></i>
            <span class="badge-count" id="floatingCartCount">0</span>
            <span id="floatingCartTotal">$0</span>
        </button>

        <div class="cart-drawer-overlay" id="cartDrawerOverlay" onclick="cerrarCarrito()"></div>
        <div class="cart-drawer" id="cartDrawer">
            <div class="cart-drawer-header">
                <h3><i class="fas fa-shopping-cart"></i> Tu Pedido</h3>
                <button class="cart-drawer-close" onclick="cerrarCarrito()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="cart-drawer-body" id="seccion-resumen-pedido">
                <!-- El contenido de renderHTMLResumenPedido se inyectará aquí -->
            </div>
        </div>
    </div>`;
    
    container.innerHTML = html;

    // Actualizar estado inicial del carrito flotante
    const itemsCount = pedidoActual.reduce((sum, item) => sum + item.cantidad, 0);
    if (itemsCount > 0) {
        document.getElementById('seccion-resumen-pedido').innerHTML = renderHTMLResumenPedido();
        actualizarBotonFlotante();
    }
}

// Genera solo el HTML del resumen y datos del cliente (V10)
function renderHTMLResumenPedido() {
    const total = calcularTotal();
    return `
        <div class="resumen-pedido">
            <h3><i class="fas fa-shopping-cart"></i> Resumen del Pedido</h3>
            <div class="resumen-items">
                ${pedidoActual.map(item => `
                    <div class="resumen-item" style="flex-direction: column; align-items: flex-start;">
                        <div style="display: flex; justify-content: space-between; width: 100%;">
                            <span>${item.cantidad}x ${item.producto}</span>
                            <span>$${formatCurrency(item.cantidad * item.precio)}</span>
                        </div>
                        ${item.nota ? `<small class="text-muted" style="font-style: italic; color: rgba(255,255,255,0.7);" id="resumen-nota-${item.id}">Nota: ${item.nota}</small>` : `<div id="resumen-nota-${item.id}"></div>`}
                    </div>
                `).join('')}
            </div>
            <div class="resumen-total">
                <span>TOTAL</span>
                <span>$${formatCurrency(total)}</span>
            </div>
        </div>
        
        <div class="card">
            <h3 style="margin-bottom: 1.25rem; font-size: 1.0625rem;">
                <i class="fas fa-user" style="color: var(--primary-600);"></i> Datos del Cliente
            </h3>
            
            <div class="form-group">
                <label class="form-label">Nombre del Cliente <span style="color: var(--danger-500);">*</span></label>
                <input type="text" id="nombreCliente" class="form-input" placeholder="Nombre completo" required minlength="3">
                <small class="text-muted" style="display: block; margin-top: 0.375rem; font-size: 0.75rem;">Mínimo 3 caracteres</small>
            </div>
            
            <div class="form-group">
                <label class="form-label"><i class="fas fa-mobile-alt" style="margin-right: 0.25rem;"></i> Celular (WhatsApp)</label>
                <input type="tel" id="celularCliente" class="form-input" placeholder="Ej: 11 1234 5678">
                <small class="text-muted" style="display: block; margin-top: 0.375rem; font-size: 0.75rem;">Solo números (opcional)</small>
            </div>
            
            <div class="form-group">
                <label class="form-label"><i class="fas fa-truck" style="margin-right: 0.25rem;"></i> Tipo de Entrega</label>
                <select id="tipoEntrega" class="form-select" onchange="toggleDomicilio()">
                    <option value="retira">🏠 Retira en el local</option>
                    <option value="envio">🚚 Requiere envío</option>
                </select>
            </div>
            
            <div class="form-group hidden" id="domicilio-group">
                <label class="form-label"><i class="fas fa-map-marker-alt" style="margin-right: 0.25rem;"></i> Domicilio de Entrega</label>
                <input type="text" id="domicilioCliente" class="form-input" placeholder="Calle y número">
            </div>
            
            <div class="form-group">
                <label class="form-label"><i class="fas fa-comment-alt" style="margin-right: 0.25rem;"></i> Observaciones</label>
                <textarea id="observaciones" class="form-textarea" placeholder="Ej: Sin cebolla, extra queso..."></textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label"><i class="fas fa-credit-card" style="margin-right: 0.25rem;"></i> Método de Pago</label>
                <select id="metodoPago" class="form-select">
                    <option value="mercadopago">📱 Mercado Pago</option>
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="point">💳 POINT (Posnet)</option>
                    <option value="transferencia">🏦 Transferencia</option>
                </select>
            </div>
            
            <button class="btn btn-primary" onclick="confirmarPedido()" style="margin-top: 1rem;">
                <i class="fas fa-check-circle"></i>
                Confirmar Pedido
            </button>
            <button class="btn btn-danger" onclick="cancelarPedido()">
                <i class="fas fa-times-circle"></i>
                Cancelar
            </button>
        </div>
    `;
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

    // (V10) Optimización: Actualización parcial del DOM
    actualizarUIDespuesDeCambioCantidad(productoId);
}

function actualizarUIDespuesDeCambioCantidad(productoId) {
    const cantidad = getCantidadEnPedido(productoId);

    // 1. Actualizar contador en la lista
    const qtyDisplay = document.getElementById(`qty-${productoId}`);
    if (qtyDisplay) {
        qtyDisplay.textContent = cantidad;
        // Visual feedback
        qtyDisplay.style.transform = 'scale(1.3)';
        setTimeout(() => { qtyDisplay.style.transform = 'scale(1)'; }, 150);
    }

    // 2. Mostrar/Ocultar campo de notas
    const notaContainer = document.getElementById(`nota-container-${productoId}`);
    if (notaContainer) {
        if (cantidad > 0 && !notaContainer.innerHTML.trim()) {
            notaContainer.innerHTML = `
                <div class="producto-nota" style="margin-top: 2px;">
                    <input type="text" class="form-input" style="font-size: 0.8125rem; padding: 0.5rem; background: var(--bg-hover);" 
                        placeholder="📝 Agregar nota específica..." 
                        oninput="actualizarNota('${productoId}', this.value)">
                </div>
            `;
        } else if (cantidad === 0) {
            notaContainer.innerHTML = '';
        }
    }

    // 3. Actualizar resumen inferior (ahora en el panel lateral)
    const seccionResumen = document.getElementById('seccion-resumen-pedido');
    if (seccionResumen) {
        const itemsCount = pedidoActual.reduce((sum, item) => sum + item.cantidad, 0);
        if (itemsCount > 0) {
            // Preservar valores de los inputs si ya existen
            const nombre = document.getElementById('nombreCliente')?.value;
            const celular = document.getElementById('celularCliente')?.value;
            const tipo = document.getElementById('tipoEntrega')?.value;
            const domi = document.getElementById('domicilioCliente')?.value;
            const obs = document.getElementById('observaciones')?.value;
            const pago = document.getElementById('metodoPago')?.value;

            seccionResumen.innerHTML = renderHTMLResumenPedido();

            // Restaurar valores
            if (nombre) document.getElementById('nombreCliente').value = nombre;
            if (celular) document.getElementById('celularCliente').value = celular;
            if (tipo) {
                document.getElementById('tipoEntrega').value = tipo;
                if (tipo === 'envio') document.getElementById('domicilio-group')?.classList.remove('hidden');
            }
            if (domi) document.getElementById('domicilioCliente').value = domi;
            if (obs) document.getElementById('observaciones').value = obs;
            if (pago) document.getElementById('metodoPago').value = pago;
        } else {
            seccionResumen.innerHTML = '';
            cerrarCarrito(); // Si se vacía el carrito, lo cerramos
        }
    }

    // 4. Actualizar botón flotante
    actualizarBotonFlotante();
}

function actualizarBotonFlotante() {
    const btn = document.getElementById('floatingCartBtn');
    const countEl = document.getElementById('floatingCartCount');
    const totalEl = document.getElementById('floatingCartTotal');
    
    if (!btn || !countEl || !totalEl) return;

    const itemsCount = pedidoActual.reduce((sum, item) => sum + item.cantidad, 0);
    const total = calcularTotal();

    if (itemsCount > 0) {
        btn.style.display = 'flex';
        countEl.textContent = itemsCount;
        totalEl.textContent = '$' + formatCurrency(total);
        
        // Animación sutil
        btn.style.transform = 'scale(1.05)';
        setTimeout(() => btn.style.transform = '', 200);
    } else {
        btn.style.display = 'none';
    }
}

function abrirCarrito() {
    document.getElementById('cartDrawer').classList.add('active');
    document.getElementById('cartDrawerOverlay').classList.add('active');
    // Prevenir scroll en el body
    document.body.style.overflow = 'hidden';
}

function cerrarCarrito() {
    document.getElementById('cartDrawer').classList.remove('active');
    document.getElementById('cartDrawerOverlay').classList.remove('active');
    // Restaurar scroll
    document.body.style.overflow = '';
}

async function cargarProductos() {
    // Intentar cargar desde caché local para acceso inmediato
    const cached = localStorage.getItem('comanda_productos_cache');
    if (cached) {
        productos = JSON.parse(cached);
        console.log('Productos cargados desde caché local');
    }

    try {
        const response = await apiGet('productos');
        if (response.productos) {
            productos = response.productos;
            localStorage.setItem('comanda_productos_cache', JSON.stringify(productos));
        }
    } catch (error) {
        console.error('Error al cargar productos:', error);
        if (!productos.length) {
            showToast('Error al cargar productos: ' + error.message, 'error');
        }
    }
}

// Debounce para el buscador (V10)
let debounceTimer;
function actualizarFiltroBusqueda(val) {
    filtroBusqueda = val;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        renderNuevoPedido(document.getElementById('app-container'));

        // Restaurar foco después del renderizado demorado
        const input = document.getElementById('busquedaProducto');
        if (input) {
            input.focus();
            input.setSelectionRange(val.length, val.length);
        }
    }, 150);
}

function filtrarCategoria(cat) {
    filtroCategoria = cat;
    renderNuevoPedido(document.getElementById('app-container'));
}

function actualizarNota(productoId, nota) {
    const itemIndex = pedidoActual.findIndex(p => p.id === productoId);
    if (itemIndex >= 0) {
        pedidoActual[itemIndex].nota = nota;

        // Optimización (V11): Actualización quirúrgica del DOM en lugar de render completo
        const elNota = document.getElementById(`resumen-nota-${productoId}`);
        if (elNota) {
            if (nota) {
                elNota.innerHTML = `Nota: ${nota}`;
                elNota.className = 'text-muted';
                elNota.style.cssText = 'font-style: italic; color: rgba(255,255,255,0.7); display: block; margin-top: 2px; font-size: 0.75rem;';
            } else {
                elNota.innerHTML = '';
            }
        }
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
        showToast('El pedido está vacío', 'error');
        return;
    }

    if (nombre.length < 3) {
        showToast('El nombre debe tener al menos 3 caracteres', 'error');
        return;
    }

    if (tipoEntrega === 'envio' && !domicilio) {
        showToast('Debés ingresar el domicilio de entrega', 'error');
        return;
    }

    if (celular && !/^\d{8,15}$/.test(celular.replace(/\s/g, ''))) {
        showToast('El celular debe contener solo números (mínimo 8)', 'error');
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
            cerrarCarrito(); // Ocultar el panel del carrito tras confirmar
            if (metodoPago === 'mercadopago' && response.linkPago) {
                mostrarLinkPago(response);
            } else {
                showToast('✅ Pedido creado exitosamente', 'success');
                pedidoActual = [];
                location.hash = 'pedidos';
            }
        } else {
            showToast('Error al crear pedido: ' + response.error, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Error de conexión: ' + error.message, 'error');
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
        <div class="page-transition">
        <div class="card text-center">
            <div style="width: 72px; height: 72px; background: var(--gradient-success); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; box-shadow: var(--shadow-lg);">
                <i class="fas fa-check-circle" style="font-size: 2rem; color: white;"></i>
            </div>
            <h2 style="justify-content: center; margin-bottom: 0.25rem;">Pedido Creado</h2>
            <p class="text-muted" style="margin-bottom: 1.5rem;">ID: ${pedidoData.id}</p>
            
            <div class="qr-container">
                <h3><i class="fas fa-qrcode"></i> Escaneá el QR para pagar</h3>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pedidoData.linkPago)}" alt="QR Mercado Pago">
            </div>
            
            <p class="mb-1" style="font-weight: 600;">O copiá el link:</p>
            <input type="text" class="form-input mb-2" value="${pedidoData.linkPago}" readonly onclick="this.select()" style="text-align: center; font-family: monospace; font-size: 0.8125rem;">
            
            <div style="display: flex; flex-direction: column; gap: 0.625rem;">
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
        // Optimización (V11): Solo llamar a cadetes si no están en memoria
        const promises = [apiGet('pedidos', { fecha })];
        if (!window.cadetes || window.cadetes.length === 0) {
            promises.push(apiGet('cadetes'));
        }

        const responses = await Promise.all(promises);

        pedidosDelDia = responses[0].pedidos || [];
        if (responses[1]) {
            window.cadetes = responses[1].cadetes || [];
        }

        hideLoading();

        if (pedidosDelDia.length === 0) {
            container.innerHTML = `
                <div class="page-transition">
                <div class="card text-center" style="padding: 3rem 2rem;">
                    <div style="width: 72px; height: 72px; background: var(--bg-hover); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                        <i class="fas fa-inbox" style="font-size: 2rem; color: var(--text-muted);"></i>
                    </div>
                    <p class="text-muted" style="font-size: 1.0625rem; margin-bottom: 1.5rem;">No hay pedidos para hoy</p>
                    <button class="btn btn-primary" onclick="location.hash='nuevo-pedido'">
                        <i class="fas fa-plus-circle"></i>
                        Crear Primer Pedido
                    </button>
                </div>
                </div>
            `;
            return;
        }

        renderPedidosList(container, pedidosDelDia);

    } catch (error) {
        hideLoading();
        showToast('Error al cargar pedidos: ' + error.message, 'error');
    }
}

// Estado del filtro de pedidos
let filtroPedidosBusqueda = '';
let filtroPedidosEstado = 'todos';

function renderPedidosList(container, pedidos) {
    // Filtrar pedidos
    const filtrados = pedidos.filter(p => {
        // Filtro por estado (Case-insensitive)
        if (filtroPedidosEstado !== 'todos' && p.estado.toLowerCase() !== filtroPedidosEstado.toLowerCase()) return false;

        // Filtro por texto
        if (filtroPedidosBusqueda) {
            const q = filtroPedidosBusqueda.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const normalize = (str) => String(str || '').toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            
            // Buscar en campos básicos
            const matchBasico = (
                normalize(p.id).includes(q) ||
                normalize(p.nombre).includes(q) ||
                normalize(p.celular).includes(q) ||
                normalize(p.domicilio).includes(q) ||
                normalize(p.observaciones).includes(q) ||
                normalize(p.estado).includes(q)
            );

            // Buscar en items del pedido (V11)
            const matchItems = (p.items || []).some(item => 
                normalize(item.producto).includes(q)
            );

            if (!matchBasico && !matchItems) return false;
        }
        return true;
    });

    // Contar por estado para los badges (Case-insensitive)
    const conteo = { todos: pedidos.length, pendiente: 0, pagado: 0, entregado: 0, cancelado: 0 };
    pedidos.forEach(p => {
        const status = (p.estado || '').toLowerCase();
        if (conteo[status] !== undefined) conteo[status]++;
    });

    const estados = [
        { key: 'todos', label: 'Todos', icon: 'fas fa-list' },
        { key: 'pendiente', label: 'Pendientes', icon: 'fas fa-clock' },
        { key: 'pagado', label: 'Pagados', icon: 'fas fa-check' },
        { key: 'entregado', label: 'Entregados', icon: 'fas fa-box' },
        { key: 'cancelado', label: 'Cancelados', icon: 'fas fa-times' },
    ];

    let html = `
        <div style="position: sticky; top: 0; z-index: 50; background: var(--bg-body); padding: 0.75rem 0 0.5rem; margin: -0.25rem 0 0.75rem;">
            <div style="position: relative; margin-bottom: 0.625rem;">
                <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
                <input type="text" class="form-input" id="busquedaPedidos" placeholder="Buscar por ID, cliente, celular..." 
                    value="${filtroPedidosBusqueda}" 
                    oninput="filtrarPedidosTexto(this.value)"
                    style="padding-left: 38px; font-size: 0.875rem;">
            </div>
            <div class="categorias-scroll" style="gap: 0.375rem; padding-bottom: 0.25rem;">
                ${estados.map(e => `
                    <button class="btn-filtro ${filtroPedidosEstado === e.key ? 'active' : ''}" 
                            onclick="filtrarPedidosEstado('${e.key}')" 
                            style="font-size: 0.75rem; padding: 0.375rem 0.75rem; min-width: auto;">
                        <i class="${e.icon}" style="margin-right: 0.25rem; font-size: 0.625rem;"></i>${e.label} (${conteo[e.key]})
                    </button>
                `).join('')}
            </div>
        </div>`;

    if (filtrados.length === 0) {
        html += `
            <div class="card text-center" style="padding: 2rem;">
                <i class="fas fa-search" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <p class="text-muted">No se encontraron pedidos con ese filtro</p>
            </div>`;
    }

    filtrados.forEach((pedido, index) => {
        const estadoBadge = `<span class="badge badge-${pedido.estado}"><i class="fas fa-circle" style="font-size: 0.375rem;"></i> ${pedido.estado.toUpperCase()}</span>`;
        const iconP = {
            mercadopago: '<i class="fas fa-qrcode"></i> MP',
            point: '💳 POINT',
            efectivo: '<i class="fas fa-money-bill"></i> Efectivo',
            transferencia: '<i class="fas fa-university"></i> Transf.'
        };
        const metodoBadge = `<span class="badge badge-${pedido.metodoPago}">${iconP[pedido.metodoPago] || pedido.metodoPago}</span>`;
        const entregaBadge = `<span class="badge" style="background: ${pedido.tipoEntrega === 'retira' ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' : 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)'}; color: ${pedido.tipoEntrega === 'retira' ? '#1e40af' : '#9a3412'};">${pedido.tipoEntrega === 'retira' ? '🏠 Retira' : '🚚 Envío'}</span>`;

        // Estado border-left color
        const borderColors = {
            pendiente: '#fbbf24',
            pagado: '#22c55e',
            cancelado: '#ef4444',
            entregado: '#8b5cf6'
        };
        const borderColor = borderColors[pedido.estado.toLowerCase()] || 'var(--border-color)';

        html += `
                <div class="card stagger-item" style="animation-delay: ${index * 50}ms; border-left: 4px solid ${borderColor};">
                    <div class="card-header">
                        <div>
                        <div class="card-title">
                            <i class="fas fa-receipt" style="color: var(--primary-600);"></i>
                            ${pedido.id}
                            <span style="font-size: 0.85em; font-weight: normal; color: var(--text-muted);">
                                — ${pedido.nombre || 'Cliente'}
                            </span>
                        </div>
                        <div class="card-subtitle"><i class="far fa-clock"></i> ${formatDateTime(pedido.fecha)}</div>
                        ${pedido.domicilio ? `<div style="font-size: 0.8125em; margin-top: 0.375rem; color: var(--text-secondary);"><i class="fas fa-map-marker-alt" style="color: var(--danger-500);"></i> ${pedido.domicilio}</div>` : ''}
                        ${pedido.celular ? `<div style="font-size: 0.8125em; margin-top: 0.25rem; color: var(--text-secondary);"><i class="fas fa-phone" style="color: var(--primary-600);"></i> ${pedido.celular}</div>` : ''}
                    </div>
                    <div style="text-align: right; display: flex; flex-direction: column; gap: 0.375rem; align-items: flex-end;">
                        <span class="badge badge-${pedido.estado.toLowerCase()}"><i class="fas fa-circle" style="font-size: 0.375rem;"></i> ${pedido.estado.toUpperCase()}</span>
                        ${metodoBadge}
                        ${entregaBadge}
                    </div>
                    </div>
                    <div class="card-body">
                        <strong style="color: var(--text-primary); font-size: 0.8125rem;"><i class="fas fa-list"></i> Items:</strong>
                        <ul style="margin: 0.625rem 0; padding-left: 1.25rem; color: var(--text-secondary); font-size: 0.875rem;">
                            ${pedido.items.map(item => `
                                <li style="margin-bottom: 0.25rem;">
                                    ${item.cantidad}x ${item.producto} — <strong>$${formatCurrency(item.cantidad * item.precio)}</strong>
                                    ${item.nota ? `<br><small style="font-style: italic; color: var(--primary-600); margin-left: 10px;">• ${item.nota}</small>` : ''}
                                </li>
                            `).join('')}
                        </ul>
                        <div style="display: flex; justify-content: flex-end; font-size: 1.125rem; font-weight: 800; color: var(--primary-600); letter-spacing: -0.02em;">
                            $${formatCurrency(pedido.total)}
                        </div>
                        ${pedido.observaciones ? `<p style="background: var(--bg-hover); padding: 0.625rem; border-radius: var(--radius); margin-top: 0.625rem; font-size: 0.8125rem;"><strong><i class="fas fa-comment-alt"></i> Obs:</strong> ${pedido.observaciones}</p>` : ''}
                    ${pedido.tipoEntrega === 'envio' && pedido.cadete ? `<p style="background: var(--primary-50); padding: 0.625rem; border-radius: var(--radius); margin-top: 0.5rem; font-size: 0.8125rem;"><strong><i class="fas fa-user-tag"></i> Cadete:</strong> ${window.cadetes.find(c => c.id === pedido.cadete)?.nombre || pedido.cadete}</p>` : ''}
                </div>
                <div class="card-footer">
                    ${renderBotonesEstado(pedido)}
                    ${pedido.tipoEntrega === 'envio' && (pedido.estado === 'pagado' || (pedido.estado === 'pendiente' && pedido.metodoPago === 'efectivo')) ? `
                        <div style="display: inline-block; position: relative; margin-left: 4px;">
                            <i class="fas fa-motorcycle" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--primary-600); pointer-events: none; z-index: 1;"></i>
                            <select class="form-select" style="
                                display: inline-block; 
                                width: auto; 
                                min-width: 160px;
                                padding-left: 34px;
                                padding-top: 0.5rem;
                                padding-bottom: 0.5rem;
                                font-size: 0.8125rem;
                                background: var(--bg-surface);
                                border: 2px solid var(--primary-200);
                                color: var(--primary-600);
                                font-weight: 600;
                                cursor: pointer;
                            " onchange="asignarCadete('${pedido.id}', this.value)">
                                <option value="">${pedido.cadete ? '🔄 Cambiar' : '👤 Asignar cadete'}</option>
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

    html += '';
    container.innerHTML = html;

    // Restaurar foco en el buscador si estaba activo
    const searchInput = document.getElementById('busquedaPedidos');
    if (searchInput && filtroPedidosBusqueda) {
        searchInput.focus();
        searchInput.setSelectionRange(filtroPedidosBusqueda.length, filtroPedidosBusqueda.length);
    }
}

let debouncePedidos;
function filtrarPedidosTexto(val) {
    filtroPedidosBusqueda = val;
    clearTimeout(debouncePedidos);
    debouncePedidos = setTimeout(() => {
        renderPedidosList(document.getElementById('app-container'), pedidosDelDia);
    }, 150);
}

function filtrarPedidosEstado(estado) {
    filtroPedidosEstado = estado;
    renderPedidosList(document.getElementById('app-container'), pedidosDelDia);
}

function renderBotonesEstado(pedido) {
    let botones = '';
    const estadoNormalizado = (pedido.estado || '').toLowerCase();
    if (estadoNormalizado === 'pendiente') {
        botones += `
            <button class="btn btn-small btn-success" onclick="cambiarEstado('${pedido.id}', 'pagado')">
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
    } else if (estadoNormalizado === 'pagado') {
        botones += `
            <button class="btn btn-small btn-primary" onclick="cambiarEstado('${pedido.id}', 'entregado')">
                <i class="fas fa-box"></i> Entregado
            </button>
        `;
    }

    return botones;
}

async function cambiarEstado(pedidoId, nuevoEstado) {
    // Optimización (V11): UI Optimista - Cambiar estado localmente primero
    const index = pedidosDelDia.findIndex(p => p.id === pedidoId);
    let estadoAnterior = '';

    if (index >= 0) {
        estadoAnterior = pedidosDelDia[index].estado;
        pedidosDelDia[index].estado = nuevoEstado;
        // Renderizado instantáneo
        renderPedidosList(document.getElementById('app-container'), pedidosDelDia);
    }

    incPending(); // Iniciar sincronización visual

    try {
        const response = await apiPost({
            action: 'actualizar_estado',
            id: pedidoId,
            estado: nuevoEstado
        });

        if (response.success) {
            showToast(`Estado actualizado a: ${nuevoEstado}`, 'success');
        } else {
            throw new Error('Error al actualizar estado en el servidor');
        }
    } catch (error) {
        // Revertir cambio si falla
        if (index >= 0) {
            pedidosDelDia[index].estado = estadoAnterior;
            renderPedidosList(document.getElementById('app-container'), pedidosDelDia);
        }
        showToast('Error: ' + error.message, 'error');
    } finally {
        decPending(); // Finalizar sincronización visual
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
            showToast('✅ Cadete asignado correctamente', 'success');
            const container = document.getElementById('app-container');
            renderPedidos(container);
        } else {
            showToast('Error al asignar cadete', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Error: ' + error.message, 'error');
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
        pedido.metodoPago === 'point' ? 'POINT (Posnet)' : 
        pedido.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo';

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
                <h1>PURO SABOR</h1>
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
        const response = await apiGet('pedidos', { fecha, paraCierre: true });
        const pedidos = response.pedidos || [];

        hideLoading();

        let totalMP = 0;
        let totalEfectivo = 0;
        let totalPoint = 0;
        let totalTransferencia = 0;
        let cantidadPedidos = 0;

        pedidos.forEach(pedido => {
            const estadoNormalizado = pedido.estado.toLowerCase();
            if (estadoNormalizado === 'pagado' || estadoNormalizado === 'entregado') {
                cantidadPedidos++;
                if (pedido.metodoPago === 'mercadopago') {
                    totalMP += pedido.total;
                } else if (pedido.metodoPago === 'efectivo') {
                    totalEfectivo += pedido.total;
                } else if (pedido.metodoPago === 'point') {
                    totalPoint += pedido.total;
                } else if (pedido.metodoPago === 'transferencia') {
                    totalTransferencia += pedido.total;
                }
            }
        });

        const totalGeneral = totalMP + totalEfectivo + totalPoint + totalTransferencia;

        // Guardar en variable global para calcularDiferencia
        window.totalGeneralCaja = totalGeneral;

        container.innerHTML = `
            <div class="page-transition">
            <div class="card">
                <h2 style="margin-bottom: 0.5rem;">
                    <i class="fas fa-calculator"></i> Resumen del Día
                </h2>
                <p class="text-muted mb-2" style="font-size: 0.875rem;">${formatDate(new Date())}</p>
                
                <div class="table-responsive">
                    <table>
                        <tr>
                            <th><i class="fas fa-list"></i> Concepto</th>
                            <th style="text-align: right;"><i class="fas fa-dollar-sign"></i> Monto</th>
                        </tr>
                        <tr>
                            <td>📱 Mercado Pago</td>
                            <td style="text-align: right;"><strong>$${formatCurrency(totalMP)}</strong></td>
                        </tr>
                        <tr>
                            <td>💵 Efectivo</td>
                            <td style="text-align: right;"><strong>$${formatCurrency(totalEfectivo)}</strong></td>
                        </tr>
                        <tr>
                            <td>💳 POINT (Posnet)</td>
                            <td style="text-align: right;"><strong>$${formatCurrency(totalPoint)}</strong></td>
                        </tr>
                        <tr>
                            <td>🏦 Transferencia</td>
                            <td style="text-align: right;"><strong>$${formatCurrency(totalTransferencia)}</strong></td>
                        </tr>
                        <tr style="background: var(--bg-hover);">
                            <td><strong><i class="fas fa-coins"></i> TOTAL</strong></td>
                            <td style="text-align: right;"><strong style="color: var(--primary-600); font-size: 1.125rem;">$${formatCurrency(totalGeneral)}</strong></td>
                        </tr>
                        <tr>
                            <td><i class="fas fa-shopping-bag"></i> Cantidad de pedidos</td>
                            <td style="text-align: right;"><strong>${cantidadPedidos}</strong></td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <div class="card" style="border-left: 4px solid var(--warning-500);">
                <h3 style="margin-bottom: 1rem; font-size: 1.0625rem;">
                    <i class="fas fa-cash-register" style="color: var(--warning-500);"></i> Dinero Real en Caja
                </h3>
                <div class="form-group">
                    <label class="form-label">💵 Dinero Real Contado ($)</label>
                    <input type="number" id="dineroReal" class="form-input" placeholder="Ingresá el dinero real en caja" min="0" step="0.01" oninput="calcularDiferencia()">
                    <small class="text-muted" style="display: block; margin-top: 0.375rem; font-size: 0.75rem;">
                        Ingresá el monto total que contaste físicamente en la caja
                    </small>
                </div>
                
                <div id="diferencia-container" class="hidden" style="padding: 0.875rem; border-radius: var(--radius-md); margin-top: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600;">Diferencia:</span>
                        <span id="diferencia-monto" style="font-size: 1.125rem; font-weight: 800;"></span>
                    </div>
                </div>

                <div class="form-group" style="margin-top: 1rem;">
                    <label class="form-label"><i class="fas fa-comment-alt" style="margin-right: 0.25rem;"></i> Observaciones / Justificación de Diferencias</label>
                    <textarea id="observacionesCaja" class="form-textarea" placeholder="Ej: Se le pagó a los cadetes un importe de $1500..." rows="3"></textarea>
                    <small class="text-muted" style="display: block; margin-top: 0.375rem; font-size: 0.75rem;">
                        Justificá cualquier excedente o faltante (opcional)
                    </small>
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
            </div>
        `;

    } catch (error) {
        hideLoading();
        showToast('Error: ' + error.message, 'error');
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
            montoSpan.textContent = '✓ Caja cuadrada';
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
    const observacionesCaja = document.getElementById('observacionesCaja').value.trim();

    if (dineroReal === 0) {
        showToast('Por favor ingresá el dinero real en caja', 'error');
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
            dineroReal: dineroReal,
            observaciones: observacionesCaja
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
            showToast('Error al cerrar caja', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Error: ' + error.message, 'error');
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
                <div class="page-transition">
                <div class="card text-center" style="padding: 3rem 2rem;">
                    <div style="width: 72px; height: 72px; background: var(--bg-hover); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                        <i class="fas fa-archive" style="font-size: 2rem; color: var(--text-muted);"></i>
                    </div>
                    <p class="text-muted" style="font-size: 1.0625rem;">No hay cajas cerradas aún</p>
                </div>
                </div>
            `;
            return;
        }

        let html = '<div class="page-transition"><div class="table-responsive"><table>';
        html += `
            <tr>
                <th><i class="far fa-calendar"></i> Fecha</th>
                <th>📱 MP</th>
                <th>💵 Efect.</th>
                <th>💳 Point</th>
                <th>🏦 Transf.</th>
                <th><i class="fas fa-coins"></i> Total</th>
                <th>💵 Real</th>
                <th>📊 Dif.</th>
                <th># Ped.</th>
                <th><i class="fas fa-comment"></i> Obs.</th>
            </tr>
        `;

        cajas.forEach(caja => {
            const diferencia = (caja.diferencia || 0);
            let diferenciaStyle = '';
            let diferenciaText = '$' + formatCurrency(Math.abs(diferencia));

            if (diferencia === 0) {
                diferenciaStyle = 'color: #059669; font-weight: 700;';
                diferenciaText = '✓';
            } else if (diferencia > 0) {
                diferenciaStyle = 'color: #d97706; font-weight: 700;';
                diferenciaText = '+$' + formatCurrency(diferencia);
            } else {
                diferenciaStyle = 'color: #dc2626; font-weight: 700;';
                diferenciaText = '-$' + formatCurrency(Math.abs(diferencia));
            }

            html += `
                <tr>
                    <td>${formatDate(new Date(caja.fecha))}</td>
                    <td>$${formatCurrency(caja.totalMercadoPago || 0)}</td>
                    <td>$${formatCurrency(caja.totalEfectivo || 0)}</td>
                    <td>$${formatCurrency(caja.totalPoint || 0)}</td>
                    <td>$${formatCurrency(caja.totalTransferencia || 0)}</td>
                    <td><strong style="color: var(--primary-600);">$${formatCurrency(caja.totalGeneral)}</strong></td>
                    <td>$${formatCurrency(caja.dineroReal || 0)}</td>
                    <td style="${diferenciaStyle}">${diferenciaText}</td>
                    <td>${caja.cantidadPedidos}</td>
                    <td style="font-size: 0.8125rem; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${caja.observaciones || ''}">${caja.observaciones || '-'}</td>
                </tr>
            `;
        });

        html += '</table></div></div>';

        container.innerHTML = html;

    } catch (error) {
        hideLoading();
        showToast('Error: ' + error.message, 'error');
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
            <div class="page-transition">
            <div class="mb-2">
                <button class="btn btn-primary" onclick="mostrarFormularioProducto()">
                    <i class="fas fa-plus-circle"></i>
                    Nuevo Producto
                </button>
            </div>
            
            <div id="formulario-producto" class="card mb-2 hidden" style="border-left: 4px solid var(--primary-600);">
                <h3 id="form-titulo" style="margin-bottom: 1.25rem; font-size: 1.0625rem;">
                    <i class="fas fa-box" style="color: var(--primary-600);"></i> Nuevo Producto
                </h3>
                <input type="hidden" id="prod-id">
                
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-tag" style="margin-right: 0.25rem;"></i> Nombre</label>
                    <input type="text" id="prod-nombre" class="form-input" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-folder" style="margin-right: 0.25rem;"></i> Categoría</label>
                    <input type="text" id="prod-categoria" class="form-input" list="categorias-list" required>
                    <datalist id="categorias-list">
                        <option value="Menú Trabajador">
                        <option value="Menú Habitual">
                        <option value="Platos Principales">
                        <option value="Combos">
                        <option value="Guarniciones">
                        <option value="Viandas">
                    </datalist>
                </div>
                
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-dollar-sign" style="margin-right: 0.25rem;"></i> Precio ($)</label>
                    <input type="number" id="prod-precio" class="form-input" required min="0">
                </div>
                
                <div class="form-group">
                    <label class="form-label" style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="prod-activo" checked style="width: auto; accent-color: var(--primary-600);">
                        <i class="fas fa-check-circle" style="color: var(--primary-600);"></i> Activo
                    </label>
                </div>
                
                <div style="display: flex; gap: 0.625rem;">
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
                        <div style="font-weight: 700; color: var(--text-primary);">${prod.nombre}</div>
                        <div style="font-size: 0.75em; color: var(--text-muted);">${prod.categoria}</div>
                    </td>
                    <td><strong style="color: var(--primary-600);">$${formatCurrency(prod.precio)}</strong></td>
                    <td><span class="badge ${estadoClass}"><i class="fas fa-circle" style="font-size: 0.35rem;"></i> ${estadoTexto}</span></td>
                    <td>
                        <button class="btn btn-small btn-info" onclick='editarProducto(${JSON.stringify(prod)})'>
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</table></div></div>';
        container.innerHTML = html;

    } catch (error) {
        hideLoading();
        showToast('Error al cargar productos: ' + error.message, 'error');
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

    titulo.innerHTML = producto
        ? '<i class="fas fa-edit" style="color: var(--primary-600);"></i> Editar Producto'
        : '<i class="fas fa-plus-circle" style="color: var(--primary-600);"></i> Nuevo Producto';
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
        showToast('Completá todos los campos obligatorios', 'error');
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
            showToast(response.message || 'Producto guardado', 'success');
            ocultarFormularioProducto();
            renderGestionProductos(document.getElementById('app-container'));
        } else {
            showToast('Error: ' + response.error, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Error de conexión: ' + error.message, 'error');
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

    const response = await fetch(targetUrl.toString());

    if (!response.ok) {
        throw new Error('Error en la petición');
    }

    return await response.json();
}

async function apiPost(data) {
    // Agregar timestamp para evitar caché
    const targetUrl = new URL(APPS_SCRIPT_URL);
    targetUrl.searchParams.append('_t', new Date().getTime());

    const response = await fetch(targetUrl.toString(), {
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

function showToast(message, type = 'default') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Remove all type classes
    toast.className = 'toast';
    toast.classList.add(`toast--${type}`);

    // Set icon based on type
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        default: 'fas fa-info-circle'
    };
    const iconEl = toast.querySelector('i');
    if (iconEl) iconEl.className = icons[type] || icons.default;

    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// HELPERS: PANTALLA DE CARGA Y SYNC (V11)
// ============================================
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function incPending() {
    operacionesPendientes++;
    const el = document.getElementById('sync-indicator');
    if (el) el.classList.remove('hidden');
}

function decPending() {
    operacionesPendientes = Math.max(0, operacionesPendientes - 1);
    if (operacionesPendientes === 0) {
        const el = document.getElementById('sync-indicator');
        if (el) el.classList.add('hidden');
    }
}
