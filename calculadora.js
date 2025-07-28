// calculadora.js - SISTEMA MEJORADO DE PERSISTENCIA DE PESAS
let inputPeso = document.getElementById("inputPeso");
let totalKilosSpan = document.getElementById("totalKilos");
let ultimaPesaSpan = document.getElementById("ultimaPesa");
let listaPesas = document.getElementById("listaPesas");
let precioPorKilo = document.getElementById("precioPorKilo");
let valorTotal = document.getElementById("valorTotal");
let frutaSelect = document.getElementById("frutaSelect");
let calidadSelect = document.getElementById("calidadSelect");
let enviarReciboBtn = document.getElementById("enviarReciboBtn");

const STORAGE_KEY_PESAS = "pesas_recogida";
const STORAGE_KEY_BACKUP = "pesas_backup";
let preciosDisponibles = [];
let editandoIndex = null;

// Variables para control de usuario
let sessionData = {};
let isSubusuario = false;
let tipoUsuarioVerificado = null;
let esAdministradorViendo = false;

const urlParams = new URLSearchParams(window.location.search);
const modoEdicion = urlParams.get("modo") === "editar";
const idRecogida = urlParams.get("idRecogida");
const usuario = urlParams.get("usuario");

// 🔥 SISTEMA MEJORADO DE PERSISTENCIA
function getPesas() {
  try {
    const pesasString = localStorage.getItem(STORAGE_KEY_PESAS);
    if (pesasString) {
      const pesas = JSON.parse(pesasString);
      console.log("📦 Pesas recuperadas de localStorage:", pesas.length);
      return pesas;
    }
    
    // Si no hay pesas principales, intentar recuperar del backup
    const backupString = localStorage.getItem(STORAGE_KEY_BACKUP);
    if (backupString) {
      const pesasBackup = JSON.parse(backupString);
      console.log("🔄 Recuperando pesas desde backup:", pesasBackup.length);
      // Restaurar las pesas principales desde el backup
      savePesas(pesasBackup);
      return pesasBackup;
    }
    
    console.log("📦 No hay pesas guardadas, iniciando con array vacío");
    return [];
  } catch (error) {
    console.error("❌ Error al recuperar pesas:", error);
    return [];
  }
}

function savePesas(pesas) {
  try {
    const pesasString = JSON.stringify(pesas);
    
    // Guardar en localStorage principal
    localStorage.setItem(STORAGE_KEY_PESAS, pesasString);
    
    // Crear backup automático
    localStorage.setItem(STORAGE_KEY_BACKUP, pesasString);
    
    // Backup adicional con timestamp
    const timestampKey = `pesas_backup_${Date.now()}`;
    localStorage.setItem(timestampKey, pesasString);
    
    // Limpiar backups antiguos (mantener solo los últimos 5)
    limpiarBackupsAntiguos();
    
    console.log("💾 Pesas guardadas exitosamente:", pesas.length);
  } catch (error) {
    console.error("❌ Error al guardar pesas:", error);
    alert("Error al guardar las pesas. Por favor, intente de nuevo.");
  }
}

// 🔥 FUNCIÓN PARA LIMPIAR BACKUPS ANTIGUOS
function limpiarBackupsAntiguos() {
  try {
    const todasLasClaves = Object.keys(localStorage);
    const clavesBackup = todasLasClaves
      .filter(key => key.startsWith('pesas_backup_'))
      .sort((a, b) => {
        const timestampA = parseInt(a.split('_')[2]);
        const timestampB = parseInt(b.split('_')[2]);
        return timestampB - timestampA; // Orden descendente (más reciente primero)
      });
    
    // Mantener solo los 5 backups más recientes
    if (clavesBackup.length > 5) {
      const clavesAEliminar = clavesBackup.slice(5);
      clavesAEliminar.forEach(key => {
        localStorage.removeItem(key);
      });
      console.log("🧹 Backups antiguos limpiados:", clavesAEliminar.length);
    }
  } catch (error) {
    console.error("❌ Error al limpiar backups:", error);
  }
}

