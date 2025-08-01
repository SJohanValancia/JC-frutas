import { apiFetch } from "./api.js";

const urlParams = new URLSearchParams(window.location.search);
const fincaId = urlParams.get("id");
const usuario = urlParams.get("usuario");  

const cantidadInput = document.getElementById("cantidadFrutas");
const frutasContainer = document.getElementById("frutasContainer");
const guardarBtn = document.getElementById("guardarPrecios");

// Cargar precios al iniciar
cargarPreciosGuardados();

// ✅ Función para guardar cambios de precios GLOBALMENTE
async function guardarCambiosPrecios(frutaId, nuevosPrecios) {
  console.log("🔥 Iniciando actualización global:", { frutaId, nuevosPrecios });
  
  // Confirmación personalizada para actualización global
  const confirmacion = confirm(
    `⚠️ ACTUALIZACIÓN GLOBAL\n\n` +
    `Estás a punto de actualizar los precios de esta fruta en TODAS las fincas donde aparece:\n\n` +
    `💎 Primera: $${nuevosPrecios.primera.toLocaleString()}\n` +
    `✨ Segunda: $${nuevosPrecios.segunda.toLocaleString()}\n` +
    `⭐ Tercera: $${nuevosPrecios.tercera.toLocaleString()}\n\n` +
    `Solo se actualizarán las fincas que te pertenecen.\n\n` +
    `¿Estás seguro de continuar?`
  );

  if (!confirmacion) return;

  try {
    console.log("📡 Enviando solicitud de actualización global...");
    
    // Actualizar el precio globalmente usando la ruta correcta de precios
    const resultado = await apiFetch(`/precios/actualizar-global/${frutaId}`, "PUT", {
      precios: nuevosPrecios,
      usuario: usuario,
      adminAlias: usuario
    });

    console.log("✅ Resultado de actualización global:", resultado);
    
    // Mostrar mensaje de éxito detallado
    let mensaje = `✅ ¡Actualización completada!\n\n` +
      `Precios de la fruta actualizados en ${resultado.fincasActualizadas} finca(s).\n\n` +
      `💎 Primera: $${nuevosPrecios.primera.toLocaleString()}\n` +
      `✨ Segunda: $${nuevosPrecios.segunda.toLocaleString()}\n` +
      `⭐ Tercera: $${nuevosPrecios.tercera.toLocaleString()}\n\n` +
      `Todos los cambios se aplicaron correctamente.`;
    
    if (resultado.errores && resultado.errores.length > 0) {
      mensaje += `\n\n⚠️ Se encontraron ${resultado.errores.length} error(es) menores durante la actualización.`;
    }
    
    alert(mensaje);
    
    // Recargar precios después de la actualización
    cargarPreciosGuardados();
  } catch (err) {
    console.error("❌ Error al actualizar precios globalmente:", err);
    alert(`❌ Error al actualizar los precios globalmente:\n\n${err.message}\n\nPor favor, inténtalo de nuevo.`);
  }
}

// Cargar precios guardados (precios específicos de la finca o globales)
async function cargarPreciosGuardados() {
  try {
    console.log("📥 Cargando precios guardados para finca:", fincaId);
    
    // Cargar precios globales con frecuencia
    const preciosGlobales = await apiFetch('/precios/todos-los-precios-con-frecuencia', "GET");
    
    // Cargar precios específicos para la finca
    const preciosGuardados = await apiFetch(`/precios/por-finca/${fincaId}`, "GET");

    let frutasFinales = [];

    if (preciosGuardados.length > 0) {
      // Usamos los precios específicos para esta finca si existen
      console.log("✅ Usando precios específicos de la finca");
      frutasFinales = preciosGuardados[0].frutas;
    } else {
      // Si no existen precios específicos, usamos los precios globales
      console.log("✅ Usando precios globales como base");
      frutasFinales = preciosGlobales;
    }

    console.log(`📊 Mostrando ${frutasFinales.length} frutas`);
    renderFrutasGuardadas(frutasFinales);
  } catch (err) {
    console.error("❌ Error al cargar precios guardados:", err);
    alert("Error al cargar precios: " + err.message);
  }
}

