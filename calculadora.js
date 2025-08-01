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


let filtroActivo = "todos";
let valorFiltroActivo = "";

// 2. AGREGAR ESTA FUNCIÓN DESPUÉS DE mostrarNotificacion()
function crearSistemaFiltros() {
  const listaPesas = document.getElementById("listaPesas");
  if (!listaPesas) return;

  let contenedorFiltros = document.getElementById("contenedorFiltros");
  
  if (!contenedorFiltros) {
    contenedorFiltros = document.createElement("div");
    contenedorFiltros.id = "contenedorFiltros";
    contenedorFiltros.style.cssText = `
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin-bottom: 15px;
      padding: 0;
      position: relative;
      opacity: 0;
      transform: translateY(-20px);
      animation: fadeInDown 0.6s ease forwards;
    `;

    // Crear wrapper para el select con icono
    const selectWrapper = document.createElement("div");
    selectWrapper.style.cssText = `
      position: relative;
      display: inline-block;
    `;

    // Icono de filtro
    const iconoFiltro = document.createElement("div");
    iconoFiltro.innerHTML = "🔍";
    iconoFiltro.style.cssText = `
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 14px;
      pointer-events: none;
      z-index: 2;
      opacity: 0.7;
    `;

    const selectFiltro = document.createElement("select");
    selectFiltro.id = "filtroSelect";
    selectFiltro.style.cssText = `
      font-size: 12px;
      padding: 8px 12px 8px 28px;
      border: none;
      border-radius: 20px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      min-width: 120px;
      cursor: pointer;
      outline: none;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      appearance: none;
      font-weight: 500;
      letter-spacing: 0.5px;
    `;

    // Flecha personalizada
    const flechaSelect = document.createElement("div");
    flechaSelect.innerHTML = "▼";
    flechaSelect.style.cssText = `
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 10px;
      color: rgba(255, 255, 255, 0.7);
      pointer-events: none;
      transition: transform 0.3s ease;
    `;

    // Efectos hover y focus
    selectFiltro.addEventListener("mouseenter", () => {
      selectFiltro.style.background = "rgba(0, 0, 0, 0.85)";
      selectFiltro.style.transform = "translateY(-2px)";
      selectFiltro.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.3)";
      flechaSelect.style.transform = "translateY(-50%) scale(1.2)";
    });

    selectFiltro.addEventListener("mouseleave", () => {
      selectFiltro.style.background = "rgba(0, 0, 0, 0.7)";
      selectFiltro.style.transform = "translateY(0)";
      selectFiltro.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.2)";
      flechaSelect.style.transform = "translateY(-50%) scale(1)";
    });

    selectFiltro.addEventListener("focus", () => {
      selectFiltro.style.background = "rgba(0, 0, 0, 0.9)";
      selectFiltro.style.boxShadow = "0 0 0 3px rgba(255, 255, 255, 0.2)";
      flechaSelect.style.transform = "translateY(-50%) rotate(180deg)";
    });

    selectFiltro.addEventListener("blur", () => {
      selectFiltro.style.background = "rgba(0, 0, 0, 0.7)";
      selectFiltro.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.2)";
      flechaSelect.style.transform = "translateY(-50%) rotate(0deg)";
    });

    selectFiltro.addEventListener("change", aplicarFiltroConAnimacion);

    selectWrapper.appendChild(iconoFiltro);
    selectWrapper.appendChild(selectFiltro);
    selectWrapper.appendChild(flechaSelect);
    contenedorFiltros.appendChild(selectWrapper);
    
    listaPesas.parentNode.insertBefore(contenedorFiltros, listaPesas);
  }

  actualizarOpcionesFiltro();
}

function aplicarFiltroConAnimacion() {
  const selectFiltro = document.getElementById("filtroSelect");
  if (!selectFiltro) return;

  // Animación de "procesando"
  selectFiltro.style.background = "rgba(0, 150, 255, 0.8)";
  
  setTimeout(() => {
    aplicarFiltro();
    selectFiltro.style.background = "rgba(0, 0, 0, 0.7)";
  }, 200);
}

