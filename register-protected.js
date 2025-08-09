import { apiFetch } from "./api.js";

// 🛡️ PROTECCIÓN: Verificar que solo super admin pueda acceder
document.addEventListener("DOMContentLoaded", () => {
  console.log("🔐 Verificando permisos de super admin...");
  
  // Verificar si hay datos de usuario en localStorage
  const userData = localStorage.getItem("userData");
  
  if (!userData) {
    console.log("❌ No hay datos de usuario - Redirigiendo a login");
    alert("⚠️ Acceso no autorizado. Debes iniciar sesión.");
    window.location.href = "index.html";
    return;
  }
  
  let user;
  try {
    user = JSON.parse(userData);
  } catch (e) {
    console.log("❌ Datos de usuario inválidos - Redirigiendo a login");
    alert("⚠️ Sesión inválida. Inicia sesión nuevamente.");
    localStorage.removeItem("userData");
    window.location.href = "index.html";
    return;
  }
  
  // Verificar que el usuario sea tipo 3 (super admin)
  if (user.tipo !== 3) {
    console.log("❌ Usuario no es super admin (tipo:", user.tipo, ") - Acceso denegado");
    alert("🚫 Acceso denegado. Solo los Super Administradores pueden registrar usuarios.");
    
    // Redirigir según el tipo de usuario
    if (user.tipo === 1) {
      window.location.href = "dashboard.html"; // Admin normal
    } else if (user.tipo === 2) {
      window.location.href = "dashboard2.html"; // Subusuario
    } else {
      window.location.href = "index.html"; // Por defecto
    }
    return;
  }
  
  console.log("✅ Super admin verificado - Acceso permitido");
  
  // Inicializar funcionalidad del formulario
  initializeRegisterForm();
});

function initializeRegisterForm() {
  const tipoSelect = document.getElementById("registerTipo");
  const aliasInput = document.getElementById("aliasAdmin");

  // Mostrar/ocultar campo de alias admin según tipo seleccionado
  tipoSelect.addEventListener("change", () => {
    if (tipoSelect.value === "2") {
      aliasInput.classList.remove("hidden");
    } else {
      aliasInput.classList.add("hidden");
      aliasInput.value = "";
    }
  });

  // Manejar envío del formulario
  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("registerName").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const tipo = parseInt(tipoSelect.value);
    const alias = document.getElementById("registerAlias").value.trim();
    const aliasAdmin = aliasInput.value.trim();

    console.log("📝 Intentando registrar:", { username, tipo, alias, aliasAdmin });

    // Validaciones básicas
    if (!username || !password || !alias || !tipo || (tipo === 2 && !aliasAdmin)) {
      alert("⚠️ Completa todos los campos requeridos.");
      return;
    }

    // Validaciones adicionales
    if (username.length < 3) {
      alert("⚠️ El nombre de usuario debe tener al menos 3 caracteres.");
      return;
    }

    if (password.length < 6) {
      alert("⚠️ La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (alias.length < 2) {
      alert("⚠️ El alias debe tener al menos 2 caracteres.");
      return;
    }

    try {
      const body = {
        username,
        password,
        tipo,
        alias,
        aliasAdmin: tipo === 2 ? aliasAdmin : null,
      };

      console.log("🚀 Enviando solicitud de registro:", body);

      await apiFetch("/auth/register", "POST", body);
      
      console.log("✅ Registro exitoso");
      alert("✅ Usuario registrado exitosamente");
      
      // Limpiar formulario
      document.getElementById("registerForm").reset();
      aliasInput.classList.add("hidden");
      
      // Opcional: Redirigir de vuelta al dashboard después de un registro exitoso
      setTimeout(() => {
        window.location.href = "dashboard3.html";
      }, 1500);
      
    } catch (err) {
      console.error("❌ Error en registro:", err);
      alert("❌ Error en el registro: " + err.message);
    }
  });
}

// Función adicional de seguridad que se ejecuta periódicamente
setInterval(() => {
  const userData = localStorage.getItem("userData");
  if (!userData) {
    console.log("🔐 Sesión perdida - Redirigiendo");
    window.location.href = "index.html";
    return;
  }
  
  try {
    const user = JSON.parse(userData);
    if (user.tipo !== 3) {
      console.log("🔐 Permisos cambiados - Redirigiendo");
      window.location.href = "index.html";
    }
  } catch (e) {
    console.log("🔐 Datos corruptos - Redirigiendo");
    localStorage.removeItem("userData");
    window.location.href = "index.html";
  }
}, 30000); // Verificar cada 30 segundos