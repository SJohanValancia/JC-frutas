import { apiFetch } from "./api.js";

const urlParams = new URLSearchParams(window.location.search);
const fincaId = urlParams.get("id");
const usuario = urlParams.get("usuario");  

const cantidadInput = document.getElementById("cantidadFrutas");
const frutasContainer = document.getElementById("frutasContainer");
const guardarBtn = document.getElementById("guardarPrecios");

cargarPreciosGuardados();

async function cargarPreciosGuardados() {
  try {
    const preciosGuardados = await apiFetch(`/precios/por-finca/${fincaId}`, "GET");

    // ✅ Encontrar el documento con más frutas (el más actualizado)
    let frutasFinales = [];
    for (const doc of preciosGuardados) {
      if (doc.frutas?.length > frutasFinales.length) {
        frutasFinales = doc.frutas;
      }
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
    div.className = "fruta-card";  // nuevo estilo para mejor apariencia
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
    const existentes = await apiFetch(`/precios/por-finca/${fincaId}`, "GET");
    const fincaYaTienePrecios = existentes.length > 0 && existentes[existentes.length - 1]?.frutas?.length > 0;

    if (fincaYaTienePrecios) {
      // Agregar cada fruta individualmente, sin eliminar las anteriores
      for (const fruta of frutas) {
        await apiFetch(`/precios/agregar-fruta/${fincaId}`, "POST", { fruta });
      }
    } else {
      // Finca vacía → guardamos normalmente y se copia a otras vacías
      await apiFetch("/precios/guardar", "POST", { fincaId, frutas });
    }

    // Recargar frutas después de agregar nuevas
    cargarPreciosGuardados();  // Asegura que se recargue la lista de frutas

    alert("Frutas guardadas correctamente");
    window.location.href = `dashboard1.html?usuario=${encodeURIComponent(usuario)}`;
  } catch (err) {
    alert("Error al guardar frutas: " + err.message);
  }
});




function renderFrutasGuardadas(frutas) {
  frutasContainer.innerHTML = ""; // Limpiar

  frutas.forEach((fruta, index) => {
    const precios = fruta.precios || { primera: 0, segunda: 0, tercera: 0 }; // 👈 protección

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


async function toggleEdicion(div, fruta, btn) {
  const inputs = div.querySelectorAll("input");
  const editando = btn.textContent === "💾 Guardar";

  if (editando) {
    // Guardar cambios
    const nombre = inputs[0].value.trim();
    const precioPrimera = parseFloat(inputs[1].value);
    const precioSegunda = parseFloat(inputs[2].value);
    const precioTercera = parseFloat(inputs[3].value);

    try {
      await apiFetch(`/precios/actualizar/${fruta._id}`, "PUT", {
        nombre,
        precios: {
          primera: precioPrimera,
          segunda: precioSegunda,
          tercera: precioTercera
        }
      });
      btn.textContent = "✏️ Editar";
      inputs.forEach(input => input.disabled = true);
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
  if (!confirm("¿Estás seguro de eliminar esta fruta?")) return;
  try {
    await apiFetch(`/precios/eliminar/${fruta._id}`, "DELETE");
    div.remove();
  } catch (err) {
    alert("Error al eliminar: " + err.message);
  }
}

const btnVolver = document.getElementById("btnVolverDashboard");
btnVolver.addEventListener("click", () => {
  // Regresar al dashboard con el usuario en la URL
  window.location.href = `dashboard1.html?usuario=${encodeURIComponent(usuario)}`;
});