function actualizarOpcionesFiltro() {
  const selectFiltro = document.getElementById("filtroSelect");
  if (!selectFiltro) return;

  const pesas = getPesas();
  const frutasUnicas = [...new Set(pesas.map(pesa => pesa.fruta).filter(Boolean))].sort();
  const calidadesUnicas = [...new Set(pesas.map(pesa => pesa.calidad).filter(Boolean))].sort();

  selectFiltro.innerHTML = "";

  // Opción para mostrar todas las pesas
  const optionTodos = document.createElement("option");
  optionTodos.value = "todos";
  optionTodos.textContent = "📋 Todas";
  optionTodos.style.cssText = "background: rgba(0, 0, 0, 0.9); color: white; font-weight: 600;";
  selectFiltro.appendChild(optionTodos);

  // Opciones por fruta
  if (frutasUnicas.length > 0) {
    const optionSeparadorFrutas = document.createElement("option");
    optionSeparadorFrutas.disabled = true;
    optionSeparadorFrutas.textContent = "── Frutas ──";
    optionSeparadorFrutas.style.cssText = "background: rgba(50, 50, 50, 0.9); color: #ccc; font-weight: bold; font-style: italic;";
    selectFiltro.appendChild(optionSeparadorFrutas);

    frutasUnicas.forEach(fruta => {
      const option = document.createElement("option");
      option.value = `fruta:${fruta}`;
      option.textContent = `🍎 ${fruta}`;
      option.style.cssText = "background: rgba(0, 0, 0, 0.9); color: #4fc3f7; padding: 5px;";
      selectFiltro.appendChild(option);
    });
  }

  // Opciones por calidad
  if (calidadesUnicas.length > 0) {
    const optionSeparadorCalidades = document.createElement("option");
    optionSeparadorCalidades.disabled = true;
    optionSeparadorCalidades.textContent = "── Calidades ──";
    optionSeparadorCalidades.style.cssText = "background: rgba(50, 50, 50, 0.9); color: #ccc; font-weight: bold; font-style: italic;";
    selectFiltro.appendChild(optionSeparadorCalidades);

    calidadesUnicas.forEach(calidad => {
      const option = document.createElement("option");
      option.value = `calidad:${calidad}`;
      option.textContent = `⭐ ${calidad.charAt(0).toUpperCase() + calidad.slice(1)}`;
      option.style.cssText = "background: rgba(0, 0, 0, 0.9); color: #81c784; padding: 5px;";
      selectFiltro.appendChild(option);
    });
  }

  // Restaurar filtro activo si existe
  if (filtroActivo !== "todos") {
    const valorRestaurar = `${filtroActivo}:${valorFiltroActivo}`;
    if ([...selectFiltro.options].some(opt => opt.value === valorRestaurar)) {
      selectFiltro.value = valorRestaurar;
    } else {
      filtroActivo = "todos";
      valorFiltroActivo = "";
      selectFiltro.value = "todos";
    }
  }
}

// 🎨 CSS PARA ANIMACIONES ELEGANTES
const styleElegante = document.createElement('style');
styleElegante.textContent = `
  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  #listaPesas {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Estilos para las opciones del select */
  #filtroSelect option {
    padding: 8px 12px;
    border-radius: 8px;
    margin: 2px 0;
  }

  #filtroSelect option:hover {
    background: rgba(255, 255, 255, 0.1) !important;
  }

  /* Efecto de glassmorphism */
  .glass-effect {
    backdrop-filter: blur(10px);
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
`;
document.head.appendChild(styleElegante);

console.log("✨ Sistema de filtros elegante con animaciones cargado");

function aplicarFiltro() {
  const selectFiltro = document.getElementById("filtroSelect");
  if (!selectFiltro) return;

  const valorSeleccionado = selectFiltro.value;
  console.log("🎯 Valor seleccionado en filtro:", valorSeleccionado);
  
  // Animación de salida de las pesas actuales
  const listaPesas = document.getElementById("listaPesas");
  if (listaPesas) {
    listaPesas.style.opacity = "0.5";
    listaPesas.style.transform = "scale(0.98)";
  }
  
  setTimeout(() => {
    if (valorSeleccionado === "todos") {
      filtroActivo = "todos";
      valorFiltroActivo = "";
    } else {
      const [tipo, valor] = valorSeleccionado.split(":");
      filtroActivo = tipo;
      valorFiltroActivo = valor;
    }

    console.log(`🔍 Aplicando filtro: ${filtroActivo} = ${valorFiltroActivo}`);
    
    renderPesas();
    
    // Animación de entrada de las nuevas pesas
    if (listaPesas) {
      listaPesas.style.opacity = "1";
      listaPesas.style.transform = "scale(1)";
    }
    
    // Mostrar notificación con información del filtro
    if (filtroActivo === "todos") {
      mostrarNotificacionElegante("👁️ Mostrando todas las pesas", "info");
    } else {
      const pesasFiltradas = getPesasFiltradas();
      const tipoTexto = filtroActivo === "fruta" ? "🍎 fruta" : "⭐ calidad";
      mostrarNotificacionElegante(`🔍 ${pesasFiltradas.length} pesas de ${tipoTexto} "${valorFiltroActivo}"`, "success");
    }
  }, 150);
}

