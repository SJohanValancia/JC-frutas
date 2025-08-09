import { apiFetch } from "./api.js";

// Limpiar localStorage cuando se carga la página de login
document.addEventListener("DOMContentLoaded", () => {
  localStorage.clear();
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  try {
    const res = await apiFetch("/auth/login", "POST", { username, password });
    alert("Inicio de sesión exitoso");

    // Limpiar localStorage antes de redirigir al dashboard
    window.localStorage.clear();

    // 🔍 DEBUG: Vamos a ver exactamente qué está devolviendo el servidor
    console.log("=== RESPUESTA COMPLETA DEL SERVIDOR ===");
    console.log(res);
    console.log("Tipo:", res.tipo);
    console.log("Usuario:", res.usuario);
    console.log("Alias:", res.alias);
    console.log("Admin:", res.admin);
    console.log("=== FIN DEBUG ===");

    // Verificar que res.usuario existe y no es undefined
    if (!res.usuario || res.usuario === undefined || res.usuario === "undefined") {
      console.error("❌ ERROR CRÍTICO: res.usuario es undefined o null");
      console.error("❌ Esto indica un problema en el backend");
      console.error("❌ Respuesta del servidor:", res);
      alert("Error crítico: El servidor no devolvió el nombre de usuario. Revisa la consola del servidor.");
      return;
    }

    if (res.tipo === 1) {
      // Administrador
      const url = `dashboard1.html?usuario=${encodeURIComponent(res.usuario)}`;
      console.log("Redirigiendo a:", url);
      window.location.href = url;
    } else if (res.tipo === 2) {
      // Subusuario
      const url = `dashboard2.html?usuario=${encodeURIComponent(res.usuario)}&admin=${encodeURIComponent(res.admin.alias)}`;
      console.log("Redirigiendo a:", url);
      window.location.href = url;
    } else if (res.tipo === 3) {
      // Super Administrador
      const url = `dashboard3.html?usuario=${encodeURIComponent(res.usuario)}`;
      console.log("Redirigiendo a super admin dashboard:", url);
      window.location.href = url;
    }
  } catch (err) {
    console.error("Error completo:", err);
    alert("Error al iniciar sesión: " + err.message);
  }

  // Agregar esta modificación a tu script de login existente

// Función de login modificada para manejar usuarios bloqueados
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
        
        // Verificar si el error es por cuenta bloqueada
        if (error.message && error.message.includes('CUENTA_BLOQUEADA')) {
            console.log("🚫 Usuario bloqueado detectado");
            handleBlockedUser(username, error);
            return;
        }
        
        // Si es un error de respuesta JSON, intentar parsearlo
        if (error.message.startsWith('{')) {
            try {
                const errorData = JSON.parse(error.message);
                if (errorData.error === 'CUENTA_BLOQUEADA') {
                    console.log("🚫 Usuario bloqueado detectado desde JSON");
                    handleBlockedUser(username, errorData);
                    return;
                }
            } catch (parseError) {
                console.log("❌ Error parseando JSON de error");
            }
        }
        
        // Para otros errores, mostrar mensaje genérico
        alert("❌ Error en el login: " + error.message);
    }
}

// Nueva función para manejar usuarios bloqueados
function handleBlockedUser(username, errorData) {
    console.log("🚫 Redirigiendo usuario bloqueado a página de suspensión");
    
    // Guardar temporalmente el usuario bloqueado
    localStorage.setItem('blockedUser', username);
    
    // Limpiar cualquier dato de sesión anterior
    localStorage.removeItem('userData');
    localStorage.removeItem('userToken');
    
    // Mostrar mensaje de notificación
    alert("🚫 Su cuenta ha sido suspendida. Será redirigido a la página de información.");
    
    // Redirigir a la página de cuenta suspendida
    setTimeout(() => {
        window.location.href = `cuenta-suspendida.html?usuario=${encodeURIComponent(username)}`;
    }, 1500);
}

// Función para redirigir usuarios según su tipo (mantener la existente)
function redirectUserByType(userData, username) {
    switch(userData.tipo) {
        case 1: // Administrador
            window.location.href = `dashboard.html?usuario=${encodeURIComponent(username)}`;
            break;
        case 2: // Subusuario
            window.location.href = `dashboard2.html?usuario=${encodeURIComponent(username)}`;
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

// Ejemplo de cómo integrar esto en tu formulario de login existente
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = document.getElementById("loginName").value.trim();
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

});

