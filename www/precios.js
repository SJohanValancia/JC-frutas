import { apiFetch } from "./api.js";
import './dbb.js';

// 🔥 SISTEMA DE AUTENTICACIÓN SILENCIOSA
const urlParams = new URLSearchParams(window.location.search);
const origenIntegracion = urlParams.get("origenIntegracion");
let fincaId = urlParams.get("id");
let usuario = urlParams.get("usuario");

const cantidadInput = document.getElementById("cantidadFrutas");
const frutasContainer = document.getElementById("frutasContainer");
const guardarBtn = document.getElementById("guardarPrecios");

// 🔥 FUNCIÓN: Obtener datos de usuario (con soporte para integración)
function obtenerDatosUsuario() {
    console.log('🔍 Obteniendo datos de usuario...');
    
    // 1️⃣ Si viene de integración, intentar usar sesión compartida
    if (origenIntegracion === 'true') {
        console.log('📱 Detectada integración desde programa principal');
        
        // Intentar obtener de sessionStorage primero
        const sesionCompartidaStr = sessionStorage.getItem('sesionCompartida');
        if (sesionCompartidaStr) {
            try {
                const sesionCompartida = JSON.parse(sesionCompartidaStr);
                console.log('✅ Sesión compartida encontrada:', sesionCompartida.usuario);
                
                // Guardar en localStorage local para persistencia
                localStorage.setItem('sesionFrutas', JSON.stringify(sesionCompartida));
                localStorage.setItem('usuario', sesionCompartida.usuario);
                localStorage.setItem('alias', sesionCompartida.alias || sesionCompartida.usuario);
                localStorage.setItem('tipo', (sesionCompartida.tipo || 1).toString());
                
                return sesionCompartida;
            } catch (e) {
                console.error('❌ Error al parsear sesión compartida:', e);
            }
        }
        
        // Intentar obtener de localStorage (sesión de frutas)
        const sesionFrutasStr = localStorage.getItem('sesionFrutas');
        if (sesionFrutasStr) {
            try {
                const sesionFrutas = JSON.parse(sesionFrutasStr);
                console.log('✅ Sesión de frutas encontrada:', sesionFrutas.usuario);
                return sesionFrutas;
            } catch (e) {
                console.error('❌ Error al parsear sesión de frutas:', e);
            }
        }
    }
    
    // 2️⃣ Método tradicional: obtener de localStorage individual
    const usuarioLocal = localStorage.getItem('usuario');
    const aliasLocal = localStorage.getItem('alias');
    const tipoLocal = localStorage.getItem('tipo');
    
    if (usuarioLocal) {
        console.log('✅ Usando sesión local tradicional:', usuarioLocal);
        return {
            usuario: usuarioLocal,
            alias: aliasLocal || usuarioLocal,
            tipo: tipoLocal ? parseInt(tipoLocal) : 1,
            nombre: usuarioLocal
        };
    }
    
    // 3️⃣ Si viene de URL params (para compatibilidad)
    if (usuario) {
        console.log('✅ Usando usuario de URL params:', usuario);
        return {
            usuario: usuario,
            alias: usuario,
            tipo: 1,
            nombre: usuario
        };
    }
    
    console.error('❌ No se encontraron datos de usuario');
    return null;
}