// Evento para generar campos de entrada de frutas
cantidadInput.addEventListener("input", () => {
  const cantidad = parseInt(cantidadInput.value) || 0;
  frutasContainer.innerHTML = "";

  if (cantidad <= 0) return;

  console.log(`📝 Generando ${cantidad} campos para nuevas frutas`);

  for (let i = 0; i < cantidad; i++) {
    const div = document.createElement("div");
    div.className = "fruta-card";
    div.innerHTML = `
      <input placeholder="Nombre de la fruta" class="nombreFruta">
      <div class="precios-por-calidad">
        <label>Primera: <input type="number" placeholder="Precio primera" class="precioFruta primera" step="0.01" min="0"></label>
        <label>Segunda: <input type="number" placeholder="Precio segunda" class="precioFruta segunda" step="0.01" min="0"></label>
        <label>Tercera: <input type="number" placeholder="Precio tercera" class="precioFruta tercera" step="0.01" min="0"></label>
      </div>
    `;
    frutasContainer.appendChild(div);

    const nombreFrutaInput = div.querySelector(".nombreFruta");

    // Convertir la primera letra a mayúscula al escribir
    nombreFrutaInput.addEventListener("input", () => {
      let valor = nombreFrutaInput.value;
      if (valor.length > 0) {
        nombreFrutaInput.value = valor.charAt(0).toUpperCase() + valor.slice(1);
      }
    });

    // Validar que los precios no sean negativos
    const preciosInputs = div.querySelectorAll(".precioFruta");
    preciosInputs.forEach(input => {
      input.addEventListener("input", () => {
        if (parseFloat(input.value) < 0) {
          input.value = 0;
          alert("⚠️ Los precios no pueden ser negativos");
        }
      });
    });
  }
});

// Evento para guardar nuevas frutas
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

    // Validaciones
    if (!nombre) {
      alert(`⚠️ Por favor, ingresa el nombre de la fruta en la posición ${i + 1}`);
      nombres[i].focus();
      return;
    }

    if (isNaN(precioPrimera) || isNaN(precioSegunda) || isNaN(precioTercera)) {
      alert(`⚠️ Por favor, completa todos los precios para "${nombre}"`);
      return;
    }

    if (precioPrimera < 0 || precioSegunda < 0 || precioTercera < 0) {
      alert(`⚠️ Los precios de "${nombre}" no pueden ser negativos`);
      return;
    }

    frutas.push({
      nombre,
      precios: {
        primera: precioPrimera,
        segunda: precioSegunda,
        tercera: precioTercera
      }
    });
  }

  if (!fincaId || frutas.length === 0) {
    alert("⚠️ No hay frutas válidas para guardar");
    return;
  }

  console.log(`💾 Guardando ${frutas.length} frutas nuevas`);

  // Deshabilitar botón mientras se guarda
  const textoOriginal = guardarBtn.textContent;
  guardarBtn.textContent = "⏳ Guardando...";
  guardarBtn.disabled = true;

  try {
    // Usar la ruta correcta para agregar frutas a una finca específica
    for (let i = 0; i < frutas.length; i++) {
      const fruta = frutas[i];
      console.log(`📝 Guardando fruta ${i + 1}/${frutas.length}: ${fruta.nombre}`);
      
      await apiFetch(`/precios/agregar-fruta/${fincaId}`, "POST", { 
        fruta,
        usuario: usuario,
        adminAlias: usuario
      });
    }

    alert(`✅ ${frutas.length} fruta(s) guardada(s) correctamente en esta finca`);
    
    // Recargar frutas después de agregar nuevas
    cargarPreciosGuardados();
    
    // Limpiar formulario
    cantidadInput.value = "";
    frutasContainer.innerHTML = "";
    
  } catch (err) {
    console.error("❌ Error al guardar frutas:", err);
    alert("❌ Error al guardar frutas: " + err.message);
  } finally {
    // Rehabilitar botón
    guardarBtn.textContent = textoOriginal;
    guardarBtn.disabled = false;
  }
});

