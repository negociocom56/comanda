// ============================================
// CONFIGURACIÓN
// ============================================

// URL de tu Google Apps Script (Web App)
// URL de tu Google Apps Script (Web App)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyR6xGo_kAXXV1WtdBwFgW3DBLB9FkgxhFOQy4aRjDE0AcCqTYisDK5gp4Odc-WdtuYJg/exec';

// Estado global
let productos = [];
let pedidoActual = [];
let pedidosDelDia = [];

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Cargar página inicial
    window.addEventListener('hashchange', renderPage);
    renderPage();
});

// ============================================
// ROUTER
// ============================================

function renderPage() {
    const page = location.hash.slice(1) || 'home';
    // Mostrar título
    const container = document.getElementById('app-container');
    const headerTitle = document.getElementById('header-title');

    // El botón home siempre es visible ahora

    // Renderizar página correspondiente
    switch (page) {
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
// PANTALLA: HOME
// ============================================

function renderHome(container) {
    container.innerHTML = `
        <div class="btn-grid">
            <button class="btn btn-primary" onclick="location.hash='nuevo-pedido'">
                📝 Nuevo Pedido
            </button>
            <button class="btn btn-info" onclick="location.hash='pedidos'">
                📋 Pedidos del Día
            </button>
            <button class="btn btn-warning" onclick="location.hash='cerrar-caja'">
                💰 Cerrar Caja
            </button>
            <button class="btn btn-secondary" onclick="location.hash='historial-cajas'">
                📊 Historial de Cajas
            </button>
            <button class="btn btn-info" onclick="location.hash='gestionar-productos'" style="background-color: #6c757d; border-color: #6c757d;">
                🛒 Gestionar Productos
            </button>
            <button class="btn btn-light" disabled style="color: #999; border: 1px dashed #ccc; background-color: #f8f9fa;">
                📈 Métricas 
                <div style="font-size: 0.75rem; margin-top: 2px;">(Solo Plan Premium)</div>
            </button>
        </div>
    `;
}

// ============================================
// PANTALLA: NUEVO PEDIDO
// ============================================

async function renderNuevoPedido(container) {
    showLoading();

    // Cargar productos si no están en memoria
    if (productos.length === 0) {
        await cargarProductos();
    }

    hideLoading();

    // Agrupar productos por categoría
    const categorias = {};
    productos.forEach(p => {
        if (!categorias[p.categoria]) {
            categorias[p.categoria] = [];
        }
        categorias[p.categoria].push(p);
    });

    let html = '<div class="mb-2">';

    // Renderizar productos por categoría
    for (const [categoria, prods] of Object.entries(categorias)) {
        html += `<h2 class="mb-1">${categoria}</h2>`;

        prods.forEach(producto => {
            const cantidad = getCantidadEnPedido(producto.id);
            html += `
                <div class="producto-item">
                    <div class="producto-info">
                        <div class="producto-nombre">${producto.nombre}</div>
                        <div class="producto-categoria">${producto.categoria}</div>
                    </div>
                    <div class="producto-precio">$${formatCurrency(producto.precio)}</div>
                    <div class="producto-actions">
                        <button class="btn-cantidad" onclick="cambiarCantidad('${producto.id}', -1)">−</button>
                        <span class="cantidad-display">${cantidad}</span>
                        <button class="btn-cantidad" onclick="cambiarCantidad('${producto.id}', 1)">+</button>
                    </div>
                </div>
            `;
        });
    }

    html += '</div>';

    // Resumen del pedido
    const total = calcularTotal();
    const itemsCount = pedidoActual.reduce((sum, item) => sum + item.cantidad, 0);

    if (itemsCount > 0) {
        html += `
            <div class="resumen-pedido">
                <h3>Resumen del Pedido</h3>
                <div class="resumen-items">
                    ${pedidoActual.map(item => `
                        <div class="resumen-item">
                            <span>${item.cantidad}x ${item.producto}</span>
                            <span>$${formatCurrency(item.cantidad * item.precio)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="resumen-total">
                    <span>TOTAL</span>
                    <span>$${formatCurrency(total)}</span>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Nombre del Cliente <span style="color:red">*</span></label>
                <input type="text" id="nombreCliente" class="form-input" placeholder="Nombre completo" required minlength="3">
                <small class="text-muted">Mínimo 3 caracteres</small>
            </div>
            
            <div class="form-group">
                <label class="form-label">Celular (WhatsApp)</label>
                <input type="tel" id="celularCliente" class="form-input" placeholder="Ej: 11 1234 5678">
                <small class="text-muted">Solo números, sin guiones ni espacios (opcional)</small>
            </div>
            
            <div class="form-group">
                <label class="form-label">Domicilio de Entrega</label>
                <input type="text" id="domicilioCliente" class="form-input" placeholder="Calle y número">
            </div>
            
            <div class="form-group">
                <label class="form-label">Observaciones (opcional)</label>
                <textarea id="observaciones" class="form-textarea" placeholder="Ej: Sin cebolla, extra queso..."></textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">Método de Pago</label>
                <select id="metodoPago" class="form-select">
                    <option value="mercadopago">💳 Mercado Pago</option>
                    <option value="efectivo">💵 Efectivo</option>
                </select>
            </div>
            
            <button class="btn btn-primary" onclick="confirmarPedido()">
                ✅ Confirmar Pedido
            </button>
            <button class="btn btn-danger" onclick="cancelarPedido()">
                ❌ Cancelar
            </button>
        `;
    } else {
        html += `
            <div class="card text-center">
                <p class="text-muted">Agregá productos al pedido usando los botones +</p>
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
        // Ya existe en el pedido
        pedidoActual[itemIndex].cantidad += delta;

        if (pedidoActual[itemIndex].cantidad <= 0) {
            pedidoActual.splice(itemIndex, 1);
        }
    } else if (delta > 0) {
        // Agregar nuevo item
        pedidoActual.push({
            id: producto.id,
            producto: producto.nombre,
            cantidad: delta,
            precio: producto.precio
        });
    }

    // Re-renderizar
    renderPage();
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
    const total = calcularTotal();

    if (pedidoActual.length === 0) {
        showToast('El pedido está vacío');
        return;
    }

    if (nombre.length < 3) {
        showToast('El nombre debe tener al menos 3 caracteres');
        return;
    }

    // Validar celular si se ingresó
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
            celular: celular
        });

        hideLoading();

        if (response.success) {
            // Mostrar link de pago si es Mercado Pago
            if (metodoPago === 'mercadopago' && response.linkPago) {
                mostrarLinkPago(response);
            } else {
                showToast('Pedido creado exitosamente');
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

function mostrarLinkPago(pedidoData) {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="card text-center">
            <h2 class="mb-1">✅ Pedido Creado</h2>
            <p class="mb-2">ID: <strong>${pedidoData.id}</strong></p>
            
            <div class="qr-container">
                <h3>Escaneá el QR para pagar</h3>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pedidoData.linkPago)}" alt="QR Mercado Pago">
            </div>
            
            <p class="mb-1">O copiá el link:</p>
            <input type="text" class="form-input mb-2" value="${pedidoData.linkPago}" readonly onclick="this.select()">
            
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <button class="btn btn-primary" onclick="window.open('${pedidoData.linkPago}', '_blank')">
                    💳 Abrir Mercado Pago
                </button>

                ${pedidoData.celular ? `
                <button class="btn btn-success" onclick="enviarWhatsApp('${pedidoData.celular}', '${pedidoData.nombre}', '${pedidoData.linkPago}')" style="background-color: #25D366; color: white;">
                    📱 Enviar por WhatsApp
                </button>
                ` : ''}
                
                <button class="btn btn-secondary" onclick="pedidoActual = []; location.hash='pedidos'">
                    Ver Pedidos del Día
                </button>
            </div>
        </div>
    `;
}

function enviarWhatsApp(celular, nombre, link) {
    // Limpiar celular (dejar solo números)
    const telefono = celular.replace(/\D/g, '');
    const codigoPais = '54'; // Argentina por defecto
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
        const response = await apiGet('pedidos', { fecha });
        pedidosDelDia = response.pedidos || [];

        hideLoading();

        if (pedidosDelDia.length === 0) {
            container.innerHTML = `
                <div class="card text-center">
                    <p class="text-muted">No hay pedidos para hoy</p>
                    <button class="btn btn-primary mt-1" onclick="location.hash='nuevo-pedido'">
                        Crear Primer Pedido
                    </button>
                </div>
            `;
            return;
        }

        let html = '';

        pedidosDelDia.forEach(pedido => {
            const estadoBadge = `<span class="badge badge-${pedido.estado}">${pedido.estado.toUpperCase()}</span>`;
            const metodoBadge = `<span class="badge badge-${pedido.metodoPago}">${pedido.metodoPago === 'mercadopago' ? 'MP' : 'Efectivo'}</span>`;

            html += `
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">
                                ${pedido.id} 
                                <span style="font-size: 0.9em; font-weight: normal; color: #555;">
                                    - ${pedido.nombre || 'Cliente'}
                                </span>
                            </div>
                            <div class="card-subtitle">${formatDateTime(pedido.fecha)}</div>
                            ${pedido.domicilio ? `<div style="font-size: 0.9em; margin-top: 2px;">📍 ${pedido.domicilio}</div>` : ''}
                            ${pedido.celular ? `<div style="font-size: 0.9em; margin-top: 2px;">📱 ${pedido.celular}</div>` : ''}
                        </div>
                        <div style="text-align: right;">
                            ${estadoBadge}
                            <div style="margin-top: 4px;">${metodoBadge}</div>
                        </div>
                    </div>
                    <div class="card-body">
                        <strong>Items:</strong>
                        <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                            ${pedido.items.map(item => `
                                <li>${item.cantidad}x ${item.producto} - $${formatCurrency(item.cantidad * item.precio)}</li>
                            `).join('')}
                        </ul>
                        ${pedido.observaciones ? `<p><strong>Obs:</strong> ${pedido.observaciones}</p>` : ''}
                        <p style="font-size: 1.2rem; font-weight: 700; color: #4CAF50; margin-top: 0.5rem;">
                            Total: $${formatCurrency(pedido.total)}
                        </p>
                    </div>
                    <div class="card-footer">
                        ${renderBotonesEstado(pedido)}
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
                ✅ Marcar Pagado
            </button>
            <button class="btn btn-small btn-danger" onclick="cambiarEstado('${pedido.id}', 'cancelado')">
                ❌ Cancelar
            </button>
        `;

        if (pedido.linkPago) {
            botones += `
                <button class="btn btn-small btn-info" onclick="window.open('${pedido.linkPago}', '_blank')">
                    💳 Ver Link MP
                </button>
            `;
        }
    } else if (pedido.estado === 'pagado') {
        botones += `
            <button class="btn btn-small btn-primary" onclick="cambiarEstado('${pedido.id}', 'entregado')">
                📦 Marcar Entregado
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
            // Usar renderPedidos para recargar la lista sin recargar toda la página
            // Pasamos el contenedor actual
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

        // Calcular totales
        let totalMP = 0;
        let totalEfectivo = 0;
        let cantidadPedidos = 0;

        pedidos.forEach(pedido => {
            if (pedido.estado === 'pagado' || pedido.estado === 'entregado') {
                cantidadPedidos++;
                if (pedido.metodoPago === 'mercadopago') {
                    totalMP += pedido.total;
                } else if (pedido.metodoPago === 'efectivo') {
                    totalEfectivo += pedido.total;
                }
            }
        });

        const totalGeneral = totalMP + totalEfectivo;

        container.innerHTML = `
            <div class="card">
                <h2 class="mb-1">Resumen del Día</h2>
                <p class="text-muted mb-2">${formatDate(new Date())}</p>
                
                <table>
                    <tr>
                        <th>Concepto</th>
                        <th>Monto</th>
                    </tr>
                    <tr>
                        <td>💳 Mercado Pago</td>
                        <td><strong>$${formatCurrency(totalMP)}</strong></td>
                    </tr>
                    <tr>
                        <td>💵 Efectivo</td>
                        <td><strong>$${formatCurrency(totalEfectivo)}</strong></td>
                    </tr>
                    <tr style="background: #E8F5E9;">
                        <td><strong>TOTAL</strong></td>
                        <td><strong style="color: #4CAF50; font-size: 1.2rem;">$${formatCurrency(totalGeneral)}</strong></td>
                    </tr>
                    <tr>
                        <td>Cantidad de pedidos</td>
                        <td><strong>${cantidadPedidos}</strong></td>
                    </tr>
                </table>
            </div>
            
            <button class="btn btn-warning mt-2" onclick="confirmarCierreCaja()">
                💰 Confirmar Cierre de Caja
            </button>
            
            <button class="btn btn-secondary" onclick="location.hash='historial-cajas'">
                📊 Ver Historial
            </button>
        `;

    } catch (error) {
        hideLoading();
        showToast('Error: ' + error.message);
    }
}

async function confirmarCierreCaja() {
    if (!confirm('¿Confirmar cierre de caja del día?')) return;

    showLoading();

    try {
        const response = await apiPost({ action: 'cerrar_caja' });

        hideLoading();

        if (response.success) {
            alert(`✅ Caja cerrada exitosamente\n\nTotal: $${formatCurrency(response.totalGeneral)}\nPedidos: ${response.cantidadPedidos}`);
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
                <div class="card text-center">
                    <p class="text-muted">No hay cajas cerradas aún</p>
                </div>
            `;
            return;
        }

        let html = '<div class="table-responsive"><table>';
        html += `
            <tr>
                <th>Fecha</th>
                <th>MP</th>
                <th>Efectivo</th>
                <th>Total</th>
                <th>Pedidos</th>
            </tr>
        `;

        cajas.forEach(caja => {
            html += `
                <tr>
                    <td>${formatDate(new Date(caja.fecha))}</td>
                    <td>$${formatCurrency(caja.totalMercadoPago)}</td>
                    <td>$${formatCurrency(caja.totalEfectivo)}</td>
                    <td><strong>$${formatCurrency(caja.totalGeneral)}</strong></td>
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

        // Actualizar cache local también
        productos = todosProductos.filter(p => p.activo);

        hideLoading();

        let html = `
            <div class="mb-2">
                <button class="btn btn-primary" onclick="mostrarFormularioProducto()">
                    ➕ Nuevo Producto
                </button>
            </div>
            
            <div id="formulario-producto" class="card mb-2 hidden" style="border-left: 5px solid #2196F3;">
                <h3 id="form-titulo">Nuevo Producto</h3>
                <input type="hidden" id="prod-id">
                
                <div class="form-group">
                    <label class="form-label">Nombre</label>
                    <input type="text" id="prod-nombre" class="form-input" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Categoría</label>
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
                    <label class="form-label">Precio ($)</label>
                    <input type="number" id="prod-precio" class="form-input" required min="0">
                </div>
                
                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" id="prod-activo" checked> Activo
                    </label>
                </div>
                
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-success" onclick="guardarProducto()">💾 Guardar</button>
                    <button class="btn btn-secondary" onclick="ocultarFormularioProducto()">Cancelar</button>
                </div>
            </div>

            <div class="table-responsive">
                <table>
                    <tr>
                        <th>Nombre</th>
                        <th>Precio</th>
                        <th>Estado</th>
                        <th>Acción</th>
                    </tr>
        `;

        todosProductos.forEach(prod => {
            const estadoClass = prod.activo ? 'badge-pagado' : 'badge-cancelado';
            const estadoTexto = prod.activo ? 'Activo' : 'Inactivo';

            html += `
                <tr>
                    <td>
                        <div style="font-weight: bold;">${prod.nombre}</div>
                        <div style="font-size: 0.8em; color: #666;">${prod.categoria}</div>
                    </td>
                    <td>$${formatCurrency(prod.precio)}</td>
                    <td><span class="badge ${estadoClass}">${estadoTexto}</span></td>
                    <td>
                        <button class="btn btn-small btn-info" onclick='editarProducto(${JSON.stringify(prod)})'>
                            ✏️
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

    titulo.textContent = producto ? 'Editar Producto' : 'Nuevo Producto';
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
            id: id || null, // Si es vacío, enviar null para crear
            nombre: nombre,
            categoria: categoria,
            precio: Number(precio),
            activo: activo
        });

        hideLoading();

        if (response.success) {
            showToast(response.message || 'Producto guardado');
            ocultarFormularioProducto();
            renderGestionProductos(document.getElementById('app-container')); // Recargar lista
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
    // Construir URL completa con parámetros
    const targetUrl = new URL(APPS_SCRIPT_URL);
    targetUrl.searchParams.append('path', path);

    // Agregar timestamp para evitar cache
    targetUrl.searchParams.append('_t', new Date().getTime());

    for (const key in params) {
        targetUrl.searchParams.append(key, params[key]);
    }

    // Usar proxy
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl.toString())}`;

    const response = await fetch(proxyUrl);

    if (!response.ok) {
        throw new Error('Error en la petición');
    }

    return await response.json();
}

async function apiPost(data) {
    // Usar proxy para POST también
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(APPS_SCRIPT_URL)}`;

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
    toast.textContent = message;
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
