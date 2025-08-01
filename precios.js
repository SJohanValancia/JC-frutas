import { apiFetch } from "./api.js";

const urlParams = new URLSearchParams(window.location.search);
const fincaId = urlParams.get("id");
const usuario = urlParams.get("usuario");  

const cantidadInput = document.getElementById("cantidadFrutas");
const frutasContainer = document.getElementById("frutasContainer");
const guardarBtn = document.getElementById("guardarPrecios");

// ✅ Función para normalizar nombres (igual que en el backend)
function normalizarNombre(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes
    .replace(/[^\w\s]/g, '') // Eliminar caracteres especiales excepto espacios
    .replace(/\s+/g, ' ') // Reemplazar múltiples espacios por uno solo
    .trim(); // Eliminar espacios al inicio y final
}

// ✅ Función para formatear nombre para mostrar
function formatearNombreParaMostrar(nombre) {
  return nombre
    .toLowerCase()
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}

cargarPreciosGuardados();

// ✅ Función para guardar cambios de precios (SOLO para esta finca específica)
async function guardarCambiosPrecios(frutaId, nuevosPrecios) {
  // Confirmación para actualizar globalmente
  const confirmacion = confirm(
    `Estás a punto de actualizar los precios de esta fruta en todas las fincas. ¿Estás seguro?`
  );

  if (!confirmacion) return;

  try {
    // Actualizar el precio globalmente
    await apiFetch(`/precios/actualizar-global/${frutaId}`, "PUT", {
      precios: nuevosPrecios,
      usuario: usuario,
      adminAlias: usuario
    });

    alert("Precios actualizados globalmente en todas las fincas");
    // Recargar precios después de la actualización
    cargarPreciosGuardados();
  } catch (err) {
    console.error("Error al actualizar precios:", err);
    alert("Error al actualizar los precios globalmente: " + err.message);
  }
}

// Después de actualizar los precios globalmente, recargamos los precios
async function cargarPreciosGuardados() {
  try {
    // Cargar precios globales
    const preciosGlobales = await apiFetch('/precios/todos-los-precios', "GET");
    // Cargar precios específicos para la finca
    const preciosGuardados = await apiFetch(`/precios/por-finca/${fincaId}`, "GET");

    let frutasFinales = [];

    if (preciosGuardados.length > 0) {
      // Usamos los precios específicos para esta finca si existen
      frutasFinales = preciosGuardados[0].frutas;
    } else {
      // Si no existen precios específicos, usamos los precios globales
      frutasFinales = preciosGlobales;
    }

    renderFrutasGuardadas(frutasFinales);
  } catch (err) {
    console.error("Error al cargar precios guardados:", err);
  }
}

cantidadInput.addEventListener("input", () => {
  const cantidad = parseInt(cantidadInput.value);
  frutasContainer.innerHTML = "";

  for (let i = 0; i < cantidad; i++) {
    const div = document.createElement("div");
    div.className = "fruta-card";
    div.innerHTML = `
      <input placeholder="Nombre de la fruta" class="nombreFruta">
      <div class="precios-por-calidad">
        <label>Primera: <input type="number" placeholder="Precio primera" class="precioFruta primera"></label>
        <label>Segunda: <input type="number" placeholder="Precio segunda" class="precioFruta segunda"></label>
        <label>Tercera: <input type="number" placeholder="Precio tercera" class="precioFruta tercera"></label>
      </div>
    `;
    frutasContainer.appendChild(div);
  }
});

