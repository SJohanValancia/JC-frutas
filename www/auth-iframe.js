// 🔥 SISTEMA DE AUTENTICACIÓN SILENCIOSA PARA IFRAMES

(async function() {
    // Verificar si venimos desde integración
    const urlParams = new URLSearchParams(window.location.search);
    const origenIntegracion = urlParams.get('origenIntegracion');
    
    if (origenIntegracion !== 'true') {
        // No es una integración, usar flujo normal
        return;
    }
    
    console.log('🔐 Detectada integración desde programa principal');
    
    try {
        // 1. Obtener datos de sesión compartida
        const sesionCompartidaStr = sessionStorage.getItem('sesionCompartida');
        
        if (!sesionCompartidaStr) {
            console.error('❌ No se encontraron datos de sesión compartida');
            // Intentar obtener desde localStorage del programa principal
            const sesionLocalStr = localStorage.getItem('userData');
            if (sesionLocalStr) {
                const userData = JSON.parse(sesionLocalStr);
                await realizarLoginSilencioso(userData);
                return;
            }
            throw new Error('No hay datos de sesión disponibles');
        }
        
        const sesionCompartida = JSON.parse(sesionCompartidaStr);
        console.log('✅ Datos de sesión encontrados:', {
            usuario: sesionCompartida.usuario,
            nombre: sesionCompartida.nombre,
            rol: sesionCompartida.rol
        });
        
        // 2. Verificar si ya hay sesión activa en este programa
        const sesionActual = localStorage.getItem('sesionFrutas');
        if (sesionActual) {
            const sesionActualObj = JSON.parse(sesionActual);
            if (sesionActualObj.usuario === sesionCompartida.usuario) {
                console.log('✅ Sesión ya activa para este usuario');
                return; // Ya está autenticado
            }
        }
        
        // 3. Realizar login silencioso
        await realizarLoginSilencioso(sesionCompartida);
        
    } catch (error) {
        console.error('❌ Error en autenticación silenciosa:', error);
        mostrarErrorIntegracion(error.message);
    }
})();

async function realizarLoginSilencioso(datosUsuario) {
    try {
        console.log('🔄 Realizando login silencioso...');
        
        // Extraer usuario (puede venir como usuario.usuario o solo usuario)
        const username = datosUsuario.usuario || datosUsuario.username;
        
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
            timestamp: Date.now(),
            origenIntegracion: true
        };
        
        localStorage.setItem('sesionFrutas', JSON.stringify(sesionFrutas));
        
        // También guardar en el formato esperado por el programa de frutas
        localStorage.setItem('usuario', username);
        localStorage.setItem('alias', sesionFrutas.alias);
        localStorage.setItem('tipo', sesionFrutas.tipo.toString());
        
        console.log('✅ Login silencioso completado exitosamente');
        console.log('📦 Sesión guardada:', sesionFrutas);
        
        // Notificar al programa principal que el login fue exitoso
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
    // Crear overlay de error elegante
    const overlay = document.createElement('div');
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
            <button onclick="window.parent.postMessage({action: 'cerrarModal'}, '*')" style="
                background: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 12px 30px;
                border-radius: 25px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
               onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                Cerrar
            </button>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

// Función para verificar sesión periódicamente
function verificarSesionActiva() {
    const sesionFrutas = localStorage.getItem('sesionFrutas');
    if (!sesionFrutas) {
        console.warn('⚠️ Sesión no encontrada');
        return false;
    }
    
    const sesion = JSON.parse(sesionFrutas);
    const tiempoTranscurrido = Date.now() - sesion.timestamp;
    const TIEMPO_EXPIRACION = 7 * 24 * 60 * 60 * 1000; // 7 días
    
    if (tiempoTranscurrido > TIEMPO_EXPIRACION) {
        console.warn('⚠️ Sesión expirada');
        localStorage.removeItem('sesionFrutas');
        return false;
    }
    
    return true;
}

// Exportar funciones si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        realizarLoginSilencioso,
        verificarSesionActiva
    };
}
// 🔥 LISTENER PARA RECIBIR SESIÓN DESDE PROGRAMA PRINCIPAL
window.addEventListener('message', function(event) {
    // Verificar origen por seguridad
    if (event.origin !== 'https://jc-fi.onrender.com' && 
        event.origin !== window.location.origin) {
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