function mostrarNotificacionElegante(mensaje, tipo = "info") {
  const notificacion = document.createElement("div");
  
  const colores = {
    info: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    success: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    warning: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    error: "linear-gradient(135deg, #fc466b 0%, #3f5efb 100%)"
  };
  
  notificacion.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 25px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    background: ${colores[tipo]};
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    transform: translateX(100%) scale(0.8);
    transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    font-size: 13px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  `;
  
  notificacion.textContent = mensaje;
  document.body.appendChild(notificacion);
  
  // Animación de entrada
  setTimeout(() => {
    notificacion.style.transform = "translateX(0) scale(1)";
  }, 50);
  
  // Remover después de 2.5 segundos
  setTimeout(() => {
    notificacion.style.transform = "translateX(100%) scale(0.8)";
    notificacion.style.opacity = "0";
    setTimeout(() => {
      if (notificacion.parentNode) {
        notificacion.parentNode.removeChild(notificacion);
      }
    }, 400);
  }, 2500);
}


function getPesasFiltradas() {
  const pesas = getPesas();
  
  if (filtroActivo === "todos") {
    return pesas;
  }
  
  return pesas.filter(pesa => {
    if (filtroActivo === "fruta") {
      return pesa.fruta === valorFiltroActivo;
    } else if (filtroActivo === "calidad") {
      return pesa.calidad === valorFiltroActivo;
    }
    return true;
  });
}

function limpiarFiltros() {
  const selectFiltro = document.getElementById("filtroSelect");
  if (selectFiltro) {
    selectFiltro.value = "todos";
    filtroActivo = "todos";
    valorFiltroActivo = "";
    renderPesas();
    mostrarNotificacion("🧹 Filtros limpiados", "info");
  }
}

function mostrarInfoFiltro(pesasFiltradas, totalPesas) {
  let infoFiltro = document.getElementById("infoFiltro");
  
  if (filtroActivo === "todos") {
    if (infoFiltro) {
      infoFiltro.style.opacity = "0";
      infoFiltro.style.transform = "translateY(-20px)";
      setTimeout(() => {
        if (infoFiltro && infoFiltro.parentNode) {
          infoFiltro.parentNode.removeChild(infoFiltro);
        }
      }, 300);
    }
    return;
  }
  
  if (!infoFiltro) {
    infoFiltro = document.createElement("div");
    infoFiltro.id = "infoFiltro";
    
    const listaPesas = document.getElementById("listaPesas");
    if (listaPesas && listaPesas.parentNode) {
      listaPesas.parentNode.insertBefore(infoFiltro, listaPesas);
    }
  }
  
  infoFiltro.style.cssText = `
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.6) 100%);
    border: none;
    border-radius: 15px;
    padding: 15px 20px;
    margin: 15px 0;
    font-size: 13px;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    backdrop-filter: blur(15px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
    opacity: 0;
    transform: translateY(-20px);
    transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    border: 1px solid rgba(255, 255, 255, 0.1);
  `;
  
  const tipoFiltro = filtroActivo === "fruta" ? "🍎" : "⭐";
  const tipoTexto = filtroActivo === "fruta" ? "fruta" : "calidad";
  
  infoFiltro.innerHTML = `
    <span style="font-weight: 500; letter-spacing: 0.5px;">
      ${tipoFiltro} Filtrando por <strong style="color: #fff;">${tipoTexto}</strong>: 
      "<span style="color: #4fc3f7; font-weight: 600;">${valorFiltroActivo}</span>" 
      • <strong>${pesasFiltradas}</strong> de <strong>${totalPesas}</strong> pesas
    </span>
    <button onclick="limpiarFiltrosConAnimacion()" style="
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 20px;
      padding: 6px 12px;
      font-size: 11px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    " onmouseover="this.style.background='linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.2) 100%)'; this.style.transform='scale(1.05)'" 
       onmouseout="this.style.background='linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)'; this.style.transform='scale(1)'">
      ✖ Limpiar
    </button>
  `;
  
  // Animación de entrada
  setTimeout(() => {
    infoFiltro.style.opacity = "1";
    infoFiltro.style.transform = "translateY(0)";
  }, 100);
}

function limpiarFiltrosConAnimacion() {
  const selectFiltro = document.getElementById("filtroSelect");
  const infoFiltro = document.getElementById("infoFiltro");
  
  // Animación del botón limpiar
  if (infoFiltro) {
    infoFiltro.style.opacity = "0";
    infoFiltro.style.transform = "translateY(-20px) scale(0.95)";
  }
  
  if (selectFiltro) {
    selectFiltro.style.background = "rgba(255, 100, 100, 0.8)";
    
    setTimeout(() => {
      selectFiltro.value = "todos";
      filtroActivo = "todos";
      valorFiltroActivo = "";
      
      renderPesas();
      selectFiltro.style.background = "rgba(0, 0, 0, 0.7)";
      mostrarNotificacionElegante("🧹 Filtros limpiados", "info");
    }, 200);
  }
}

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
  
  // 🔥 AGREGAR ESTA LÍNEA AL FINAL DE LA FUNCIÓN:
  actualizarOpcionesFiltro(); // Actualizar opciones de filtro cuando se agregan pesas
}

// 🔥 FUNCIÓN MEJORADA PARA ELIMINAR PESAS
function eliminarPesa(index) {
  if (confirm("¿Está seguro de eliminar esta pesa?")) {
    const pesas = getPesas();
    const pesaEliminada = pesas.splice(index, 1)[0];
    savePesas(pesas);
    renderPesas();
    mostrarNotificacion(`🗑️ Pesa de ${pesaEliminada.kilos}kg eliminada`, "success");
    
    // 🔥 AGREGAR ESTA LÍNEA AL FINAL DE LA FUNCIÓN:
    actualizarOpcionesFiltro(); // Actualizar opciones de filtro cuando se eliminan pesas
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
  console.log("🎨 Renderizando pesas con filtro activo:", filtroActivo, valorFiltroActivo);
  
  // Obtener todas las pesas y aplicar filtro
  const todasLasPesas = getPesas();
  const pesasFiltradas = getPesasFiltradas(); // Esta función ya filtra correctamente
  
  console.log(`📊 Total pesas: ${todasLasPesas.length}, Filtradas: ${pesasFiltradas.length}`);
  
  listaPesas.innerHTML = "";
  let totalKilos = 0;
  let totalValor = 0;

  // Verificar integridad antes de renderizar
  if (!verificarIntegridadDatos()) {
    console.warn("⚠️ Datos con problemas detectados durante renderizado");
  }

  // 🔥 USAR PESAS FILTRADAS EN LUGAR DE TODAS LAS PESAS
  pesasFiltradas.forEach((pesa, index) => {
    const li = document.createElement("li");
    
    // Encontrar el índice real en el array completo para las funciones de editar/eliminar
    const indiceReal = todasLasPesas.findIndex(p => 
      p.kilos === pesa.kilos && 
      p.fruta === pesa.fruta && 
      p.calidad === pesa.calidad && 
      p.valor === pesa.valor
    );
    
    const infoFrutaCalidad = pesa.fruta && pesa.calidad ? 
      ` (${pesa.fruta} - ${pesa.calidad})` : '';
    
    if (isSubusuario) {
      li.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Pesa ${index + 1}: <strong>${pesa.kilos} kg</strong>${infoFrutaCalidad}</span>
          <div style="display: flex; gap: 6px;">
            <button onclick="editarPesa(${indiceReal})" style="background: transparent; border: none; cursor: pointer; font-size: 16px; color: #2196f3;">✏️</button>
            <button onclick="eliminarPesa(${indiceReal})" style="background: transparent; border: none; cursor: pointer; font-size: 16px; color: #ff4d4d;">🗑️</button>
          </div>
        </div>
      `;
    } else {
      li.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Pesa ${index + 1}: <strong>${pesa.kilos} kg</strong>${infoFrutaCalidad} — $<strong>${pesa.valor.toLocaleString()}</strong></span>
          <div style="display: flex; gap: 6px;">
            <button onclick="editarPesa(${indiceReal})" style="background: transparent; border: none; cursor: pointer; font-size: 16px; color: #2196f3;">✏️</button>
            <button onclick="eliminarPesa(${indiceReal})" style="background: transparent; border: none; cursor: pointer; font-size: 16px; color: #ff4d4d;">🗑️</button>
          </div>
        </div>
      `;
    }
    
    listaPesas.appendChild(li);
    totalKilos += pesa.kilos;
    totalValor += pesa.valor;
  });

  // 🔥 ACTUALIZAR TOTALES BASADOS EN PESAS FILTRADAS
  totalKilosSpan.textContent = totalKilos;
  ultimaPesaSpan.textContent = pesasFiltradas.at(-1)?.kilos || 0;
  
  if (!isSubusuario && valorTotal) {
    valorTotal.textContent = `$${totalValor.toLocaleString()}`;
  }

  // 🔥 MOSTRAR INFORMACIÓN DEL FILTRO ACTIVO
  mostrarInfoFiltro(pesasFiltradas.length, todasLasPesas.length);
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
    
    // 🔥 AGREGAR ESTAS LÍNEAS:
    filtroActivo = "todos";  // Limpiar filtro activo
    valorFiltroActivo = "";  // Limpiar valor de filtro
    
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

// 🔥 FUNCIÓN SIMPLIFICADA: Solo generar página de totales con colores suaves
let isSharingInProgress = false;

async function enviarReciboWhatsApp() {
  if (isSharingInProgress) {
    console.log("Compartir ya está en curso, por favor espera.");
    return;
  }

  // 💾 GUARDAR PESAS EN LOCALSTORAGE INMEDIATAMENTE
  const pesasActuales = getPesas();
  localStorage.setItem('pesas_backup', JSON.stringify(pesasActuales));
  console.log("💾 Pesas guardadas en localStorage como backup:", pesasActuales);

  isSharingInProgress = true;

  try {
    const pesas = getPesas();
    if (pesas.length === 0) {
      alert("No hay pesas para enviar");
      return;
    }

    // 🔥 PREPARAR DATOS DE LA FACTURA
    const finca = document.getElementById("finca")?.value || "Sin especificar";
    const propietario = document.getElementById("propietario")?.value || "Sin especificar";
    const fecha = document.getElementById("fecha")?.value || new Date().toLocaleDateString();

    // 🔥 CREAR ITEMS DE FACTURA
    const itemsFactura = pesas.map((pesa, index) => ({
      numero: index + 1,
      kilos: pesa.kilos,
      fruta: pesa.fruta || 'Sin especificar',
      calidad: pesa.calidad || 'Sin especificar',
      precio: pesa.precio || 0,
      valor: pesa.valor || 0
    }));

    // 🔥 CALCULAR TOTALES GENERALES
    const totalKilosGeneral = itemsFactura.reduce((sum, item) => sum + item.kilos, 0);
    const totalValorGeneral = itemsFactura.reduce((sum, item) => sum + item.valor, 0);

    // 🔥 GENERAR SOLO LA PÁGINA DE TOTALES CON COLORES SUAVES
    const divTotales = crearPaginaTotalesSuave(itemsFactura, totalKilosGeneral, totalValorGeneral, finca, propietario, fecha);
    document.body.appendChild(divTotales);
    await document.fonts.ready;

    const canvasTotales = await html2canvas(divTotales, {
      scale: 3,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      width: divTotales.offsetWidth,
      height: divTotales.offsetHeight,
      logging: false,
      imageTimeout: 0
    });

    document.body.removeChild(divTotales);

    const blobTotales = await new Promise(resolve => 
      canvasTotales.toBlob(resolve, "image/png", 1.0)
    );
    const fileTotales = new File([blobTotales], `resumen_totales.png`, { type: "image/png" });

    const mensaje = isSubusuario ? 
      `¡Resumen de recogida con ${itemsFactura.length} productos!` : 
      `¡Resumen de factura con ${itemsFactura.length} productos!`;

    console.log(`📤 Compartiendo resumen de totales`);

    await navigator.share({
      title: isSubusuario ? 'Resumen de Registro' : 'Resumen de Factura',
      text: mensaje,
      files: [fileTotales],
    });

  } catch (err) {
    console.error("Error al compartir:", err);
    alert("Error al generar el resumen: " + err.message);
  } finally {
    isSharingInProgress = false;
  }
}

// 🔥 FUNCIÓN MEJORADA PARA CREAR PÁGINA DE TOTALES - PARA ADMIN MUESTRA PRECIO POR KILO
function crearPaginaTotalesSuave(todosLosItems, totalKilosGeneral, totalValorGeneral, finca, propietario, fecha) {
  const div = document.createElement("div");
  div.style.cssText = `
    width: 1200px;
    min-height: 1000px;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    color: #2c3e50;
    font-family: 'Arial', sans-serif;
    padding: 40px;
    margin: 0;
    box-sizing: border-box;
    position: relative;
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  `;

  // Agrupar por fruta y calidad para el resumen
  const resumenPorFruta = {};
  todosLosItems.forEach(item => {
    const clave = `${item.fruta} - ${item.calidad}`;
    if (!resumenPorFruta[clave]) {
      resumenPorFruta[clave] = { 
        kilos: 0, 
        valor: 0, 
        cantidad: 0, 
        precio: item.precio,
        fruta: item.fruta,
        calidad: item.calidad
      };
    }
    resumenPorFruta[clave].kilos += item.kilos;
    resumenPorFruta[clave].valor += item.valor;
    resumenPorFruta[clave].cantidad += 1;
  });

  div.innerHTML = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="margin: 0; font-size: 36px; font-weight: bold; color: #34495e;">
        📊 RESUMEN TOTAL
      </h1>
      <div style="width: 60px; height: 4px; background: linear-gradient(to right, #3498db, #2ecc71); margin: 15px auto; border-radius: 2px;"></div>
    </div>

    <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 15px; margin-bottom: 25px; backdrop-filter: blur(10px);">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 16px;">
        <div><strong>🏠 Finca:</strong> ${finca}</div>
        <div><strong>👤 Propietario:</strong> ${propietario}</div>
        <div><strong>📅 Fecha:</strong> ${fecha}</div>
        <div><strong>📦 Total productos:</strong> ${Object.keys(resumenPorFruta).length}</div>
      </div>
    </div>

    <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 15px; margin-bottom: 25px; backdrop-filter: blur(10px);">
      <h3 style="margin: 0 0 25px 0; text-align: center; font-size: 20px;">📋 RESUMEN POR FRUTA Y CALIDAD</h3>
      <div style="display: grid; gap: 15px;">
        ${Object.entries(resumenPorFruta).map(([clave, datos], index) => {
          return `
          <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; color: #2c3e50; box-shadow: 0 5px 15px rgba(0,0,0,0.1); white-space: nowrap;">
            <div style="font-weight: bold; color: #2c3e50; font-size: 18px; margin-right: 20px;">${datos.fruta} - ${datos.calidad}</div>
            <div style="display: flex; align-items: center; gap: 30px;">
              <span style="color: #2c3e50; font-weight: bold; font-size: 16px;">${datos.kilos} kg</span>
              ${!isSubusuario ? `<span style="color: #e67e22; font-weight: bold; font-size: 16px;">${datos.precio.toLocaleString()} /kg</span>` : ''}
              ${!isSubusuario ? `<span style="color: #27ae60; font-weight: bold; font-size: 18px;">${datos.valor.toLocaleString()}</span>` : ''}
            </div>
          </div>
        `}).join('')}
      </div>
    </div>

    ${!isSubusuario ? `
    <div style="background: rgba(255,255,255,0.15); padding: 30px; border-radius: 15px; text-align: center; margin-top: 30px;">
      <h2 style="margin: 0 0 20px 0; font-size: 28px; color: #2c3e50; font-weight: bold;">
        💰 TOTAL GENERAL
      </h2>
      <div style="font-size: 32px; font-weight: bold; color: #27ae60;">
        ${totalValorGeneral.toLocaleString()}
      </div>
    </div>
    ` : `
    <div style="background: rgba(255,255,255,0.15); padding: 30px; border-radius: 15px; text-align: center; margin-top: 30px;">
      <h2 style="margin: 0 0 20px 0; font-size: 28px; color: #2c3e50; font-weight: bold;">
        📊 TOTAL KILOS
      </h2>
      <div style="font-size: 32px; font-weight: bold; color: #3498db;">
        ${totalKilosGeneral} kg
      </div>
    </div>
    `}

    <div style="position: absolute; bottom: 20px; right: 30px; font-size: 12px; color: #95a5a6;">
      Generado: ${new Date().toLocaleString()}
    </div>
  `;

  return div;
}

