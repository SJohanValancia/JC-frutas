// blockCheck.js - Sistema de verificación global de usuarios bloqueados
// Este archivo debe ser incluido en TODAS las páginas protegidas

class BlockCheckSystem {
    constructor() {
        this.isChecking = false;
        this.checkInterval = null;
        this.excludedPages = [
            'index.html',
            'login.html', 
            'cuenta-suspendida.html',
            'register.html'
        ];
        
        // Inicializar el sistema
        this.init();
    }

    init() {
        console.log('🛡️ Sistema de verificación de bloqueo iniciado');
        
        // Verificar inmediatamente al cargar
        this.checkUserBlockStatus();
        
        // Verificar periódicamente cada 30 segundos
        this.startPeriodicCheck();
        
        // Verificar en eventos de visibilidad
        this.setupVisibilityCheck();
        
        // Verificar al cambiar de pestaña/ventana
        this.setupFocusCheck();
    }

    // Verificar si la página actual está excluida de la verificación
    isCurrentPageExcluded() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        return this.excludedPages.includes(currentPage);
    }

    // Verificación principal del estado de bloqueo
    async checkUserBlockStatus() {
        // No verificar en páginas excluidas
        if (this.isCurrentPageExcluded()) {
            console.log('📝 Página excluida de verificación de bloqueo');
            return;
        }

        if (this.isChecking) {
            console.log('⏳ Ya hay una verificación en curso');
            return;
        }

        this.isChecking = true;

        try {
            const userData = this.getUserDataFromStorage();
            
            if (!userData || !userData.usuario) {
                console.log('❌ No hay datos de usuario válidos');
                this.redirectToLogin();
                return;
            }

            const username = userData.usuario;
            console.log('🔍 Verificando estado de bloqueo para:', username);

            // Verificar estado actual del usuario
            const response = await this.fetchUserStatus(username);
            
            if (response.blocked) {
                console.log('🚫 Usuario bloqueado detectado');
                this.handleBlockedUser(username);
            } else {
                console.log('✅ Usuario activo, continuando...');
            }

        } catch (error) {
            console.error('❌ Error en verificación de bloqueo:', error);
            
            // Si hay error 403 o 401, probablemente está bloqueado
            if (error.status === 403 || error.message?.includes('CUENTA_BLOQUEADA')) {
                const userData = this.getUserDataFromStorage();
                if (userData?.usuario) {
                    this.handleBlockedUser(userData.usuario);
                }
            }
        } finally {
            this.isChecking = false;
        }
    }

    // Obtener datos del usuario desde localStorage
    getUserDataFromStorage() {
        try {
            const userData = localStorage.getItem('userData');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('❌ Error al obtener datos de usuario:', error);
            return null;
        }
    }

    // Realizar petición al servidor para verificar estado
    async fetchUserStatus(username) {
        const response = await fetch(`/auth/check-block-status/${encodeURIComponent(username)}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            if (response.status === 403 && errorData.error === 'CUENTA_BLOQUEADA') {
                return { blocked: true, username, error: errorData };
            }
            
            throw new Error(`Error ${response.status}: ${errorData.message || 'Error desconocido'}`);
        }

        return await response.json();
    }

    // Manejar usuario bloqueado
    handleBlockedUser(username) {
        console.log('🚫 Procesando usuario bloqueado:', username);
        
        // Limpiar datos de sesión
        this.clearSessionData();
        
        // Guardar usuario bloqueado para la página de suspensión
        localStorage.setItem('blockedUser', username);
        
        // Mostrar notificación
        this.showBlockedNotification();
        
        // Redirigir después de un breve delay
        setTimeout(() => {
            this.redirectToSuspendedPage(username);
        }, 1500);
    }

    // Limpiar datos de sesión
    clearSessionData() {
        const itemsToRemove = ['userData', 'userToken', 'sessionId'];
        
        itemsToRemove.forEach(item => {
            localStorage.removeItem(item);
        });
        
        sessionStorage.clear();
        
        console.log('🧹 Datos de sesión limpiados');
    }

    // Mostrar notificación de bloqueo
    showBlockedNotification() {
        // Crear notificación visual
        const notification = document.createElement('div');
        notification.id = 'blocked-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
                color: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(255, 107, 107, 0.3);
                z-index: 10000;
                font-family: 'Inter', sans-serif;
                font-weight: 600;
                max-width: 350px;
                animation: slideInRight 0.5s ease-out;
            ">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.5em;">🚫</span>
                    <div>
                        <div style="font-size: 1.1em; margin-bottom: 5px;">Cuenta Suspendida</div>
                        <div style="font-size: 0.9em; opacity: 0.9;">Redirigiendo...</div>
                    </div>
                </div>
            </div>
        `;

        // Agregar animación CSS
        if (!document.getElementById('blocked-notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'blocked-notification-styles';
            styles.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);
    }

    // Redirigir a página de cuenta suspendida
    redirectToSuspendedPage(username) {
        const suspendedUrl = `cuenta-suspendida.html?usuario=${encodeURIComponent(username)}`;
        console.log('🔄 Redirigiendo a página de suspensión:', suspendedUrl);
        
        // Prevenir navegación hacia atrás
        history.pushState(null, null, location.href);
        window.onpopstate = function () {
            history.go(1);
        };
        
        window.location.replace(suspendedUrl);
    }

    // Redirigir a login si no hay sesión
    redirectToLogin() {
        console.log('🔄 Redirigiendo al login por falta de sesión');
        window.location.replace('index.html');
    }

    // Configurar verificación periódica
    startPeriodicCheck() {
        // Verificar cada 30 segundos
        this.checkInterval = setInterval(() => {
            console.log('⏰ Verificación periódica de bloqueo');
            this.checkUserBlockStatus();
        }, 30000);
    }

    // Configurar verificación cuando la página se vuelve visible
    setupVisibilityCheck() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('👁️ Página visible, verificando estado de bloqueo');
                setTimeout(() => this.checkUserBlockStatus(), 500);
            }
        });
    }

    // Configurar verificación cuando la ventana obtiene foco
    setupFocusCheck() {
        window.addEventListener('focus', () => {
            console.log('🎯 Ventana enfocada, verificando estado de bloqueo');
            setTimeout(() => this.checkUserBlockStatus(), 500);
        });
    }

    // Detener el sistema (útil para páginas que no lo necesitan)
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        console.log('⏹️ Sistema de verificación de bloqueo detenido');
    }

    // Verificación manual (para casos específicos)
    async manualCheck() {
        console.log('🔍 Verificación manual solicitada');
        return await this.checkUserBlockStatus();
    }
}

// Inicializar automáticamente el sistema cuando se carga el script
let blockCheckSystem = null;

// Solo inicializar si no estamos en páginas excluidas
function initBlockCheck() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const excludedPages = ['index.html', 'login.html', 'cuenta-suspendida.html', 'register.html'];
    
    if (!excludedPages.includes(currentPage)) {
        blockCheckSystem = new BlockCheckSystem();
        
        // Hacer el sistema accesible globalmente
        window.blockCheckSystem = blockCheckSystem;
        
        console.log('🛡️ Sistema de bloqueo inicializado para:', currentPage);
    } else {
        console.log('📝 Página excluida del sistema de bloqueo:', currentPage);
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBlockCheck);
} else {
    initBlockCheck();
}

// Función de utilidad para verificar estado desde otros scripts
window.checkUserBlockStatus = () => {
    if (blockCheckSystem) {
        return blockCheckSystem.manualCheck();
    }
    console.warn('⚠️ Sistema de verificación de bloqueo no inicializado');
    return Promise.resolve();
};

// Exportar para uso en otros módulos si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BlockCheckSystem;
}