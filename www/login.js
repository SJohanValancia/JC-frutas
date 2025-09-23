import { apiFetch } from "./api.js";
import { getUserFromDB, saveUserToDB } from "./db.js";

// Limpiar localStorage cuando se carga la página de login
document.addEventListener("DOMContentLoaded", () => {
  // 1. Guardar la marca (si existe)
  const lastSeen = localStorage.getItem('lastSeenUpdate');

  // 2. Limpiar TODO lo demás
  localStorage.clear();

  // 3. Restaurar la marca
  if (lastSeen) {
    localStorage.setItem('lastSeenUpdate', lastSeen);
  }

  // 🔽 Ocultar badge al hacer clic en el ícono de descarga
  const downloadIcon = document.getElementById('downloadIcon');
  if (downloadIcon) {
    downloadIcon.addEventListener('click', hideUpdateNotification);
  }

  // Simular notificación de actualización después de 2 segundos
  setTimeout(() => {
    showUpdateNotification();
  }, 2000);
});
/* ========== NOTIFICACIÓN DE ACTUALIZACIÓN ========== */
function showUpdateNotification() {
  const downloadIcon = document.getElementById('downloadIcon');
  const badge = document.getElementById('notificationBadge');

  const lastSeen = localStorage.getItem('lastSeenUpdate');
  if (lastSeen === '1') return; // Ya la vio, no mostrar

  downloadIcon.classList.add('has-update');
  badge.textContent = '1';
  badge.style.opacity = '1';
  badge.style.transform = 'scale(1)';
}

function hideUpdateNotification() {
  const downloadIcon = document.getElementById('downloadIcon');
  const badge = document.getElementById('notificationBadge');

  downloadIcon.classList.remove('has-update');
  badge.style.opacity = '0';
  badge.style.transform = 'scale(0)';

  // Marcar como vista
  localStorage.setItem('lastSeenUpdate', '1');
}
/* ===================================================== */

/* ========== LOGIN ========== */
async function handleLogin(username, password) {
  try {
    if (navigator.onLine) {
      console.log("🌐 Online: intentando login con servidor...");
      try {
        const response = await apiFetch("/auth/login", "POST", { username, password });

        await saveUserToDB({
          username,
          password,
          tipo: response.tipo,
          alias: response.alias,
          enlazadoAAdmin: response.enlazadoAAdmin,
          admin: response.admin,
        });

        localStorage.setItem("userData", JSON.stringify(response));
        redirectUserByType(response, username);
        return;
      } catch (err) {
        console.warn("⚠️ Servidor no responde, intentando login offline...");
      }
    }

    console.log("📴 Intentando login offline...");
    const user = await getUserFromDB(username);
    if (!user) {
      alert("❌ Usuario no encontrado en modo offline");
      return;
    }
    if (user.password !== password) {
      alert("❌ Contraseña incorrecta");
      return;
    }

    const fakeResponse = {
      tipo: user.tipo,
      alias: user.alias,
      usuario: user.username,
      enlazadoAAdmin: user.enlazadoAAdmin,
      admin: user.admin,
    };

    localStorage.setItem("userData", JSON.stringify(fakeResponse));
    redirectUserByType(fakeResponse, username);
  } catch (error) {
    console.error("❌ Error en login:", error);
    alert("❌ Error en el login: " + error.message);
  }
}

/* ========== REDIRECCIONES ========== */
function redirectUserByType(userData, username) {
  const userDataToKeep = JSON.stringify(userData);
  localStorage.clear();
  localStorage.setItem("userData", userDataToKeep);

  switch (userData.tipo) {
    case 1: // Administrador
      handleAdminRedirect(userData, username);
      break;
    case 2: // Subusuario
      handleSubuserRedirect(userData, username);
      break;
    case 3: // Super Admin
      window.location.href = `dashboard3.html?usuario=${encodeURIComponent(username)}`;
      break;
    default:
      console.error("❌ Tipo de usuario desconocido:", userData.tipo);
      alert("Error: Tipo de usuario no reconocido");
  }
}

function handleAdminRedirect(userData, username) {
  if (userData.enlazadoAAdmin === true && userData.admin) {
    const adminAlias = userData.admin.alias;
    window.location.href =
      `dashboard1.html?usuario=${encodeURIComponent(username)}&alias=${encodeURIComponent(adminAlias)}&enlazado=true&tipoEnlace=admin&adminEnlazado=${encodeURIComponent(userData.alias)}`;
  } else {
    window.location.href =
      `dashboard1.html?usuario=${encodeURIComponent(username)}&alias=${encodeURIComponent(userData.alias)}`;
  }
}

function handleSubuserRedirect(userData, username) {
  if (userData.admin && userData.admin.alias) {
    const adminAlias = userData.admin.alias;
    window.location.href =
      `dashboard2.html?usuario=${encodeURIComponent(username)}&admin=${encodeURIComponent(adminAlias)}&tipoEnlace=subusuario`;
  } else {
    console.error("❌ Subusuario sin admin asignado");
    alert("Error: Subusuario sin administrador asignado. Contacte al super administrador.");
  }
}

/* ========== FORMULARIO ========== */
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!username || !password) {
    alert("⚠️ Por favor, completa todos los campos");
    return;
  }

  await handleLogin(username, password);
});