// 🔥 FUNCIÓN PARA RECUPERAR DATOS EN CASO DE EMERGENCIA
function recuperarDatosEmergencia() {
  try {
    console.log("🚨 Iniciando recuperación de emergencia...");
    
    const todasLasClaves = Object.keys(localStorage);
    const clavesBackup = todasLasClaves
      .filter(key => key.startsWith('pesas_backup_'))
      .sort((a, b) => {
        const timestampA = parseInt(a.split('_')[2]);
        const timestampB = parseInt(b.split('_')[2]);
        return timestampB - timestampA;
      });
    
    if (clavesBackup.length > 0) {
      const backupMasReciente = localStorage.getItem(clavesBackup[0]);
      if (backupMasReciente) {
        const pesasRecuperadas = JSON.parse(backupMasReciente);
        savePesas(pesasRecuperadas);
        renderPesas();
        console.log("✅ Datos recuperados exitosamente:", pesasRecuperadas.length);
        mostrarNotificacion("✅ Datos recuperados exitosamente", "success");
        return true;
      }
    }
    
    console.log("❌ No se encontraron backups para recuperar");
    mostrarNotificacion("❌ No se encontraron datos para recuperar", "error");
    return false;
  } catch (error) {
    console.error("❌ Error en recuperación de emergencia:", error);
    mostrarNotificacion("❌ Error en la recuperación de datos", "error");
    return false;
  }
}

// 🔥 FUNCIÓN PARA MOSTRAR NOTIFICACIONES
function mostrarNotificacion(mensaje, tipo = "info") {
  const notificacion = document.createElement("div");
  notificacion.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-weight: bold;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;
  
  switch (tipo) {
    case "success":
      notificacion.style.background = "#4CAF50";
      break;
    case "error":
      notificacion.style.background = "#f44336";
      break;
    case "warning":
      notificacion.style.background = "#ff9800";
      break;
    default:
      notificacion.style.background = "#2196F3";
  }
  
  notificacion.textContent = mensaje;
  document.body.appendChild(notificacion);
  
  // Animación de entrada
  setTimeout(() => {
    notificacion.style.transform = "translateX(0)";
  }, 100);
  
  // Remover después de 3 segundos
  setTimeout(() => {
    notificacion.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (notificacion.parentNode) {
        notificacion.parentNode.removeChild(notificacion);
      }
    }, 300);
  }, 3000);
}

// 🔥 FUNCIÓN MEJORADA PARA CARGAR DATOS EXISTENTES
if (modoEdicion && idRecogida) {
  cargarDatosRecogida(idRecogida);
}

async function cargarDatosRecogida(id) {
  try {
    console.log("📥 Cargando datos de recogida:", id);
    
    const res = await fetch(`https://jc-frutas.onrender.com/recogidas/${id}`);
    if (!res.ok) throw new Error("No se pudo obtener la recogida");
    const recogida = await res.json();

    document.getElementById("finca").value = recogida.finca;
    document.getElementById("propietario").value = recogida.propietario;
    document.getElementById("fecha").value = recogida.fecha;
    frutaSelect.value = recogida.fruta;
    calidadSelect.value = recogida.calidad;
    
    if (!isSubusuario) {
      actualizarPrecioKiloVisible();
    }

    const pesasConInfo = recogida.pesas.map(pesa => ({
      ...pesa,
      fruta: pesa.fruta || recogida.fruta,
      calidad: pesa.calidad || recogida.calidad,
      precio: pesa.precio || recogida.precio
    }));

    // Guardar con sistema mejorado
    savePesas(pesasConInfo);
    renderPesas();
    
    console.log("✅ Datos de recogida cargados y guardados en localStorage");
    mostrarNotificacion("✅ Datos cargados correctamente", "success");

  } catch (err) {
    console.error("❌ Error al cargar recogida:", err);
    alert("Error al cargar la recogida: " + err.message);
  }
}

// 🔥 FUNCIÓN MEJORADA PARA AGREGAR PESAS
function sumarPesa() {
  const kilos = parseInt(inputPeso.value);
  if (isNaN(kilos) || kilos <= 0) {
    mostrarNotificacion("⚠️ Ingrese un peso válido", "warning");
    return;
  }

  const frutaActual = frutaSelect.value;
  const calidadActual = calidadSelect.value;
  
  if (!frutaActual || !calidadActual) {
    mostrarNotificacion("⚠️ Seleccione fruta y calidad", "warning");
    return;
  }

  const precio = getPrecioActual();
  const valor = kilos * precio;
  
  const nueva = { 
    kilos, 
    valor,
    fruta: frutaActual,
    calidad: calidadActual,
    precio: precio
  };

  const pesas = getPesas();

  if (editandoIndex !== null) {
    const pesaOriginal = pesas[editandoIndex];
    nueva.fruta = pesaOriginal.fruta;
    nueva.calidad = pesaOriginal.calidad;
    nueva.precio = pesaOriginal.precio;
    nueva.valor = kilos * nueva.precio;
    
    pesas[editandoIndex] = nueva;
    editandoIndex = null;
    mostrarNotificacion("✏️ Pesa editada correctamente", "success");
  } else {
    pesas.push(nueva);
    mostrarNotificacion("➕ Pesa agregada correctamente", "success");
  }

  savePesas(pesas);
  inputPeso.value = "";
  renderPesas();
}

