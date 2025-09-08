import { apiFetch } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  const tipoSelect = document.getElementById("registerTipo");
  const aliasInput = document.getElementById("aliasAdmin");
  const enlaceAdminDiv = document.getElementById("enlaceAdminDiv"); // Nuevo div para admin enlazado
  const enlaceAdminCheckbox = document.getElementById("enlaceAdmin"); // Nuevo checkbox

  // Función para mostrar/ocultar campos según el tipo
  function updateFieldsVisibility() {
    const tipoValue = tipoSelect.value;
    
    // Para subusuarios (tipo 2) - siempre mostrar alias admin
    if (tipoValue === "2") {
      aliasInput.classList.remove("hidden");
      if (enlaceAdminDiv) enlaceAdminDiv.classList.add("hidden");
      if (enlaceAdminCheckbox) enlaceAdminCheckbox.checked = false;
    } 
    // Para administradores (tipo 1) - mostrar opción de enlace
    else if (tipoValue === "1") {
      if (enlaceAdminDiv) enlaceAdminDiv.classList.remove("hidden");
      // Si el checkbox está marcado, mostrar el campo de alias
      if (enlaceAdminCheckbox && enlaceAdminCheckbox.checked) {
        aliasInput.classList.remove("hidden");
      } else {
        aliasInput.classList.add("hidden");
        aliasInput.value = "";
      }
    } 
    // Para otros tipos - ocultar todo
    else {
      aliasInput.classList.add("hidden");
      if (enlaceAdminDiv) enlaceAdminDiv.classList.add("hidden");
      aliasInput.value = "";
      if (enlaceAdminCheckbox) enlaceAdminCheckbox.checked = false;
    }
  }

  // Event listener para cambio de tipo
  tipoSelect.addEventListener("change", updateFieldsVisibility);

  // Event listener para checkbox de enlace admin
  if (enlaceAdminCheckbox) {
    enlaceAdminCheckbox.addEventListener("change", () => {
      if (tipoSelect.value === "1") {
        if (enlaceAdminCheckbox.checked) {
          aliasInput.classList.remove("hidden");
        } else {
          aliasInput.classList.add("hidden");
          aliasInput.value = "";
        }
      }
    });
  }

  // Event listener para el formulario
  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("registerName").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const tipo = parseInt(tipoSelect.value);
    const alias = document.getElementById("registerAlias").value.trim();
    const aliasAdmin = aliasInput.value.trim();
    const enlazadoAAdmin = enlaceAdminCheckbox ? enlaceAdminCheckbox.checked : false;

    console.log("Datos del formulario:");
    console.log("- Username:", username);
    console.log("- Tipo:", tipo);
    console.log("- Alias:", alias);
    console.log("- AliasAdmin:", aliasAdmin);
    console.log("- EnlazadoAAdmin:", enlazadoAAdmin);

    // Validaciones
    if (!username || !password || !alias || !tipo) {
      return alert("Completa todos los campos requeridos.");
    }

    // Para subusuarios, siempre requerir aliasAdmin
    if (tipo === 2 && !aliasAdmin) {
      return alert("Los subusuarios deben tener un administrador asignado.");
    }

    // Para administradores enlazados, requerir aliasAdmin si está marcado el checkbox
    if (tipo === 1 && enlazadoAAdmin && !aliasAdmin) {
      return alert("Si vas a enlazar el administrador, debes especificar el alias del admin principal.");
    }

    try {
      const body = {
        username,
        password,
        tipo,
        alias,
        aliasAdmin: (tipo === 2 || (tipo === 1 && enlazadoAAdmin)) ? aliasAdmin : null,
        enlazadoAAdmin: tipo === 1 ? enlazadoAAdmin : false
      };

      console.log("Enviando datos:", body);

      await apiFetch("/auth/register", "POST", body);
      alert("Registro exitoso");
      window.location.href = "index.html";
    } catch (err) {
      console.error("Error en registro:", err);
      alert("Error en el registro: " + err.message);
    }
  });

  // Inicializar visibilidad de campos
  updateFieldsVisibility();
});