// Renderizar frutas guardadas con opciones de edición
function renderFrutasGuardadas(frutas) {
  console.log(`🎨 Renderizando ${frutas.length} frutas guardadas`);
  frutasContainer.innerHTML = ""; // Limpiar contenedor

  if (frutas.length === 0) {
    frutasContainer.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666; font-style: italic;">
        📝 No hay frutas configuradas para esta finca.<br>
        Usa el campo de arriba para agregar nuevas frutas.
      </div>
    `;
    return;
  }

  frutas.forEach((fruta, index) => {
    const precios = fruta.precios || { primera: 0, segunda: 0, tercera: 0 };

    const div = document.createElement("div");
    div.className = "fruta-card";
    div.innerHTML = `
      <input value="${fruta.nombre}" class="nombreFruta" disabled>
      <div class="precios-por-calidad">
        <label>Primera: <input type="number" value="${precios.primera}" class="precioFruta primera" disabled step="0.01" min="0"></label>
        <label>Segunda: <input type="number" value="${precios.segunda}" class="precioFruta segunda" disabled step="0.01" min="0"></label>
        <label>Tercera: <input type="number" value="${precios.tercera}" class="precioFruta tercera" disabled step="0.01" min="0"></label>
      </div>
      <div class="botones-fruta">
        <button class="editarBtn" title="Editar solo en esta finca">✏️ Editar</button>
        <button class="editarGlobalBtn" title="Actualizar en todas las fincas" style="background: #ff6b6b; color: white;">🌍 Editar Globalmente</button>
        <button class="eliminarBtn" title="Eliminar solo de esta finca">🗑️ Eliminar</button>
      </div>
    `;
    frutasContainer.appendChild(div);

    // Eventos para los botones
    const editarBtn = div.querySelector(".editarBtn");
    const editarGlobalBtn = div.querySelector(".editarGlobalBtn");
    const eliminarBtn = div.querySelector(".eliminarBtn");

    // Validar precios negativos en tiempo real
    const preciosInputs = div.querySelectorAll(".precioFruta");
    preciosInputs.forEach(input => {
      input.addEventListener("input", () => {
        if (parseFloat(input.value) < 0) {
          input.value = 0;
          alert("⚠️ Los precios no pueden ser negativos");
        }
      });
    });

    editarBtn.addEventListener("click", () => toggleEdicion(div, fruta, editarBtn, false));
    editarGlobalBtn.addEventListener("click", () => toggleEdicion(div, fruta, editarBtn, true));
    eliminarBtn.addEventListener("click", () => eliminarFruta(fruta, div));
  });
}

// ✅ Función toggleEdicion mejorada para manejar edición local vs global
async function toggleEdicion(div, fruta, btn, esGlobal = false) {
  const inputs = div.querySelectorAll("input");
  const editando = btn.textContent.includes("Guardar");

  if (editando) {
    // Guardar cambios
    const nombre = inputs[0].value.trim();
    const precioPrimera = parseFloat(inputs[1].value);
    const precioSegunda = parseFloat(inputs[2].value);
    const precioTercera = parseFloat(inputs[3].value);

    // Validar datos
    if (!nombre) {
      alert("⚠️ El nombre de la fruta no puede estar vacío");
      inputs[0].focus();
      return;
    }

    if (isNaN(precioPrimera) || isNaN(precioSegunda) || isNaN(precioTercera)) {
      alert("⚠️ Por favor completa todos los precios correctamente");
      return;
    }

    if (precioPrimera < 0 || precioSegunda < 0 || precioTercera < 0) {
      alert("⚠️ Los precios no pueden ser negativos");
      return;
    }

    const nuevosPrecios = {
      primera: precioPrimera,
      segunda: precioSegunda,
      tercera: precioTercera
    };

    // Deshabilitar botón mientras se guarda
    const textoOriginal = btn.textContent;
    btn.textContent = "⏳ Guardando...";
    btn.disabled = true;

    try {
      if (esGlobal) {
        // Actualización global - usar la función específica
        console.log("🌍 Iniciando actualización global");
        await guardarCambiosPrecios(fruta._id, nuevosPrecios);
      } else {
        // Actualización solo para esta finca
        console.log("📝 Actualizando solo en esta finca");
        await apiFetch(`/precios/actualizar/${fruta._id}`, "PUT", {
          nombre,
          precios: nuevosPrecios,
          usuario: usuario,
          adminAlias: usuario,
          fincaId: fincaId
        });
        alert("✅ Precio actualizado solo para esta finca");
      }

      // Cambiar botón de vuelta a modo edición
      btn.textContent = "✏️ Editar";
      inputs.forEach(input => input.disabled = true);
      
    } catch (err) {
      console.error("❌ Error al actualizar:", err);
      alert(`❌ Error al actualizar: ${err.message}`);
    } finally {
      btn.disabled = false;
      if (btn.textContent.includes("Guardando")) {
        btn.textContent = textoOriginal;
      }
    }
  } else {
    // Cambiar a modo edición
    console.log(`✏️ Activando modo edición para: ${fruta.nombre}`);
    btn.textContent = "💾 Guardar";
    inputs.forEach(input => input.disabled = false);
    inputs[0].focus(); // Enfocar el nombre
  }
}

// ✅ Función eliminarFruta mejorada
async function eliminarFruta(fruta, div) {
  const confirmacion = confirm(
    `⚠️ ELIMINAR FRUTA\n\n` +
    `¿Estás seguro de eliminar "${fruta.nombre}" SOLO de esta finca?\n\n` +
    `Esta acción no afectará otras fincas y no se puede deshacer.`
  );
  
  if (!confirmacion) return;
  
  console.log(`🗑️ Eliminando fruta: ${fruta.nombre}`);
  
  try {
    await apiFetch(`/precios/eliminar/${fruta._id}`, "DELETE", {
      usuario: usuario,
      adminAlias: usuario,
      fincaId: fincaId
    });
    
    // Eliminar visualmente
    div.remove();
    alert(`✅ "${fruta.nombre}" eliminada solo de esta finca`);
    
    console.log(`✅ Fruta ${fruta.nombre} eliminada exitosamente`);
  } catch (err) {
    console.error("❌ Error al eliminar:", err);
    alert(`❌ Error al eliminar: ${err.message}`);
  }
}

// Botón para volver al dashboard
const btnVolver = document.getElementById("btnVolverDashboard");
if (btnVolver) {
  btnVolver.addEventListener("click", () => {
    console.log("🔙 Volviendo al dashboard");
    window.location.href = `dashboard1.html?usuario=${encodeURIComponent(usuario)}`;
  });
}

// ✅ Funciones adicionales de utilidad

// Función para validar entrada de precios
function validarPrecio(valor) {
  const precio = parseFloat(valor);
  return !isNaN(precio) && precio >= 0;
}

// Función para formatear precios para mostrar
function formatearPrecio(precio) {
  if (typeof precio !== 'number') return '0';
  return precio.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  });
}

// Función para mostrar loading mientras se procesan las operaciones
function mostrarLoading(elemento, texto = "Cargando...") {
  if (elemento) {
    elemento.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
        <p>${texto}</p>
      </div>
    `;
  }
}

// CSS para la animación de loading (si no está definida)
if (!document.querySelector('#loading-animation-styles')) {
  const style = document.createElement('style');
  style.id = 'loading-animation-styles';
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .botones-fruta {
      display: flex;
      gap: 5px;
      margin-top: 10px;
      flex-wrap: wrap;
    }
    .botones-fruta button {
      flex: 1;
      min-width: 80px;
      padding: 8px 12px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.3s ease;
    }
    .editarBtn {
      background: #4CAF50;
      color: white;
    }
    .editarBtn:hover {
      background: #45a049;
    }
    .eliminarBtn {
      background: #f44336;
      color: white;
    }
    .eliminarBtn:hover {
      background: #da190b;
    }
    .editarGlobalBtn:hover {
      background: #e55555;
    }
  `;
  document.head.appendChild(style);
}

console.log("✅ precios.js cargado correctamente");
console.log("🏠 Finca ID:", fincaId);
console.log("👤 Usuario:", usuario);