// 🔥 FUNCIÓN MEJORADA PARA ELIMINAR PESAS
function eliminarPesa(index) {
  if (confirm("¿Está seguro de eliminar esta pesa?")) {
    const pesas = getPesas();
    const pesaEliminada = pesas.splice(index, 1)[0];
    savePesas(pesas);
    renderPesas();
    mostrarNotificacion(`🗑️ Pesa de ${pesaEliminada.kilos}kg eliminada`, "success");
  }
}

// 🔥 AUTO-GUARDADO PERIÓDICO
function iniciarAutoGuardado() {
  setInterval(() => {
    const pesas = getPesas();
    if (pesas.length > 0) {
      // Crear backup silencioso cada 30 segundos
      const timestampKey = `pesas_autosave_${Date.now()}`;
      localStorage.setItem(timestampKey, JSON.stringify(pesas));
      
      // Limpiar autoguardados antiguos (mantener solo el último)
      const todasLasClaves = Object.keys(localStorage);
      const clavesAutoguardado = todasLasClaves
        .filter(key => key.startsWith('pesas_autosave_'))
        .sort((a, b) => {
          const timestampA = parseInt(a.split('_')[2]);
          const timestampB = parseInt(b.split('_')[2]);
          return timestampB - timestampA;
        });
      
      if (clavesAutoguardado.length > 1) {
        clavesAutoguardado.slice(1).forEach(key => {
          localStorage.removeItem(key);
        });
      }
      
      console.log("💾 Auto-guardado realizado");
    }
  }, 30000); // Cada 30 segundos
}

// 🔥 EVENTO PARA PREVENIR PÉRDIDA DE DATOS
window.addEventListener('beforeunload', function(e) {
  const pesas = getPesas();
  if (pesas.length > 0) {
    // Guardar antes de cerrar
    savePesas(pesas);
    
    // Mostrar advertencia si hay datos no guardados
    const message = '¿Está seguro de salir? Asegúrese de haber guardado su recogida.';
    e.returnValue = message;
    return message;
  }
});

