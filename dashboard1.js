import { apiFetch } from "./api.js";

// 🔍 DEBUG: Verificar la URL completa
console.log("=== URL Y PARÁMETROS ===");
console.log("URL completa:", window.location.href);
console.log("Search params:", window.location.search);

const params = new URLSearchParams(window.location.search);
const usuario = params.get("usuario");
const adminAlias = params.get("adminAlias");  // Obtén también el adminAlias

// Verifica que adminAlias no sea null
if (!adminAlias) {
  console.error("❌ No se encontró el adminAlias en la URL");
} else {
  console.log("Admin alias:", adminAlias);
}

// Actualiza la URL para filtrar las fincas del admin
const response = await fetch(`/fincas/por-admin?adminAlias=${adminAlias}`);

// 🔍 DEBUG: Verificar qué usuario se extrajo
console.log("Usuario extraído de URL:", usuario);
console.log("Usuario es null?", usuario === null);
console.log("Usuario es undefined?", usuario === undefined);
console.log("Usuario es string vacío?", usuario === "");
console.log("=== FIN DEBUG URL ===");

const saludo = document.getElementById("saludo");
if (usuario && usuario !== "null" && usuario !== "undefined") {
  saludo.textContent = `Bienvenido, ${usuario}`;
  console.log("✅ Saludo configurado correctamente");
} else {
  saludo.textContent = "Bienvenido (usuario no identificado)";
  console.error("❌ Usuario no válido:", usuario);
}

const btnAgregar = document.getElementById("btnAgregarFinca");
const modal = document.getElementById("modalFinca");
const guardar = document.getElementById("guardarFinca");
const lista = document.getElementById("listaFincas");

// ✅ aquí la declaras global
let todasLasFincas = [];  

guardar.addEventListener("click", async () => {
  const nombre = document.getElementById("nombreFinca").value.trim();
  const propietario = document.getElementById("propietarioFinca").value.trim();

  if (!nombre || !propietario) return alert("Completa todos los campos");

  try {
    const finca = await apiFetch("/fincas/agregar", "POST", { 
      nombre, 
      propietario, 
      usuario,     // Subusuario que está creando
      adminAlias   // Administrador dueño
    });
    
    todasLasFincas.unshift(finca);
    renderFinca(finca);
    modal.classList.add("hidden");
    
    // Limpiar formulario
    document.getElementById("nombreFinca").value = "";
    document.getElementById("propietarioFinca").value = "";
  } catch (err) {
    console.error("Error al guardar finca:", err);
    alert("Error al guardar finca: " + err.message);
  }
});


function renderFinca(finca) {
  const div = document.createElement("div");
  div.className = "card-glass";
  div.innerHTML = `
    <strong>${finca.nombre}</strong><br>
    <small>${finca.propietario}</small><br>
    <button onclick="location.href='precios.html?id=${finca._id}&usuario=${encodeURIComponent(usuario)}'">Agregar precios</button>
    <button onclick="location.href='recogida.html?fincaId=${finca._id}&usuario=${encodeURIComponent(usuario)}&finca=${encodeURIComponent(finca.nombre)}&propietario=${encodeURIComponent(finca.propietario)}'">Recogida</button>
    <button onclick="location.href='historial.html?id=${finca._id}&usuario=${encodeURIComponent(usuario)}&finca=${encodeURIComponent(finca.nombre)}'">Ver historial</button>
  `;
  lista.prepend(div);
}

async function cargarFincas() {
  try {
    console.log("🔍 Cargando fincas para el administrador:", adminAlias);

    const response = await fetch(`/fincas/por-admin?adminAlias=${adminAlias}`);

    if (!response.ok) {
      throw new Error("No se pudo cargar las fincas");
    }

    const fincasAdmin = await response.json();
    console.log("📋 Fincas del administrador:", fincasAdmin.length);

    // Asegúrate de actualizar el estado de todas las fincas del admin
    todasLasFincas = fincasAdmin;
    mostrarFincas(todasLasFincas);
  } catch (err) {
    console.error("Error al cargar fincas:", err);
  }
}




function mostrarFincas(fincas) {
  lista.innerHTML = ""; // Limpiar la lista de fincas
  if (fincas.length === 0) {
    lista.innerHTML = "<p>No tienes fincas registradas aún.</p>";
  } else {
    // Renderizar las fincas de manera eficiente
    fincas.forEach(renderFinca);
  }
}


modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.add("hidden");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    modal.classList.add("hidden");
  }
});

btnAgregar.addEventListener("click", () => {
  modal.classList.remove("hidden");
});

const inputBuscar = document.getElementById("buscarFinca");

inputBuscar.addEventListener("input", () => {
  const texto = inputBuscar.value.toLowerCase();

  const filtradas = todasLasFincas.filter(finca =>
    finca.nombre.toLowerCase().includes(texto) ||
    finca.propietario.toLowerCase().includes(texto)
  );

  mostrarFincas(filtradas);
});

// Cargar fincas al iniciar
cargarFincas();