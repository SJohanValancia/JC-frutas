// 🔥 AUTH-IFRAME.JS - VERSIÓN CORREGIDA

(async function() {
    // Verificar si venimos desde integración
    const urlParams = new URLSearchParams(window.location.search);
    const origenIntegracion = urlParams.get('origenIntegracion');
    
    if (origenIntegracion !== 'true') {
        return; // No es una integración, usar flujo normal
    }
    
    console.log('🔐 Detectada integración desde programa principal');

    try {
        // 1. OBTENER DATOS DESDE URL PARAMETERS (NUEVO MÉTODO)
        const token = urlParams.get('token');
        const usuario = urlParams.get('usuario');
        const nombre = urlParams.get('nombre');
        const rol = urlParams.get('rol');

        // 2. Si no hay datos en URL, intentar sessionStorage (fallback)
        let datosUsuario = null;
        if (token && usuario) {
            datosUsuario = {
                token: token,
                usuario: decodeURIComponent(usuario),
                nombre: decodeURIComponent(nombre),
                rol: rol,
                tipo: 1,
                alias: decodeURIComponent(usuario)
            };
            console.log('✅ Datos obtenidos desde URL parameters');
        } else {
            // Fallback a sessionStorage (solo funciona mismo origen)
            const sesionCompartidaStr = sessionStorage.getItem('sesionCompartida');
            if (sesionCompartidaStr) {
                datosUsuario = JSON.parse(sesionCompartidaStr);
                console.log('✅ Datos obtenidos desde sessionStorage');
            }
        }

        if (!datosUsuario) {
            console.error('❌ No se encontraron datos de sesión en URL ni sessionStorage');
            mostrarErrorIntegracion("No hay datos de sesión disponibles. Por favor vuelve a iniciar sesión.");
            return;
        }
        
        console.log('✅ Datos de sesión encontrados:', {
            usuario: datosUsuario.usuario,
            nombre: datosUsuario.nombre,
            rol: datosUsuario.rol
        });
        
        // 3. Verificar si ya hay sesión activa en este programa
        const sesionActual = localStorage.getItem('sesionFrutas');
        if (sesionActual) {
            const sesionActualObj = JSON.parse(sesionActual);
            if (sesionActualObj.usuario === datosUsuario.usuario) {
                console.log('✅ Sesión ya activa para este usuario');
                return; // Ya está autenticado
            }
        }
        
        // 4. Realizar login silencioso
        await realizarLoginSilencioso(datosUsuario);
        
    } catch (error) {
        console.error('❌ Error en autenticación silenciosa:', error);
        mostrarErrorIntegracion(error.message);
    }
})();

async function realizarLoginSilencioso(datosUsuario) {
    try {
        console.log('🔄 Realizando login silencioso...');
        
        const username = datosUsuario.usuario || datosUsuario.username;
        const token = datosUsuario.token; // 🔥 USAR TOKEN DIRECTAMENTE
        
        if (!username) {
            throw new Error('No se proporcionó nombre de usuario');
        }
        
        // Guardar sesión localmente para el programa de frutas
        const sesionFrutas = {
            usuario: username,
            nombre: datosUsuario.nombre || username,
            rol: datosUsuario.rol || 'admin',
            tipo: datosUsuario.tipo || 1,
            alias: datosUsuario.alias || username,
            token: token, // 🔥 GUARDAR TOKEN PARA PETICIONES
            timestamp: Date.now(),
            origenIntegracion: true
        };
        
        localStorage.setItem('sesionFrutas', JSON.stringify(sesionFrutas));
        
        // También guardar en el formato esperado
        localStorage.setItem('usuario', username);
        localStorage.setItem('alias', sesionFrutas.alias);
        localStorage.setItem('tipo', sesionFrutas.tipo.toString());
        localStorage.setItem('userToken', token); // 🔥 IMPORTANTE: Guardar token separado
        
        console.log('✅ Login silencioso completado exitosamente');
        
        // Notificar al parent
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

function mostrarErrorIntegracion(mensaje) {
    // 🔥 VERIFICAR QUE EL DOM ESTÉ LISTO
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            crearOverlayError(mensaje);
        });
    } else {
        crearOverlayError(mensaje);
    }
}

function crearOverlayError(mensaje) {
    // Eliminar overlay previo si existe
    const overlayPrevio = document.getElementById('error-overlay');
    if (overlayPrevio) overlayPrevio.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'error-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    
    overlay.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px;
            border-radius: 20px;
            max-width: 500px;
            color: white;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        ">
            <div style="font-size: 64px; margin-bottom: 20px;">🔐</div>
            <h2 style="margin: 0 0 15px 0; font-size: 24px;">Error de Autenticación</h2>
            <p style="opacity: 0.9; line-height: 1.6; margin-bottom: 25px;">
                ${mensaje}
            </p>
            <button onclick="cerrarErrorIntegracion()" style="
                background: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 12px 30px;
                border-radius: 25px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            ">
                Cerrar
            </button>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

function cerrarErrorIntegracion() {
    const overlay = document.getElementById('error-overlay');
    if (overlay) overlay.remove();
    
    // Opcional: redirigir a login
    // window.location.href = 'index.html';
}

// 🔥 LISTENER PARA RECIBIR SESIÓN DESDE PROGRAMA PRINCIPAL
window.addEventListener('message', function(event) {
    // Verificar origen por seguridad
    if (event.origin !== window.location.origin && 
        event.origin !== 'https://jc-fi.onrender.com' &&
        event.origin !== 'http://127.0.0.1:5503') {
        console.warn('⚠️ Origen no permitido:', event.origin);
        return;
    }
    
    const data = event.data;
    
    if (data.action === 'establecerSesion' && data.sesionData) {
        console.log('📥 Recibiendo sesión desde programa principal...');
        
        try {
            realizarLoginSilencioso(data.sesionData);
            console.log('✅ Sesión establecida desde mensaje');
        } catch (error) {
            console.error('❌ Error al establecer sesión:', error);
        }
    }
});

// Exportar funciones
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        realizarLoginSilencioso,
        verificarSesionActiva
    };
}