// 🔥 FUNCIÓN PARA VERIFICAR INTEGRIDAD DE DATOS
function verificarIntegridadDatos() {
  try {
    const pesas = getPesas();
    const pesasInvalidas = pesas.filter(pesa => 
      !pesa.kilos || !pesa.fruta || !pesa.calidad || 
      isNaN(pesa.kilos) || pesa.kilos <= 0
    );
    
    if (pesasInvalidas.length > 0) {
      console.warn("⚠️ Se encontraron pesas con datos inválidos:", pesasInvalidas);
      mostrarNotificacion("⚠️ Algunos datos pueden estar corruptos", "warning");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("❌ Error al verificar integridad:", error);
    return false;
  }
}

// FUNCIONES EXISTENTES (sin cambios principales, solo mejoras en logging)
async function verificarTipoUsuario() {
  console.log("=== VERIFICANDO TIPO DE USUARIO EN CALCULADORA ===");
  
  try {
    const storedData = sessionStorage.getItem('userData');
    console.log("📦 Datos en sessionStorage:", storedData);
    
    if (storedData) {
      sessionData = JSON.parse(storedData);
      console.log("✅ SessionData parseado:", sessionData);
      
      if (sessionData.tipo) {
        tipoUsuarioVerificado = sessionData.tipo;
        isSubusuario = sessionData.tipo === 2;
        esAdministradorViendo = sessionData.tipo === 1;
        console.log("✅ Tipo desde sessionStorage:", tipoUsuarioVerificado, "Es subusuario:", isSubusuario, "Es admin viendo:", esAdministradorViendo);
        return isSubusuario;
      }
    } else {
      console.log("⚠️ No hay datos en sessionStorage");
    }
    
    if (usuario) {
      console.log("🔍 Consultando servidor para usuario:", usuario);
      
      const response = await fetch(`https://jc-frutas.onrender.com/auth/get-alias?usuario=${encodeURIComponent(usuario)}`);
      
      if (!response.ok) {
        console.error("❌ Error en respuesta del servidor:", response.status);
        return false;
      }
      
      const userData = await response.json();
      console.log("📊 Datos recibidos del servidor:", userData);
      
      tipoUsuarioVerificado = userData.tipo;
      isSubusuario = userData.tipo === 2;
      esAdministradorViendo = userData.tipo === 1;
      
      sessionData = {
        tipo: userData.tipo,
        alias: userData.alias,
        username: userData.username
      };
      
      sessionStorage.setItem('userData', JSON.stringify(sessionData));
      console.log("💾 Datos guardados en sessionStorage");
      
    } else {
      console.error("❌ No hay usuario en los parámetros URL");
      return false;
    }
    
    console.log("=== RESULTADO FINAL CALCULADORA ===");
    console.log("- Tipo de usuario:", tipoUsuarioVerificado);
    console.log("- Es subusuario:", isSubusuario);
    console.log("- Es administrador viendo:", esAdministradorViendo);
    console.log("- SessionData:", sessionData);
    console.log("===================================");
    
    return isSubusuario;
    
  } catch (error) {
    console.error("❌ Error al verificar tipo de usuario:", error);
    return false;
  }
}

async function configurarInterfazCalculadora() {
  console.log("🎨 Configurando interfaz de calculadora según tipo de usuario...");
  
  await verificarTipoUsuario();
  
  console.log("🔍 Análisis de visibilidad:");
  console.log("- Es subusuario:", isSubusuario);
  console.log("- Debe ocultar precios:", isSubusuario);
  
  if (isSubusuario) {
    console.log("🚫 Configurando calculadora para subusuario - ocultando precios");
    
    if (precioPorKilo) {
      precioPorKilo.style.display = "none";
      const labelPrecio = document.querySelector('label[for="precioPorKilo"]');
      if (labelPrecio) labelPrecio.style.display = "none";
    }
    
    if (valorTotal) {
      const containerValorTotal = valorTotal.parentElement;
      if (containerValorTotal) {
        containerValorTotal.style.display = "none";
      }
    }
    
    if (enviarReciboBtn) {
      enviarReciboBtn.innerHTML = "📤 Enviar Registro";
    }
    
    console.log("✅ Interfaz de calculadora configurada para subusuario");
  } else {
    console.log("✅ Configurando calculadora para administrador - mostrando todos los elementos");
    
    if (precioPorKilo) {
      precioPorKilo.style.display = "block";
      const labelPrecio = document.querySelector('label[for="precioPorKilo"]');
      if (labelPrecio) labelPrecio.style.display = "block";
    }
    
    if (valorTotal) {
      const containerValorTotal = valorTotal.parentElement;
      if (containerValorTotal) {
        containerValorTotal.style.display = "block";
      }
    }
    
    if (enviarReciboBtn) {
      enviarReciboBtn.innerHTML = "📤 Enviar Factura";
    }
  }
}

async function cargarPreciosFrutas() {
  const fincaId = new URLSearchParams(window.location.search).get("fincaId");
  const res = await fetch(`https://jc-frutas.onrender.com/precios/por-finca/${fincaId}`);
  if (!res.ok) throw new Error("No se pudo cargar precios");
  const datos = await res.json();

  let frutasFinales = [];
  for (const doc of datos) {
    if (doc.frutas?.length > frutasFinales.length) {
      frutasFinales = doc.frutas;
    }
  }

  preciosDisponibles = frutasFinales;
  
  const debeOcultarPrecios = isSubusuario && !esAdministradorViendo;
  if (!debeOcultarPrecios) {
    actualizarPrecioKiloVisible();
  }
  
  renderPesas();
}

function getPrecioPorFrutaYCalidad(fruta, calidad) {
  if (isSubusuario) {
    return 0;
  }
  
  const frutaObj = preciosDisponibles.find(f => f.nombre === fruta);
  return frutaObj?.precios?.[calidad] || 0;
}

function getPrecioActual() {
  if (isSubusuario) {
    return 0;
  }
  
  const fruta = frutaSelect.value;
  const calidad = calidadSelect.value;
  return getPrecioPorFrutaYCalidad(fruta, calidad);
}

function actualizarPrecioKiloVisible() {
  if (!isSubusuario && precioPorKilo) {
    const precio = getPrecioActual();
    precioPorKilo.value = precio;
  }
}

function renderPesas() {
  const pesas = getPesas();
  listaPesas.innerHTML = "";
  let totalKilos = 0;
  let totalValor = 0;

  // Verificar integridad antes de renderizar
  if (!verificarIntegridadDatos()) {
    console.warn("⚠️ Datos con problemas detectados durante renderizado");
  }

  pesas.forEach((pesa, index) => {
    const li = document.createElement("li");
    
    const infoFrutaCalidad = pesa.fruta && pesa.calidad ? 
      ` (${pesa.fruta} - ${pesa.calidad})` : '';
    
    if (isSubusuario) {
      li.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Pesa ${index + 1}: <strong>${pesa.kilos} kg</strong>${infoFrutaCalidad}</span>
          <div style="display: flex; gap: 6px;">
            <button onclick="editarPesa(${index})" style="background: transparent; border: none; cursor: pointer; font-size: 16px; color: #2196f3;">✏️</button>
            <button onclick="eliminarPesa(${index})" style="background: transparent; border: none; cursor: pointer; font-size: 16px; color: #ff4d4d;">🗑️</button>
          </div>
        </div>
      `;
    } else {
      li.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Pesa ${index + 1}: <strong>${pesa.kilos} kg</strong>${infoFrutaCalidad} — $<strong>${pesa.valor.toLocaleString()}</strong></span>
          <div style="display: flex; gap: 6px;">
            <button onclick="editarPesa(${index})" style="background: transparent; border: none; cursor: pointer; font-size: 16px; color: #2196f3;">✏️</button>
            <button onclick="eliminarPesa(${index})" style="background: transparent; border: none; cursor: pointer; font-size: 16px; color: #ff4d4d;">🗑️</button>
          </div>
        </div>
      `;
    }
    
    listaPesas.appendChild(li);
    totalKilos += pesa.kilos;
    totalValor += pesa.valor;
  });

  totalKilosSpan.textContent = totalKilos;
  ultimaPesaSpan.textContent = pesas.at(-1)?.kilos || 0;
  
  if (!isSubusuario && valorTotal) {
    valorTotal.textContent = `$${totalValor.toLocaleString()}`;
  }
}

function escribirNumero(n) {
  inputPeso.value += n;
}

function borrarNumero() {
  inputPeso.value = inputPeso.value.slice(0, -1);
}

function limpiarTodo() {
  if (confirm("¿Está seguro de limpiar todas las pesas? Esta acción no se puede deshacer.")) {
    inputPeso.value = "";
    localStorage.removeItem(STORAGE_KEY_PESAS);
    editandoIndex = null;
    renderPesas();
    mostrarNotificacion("🧹 Todas las pesas han sido eliminadas", "success");
  }
}

function editarPesa(index) {
  const pesas = getPesas();
  const pesa = pesas[index];
  inputPeso.value = pesa.kilos;
  editandoIndex = index;
  mostrarNotificacion("✏️ Editando pesa - ingrese el nuevo peso", "info");
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  if (frutaSelect) {
    frutaSelect.addEventListener("change", () => {
      if (!isSubusuario || esAdministradorViendo) {
        actualizarPrecioKiloVisible();
      }
    });
  }

  if (calidadSelect) {
    calidadSelect.addEventListener("change", () => {
      if (!isSubusuario || esAdministradorViendo) {
        actualizarPrecioKiloVisible();
      }
    });
  }
});

