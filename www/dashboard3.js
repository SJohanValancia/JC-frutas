import { apiFetch } from "./api.js";

let currentUser = null;
let adminUsers = [];

// 🛡️ NUEVA FUNCIÓN: Verificar permisos de super admin
function checkSuperAdminAccess() {
    const userData = localStorage.getItem("userData");
    
    if (userData) {
        try {
            const user = JSON.parse(userData);
            
            console.log("🔍 Verificando permisos de usuario:", user);
            
            // Si es super admin (tipo 3), mostrar botón de registrar
            if (user.tipo === 3) {
                console.log("✅ Super admin detectado - Mostrando botón registrar");
                const registerBtn = document.getElementById("registerBtn");
                if (registerBtn) {
                    registerBtn.style.display = "inline-block";
                }
            } else {
                console.log("ℹ️ Usuario regular - Ocultando botón registrar");
                const registerBtn = document.getElementById("registerBtn");
                if (registerBtn) {
                    registerBtn.style.display = "none";
                }
            }
        } catch (e) {
            console.log("❌ Error al parsear userData:", e);
            const registerBtn = document.getElementById("registerBtn");
            if (registerBtn) {
                registerBtn.style.display = "none";
            }
        }
    } else {
        console.log("❌ No hay userData - Verificando por parámetros URL");
        // Fallback: verificar si el usuario viene por parámetro URL
        const { usuario } = getUrlParams();
        if (usuario) {
            // Hacer una llamada para verificar el tipo del usuario
            verifyUserTypeFromServer(usuario);
        } else {
            const registerBtn = document.getElementById("registerBtn");
            if (registerBtn) {
                registerBtn.style.display = "none";
            }
        }
    }
}

// 🔍 NUEVA FUNCIÓN: Verificar tipo de usuario desde el servidor
async function verifyUserTypeFromServer(username) {
    try {
        console.log("🔍 Verificando tipo de usuario desde servidor:", username);
        
        // Usar el endpoint existente get-alias que también devuelve el tipo
        const response = await apiFetch(`/auth/get-alias?usuario=${username}`, "GET");
        
        console.log("📊 Respuesta del servidor:", response);
        
        if (response.tipo === 3) {
            console.log("✅ Super admin verificado desde servidor");
            const registerBtn = document.getElementById("registerBtn");
            if (registerBtn) {
                registerBtn.style.display = "inline-block";
            }
            
            // Guardar en localStorage para futuras verificaciones
            const userData = {
                usuario: response.username,
                alias: response.alias,
                tipo: response.tipo
            };
            localStorage.setItem("userData", JSON.stringify(userData));
        } else {
            console.log("ℹ️ Usuario no es super admin");
            const registerBtn = document.getElementById("registerBtn");
            if (registerBtn) {
                registerBtn.style.display = "none";
            }
        }
    } catch (error) {
        console.error("❌ Error al verificar tipo de usuario:", error);
        const registerBtn = document.getElementById("registerBtn");
        if (registerBtn) {
            registerBtn.style.display = "none";
        }
    }
}

// Función para obtener parámetros de la URL
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        usuario: params.get('usuario')
    };
}

// Función para mostrar mensaje de bienvenida
function showWelcomeMessage() {
    const { usuario } = getUrlParams();
    if (usuario) {
        document.getElementById('welcomeMessage').textContent = `Bienvenido, ${usuario}`;
        currentUser = usuario;
    }
}

// Función para cargar todos los usuarios tipo 1 (administradores)
async function loadAdminUsers() {
    try {
        console.log("🔄 Cargando usuarios administradores...");
        
        // Llamar al endpoint que necesitaremos crear en el backend
        const response = await apiFetch("/auth/get-all-admins", "GET");
        
        adminUsers = response;
        console.log("✅ Usuarios administradores cargados:", adminUsers);
        
        displayAdminUsers();
    } catch (error) {
        console.error("❌ Error al cargar usuarios:", error);
        document.getElementById('loadingMessage').style.display = 'none';
        document.getElementById('noUsersMessage').style.display = 'block';
    }
}

// Función para mostrar las tarjetas de usuarios
function displayAdminUsers() {
    const container = document.getElementById('usersContainer');
    const loading = document.getElementById('loadingMessage');
    const noUsers = document.getElementById('noUsersMessage');
    
    loading.style.display = 'none';
    
    if (!adminUsers || adminUsers.length === 0) {
        noUsers.style.display = 'block';
        return;
    }
    
    container.style.display = 'grid';
    container.innerHTML = '';
    
    adminUsers.forEach(user => {
        const userCard = createUserCard(user);
        container.appendChild(userCard);
    });
}

