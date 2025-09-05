// auth-guard.js - Sistema de verificación global para todas las páginas
// Incluir este script en TODAS las páginas HTML del sistema (excepto cuenta-suspendida.html)

(function() {
    'use strict';
    
    // 🚫 VERIFICACIÓN CRÍTICA DE USUARIO BLOQUEADO
    async function verificarEstadoUsuario() {
        try {
            // 1. Verificar si hay datos de usuario en la sesión
            const userData = localStorage.getItem('userData');
            const sessionUser = sessionStorage.getItem('currentUser');
            
            if (!userData && !sessionUser) {
                // No hay sesión activa, redirigir al login
                console.log('❌ No hay sesión activa, redirigiendo al login...');
                window.location.href = 'index.html';
                return;
            }
            
            let usuario = null;
            
            // Obtener nombre de usuario de los datos guardados
            if (userData) {
                try {
                    const parsedData = JSON.parse(userData);
                    usuario = parsedData.usuario;
                } catch (e) {
                    console.error('Error al parsear userData:', e);
                }
            }
            
            if (!usuario && sessionUser) {
                usuario = sessionUser;
            }
            
            if (!usuario) {
                console.log('❌ No se pudo obtener nombre de usuario');
                window.location.href = 'index.html';
                return;
            }
            
            console.log('🔍 Verificando estado del usuario:', usuario);
            
            // 2. Consultar el estado actual del usuario en la base de datos
            const response = await fetch(`/api/auth/get-alias?usuario=${encodeURIComponent(usuario)}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.log('❌ Error al verificar usuario, redirigiendo al login');
                clearAllSessionData();
                window.location.href = 'index.html';
                return;
            }
            
            const userInfo = await response.json();
            console.log('📊 Estado del usuario:', userInfo);
            
            // 3. VERIFICACIÓN CRÍTICA: Si el usuario está bloqueado
            if (userInfo.bloqueado === true) {
                console.log('🚫 USUARIO BLOQUEADO - Redirigiendo a página de suspensión');
                
                // Limpiar todos los datos de sesión
                clearAllSessionData();
                
                // Guardar temporalmente el usuario bloqueado para la página de suspensión
                localStorage.setItem('blockedUser', usuario);
                
                // Redirigir inmediatamente a la página de cuenta suspendida
                window.location.replace('cuenta-suspendida.html?usuario=' + encodeURIComponent(usuario));
                return;
            }
            
            console.log('✅ Usuario verificado y no bloqueado:', usuario);
            
        } catch (error) {
            console.error('❌ Error en verificación de usuario:', error);
            // En caso de error, por seguridad redirigir al login
            clearAllSessionData();
            window.location.href = 'index.html';
        }
    }
    
    // Función para limpiar todos los datos de sesión
    function clearAllSessionData() {
        localStorage.removeItem('userData');
        localStorage.removeItem('userToken');
        localStorage.removeItem('currentUser');
        sessionStorage.clear();
        
        // Limpiar cookies de sesión si existen
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
    }
    
    // Función para prevenir navegación con botones del navegador
    function preventNavigation() {
        // Prevenir botón atrás
        history.pushState(null, null, location.href);
        window.onpopstate = function () {
            history.go(1);
        };
        
        // Prevenir recarga de página con F5 o Ctrl+R durante verificación
        document.addEventListener('keydown', function(e) {
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
                e.preventDefault();
                verificarEstadoUsuario();
            }
        });
    }
    
    // Verificación continua cada 30 segundos
    function iniciarVerificacionContinua() {
        setInterval(async () => {
            await verificarEstadoUsuario();
        }, 30000); // Verificar cada 30 segundos
    }
    
    // Verificar cuando la página se enfoca (usuario regresa a la pestaña)
    function verificarAlEnfocar() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('🔄 Página enfocada, verificando estado...');
                verificarEstadoUsuario();
            }
        });
        
        window.addEventListener('focus', () => {
            console.log('🔄 Ventana enfocada, verificando estado...');
            verificarEstadoUsuario();
        });
    }
    
    // Interceptar intentos de navegación directa por URL
    function interceptarNavegacion() {
        // Monitorear cambios en la URL
        let currentLocation = location.href;
        setInterval(() => {
            if (location.href !== currentLocation) {
                currentLocation = location.href;
                console.log('🔄 Cambio de URL detectado, verificando estado...');
                verificarEstadoUsuario();
            }
        }, 1000);
    }
    
    // INICIALIZACIÓN DEL SISTEMA DE PROTECCIÓN
    function inicializarSistemaProteccion() {
        console.log('🛡️ Inicializando sistema de protección contra usuarios bloqueados...');
        
        // Verificación inmediata al cargar
        verificarEstadoUsuario();
        
        // Configurar verificaciones continuas
        iniciarVerificacionContinua();
        
        // Configurar verificación al enfocar
        verificarAlEnfocar();
        
        // Prevenir navegación problemática
        preventNavigation();
        
        // Interceptar navegación por URL
        interceptarNavegacion();
        
        console.log('✅ Sistema de protección activado');
    }
    
    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarSistemaProteccion);
    } else {
        inicializarSistemaProteccion();
    }
    
    // También ejecutar inmediatamente por seguridad
    inicializarSistemaProteccion();
    
})();

// ========== FUNCIONES ADICIONALES DE SEGURIDAD ==========

// Función para ser llamada desde las páginas específicas
window.verificarUsuarioActivo = async function() {
    try {
        const userData = localStorage.getItem('userData');
        if (!userData) {
            window.location.href = 'index.html';
            return false;
        }
        
        const parsedData = JSON.parse(userData);
        const response = await fetch(`/api/auth/get-alias?usuario=${encodeURIComponent(parsedData.usuario)}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            window.location.href = 'index.html';
            return false;
        }
        
        const userInfo = await response.json();
        if (userInfo.bloqueado === true) {
            localStorage.setItem('blockedUser', parsedData.usuario);
            window.location.replace('cuenta-suspendida.html?usuario=' + encodeURIComponent(parsedData.usuario));
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error en verificación:', error);
        window.location.href = 'index.html';
        return false;
    }
};

// Protección adicional: Interceptar todas las llamadas AJAX/fetch
(function() {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        try {
            const response = await originalFetch.apply(this, args);
            
            // Si recibimos un 403 (Forbidden) que podría indicar cuenta bloqueada
            if (response.status === 403) {
                const clonedResponse = response.clone();
                try {
                    const data = await clonedResponse.json();
                    if (data.error === 'CUENTA_BLOQUEADA') {
                        console.log('🚫 Cuenta bloqueada detectada en respuesta del servidor');
                        localStorage.setItem('blockedUser', data.username || '');
                        window.location.replace('cuenta-suspendida.html?usuario=' + encodeURIComponent(data.username || ''));
                        return;
                    }
                } catch (e) {
                    // Ignorar errores de parsing
                }
            }
            
            return response;
        } catch (error) {
            throw error;
        }
    };
})();