// 🔥 FUNCIÓN PARA CREAR PÁGINA INDIVIDUAL DE FACTURA - COLORES SUAVES
function crearFactura(items, numeroPagina, totalPaginas, finca, propietario, fecha) {
  const div = document.createElement("div");
  div.style.cssText = `
    width: 2500px;
    min-height: 1000px;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    color: #2c3e50;
    font-family: 'Arial', sans-serif;
    padding: 30px;
    margin: 0;
    box-sizing: border-box;
    position: relative;
    border: 1px solid #e1e8ed;
  `;

  // Calcular totales de esta página
  const totalKilosPagina = items.reduce((sum, item) => sum + item.kilos, 0);
  const totalValorPagina = items.reduce((sum, item) => sum + item.valor, 0);

  div.innerHTML = `
    <div style="text-align: center; margin-bottom: 25px;">
      <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #34495e; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">
        ${isSubusuario ? '📋 REGISTRO PREMIUM' : '🧾 FACTURA PREMIUM'}
      </h1>
      <p style="margin: 5px 0; font-size: 16px; color: #7f8c8d;">Página ${numeroPagina} de ${totalPaginas}</p>
    </div>

    <div style="background: rgba(255,255,255,0.8); padding: 20px; border-radius: 15px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e8f4f8;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 16px; color: #2c3e50;">
        <div><strong style="color: #3498db;">🏠 Finca:</strong> ${finca}</div>
        <div><strong style="color: #3498db;">👤 Propietario:</strong> ${propietario}</div>
        <div><strong style="color: #3498db;">📅 Fecha:</strong> ${fecha}</div>
        <div><strong style="color: #3498db;">📄 Página:</strong> ${numeroPagina}/${totalPaginas}</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px;">
      ${items.map(item => `
        <div style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border: 1px solid #e8f4f8; transition: transform 0.2s;">
          <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px; color: #2c3e50;">Pesa ${item.numero}</div>
          <div style="font-size: 24px; color: #e67e22; font-weight: bold; margin-bottom: 5px;">${item.kilos} kg</div>
          <div style="font-size: 14px; margin-bottom: 3px; color: #27ae60; font-weight: 500;">${item.fruta}</div>
          <div style="font-size: 12px; color: #7f8c8d; margin-bottom: 5px;">${item.calidad}</div>
          ${!isSubusuario ? `<div style="font-size: 16px; color: #2ecc71; font-weight: bold;">${item.valor.toLocaleString()}</div>` : ''}
        </div>
      `).join('')}
    </div>

    <div style="background: rgba(255,255,255,0.9); padding: 20px; border-radius: 15px; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e8f4f8;">
      <h3 style="margin: 0 0 15px 0; font-size: 20px; color: #2c3e50;">📊 TOTALES DE ESTA PÁGINA</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 18px;">
        <div style="background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%); padding: 15px; border-radius: 10px; border: 1px solid #dee2e6;">
          <div style="font-size: 14px; color: #6c757d; margin-bottom: 5px;">Total Kilos</div>
          <div style="font-size: 28px; font-weight: bold; color: #e67e22;">${totalKilosPagina} kg</div>
        </div>
        ${!isSubusuario ? `
        <div style="background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%); padding: 15px; border-radius: 10px; border: 1px solid #dee2e6;">
          <div style="font-size: 14px; color: #6c757d; margin-bottom: 5px;">Total Valor</div>
          <div style="font-size: 28px; font-weight: bold; color: #2ecc71;">${totalValorPagina.toLocaleString()}</div>
        </div>
        ` : `
        <div style="background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%); padding: 15px; border-radius: 10px; border: 1px solid #dee2e6;">
          <div style="font-size: 14px; color: #6c757d; margin-bottom: 5px;">Items</div>
          <div style="font-size: 28px; font-weight: bold; color: #3498db;">${items.length} productos</div>
        </div>
        `}
      </div>
    </div>

    <div style="position: absolute; bottom: 15px; right: 25px; font-size: 12px; color: #95a5a6;">
      Generado: ${new Date().toLocaleString()}
    </div>
  `;

  return div;
}

