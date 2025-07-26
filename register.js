import { apiFetch } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  const tipoSelect = document.getElementById("registerTipo");
  const aliasInput = document.getElementById("aliasAdmin");

  tipoSelect.addEventListener("change", () => {
    if (tipoSelect.value === "2") {
      aliasInput.classList.remove("hidden");
    } else {
      aliasInput.classList.add("hidden");
      aliasInput.value = "";
    }
  });

  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("registerName").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const tipo = parseInt(tipoSelect.value);
    const alias = document.getElementById("registerAlias").value.trim();
    const aliasAdmin = aliasInput.value.trim();

    console.log("Alias ingresado:", alias); // ✅ Aquí ya no será null

    if (!username || !password || !alias || !tipo || (tipo === 2 && !aliasAdmin)) {
      return alert("Completa todos los campos requeridos.");
    }

    try {
      const body = {
        username,
        password,
        tipo,
        alias,
        aliasAdmin: tipo === 2 ? aliasAdmin : null,
      };

      await apiFetch("/auth/register", "POST", body);
      alert("Registro exitoso");
      window.location.href = "login.html";
    } catch (err) {
      alert("Error en el registro: " + err.message);
    }
  });
});
