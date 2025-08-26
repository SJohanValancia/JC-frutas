import { apiFetch } from "./api.js";

// 🛡️ PROTECCIÓN: Verificar que solo super admin pueda acceder
document.addEventListener("DOMContentLoaded", () => {
  console.log("🔍 Verificando permisos de super admin...");
  
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
  const aliasAdminContainer = document.getElementById("aliasAdminContainer");
  const aliasAdminInput = document.getElementById("aliasAdmin");
  const enlazarAdminContainer = document.getElementById("enlazarAdminContainer");
  const enlazarAdminCheckbox = document.getElementById("enlazarAdmin");
  const adminSelectContainer = document.getElementById("adminSelectContainer");
  const adminSelect = document.getElementById("adminSelect");

  // Cargar administradores disponibles para enlazar
  loadAvailableAdmins();

  // Mostrar/ocultar campos según tipo seleccionado
  tipoSelect.addEventListener("change", () => {
    const selectedType = tipoSelect.value;
    
    if (selectedType === "2") {
      // Subusuario - mostrar campo de alias admin
      aliasAdminContainer.classList.remove("hidden");
      enlazarAdminContainer.classList.add("hidden");
      adminSelectContainer.classList.add("hidden");
      
      // Limpiar campos no utilizados
      enlazarAdminCheckbox.checked = false;
      adminSelect.value = "";
    } else if (selectedType === "1") {
      // Administrador - mostrar opción de enlazar
      aliasAdminContainer.classList.add("hidden");
      enlazarAdminContainer.classList.remove("hidden");
      
      // Limpiar campos no utilizados
      aliasAdminInput.value = "";
      
      // Si ya está marcado el checkbox, mostrar el select
      if (enlazarAdminCheckbox.checked) {
        adminSelectContainer.classList.remove("hidden");
      }
    } else {
      // Ningún tipo seleccionado - ocultar todo
      aliasAdminContainer.classList.add("hidden");
      enlazarAdminContainer.classList.add("hidden");
      adminSelectContainer.classList.add("hidden");
      
      // Limpiar todos los campos
      aliasAdminInput.value = "";
      enlazarAdminCheckbox.checked = false;
      adminSelect.value = "";
    }
  });

  // Manejar checkbox de enlazar admin
  enlazarAdminCheckbox.addEventListener("change", () => {
    if (enlazarAdminCheckbox.checked) {
      adminSelectContainer.classList.remove("hidden");
    } else {
      adminSelectContainer.classList.add("hidden");
      adminSelect.value = "";
    }
  });

  // Manejar envío del formulario
  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("registerName").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const tipo = parseInt(tipoSelect.value);
    const alias = document.getElementById("registerAlias").value.trim();
    
    // Determinar aliasAdmin según el tipo y configuración
    let aliasAdmin = null;
    let enlazadoAAdmin = false;
    
    if (tipo === 2) {
      // Subusuario - usar el campo de alias admin tradicional
      aliasAdmin = aliasAdminInput.value.trim();
    } else if (tipo === 1 && enlazarAdminCheckbox.checked) {
      // Admin enlazado - usar el select de admins
      aliasAdmin = adminSelect.value;
      enlazadoAAdmin = true;
    }

    console.log("🔍 Intentando registrar:", { 
      username, 
      tipo, 
      alias, 
      aliasAdmin, 
      enlazadoAAdmin 
    });

    // Validaciones básicas
    if (!username || !password || !alias || !tipo) {
      alert("⚠️ Completa todos los campos requeridos.");
      return;
    }

    // Validaciones específicas según tipo
    if (tipo === 2 && !aliasAdmin) {
      alert("⚠️ Los subusuarios deben tener un administrador asignado.");
      return;
    }

    if (tipo === 1 && enlazarAdminCheckbox.checked && !aliasAdmin) {
      alert("⚠️ Si deseas enlazar el administrador, debes seleccionar uno.");
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
        aliasAdmin,
        enlazadoAAdmin
      };

      console.log("🚀 Enviando solicitud de registro:", body);

      await apiFetch("/auth/register", "POST", body);
      
      console.log("✅ Registro exitoso");
      alert("✅ Usuario registrado exitosamente");
      
      // Limpiar formulario
      document.getElementById("registerForm").reset();
      aliasAdminContainer.classList.add("hidden");
      enlazarAdminContainer.classList.add("hidden");
      adminSelectContainer.classList.add("hidden");
      
      // Recargar lista de admins disponibles
      loadAvailableAdmins();
      
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

// Función para cargar administradores disponibles para enlazar
async function loadAvailableAdmins() {
  try {
    console.log("🔍 Cargando administradores disponibles...");
    
    const admins = await apiFetch("/auth/get-available-admins", "GET");
    
    const adminSelect = document.getElementById("adminSelect");
    
    // Limpiar opciones existentes
    adminSelect.innerHTML = '<option value="">Selecciona un administrador...</option>';
    
    // Agregar opciones de administradores
    admins.forEach(admin => {
      const option = document.createElement("option");
      option.value = admin.alias;
      option.textContent = `${admin.username} (${admin.alias})`;
      adminSelect.appendChild(option);
    });
    
    console.log(`✅ Cargados ${admins.length} administradores disponibles`);
    
  } catch (error) {
    console.error("❌ Error cargando administradores:", error);
    
    const adminSelect = document.getElementById("adminSelect");
    adminSelect.innerHTML = '<option value="">Error cargando administradores...</option>';
  }
}

// Función adicional de seguridad que se ejecuta periódicamente
setInterval(() => {
  const userData = localStorage.getItem("userData");
  if (!userData) {
    console.log("🔍 Sesión perdida - Redirigiendo");
    window.location.href = "index.html";
    return;
  }
  
  try {
    const user = JSON.parse(userData);
    if (user.tipo !== 3) {
      console.log("🔍 Permisos cambiados - Redirigiendo");
      window.location.href = "index.html";
    }
  } catch (e) {
    console.log("🔍 Datos corruptos - Redirigiendo");
    localStorage.removeItem("userData");
    window.location.href = "index.html";
  }
}, 30000); // Verificar cada 30 segundos