// 🔥 NUEVA FUNCIÓN PARA CREAR PÁGINA DE TOTALES GENERALES
function crearPaginaTotales(todosLosItems, totalKilosGeneral, totalValorGeneral, numeroPagina, totalPaginas, finca, propietario, fecha) {
  const div = document.createElement("div");
  div.style.cssText = `
    width: 2500px;
    min-height: 1000px;
    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    color: white;
    font-family: 'Arial', sans-serif;
    padding: 30px;
    margin: 0;
    box-sizing: border-box;
    position: relative;
  `;

  // Agrupar por fruta y calidad para el resumen
  const resumenPorFruta = {};
  todosLosItems.forEach(item => {
    const clave = `${item.fruta} - ${item.calidad}`;
    if (!resumenPorFruta[clave]) {
      resumenPorFruta[clave] = { kilos: 0, valor: 0, cantidad: 0 };
    }
    resumenPorFruta[clave].kilos += item.kilos;
    resumenPorFruta[clave].valor += item.valor;
    resumenPorFruta[clave].cantidad += 1;
  });

  div.innerHTML = `
    <div style="text-align: center; margin-bottom: 25px;">
      <h1 style="margin: 0; font-size: 36px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
        📊 RESUMEN TOTAL
      </h1>
      <p style="margin: 5px 0; font-size: 16px; opacity: 0.9;">Página ${numeroPagina} de ${totalPaginas}</p>
    </div>

    <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 15px; margin-bottom: 25px; backdrop-filter: blur(10px);">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 16px;">
        <div><strong>🏠 Finca:</strong> ${finca}</div>
        <div><strong>👤 Propietario:</strong> ${propietario}</div>
        <div><strong>📅 Fecha:</strong> ${fecha}</div>
        <div><strong>📦 Total Items:</strong> ${todosLosItems.length}</div>
      </div>
    </div>

    <div style="background: rgba(255,255,255,0.2); padding: 25px; border-radius: 15px; margin-bottom: 25px; backdrop-filter: blur(10px);">
      <h2 style="margin: 0 0 20px 0; text-align: center; font-size: 24px;">🎯 TOTALES GENERALES</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; text-align: center;">
          <div style="font-size: 16px; opacity: 0.8; margin-bottom: 8px;">TOTAL KILOS</div>
          <div style="font-size: 28px; font-weight: bold; color: #ffd700;">${totalKilosGeneral} kg</div>
        </div>
        ${!isSubusuario ? `
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; text-align: center;">
          <div style="font-size: 16px; opacity: 0.8; margin-bottom: 8px;">TOTAL VALOR</div>
          <div style="font-size: 28px; font-weight: bold; color: #90ee90;">${totalValorGeneral.toLocaleString()}</div>
        </div>
        ` : `
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; text-align: center;">
          <div style="font-size: 16px; opacity: 0.8; margin-bottom: 8px;">TOTAL ITEMS</div>
          <div style="font-size: 28px; font-weight: bold; color: #87ceeb;">${todosLosItems.length}</div>
        </div>
        `}
      </div>
    </div>

    <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 15px; margin-bottom: 25px; backdrop-filter: blur(10px);">
      <h3 style="margin: 0 0 15px 0; text-align: center; font-size: 20px;">📋 RESUMEN POR FRUTA Y CALIDAD</h3>
      <div style="display: grid; gap: 10px;">
        ${Object.entries(resumenPorFruta).map(([clave, datos]) => `
          <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; display: grid; grid-template-columns: 2fr 1fr 1fr ${!isSubusuario ? '1fr' : ''}; gap: 15px; align-items: center;">
            <div style="font-weight: bold;">${clave}</div>
            <div style="text-align: center;">${datos.kilos} kg</div>
            <div style="text-align: center;">${datos.cantidad} pesas</div>
            ${!isSubusuario ? `<div style="text-align: center; color: #90ee90; font-weight: bold;">${datos.valor.toLocaleString()}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>

    <div style="position: absolute; bottom: 15px; right: 25px; font-size: 12px; opacity: 0.7;">
      Generado: ${new Date().toLocaleString()}
    </div>
  `;

  return div;
}

if (enviarReciboBtn) {
  enviarReciboBtn.addEventListener("click", enviarReciboWhatsApp);
}

async function cargarDatosRecogida(id) {
  try {
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

    savePesas(pesasConInfo);
    renderPesas();

  } catch (err) {
    alert("Error al cargar la recogida: " + err.message);
  }
}

// INICIALIZACIÓN
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
  
  // 🔥 AGREGAR ESTAS LÍNEAS PARA INICIALIZAR FILTROS:
  setTimeout(() => {
    crearSistemaFiltros();
    console.log("✅ Sistema de filtros inicializado");
  }, 500);
  
  console.log("✅ Calculadora configurada completamente con persistencia mejorada");
  console.log("🎯 Auto-guardado activado cada 30 segundos");
  console.log("🔍 Sistema de filtros habilitado"); // Nueva línea de log
});

window.resetearFiltros = function() {
  limpiarFiltros();
  console.log("🔄 Filtros reseteados desde consola");
};

window.aplicarFiltroConsola = function(tipo, valor) {
  const selectFiltro = document.getElementById("filtroSelect");
  if (selectFiltro) {
    selectFiltro.value = `${tipo}:${valor}`;
    aplicarFiltro();
    console.log(`🔍 Filtro aplicado desde consola: ${tipo} = ${valor}`);
  }
};

console.log("🔍 Sistema de filtros para pesas integrado en calculadora.js");
console.log("💡 Funciones disponibles: resetearFiltros(), aplicarFiltroConsola(tipo, valor)");

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
