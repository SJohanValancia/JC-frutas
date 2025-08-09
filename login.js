import { apiFetch } from "./api.js";

// Limpiar localStorage cuando se carga la página de login
document.addEventListener("DOMContentLoaded", () => {
  localStorage.clear();
});

// Función principal para manejar el login
async function handleLogin(username, password) {
    try {
        console.log("🔄 Intentando login para:", username);
        
        const response = await apiFetch("/auth/login", "POST", {
            username,
            password
        });
        
        console.log("✅ Login exitoso:", response);
        
        // Guardar datos de usuario
        localStorage.setItem("userData", JSON.stringify(response));
        
        // Redirigir según el tipo de usuario
        redirectUserByType(response, username);
        
    } catch (error) {
        console.error("❌ Error en login:", error);
        
        // Verificar si el error es por cuenta bloqueada usando el nuevo sistema
        if (error.type === 'CUENTA_BLOQUEADA' || error.message === 'CUENTA_BLOQUEADA') {
            console.log("🚫 Usuario bloqueado detectado");
            handleBlockedUser(username, error);
            return;
        }
        
        // Verificar también por status 403
        if (error.status === 403) {
            console.log("🚫 Posible usuario bloqueado - Status 403");
            handleBlockedUser(username, error);
            return;
        }
        
        // Para otros errores, mostrar mensaje genérico
        alert("❌ Error en el login: " + error.message);
    }
}

// Función para manejar usuarios bloqueados
function handleBlockedUser(username, errorData) {
    console.log("🚫 Redirigiendo usuario bloqueado a página de suspensión");
    
    // Guardar temporalmente el usuario bloqueado
    localStorage.setItem('blockedUser', username);
    
    // Limpiar cualquier dato de sesión anterior
    localStorage.removeItem('userData');
    localStorage.removeItem('userToken');
    sessionStorage.clear();
    
    // Mostrar mensaje de notificación
    alert("🚫 Su cuenta ha sido suspendida. Será redirigido a la página de información.");
    
    // Redirigir a la página de cuenta suspendida
    setTimeout(() => {
        window.location.href = `cuenta-suspendida.html?usuario=${encodeURIComponent(username)}`;
    }, 1500);
}

// Función para redirigir usuarios según su tipo
function redirectUserByType(userData, username) {
    // Limpiar localStorage antes de redirigir
    localStorage.clear();
    
    switch(userData.tipo) {
        case 1: // Administrador
            window.location.href = `dashboard1.html?usuario=${encodeURIComponent(username)}`;
            break;
        case 2: // Subusuario
            const adminAlias = userData.admin ? userData.admin.alias : '';
            window.location.href = `dashboard2.html?usuario=${encodeURIComponent(username)}&admin=${encodeURIComponent(adminAlias)}`;
            break;
        case 3: // Super Admin
            window.location.href = `dashboard3.html?usuario=${encodeURIComponent(username)}`;
            break;
        default:
            console.error("❌ Tipo de usuario desconocido:", userData.tipo);
            alert("Error: Tipo de usuario no reconocido");
            break;
    }
}

// Event listener para el formulario de login
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    
    if (!username || !password) {
        alert("⚠️ Por favor, completa todos los campos");
        return;
    }
    
    // Usar la nueva función de login
    await handleLogin(username, password);
});

// Función adicional para verificar si un usuario está bloqueado (opcional)
async function checkUserStatus(username) {
    try {
        const response = await apiFetch(`/auth/get-alias?usuario=${username}`, "GET");
        
        if (response.bloqueado) {
            console.log("🚫 Usuario está bloqueado");
            return { blocked: true, user: response };
        }
        
        return { blocked: false, user: response };
    } catch (error) {
        console.error("❌ Error verificando estado del usuario:", error);
        return { blocked: false, user: null };
    }
}