// Función para crear una tarjeta de usuario
function createUserCard(user) {
    const card = document.createElement('div');
    card.className = 'user-card';
    card.id = `user-${user._id}`;
    
    const avatar = user.username ? user.username.charAt(0).toUpperCase() : 'U';
    const status = user.bloqueado ? 'Bloqueado' : 'Activo';
    const statusClass = user.bloqueado ? 'status-blocked' : 'status-active';
    const passwordId = `password-${user._id}`;
    
    card.innerHTML = `
        <div class="user-header">
            <div class="user-avatar">${avatar}</div>
            <div class="user-info">
                <h3>${user.username || 'Sin nombre'}</h3>
                <span class="user-type">Administrador</span>
            </div>
        </div>
        
        <div class="user-details">
            <div class="detail-row">
                <span class="detail-label">Nombre:</span>
                <input type="text" class="detail-value editable" value="${user.username || ''}" 
                       data-field="username" data-user-id="${user._id}">
            </div>
            <div class="detail-row">
                <span class="detail-label">Alias:</span>
                <span class="detail-value">${user.alias || 'Sin alias'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Contraseña:</span>
                <div class="password-container">
                    <input type="password" id="${passwordId}" class="detail-value editable password-input" 
                           value="${user.password || ''}" data-field="password" data-user-id="${user._id}">
                    <button type="button" class="password-toggle" onclick="togglePassword('${passwordId}')">
                        👁️
                    </button>
                </div>
            </div>
            <div class="detail-row">
                <span class="detail-label">Tipo:</span>
                <select class="detail-value editable" data-field="tipo" data-user-id="${user._id}">
                    <option value="1" ${user.tipo === 1 ? 'selected' : ''}>Administrador</option>
                    <option value="2" ${user.tipo === 2 ? 'selected' : ''}>Subusuario</option>
                    <option value="3" ${user.tipo === 3 ? 'selected' : ''}>Super Admin</option>
                </select>
            </div>
            <div class="detail-row">
                <span class="detail-label">Estado:</span>
                <span class="detail-value ${statusClass}">${status}</span>
            </div>
        </div>
        
        <button class="action-btn btn-save" onclick="saveUserChanges('${user._id}')">
            💾 Guardar Cambios
        </button>
        
        <div class="user-actions">
            <button class="action-btn btn-block" onclick="blockUser('${user._id}')" 
                    ${user.bloqueado ? 'disabled' : ''}>
                🚫 Bloquear
            </button>
            <button class="action-btn btn-unblock" onclick="unblockUser('${user._id}')" 
                    ${!user.bloqueado ? 'disabled' : ''}>
                ✅ Desbloquear
            </button>
            <button class="action-btn btn-inspect" onclick="inspectUser('${user._id}')">
                🔍 Inspeccionar
            </button>
        </div>
    `;
    
    return card;
}

// Función para guardar cambios de usuario
async function saveUserChanges(userId) {
    try {
        const card = document.getElementById(`user-${userId}`);
        const editableFields = card.querySelectorAll('.editable');
        
        const updates = {};
        editableFields.forEach(field => {
            const fieldName = field.dataset.field;
            const value = field.value;
            updates[fieldName] = fieldName === 'tipo' ? parseInt(value) : value;
        });
        
        console.log("💾 Guardando cambios:", updates);
        
        await apiFetch(`/auth/update-user/${userId}`, "PUT", updates);
        
        alert("✅ Usuario actualizado correctamente");
        
        // Recargar la lista de usuarios
        await loadAdminUsers();
        
    } catch (error) {
        console.error("❌ Error al guardar cambios:", error);
        alert("❌ Error al guardar cambios: " + error.message);
    }
}

// Función para bloquear usuario
async function blockUser(userId) {
    try {
        console.log("🚫 Bloqueando usuario:", userId);
        
        await apiFetch(`/auth/block-user/${userId}`, "PUT");
        
        alert("🚫 Usuario bloqueado correctamente");
        
        // Recargar la lista de usuarios
        await loadAdminUsers();
        
    } catch (error) {
        console.error("❌ Error al bloquear usuario:", error);
        alert("❌ Error al bloquear usuario: " + error.message);
    }
}