// 🔥 FUNCIÓN: Realizar login silencioso
async function realizarLoginSilencioso(datosUsuario) {
    try {
        console.log('🔐 Realizando login silencioso...');
        
        const username = datosUsuario.usuario || datosUsuario.username;
        
        if (!username) {
            throw new Error('No se proporcionó nombre de usuario');
        }
        
        // Guardar sesión localmente
        const sesionFrutas = {
            usuario: username,
            nombre: datosUsuario.nombre || username,
            rol: datosUsuario.rol || 'admin',
            tipo: datosUsuario.tipo || 1,
            alias: datosUsuario.alias || username,
            timestamp: Date.now(),
            origenIntegracion: true
        };
        
        localStorage.setItem('sesionFrutas', JSON.stringify(sesionFrutas));
        localStorage.setItem('usuario', username);
        localStorage.setItem('alias', sesionFrutas.alias);
        localStorage.setItem('tipo', sesionFrutas.tipo.toString());
        
        console.log('✅ Login silencioso completado:', sesionFrutas);
        
        // Notificar al programa principal
        if (window.parent !== window) {
            window.parent.postMessage({
                action: 'loginSilenciosoExitoso',
                usuario: username
            }, '*');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error en login silencioso:', error);
        throw error;
    }
}

// 🔥 LISTENER: Recibir sesión desde programa principal
window.addEventListener('message', function(event) {
    // Seguridad: verificar origen
    const origenesPermitidos = [
        'https://jc-fi.onrender.com',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        window.location.origin
    ];
    
    if (!origenesPermitidos.includes(event.origin)) {
        return;
    }
    
    const data = event.data;
    
    if (data.action === 'establecerSesion' && data.sesionData) {
        console.log('📥 Recibiendo sesión desde programa principal...');
        
        try {
            realizarLoginSilencioso(data.sesionData);
            console.log('✅ Sesión establecida desde mensaje');
            
            // Recargar precios con la nueva sesión
            if (typeof cargarPreciosGuardados === 'function') {
                cargarPreciosGuardados();
            }
        } catch (error) {
            console.error('❌ Error al establecer sesión:', error);
        }
    }
});

// 🔥 INICIALIZACIÓN: Verificar y establecer autenticación
(async function inicializarAutenticacion() {
    console.log('🚀 Iniciando sistema de autenticación...');
    
    // Obtener datos de usuario
    const datosUsuario = obtenerDatosUsuario();
    
    if (!datosUsuario) {
        console.error('❌ No hay sesión activa');
        
        // Solo redirigir si NO viene de integración
        if (origenIntegracion !== 'true') {
            console.log('🔄 Redirigiendo a login...');
            window.location.href = 'index.html';
            return;
        }
        
        // Si viene de integración, esperar a recibir datos
        console.log('⏳ Esperando datos de sesión desde integración...');
        mostrarMensajeCarga();
        return;
    }
    
    // Actualizar variables globales
    usuario = datosUsuario.usuario;
    
    console.log('✅ Autenticación exitosa:', {
        usuario: usuario,
        tipo: datosUsuario.tipo,
        origenIntegracion: origenIntegracion === 'true'
    });
    
    // Inicializar la aplicación
    inicializarApp();
})();

// 🔥 FUNCIÓN: Mostrar mensaje de carga mientras se autentica
function mostrarMensajeCarga() {
    if (frutasContainer) {
        frutasContainer.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #4CAF50;
                    border-radius: 50%;
                    width: 60px;
                    height: 60px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                <h3 style="color: #4CAF50; margin-bottom: 10px;">🔐 Verificando sesión...</h3>
                <p style="color: #666;">Conectando con el sistema principal</p>
            </div>
        `;
    }
}

// 🔥 FUNCIÓN: Inicializar aplicación después de autenticación
function inicializarApp() {
    console.log('📋 Inicializando aplicación de precios...');
    
    // Cargar precios guardados
    cargarPreciosGuardados();
    
    // Verificar sincronización offline
    verificarSincronizacionOffline();
}

// 🔥 FUNCIÓN: Verificar sincronización offline
async function verificarSincronizacionOffline() {
    const yaSincronizado = localStorage.getItem("frutasSincronizadas_v1");
    if (!yaSincronizado) {
        console.log('🔄 Primera vez: sincronizando datos offline...');
        await sincronizarFrutasYpreciosALocal();
        localStorage.setItem("frutasSincronizadas_v1", "true");
    }
}

// ==========================================
// FUNCIONES ORIGINALES (SIN CAMBIOS)
// ==========================================

async function fetchAndStorePrices() {
    try {
        const resp = await fetch('/api/precios');
        if (!resp.ok) throw new Error('Error al traer precios');
        const data = await resp.json();
        
        await window.IDB_HELPER.savePrices(data.map(p => ({
            key: p.frutaId || p.id || p.nombre,
            ...p
        })));
        renderPrices(data);
    } catch (err) {
        console.warn('No se pudo traer precios del servidor, usando cache local:', err);
        const cached = await window.IDB_HELPER.getAllPrices();
        renderPrices(cached);
    }
}

function renderPrices(pricesArray) {
    const container = document.querySelector('#lista-precios');
    if (!container) return;
    container.innerHTML = pricesArray.map(p => `<div>${p.frutaId || p.key}: ${p.precio}</div>`).join('');
}

window.addEventListener('online', () => {
    console.log('Volvimos online — actualizando precios desde server.');
    fetchAndStorePrices();
});

async function guardarCambiosPrecios(frutaId, nuevosPrecios) {
    console.log("🔥 Iniciando actualización global:", { frutaId, nuevosPrecios });
    
    const confirmacion = confirm(
        `⚠️ ACTUALIZACIÓN GLOBAL\n\n` +
        `Estás a punto de actualizar los precios de esta fruta en TODAS las fincas donde aparece:\n\n` +
        `💎 Primera: $${nuevosPrecios.primera.toLocaleString()}\n` +
        `✨ Segunda: $${nuevosPrecios.segunda.toLocaleString()}\n` +
        `⭐ Tercera: $${nuevosPrecios.tercera.toLocaleString()}\n\n` +
        `Solo se actualizarán las fincas que te pertenecen.\n\n` +
        `¿Estás seguro de continuar?`
    );

    if (!confirmacion) return;

    try {
        console.log("📡 Enviando solicitud de actualización global...");
        
        const resultado = await apiFetch(`/precios/actualizar-global/${frutaId}`, "PUT", {
            precios: nuevosPrecios,
            usuario: usuario,
            adminAlias: usuario
        });

        console.log("✅ Resultado de actualización global:", resultado);
        
        let mensaje = `✅ ¡Actualización completada!\n\n` +
            `Precios de la fruta actualizados en ${resultado.fincasActualizadas} finca(s).\n\n` +
            `💎 Primera: $${nuevosPrecios.primera.toLocaleString()}\n` +
            `✨ Segunda: $${nuevosPrecios.segunda.toLocaleString()}\n` +
            `⭐ Tercera: $${nuevosPrecios.tercera.toLocaleString()}\n\n` +
            `Todos los cambios se aplicaron correctamente.`;
        
        if (resultado.errores && resultado.errores.length > 0) {
            mensaje += `\n\n⚠️ Se encontraron ${resultado.errores.length} error(es) menores durante la actualización.`;
        }
        
        alert(mensaje);
        cargarPreciosGuardados();
    } catch (err) {
        console.error("❌ Error al actualizar precios globalmente:", err);
        alert(`❌ Error al actualizar los precios globalmente:\n\n${err.message}\n\nPor favor, inténtalo de nuevo.`);
    }
}

async function cargarPreciosGuardados() {
    try {
        console.log("📥 Cargando precios guardados para finca:", fincaId);
        console.log("👤 Usuario actual:", usuario);
        
        const preciosGuardados = await apiFetch(`/precios/por-finca/${fincaId}`, "GET");

        let frutasFinales = [];

        if (preciosGuardados.length > 0) {
            console.log("✅ Usando precios específicos de la finca");
            frutasFinales = preciosGuardados[0].frutas;
        } else {
            console.log("🔍 Buscando precios de la primera finca del usuario...");
            
            try {
                const preciosDelUsuario = await apiFetch(`/precios/primera-finca-usuario?usuario=${encodeURIComponent(usuario)}`, "GET");
                
                if (preciosDelUsuario && preciosDelUsuario.frutas && preciosDelUsuario.frutas.length > 0) {
                    console.log("✅ Usando precios de la primera finca del usuario");
                    console.log(`📊 Cargando ${preciosDelUsuario.frutas.length} frutas como base`);
                    frutasFinales = preciosDelUsuario.frutas;
                } else {
                    console.log("ℹ️ El usuario no tiene fincas con precios aún");
                    frutasFinales = [];
                }
            } catch (errorUsuario) {
                console.log("ℹ️ No se encontraron precios del usuario, iniciando sin frutas");
                frutasFinales = [];
            }
        }

        console.log(`📊 Mostrando ${frutasFinales.length} frutas`);
        renderFrutasGuardadas(frutasFinales);

        await window.IDB_HELPER.saveFruits(fincaId, frutasFinales);

    } catch (err) {
        console.error("❌ Error al cargar precios guardados:", err);
        alert("Error al cargar precios: " + err.message);
    }
}

async function sincronizarFrutasYpreciosALocal() {
    try {
        console.log("🔄 Sincronizando frutas y precios desde servidor...");

        const res = await fetch(`https://jc-frutas.onrender.com/precios/todos`);
        if (!res.ok) throw new Error("No se pudieron obtener los precios");

        const todos = await res.json();

        for (const registro of todos) {
            const { fincaId, frutas } = registro;

            if (!fincaId || !frutas || !frutas.length) continue;

            await window.IDB_HELPER.saveFruits(fincaId, frutas);

            await window.IDB_HELPER.savePrices(frutas.map(f => ({
                key: f.nombre,
                fincaId,
                ...f
            })));

            console.log(`✅ Finca ${fincaId}: ${frutas.length} frutas sincronizadas`);
        }

        console.log("✅ Sincronización completa finalizada");
        alert("✅ Frutas y precios sincronizados para uso offline");

    } catch (err) {
        console.error("❌ Error al sincronizar:", err);
        alert("No se pudieron sincronizar los datos offline");
    }
}

cantidadInput.addEventListener("input", () => {
    const cantidad = parseInt(cantidadInput.value) || 0;
    frutasContainer.innerHTML = "";

    if (cantidad <= 0) return;

    console.log(`📝 Generando ${cantidad} campos para nuevas frutas`);

    for (let i = 0; i < cantidad; i++) {
        const div = document.createElement("div");
        div.className = "fruta-card";
        div.innerHTML = `
            <input placeholder="Nombre de la fruta" class="nombreFruta">
            <div class="precios-por-calidad">
                <label>Primera: <input type="number" placeholder="Precio primera" class="precioFruta primera" step="0.01" min="0"></label>
                <label>Segunda: <input type="number" placeholder="Precio segunda" class="precioFruta segunda" step="0.01" min="0"></label>
                <label>Tercera: <input type="number" placeholder="Precio tercera" class="precioFruta tercera" step="0.01" min="0"></label>
            </div>
        `;
        frutasContainer.appendChild(div);

        const nombreFrutaInput = div.querySelector(".nombreFruta");

        nombreFrutaInput.addEventListener("input", () => {
            let valor = nombreFrutaInput.value;
            if (valor.length > 0) {
                nombreFrutaInput.value = valor.charAt(0).toUpperCase() + valor.slice(1);
            }
        });

        const preciosInputs = div.querySelectorAll(".precioFruta");
        preciosInputs.forEach(input => {
            input.addEventListener("input", () => {
                if (parseFloat(input.value) < 0) {
                    input.value = 0;
                    alert("⚠️ Los precios no pueden ser negativos");
                }
            });
        });
    }
});

guardarBtn.addEventListener("click", async () => {
    const nombres = document.querySelectorAll(".nombreFruta");
    const primeras = document.querySelectorAll(".precioFruta.primera");
    const segundas = document.querySelectorAll(".precioFruta.segunda");
    const terceras = document.querySelectorAll(".precioFruta.tercera");

    const frutas = [];

    for (let i = 0; i < nombres.length; i++) {
        const nombre = nombres[i].value.trim();
        const precioPrimera = parseFloat(primeras[i].value);
        const precioSegunda = parseFloat(segundas[i].value);
        const precioTercera = parseFloat(terceras[i].value);

        if (!nombre) {
            alert(`⚠️ Por favor, ingresa el nombre de la fruta en la posición ${i + 1}`);
            nombres[i].focus();
            return;
        }

        if (isNaN(precioPrimera) || isNaN(precioSegunda) || isNaN(precioTercera)) {
            alert(`⚠️ Por favor, completa todos los precios para "${nombre}"`);
            return;
        }

        if (precioPrimera < 0 || precioSegunda < 0 || precioTercera < 0) {
            alert(`⚠️ Los precios de "${nombre}" no pueden ser negativos`);
            return;
        }

        frutas.push({
            nombre,
            precios: {
                primera: precioPrimera,
                segunda: precioSegunda,
                tercera: precioTercera
            }
        });
    }

    if (!fincaId || frutas.length === 0) {
        alert("⚠️ No hay frutas válidas para guardar");
        return;
    }

    console.log(`💾 Guardando ${frutas.length} frutas nuevas`);

    const textoOriginal = guardarBtn.textContent;
    guardarBtn.textContent = "⏳ Guardando...";
    guardarBtn.disabled = true;

    try {
        for (let i = 0; i < frutas.length; i++) {
            const fruta = frutas[i];
            console.log(`📝 Guardando fruta ${i + 1}/${frutas.length}: ${fruta.nombre}`);
            
            await apiFetch(`/precios/agregar-fruta/${fincaId}`, "POST", { 
                fruta,
                usuario: usuario,
                adminAlias: usuario
            });
        }

        alert(`✅ ${frutas.length} fruta(s) guardada(s) correctamente en esta finca`);
        
        cargarPreciosGuardados();
        
        cantidadInput.value = "";
        frutasContainer.innerHTML = "";
        
    } catch (err) {
        console.error("❌ Error al guardar frutas:", err);
        alert("❌ Error al guardar frutas: " + err.message);
    } finally {
        guardarBtn.textContent = textoOriginal;
        guardarBtn.disabled = false;
    }
});

function renderFrutasGuardadas(frutas) {
    console.log(`🎨 Renderizando ${frutas.length} frutas guardadas`);
    frutasContainer.innerHTML = "";

    if (frutas.length === 0) {
        frutasContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666; font-style: italic;">
                📝 No hay frutas configuradas para esta finca.<br>
                Usa el campo de arriba para agregar nuevas frutas.
            </div>
        `;
        return;
    }

    frutas.forEach((fruta, index) => {
        const precios = fruta.precios || { primera: 0, segunda: 0, tercera: 0 };

        const div = document.createElement("div");
        div.className = "fruta-card";
        div.innerHTML = `
            <input value="${fruta.nombre}" class="nombreFruta" disabled>
            <div class="precios-por-calidad">
                <label>Primera: <input type="number" value="${precios.primera}" class="precioFruta primera" disabled step="0.01" min="0"></label>
                <label>Segunda: <input type="number" value="${precios.segunda}" class="precioFruta segunda" disabled step="0.01" min="0"></label>
                <label>Tercera: <input type="number" value="${precios.tercera}" class="precioFruta tercera" disabled step="0.01" min="0"></label>
            </div>
            <div class="botones-fruta">
                <button class="editarBtn" title="Editar solo en esta finca">✏️ Editar</button>
                <button class="editarGlobalBtn" title="Actualizar en todas las fincas" style="background: #ff6b6b; color: white;">🌍 Editar Globalmente</button>
                <button class="eliminarBtn" title="Eliminar solo de esta finca">🗑️ Eliminar</button>
            </div>
        `;
        frutasContainer.appendChild(div);

        const editarBtn = div.querySelector(".editarBtn");
        const editarGlobalBtn = div.querySelector(".editarGlobalBtn");
        const eliminarBtn = div.querySelector(".eliminarBtn");

        const preciosInputs = div.querySelectorAll(".precioFruta");
        preciosInputs.forEach(input => {
            input.addEventListener("input", () => {
                if (parseFloat(input.value) < 0) {
                    input.value = 0;
                    alert("⚠️ Los precios no pueden ser negativos");
                }
            });
        });

        editarBtn.addEventListener("click", () => toggleEdicion(div, fruta, editarBtn, false));
        editarGlobalBtn.addEventListener("click", () => toggleEdicion(div, fruta, editarBtn, true));
        eliminarBtn.addEventListener("click", () => eliminarFruta(fruta, div));
    });
}

async function toggleEdicion(div, fruta, btn, esGlobal = false) {
    const inputs = div.querySelectorAll("input");
    const editando = btn.textContent.includes("Guardar");

    if (editando) {
        const nombre = inputs[0].value.trim();
        const precioPrimera = parseFloat(inputs[1].value);
        const precioSegunda = parseFloat(inputs[2].value);
        const precioTercera = parseFloat(inputs[3].value);

        if (!nombre) {
            alert("⚠️ El nombre de la fruta no puede estar vacío");
            inputs[0].focus();
            return;
        }

        if (isNaN(precioPrimera) || isNaN(precioSegunda) || isNaN(precioTercera)) {
            alert("⚠️ Por favor completa todos los precios correctamente");
            return;
        }

        if (precioPrimera < 0 || precioSegunda < 0 || precioTercera < 0) {
            alert("⚠️ Los precios no pueden ser negativos");
            return;
        }

        const nuevosPrecios = {
            primera: precioPrimera,
            segunda: precioSegunda,
            tercera: precioTercera
        };

        const textoOriginal = btn.textContent;
        btn.textContent = "⏳ Guardando...";
        btn.disabled = true;

        try {
            if (esGlobal) {
                console.log("🌍 Iniciando actualización global");
                await guardarCambiosPrecios(fruta._id, nuevosPrecios);
            } else {
                console.log("📝 Actualizando solo en esta finca");
                await apiFetch(`/precios/actualizar/${fruta._id}`, "PUT", {
                    nombre,
                    precios: nuevosPrecios,
                    usuario: usuario,
                    adminAlias: usuario,
                    fincaId: fincaId
                });
                alert("✅ Precio actualizado solo para esta finca");
            }

            btn.textContent = "✏️ Editar";
            inputs.forEach(input => input.disabled = true);
            
        } catch (err) {
            console.error("❌ Error al actualizar:", err);
            alert(`❌ Error al actualizar: ${err.message}`);
        } finally {
            btn.disabled = false;
            if (btn.textContent.includes("Guardando")) {
                btn.textContent = textoOriginal;
            }
        }
    } else {
        console.log(`✏️ Activando modo edición para: ${fruta.nombre}`);
        btn.textContent = "💾 Guardar";
        inputs.forEach(input => input.disabled = false);
        inputs[0].focus();
    }
}

async function eliminarFruta(fruta, div) {
    const confirmacion = confirm(
        `⚠️ ELIMINAR FRUTA\n\n` +
        `¿Estás seguro de eliminar "${fruta.nombre}" SOLO de esta finca?\n\n` +
        `Esta acción no afectará otras fincas y no se puede deshacer.`
    );
    
    if (!confirmacion) return;
    
    console.log(`🗑️ Eliminando fruta: ${fruta.nombre}`);
    
    try {
        await apiFetch(`/precios/eliminar/${fruta._id}`, "DELETE", {
            usuario: usuario,
            adminAlias: usuario,
            fincaId: fincaId
        });
        
        div.remove();
        alert(`✅ "${fruta.nombre}" eliminada solo de esta finca`);
        
        console.log(`✅ Fruta ${fruta.nombre} eliminada exitosamente`);
    } catch (err) {
        console.error("❌ Error al eliminar:", err);
        alert(`❌ Error al eliminar: ${err.message}`);
    }
}

const btnVolver = document.getElementById("btnVolverDashboard");
if (btnVolver) {
    btnVolver.addEventListener("click", () => {
        console.log("🔙 Volviendo al dashboard");
        window.location.href = `dashboard1.html?usuario=${encodeURIComponent(usuario)}`;
    });
}

function validarPrecio(valor) {
    const precio = parseFloat(valor);
    return !isNaN(precio) && precio >= 0;
}

function formatearPrecio(precio) {
    if (typeof precio !== 'number') return '0';
    return precio.toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    });
}

function mostrarLoading(elemento, texto = "Cargando...") {
    if (elemento) {
        elemento.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
                <p>${texto}</p>
            </div>
        `;
    }
}

if (!document.querySelector('#loading-animation-styles')) {
    const style = document.createElement('style');
    style.id = 'loading-animation-styles';
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .botones-fruta {
            display: flex;
            gap: 5px;
            margin-top: 10px;
            flex-wrap: wrap;
        }
        .botones-fruta button {
            flex: 1;
            min-width: 80px;
            padding: 8px 12px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }
        .editarBtn {
            background: #4CAF50;
            color: white;
        }
        .editarBtn:hover {
            background: #45a049;
        }
        .eliminarBtn {
            background: #f44336;
            color: white;
        }
        .eliminarBtn:hover {
            background: #da190b;
        }
        .editarGlobalBtn:hover {
            background: #e55555;
        }
    `;
    document.head.appendChild(style);
}

console.log("✅ precios.js cargado correctamente");
console.log("🏠 Finca ID:", fincaId);
console.log("👤 Usuario:", usuario);
console.log("🔗 Origen integración:", origenIntegracion);