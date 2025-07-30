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
    } else {
      // Subusuario - ✅ USAR res.admin.alias en lugar de res.admin.username
      const url = `dashboard2.html?usuario=${encodeURIComponent(res.usuario)}&admin=${encodeURIComponent(res.admin.alias)}`;
      console.log("Redirigiendo a:", url);
      window.location.href = url;
    }
  } catch (err) {
    console.error("Error completo:", err);
    alert("Error al iniciar sesión: " + err.message);
  }
});