guardarBtn.addEventListener("click", async () => {
  const nombres = document.querySelectorAll(".nombreFruta");
  const primeras = document.querySelectorAll(".precioFruta.primera");
  const segundas = document.querySelectorAll(".precioFruta.segunda");
  const terceras = document.querySelectorAll(".precioFruta.tercera");

  const frutas = [];

  for (let i = 0; i < nombres.length; i++) {
    const nombreOriginal = nombres[i].value.trim();
    const precioPrimera = parseFloat(primeras[i].value);
    const precioSegunda = parseFloat(segundas[i].value);
    const precioTercera = parseFloat(terceras[i].value);

    if (nombreOriginal && !isNaN(precioPrimera) && !isNaN(precioSegunda) && !isNaN(precioTercera)) {
      // ✅ Formatear nombre antes de guardar
      const nombreFormateado = formatearNombreParaMostrar(nombreOriginal);
      
      frutas.push({
        nombre: nombreFormateado,
        nombreNormalizado: normalizarNombre(nombreOriginal),
        precios: {
          primera: precioPrimera,
          segunda: precioSegunda,
          tercera: precioTercera
        }
      });
    }
  }

  if (!fincaId || frutas.length === 0) {
    alert("Completa los datos correctamente");
    return;
  }

  try {
    // Verificar si existen precios específicos para esta finca
    const existentes = await apiFetch(`/precios/por-finca/${fincaId}`, "GET");
    const fincaYaTienePrecios = existentes.length > 0 && existentes[existentes.length - 1]?.frutas?.length > 0;

    if (fincaYaTienePrecios) {
      // Si ya existen precios específicos, actualizamos los precios solo para esta finca
      for (const fruta of frutas) {
        await apiFetch(`/precios/actualizar/${fincaId}`, "PUT", { 
          fruta,
          usuario: usuario,
          adminAlias: usuario
        });
      }
    } else {
      // Si no existen precios para la finca, guardamos los precios globales
      await apiFetch("/precios/guardar", "POST", { fincaId, frutas });
    }

    // Recargar frutas después de agregar nuevas
    cargarPreciosGuardados();

    alert("Frutas guardadas correctamente");
    window.location.href = `dashboard1.html?usuario=${encodeURIComponent(usuario)}`;
  } catch (err) {
    alert("Error al guardar frutas: " + err.message);
  }
});

cantidadInput.addEventListener("input", () => {
  const cantidad = parseInt(cantidadInput.value);
  frutasContainer.innerHTML = "";

  for (let i = 0; i < cantidad; i++) {
    const div = document.createElement("div");
    div.className = "fruta-card";
    div.innerHTML = `
      <input placeholder="Nombre de la fruta" class="nombreFruta">
      <div class="precios-por-calidad">
        <label>Primera: <input type="number" placeholder="Precio primera" class="precioFruta primera"></label>
        <label>Segunda: <input type="number" placeholder="Precio segunda" class="precioFruta segunda"></label>
        <label>Tercera: <input type="number" placeholder="Precio tercera" class="precioFruta tercera"></label>
      </div>
    `;
    frutasContainer.appendChild(div);
  }
});

guardarBtn.addEventListener("click", async () => {
  const nombres = document.querySelectorAll(".nombreFruta");
  const primeras = document.querySelectorAll(".precioFruta.primera");
  const segundas = document.querySelectorAll(".precioFruta.segunda");
  const terceras = document.querySelectorAll(".precioFruta.tercera");

  const frutas = [];

  for (let i = 0; i < nombres.length; i++) {
    const nombre = nombres[i].value.trim();
    const precioPrimera = parseFloat(primeras[i].value);
    const precioSegunda = parseFloat(segundas[i].value);
    const precioTercera = parseFloat(terceras[i].value);

    if (nombre && !isNaN(precioPrimera) && !isNaN(precioSegunda) && !isNaN(precioTercera)) {
      frutas.push({
        nombre,
        precios: {
          primera: precioPrimera,
          segunda: precioSegunda,
          tercera: precioTercera
        }
      });
    }
  }

  if (!fincaId || frutas.length === 0) {
    alert("Completa los datos correctamente");
    return;
  }

  try {
    // ✅ Usar la ruta correcta para agregar frutas a una finca específica
    for (const fruta of frutas) {
      await apiFetch(`/precios/agregar-fruta/${fincaId}`, "POST", { 
        fruta,
        usuario: usuario,
        adminAlias: usuario
      });
    }

    alert("Frutas guardadas correctamente");
    
    // Recargar frutas después de agregar nuevas
    cargarPreciosGuardados();
    
    // Limpiar formulario
    cantidadInput.value = "";
    frutasContainer.innerHTML = "";
    
    // Opcional: redirigir al dashboard
    // window.location.href = `dashboard1.html?usuario=${encodeURIComponent(usuario)}`;
  } catch (err) {
    console.error("Error al guardar frutas:", err);
    alert("Error al guardar frutas: " + err.message);
  }
});