// Función para desbloquear usuario
async function unblockUser(userId) {
    try {
        console.log("✅ Desbloqueando usuario:", userId);
        
        await apiFetch(`/auth/unblock-user/${userId}`, "PUT");
        
        alert("✅ Usuario desbloqueado correctamente");
        
        // Recargar la lista de usuarios
        await loadAdminUsers();
        
    } catch (error) {
        console.error("❌ Error al desbloquear usuario:", error);
        alert("❌ Error al desbloquear usuario: " + error.message);
    }
}

// Función para alternar visibilidad de contraseña
function togglePassword(passwordId) {
    const passwordInput = document.getElementById(passwordId);
    const toggleBtn = passwordInput.nextElementSibling;
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = '👁️';
    }
}

// Función para filtrar usuarios por nombre
function filterUsers(searchTerm) {
    const userCards = document.querySelectorAll('.user-card');
    const noResults = document.getElementById('noResultsMessage');
    let visibleCount = 0;
    
    userCards.forEach(card => {
        const username = card.querySelector('.user-info h3').textContent.toLowerCase();
        const aliasElement = card.querySelector('.detail-value');
        const alias = aliasElement ? aliasElement.textContent.toLowerCase() : '';
        
        const matchesSearch = username.includes(searchTerm.toLowerCase()) || 
                             alias.includes(searchTerm.toLowerCase());
        
        if (matchesSearch || searchTerm === '') {
            card.classList.remove('hidden');
            visibleCount++;
        } else {
            card.classList.add('hidden');
        }
    });
    
    // Mostrar mensaje si no hay resultados
    if (visibleCount === 0 && searchTerm !== '') {
        noResults.style.display = 'block';
    } else {
        noResults.style.display = 'none';
    }
}

// Función para limpiar búsqueda
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    filterUsers('');
}

// Configurar el buscador
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    
    searchInput.addEventListener('input', (e) => {
        filterUsers(e.target.value);
    });
    
    // También permitir búsqueda con Enter
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            filterUsers(e.target.value);
        }
    });
}

async function inspectUser(userId) {
    try {
        console.log("🔍 Inspeccionando usuario:", userId);
        
        const inspection = await apiFetch(`/auth/inspect-user/${userId}`, "GET");
        
        const info = `
🔍 INSPECCIÓN DETALLADA DE USUARIO

📋 INFORMACIÓN BÁSICA:
👤 ID: ${inspection._id}
📧 Username: ${inspection.username || 'No definido'}
🏷️ Alias: ${inspection.alias || 'No definido'}
🔢 Tipo: ${inspection.tipo === 1 ? 'Administrador' : inspection.tipo === 2 ? 'Subusuario' : inspection.tipo === 3 ? 'Super Admin' : 'Desconocido'}
✉️ Email: ${inspection.email || 'No definido'}
👨‍💼 Nombre: ${inspection.nombre || 'No definido'}

📅 FECHAS:
🆕 Creado: ${inspection.createdAt ? new Date(inspection.createdAt).toLocaleString() : 'No disponible'}
🔄 Actualizado: ${inspection.updatedAt ? new Date(inspection.updatedAt).toLocaleString() : 'No disponible'}

🔐 ESTADO:
🚫 Bloqueado: ${inspection.bloqueado ? 'SÍ' : 'NO'}
👥 Admin asociado: ${inspection.aliasAdmin || 'N/A'}

📊 ESTADÍSTICAS:
${inspection.tipo === 1 ? `👥 Subusuarios a cargo: ${inspection.subusuariosCount || 0}` : ''}
${inspection.adminInfo ? `🔗 Admin: ${inspection.adminInfo.username} (${inspection.adminInfo.alias})` : ''}

📊 Ver consola para información completa
        `;
        
        console.log("🔍 INSPECCIÓN COMPLETA DEL SERVIDOR:", inspection);
        alert(info);
        
    } catch (error) {
        console.error("❌ Error al inspeccionar usuario:", error);
        alert("❌ Error al inspeccionar usuario: " + error.message);
    }
}

// Función para cerrar sesión
function logout() {
    if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "index.html"; // Cambiado de login.html a index.html
    }
}

// Exponer funciones globalmente para los onclick
window.saveUserChanges = saveUserChanges;
window.blockUser = blockUser;
window.unblockUser = unblockUser;
window.inspectUser = inspectUser;
window.logout = logout;
window.togglePassword = togglePassword;
window.clearSearch = clearSearch;

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Inicializando dashboard3...");
    
    showWelcomeMessage();
    setupSearch();
    loadAdminUsers();
    
    // 🆕 NUEVA LÍNEA: Verificar permisos de super admin
    checkSuperAdminAccess();
    
    console.log("✅ Dashboard3 inicializado correctamente");
});