// Resto de funciones existentes (enviarReciboWhatsApp, etc.) permanecen igual...

// INICIALIZACIÓN MEJORADA
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Calculadora cargada, configurando interfaz mejorada...");
  
  await configurarInterfazCalculadora();
  await cargarPreciosFrutas();
  
  // Iniciar auto-guardado
  iniciarAutoGuardado();
  
  // Verificar si hay datos al cargar
  const pesas = getPesas();
  if (pesas.length > 0) {
    mostrarNotificacion(`📦 ${pesas.length} pesas recuperadas correctamente`, "success");
  }
  
  console.log("✅ Calculadora configurada completamente con persistencia mejorada");
  console.log("🎯 Auto-guardado activado cada 30 segundos");
});

// 🔥 FUNCIÓN DE UTILIDAD PARA EXPORTAR/IMPORTAR DATOS
function exportarDatos() {
  const pesas = getPesas();
  const datos = {
    pesas: pesas,
    timestamp: Date.now(),
    version: "1.0"
  };
  
  const dataStr = JSON.stringify(datos);
  const dataBlob = new Blob([dataStr], {type: 'application/json'});
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `pesas_backup_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  mostrarNotificacion("📥 Backup exportado correctamente", "success");
}

function importarDatos(fileInput) {
  const file = fileInput.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const datos = JSON.parse(e.target.result);
      if (datos.pesas && Array.isArray(datos.pesas)) {
        savePesas(datos.pesas);
        renderPesas();
        mostrarNotificacion("📤 Backup importado correctamente", "success");
      } else {
        throw new Error("Formato de archivo inválido");
      }
    } catch (error) {
      console.error("❌ Error al importar:", error);
      mostrarNotificacion("❌ Error al importar el archivo", "error");
    }
  };
  reader.readAsText(file);
}