function renderFrutasGuardadas(frutas) {
  frutasContainer.innerHTML = ""; // Limpiar

  frutas.forEach((fruta, index) => {
    const precios = fruta.precios || { primera: 0, segunda: 0, tercera: 0 };

    const div = document.createElement("div");
    div.className = "fruta-card";
    div.innerHTML = `
      <input value="${fruta.nombre}" class="nombreFruta" disabled>
      <div class="precios-por-calidad">
        <label>Primera: <input type="number" value="${precios.primera}" class="precioFruta primera" disabled></label>
        <label>Segunda: <input type="number" value="${precios.segunda}" class="precioFruta segunda" disabled></label>
        <label>Tercera: <input type="number" value="${precios.tercera}" class="precioFruta tercera" disabled></label>
      </div>
      <button class="editarBtn">✏️ Editar</button>
      <button class="eliminarBtn">🗑️ Eliminar</button>
    `;
    frutasContainer.appendChild(div);

    // Eventos:
    const editarBtn = div.querySelector(".editarBtn");
    const eliminarBtn = div.querySelector(".eliminarBtn");

    editarBtn.addEventListener("click", () => toggleEdicion(div, fruta, editarBtn));
    eliminarBtn.addEventListener("click", () => eliminarFruta(fruta, div));
  });
}
// ✅ Función toggleEdicion modificada para manejar edición local vs global
async function toggleEdicion(div, fruta, btn) {
  const inputs = div.querySelectorAll("input");
  const editando = btn.textContent === "💾 Guardar";

  if (editando) {
    // Guardar cambios
    const nombreOriginal = inputs[0].value.trim();
    const precioPrimera = parseFloat(inputs[1].value);
    const precioSegunda = parseFloat(inputs[2].value);
    const precioTercera = parseFloat(inputs[3].value);

    // ✅ Formatear nombre antes de enviar
    const nombreFormateado = formatearNombreParaMostrar(nombreOriginal);

    try {
      const esEdicionGlobal = btn.dataset.global === 'true';

      if (esEdicionGlobal) {
        // Si se está editando globalmente, actualizamos los precios en todas las fincas
        await apiFetch(`/precios/actualizar-global/${fruta._id}`, "PUT", {
          nombre: nombreFormateado,
          precios: {
            primera: precioPrimera,
            segunda: precioSegunda,
            tercera: precioTercera
          },
          usuario: usuario,
          adminAlias: usuario
        });
        alert("Precio actualizado globalmente en todas las fincas");
      } else {
        // Si es solo para esta finca, actualizamos solo para esa finca
        await apiFetch(`/precios/actualizar/${fruta._id}`, "PUT", {
          nombre: nombreFormateado,
          precios: {
            primera: precioPrimera,
            segunda: precioSegunda,
            tercera: precioTercera
          },
          usuario: usuario,
          adminAlias: usuario,
          fincaId: fincaId
        });
        alert("Precio actualizado solo para esta finca");
      }

      btn.textContent = "✏️ Editar";
      inputs.forEach(input => input.disabled = true);
      
      // ✅ Actualizar el nombre mostrado en el input
      inputs[0].value = nombreFormateado;
      
    } catch (err) {
      alert("Error al actualizar: " + err.message);
    }
  } else {
    // Cambiar a modo edición
    btn.textContent = "💾 Guardar";
    inputs.forEach(input => input.disabled = false);
  }
}

async function eliminarFruta(fruta, div) {
  if (!confirm("¿Estás seguro de eliminar esta fruta solo de esta finca?")) return;
  
  try {
    await apiFetch(`/precios/eliminar/${fruta._id}`, "DELETE", {
      usuario: usuario,
      adminAlias: usuario,
      fincaId: fincaId
    });
    div.remove();
    alert("Fruta eliminada solo de esta finca");
  } catch (err) {
    alert("Error al eliminar: " + err.message);
  }
}

const btnVolver = document.getElementById("btnVolverDashboard");
btnVolver.addEventListener("click", () => {
  // Regresar al dashboard con el usuario en la URL
  window.location.href = `dashboard1.html?usuario=${encodeURIComponent(usuario)}`;
});