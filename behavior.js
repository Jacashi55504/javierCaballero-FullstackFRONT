const baseURL = 'http://localhost:8000/api'; // Asegúrate de que este URL coincida con el puerto de tu backend

// Verificar si hay un token JWT en localStorage
const token = localStorage.getItem('token');

if (token) {
    // Si hay un token, ocultar los enlaces de inicio de sesión y registro y mostrar "Cerrar sesión"
    document.getElementById('dropdownMenu').innerHTML = `
        <li><a class="dropdown-item" href="#">Cerrar sesión</a></li>
    `;
}

document.getElementById('dropdownMenu').addEventListener('click', function(event) {
    if (event.target.textContent === 'Cerrar sesión') {
        localStorage.removeItem('token');
        window.location.reload();
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    if (token) {
        // Mostrar pedidos
        await cargarPedidos();
    }
});

// CARRITO

// Manejar evento de clic en el botón "Agregar al carrito"
document.querySelectorAll('.btn-agregar').forEach(btn => {
    btn.addEventListener('click', () => {
        let carrito = JSON.parse(localStorage.getItem('carrito')) || {};

        const cardBody = btn.closest('.card-body');
        const producto = cardBody.querySelector('.card-title').textContent;
        const precio = parseInt(cardBody.querySelector('.card-text').textContent.replace(/[^0-9.-]+/g, ""), 10);
        const cantidad = parseInt(cardBody.querySelector('.form-control').value, 10);

        if (carrito[producto]) {
            carrito[producto].cantidad += cantidad;
        } else {
            carrito[producto] = { cantidad, precio };
        }

        localStorage.setItem('carrito', JSON.stringify(carrito));
        actualizarVentanaEmergenteCarrito(carrito);
    });
});

// Función para actualizar la ventana emergente del carrito
function actualizarVentanaEmergenteCarrito(carrito) {
    const listaProductos = document.getElementById('lista-productos');
    listaProductos.innerHTML = '';

    const detallesArticulos = Object.keys(carrito).map(producto => {
        const li = document.createElement('li');
        li.classList.add('list-group-item');
        li.textContent = `${producto}: ${carrito[producto].cantidad}`;
        listaProductos.appendChild(li);

        return {
            nombre: producto,
            cantidad: carrito[producto].cantidad,
            precio: carrito[producto].precio
        };
    });

    localStorage.setItem('nombresArticulos', JSON.stringify(detallesArticulos.map(item => item.nombre)));
    localStorage.setItem('cantidades', JSON.stringify(detallesArticulos.map(item => item.cantidad)));
    localStorage.setItem('precios', JSON.stringify(detallesArticulos.map(item => item.precio)));

    const modal = new bootstrap.Modal(document.getElementById('productos-agregados'));
    modal.show();
}

document.getElementById('borrar-carrito').addEventListener('click', function() {
    // Limpiar la lista de productos
    document.getElementById('lista-productos').innerHTML = '';
    // Limpiar el carrito almacenado en localStorage
    localStorage.removeItem('carrito');
});

document.getElementById('ver-carrito').addEventListener('click', function() {
    // Obtener el estado actual del carrito del almacenamiento local
    let carrito = JSON.parse(localStorage.getItem('carrito')) || {};
    const listaProductos = document.getElementById('lista-productos');

    // Limpiar la lista de productos antes de mostrar los productos del carrito
    listaProductos.innerHTML = '';

    // Iterar sobre los productos en el carrito y agregarlos a la lista
    for (const producto in carrito) {
        const li = document.createElement('li');
        li.classList.add('list-group-item');
        li.textContent = `${producto}: ${carrito[producto].cantidad}`;
        listaProductos.appendChild(li);
    }

    // Mostrar la ventana emergente del carrito
    const modalElement = document.getElementById('productos-agregados');
    const modal = bootstrap.Modal.getInstance(modalElement);
    modal.show();
});

// PEDIDOS

// Función para cargar pedidos
async function cargarPedidos() {
    const response = await fetch(`${baseURL}/pedidos`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (response.ok) {
        const pedidos = await response.json();
        const pedidosContainer = document.getElementById('pedidos-container');
        pedidosContainer.innerHTML = '';
        pedidos.forEach(pedido => {
            const pedidoDiv = document.createElement('div');
            pedidoDiv.classList.add('accordion-item');
            pedidoDiv.innerHTML = `
                <h2 class="accordion-header" id="heading${pedido._id}">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${pedido._id}" aria-expanded="false" aria-controls="collapse${pedido._id}">
                        Pedido ID: ${pedido._id} - Total: ${pedido.total}
                        <i class="fas fa-edit ms-2" onclick="mostrarEditarPedido('${pedido._id}')"></i>
                        <i class="fas fa-trash ms-2" onclick="borrarPedido('${pedido._id}')"></i>
                    </button>
                </h2>
                <div id="collapse${pedido._id}" class="accordion-collapse collapse" aria-labelledby="heading${pedido._id}" data-bs-parent="#accordionPedidos">
                    <div class="accordion-body">
                        <ul class="list-group mb-3">
                            ${pedido.productos.map((producto, index) => `
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    <span class="nombre-articulo">${producto.nombre}</span>
                                    <input type="number" value="${pedido.cantidades[index]}" class="form-control cantidad-articulo" style="width: 80px; text-align: center;" data-precio="${producto.precio}" onchange="actualizarTotal('${pedido._id}')">
                                    <button class="btn btn-sm btn-danger" onclick="borrarArticulo('${pedido._id}', '${producto._id}')">Eliminar</button>
                                </li>`).join('')}
                        </ul>
                        <div class="d-flex justify-content-between align-items-center">
                            <span>Total: </span>
                            <span id="total${pedido._id}" class="ms-2">${pedido.total}</span>
                        </div>
                        <button class="btn btn-primary mt-3" onclick="guardarPedido('${pedido._id}')">Guardar</button>
                    </div>
                </div>
            `;
            pedidosContainer.appendChild(pedidoDiv);
        });
    }
}

function mostrarEditarPedido(id) {
    document.getElementById(`collapse${id}`).classList.toggle('show');
}

function actualizarTotal(id) {
    const pedidoDiv = document.getElementById(`collapse${id}`);
    const cantidades = pedidoDiv.querySelectorAll('.cantidad-articulo');
    let total = 0;

    cantidades.forEach(cantidadInput => {
        const cantidad = parseInt(cantidadInput.value, 10);
        const precio = parseFloat(cantidadInput.dataset.precio);
        total += cantidad * precio;
    });

    document.getElementById(`total${id}`).textContent = total;
}

async function guardarPedido(id) {
    const pedidoDiv = document.getElementById(`collapse${id}`);
    const detallesArticulos = Array.from(pedidoDiv.querySelectorAll('.list-group-item')).map(item => {
        const nombre = item.querySelector('.nombre-articulo').textContent.trim();
        const cantidad = parseInt(item.querySelector('.cantidad-articulo').value, 10);
        const precio = parseFloat(item.querySelector('.cantidad-articulo').dataset.precio);
        return { nombre, cantidad, precio };
    });

    const body = {
        articulos: detallesArticulos.map(item => item.nombre),
        cantidades: detallesArticulos.map(item => item.cantidad),
        precios: detallesArticulos.map(item => item.precio)
    };

    const response = await fetch(`${baseURL}/pedidos/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });

    if (response.ok) {
        alert('Pedido actualizado con éxito');
        cargarPedidos();
    } else {
        alert('Error al actualizar el pedido');
    }
}

async function borrarPedido(id) {
    const response = await fetch(`${baseURL}/pedidos/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (response.ok) {
        alert('Pedido borrado con éxito');
        cargarPedidos();
    } else {
        alert('Error al borrar el pedido');
    }
}

async function borrarArticulo(pedidoId, articuloId) {
    const response = await fetch(`${baseURL}/pedidos/${pedidoId}/articulos/${articuloId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.ok) {
        const resultado = await response.json();
        alert(resultado.message);

        if (resultado.pedido) {
            const pedidoDiv = document.getElementById(`collapse${pedidoId}`);
            if (pedidoDiv) {
                const cantidades = pedidoDiv.querySelectorAll('.cantidad-articulo');
                let total = 0;

                cantidades.forEach(cantidadInput => {
                    const cantidad = parseInt(cantidadInput.value, 10);
                    const precio = parseFloat(cantidadInput.dataset.precio);
                    total += cantidad * precio;
                });

                document.getElementById(`total${pedidoId}`).textContent = total;

                if (cantidades.length === 0) {
                    pedidoDiv.closest('.accordion-item').remove();
                }
            }
        }

        cargarPedidos();
    } else {
        alert('Error al borrar el artículo');
    }
}

document.getElementById('realizar-pedido').addEventListener('click', async () => {
    try {
        const carrito = JSON.parse(localStorage.getItem('carrito'));
        const detallesArticulos = Object.keys(carrito).map(nombre => {
            return {
                nombre: nombre,
                cantidad: carrito[nombre].cantidad,
                precio: carrito[nombre].precio
            };
        });

        const body = {
            articulos: detallesArticulos.map(item => item.nombre),
            cantidades: detallesArticulos.map(item => item.cantidad),
            precios: detallesArticulos.map(item => item.precio)
        };

        const response = await fetch(`${baseURL}/pedidos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error('Asegúrate de haber iniciado sesión');
        alert('Pedido realizado con éxito');
        localStorage.removeItem('carrito');
        window.location.reload();
    } catch (error) {
        console.error(error.message);
        alert('Error al realizar el pedido: ' + error.message);
    }
});

// INICIO DE SESIÓN

document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${baseURL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (data.token) {
            // Guardar el token en localStorage
            localStorage.setItem('token', data.token);
            window.token = data.token;
            alert('Inicio de sesión exitoso');
            window.location.href = '/index.html';
        } else {
            alert('Credenciales inválidas');
        }
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        alert('Error al iniciar sesión');
    }
});

// REGISTRO

document.getElementById('registrationForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${baseURL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();
        alert(data.message);
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        alert('Error al registrar usuario');
    }
});
