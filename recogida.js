// recogida.js - CORRECCIÓN PARA HACER EL CAMPO FECHA EDITABLE
const params = new URLSearchParams(window.location.search);
const fincaId = params.get("fincaId");
const fincaNombre = params.get("finca");
const propietario = params.get("propietario");
const usuario = params.get("usuario");
const usuarioAlias = params.get("usuarioAlias");
const modo = params.get("modo");
const idRecogida = params.get("idRecogida");

if (modo !== "editar") {
  localStorage.removeItem("pesas_recogida");
}

// Elementos del DOM - con verificación de existencia
const fechaInput = document.getElementById("fecha");
const fincaInput = document.getElementById("finca");
const propietarioInput = document.getElementById("propietario");
const frutaSelect = document.getElementById("frutaSelect");
const calidadSelect = document.getElementById("calidadSelect");
const precioExtraInput = document.getElementById("precioExtra");
const precioPorKiloInput = document.getElementById("precioPorKilo");

// Variables globales para el control de usuario
let sessionData = {};
let isSubusuario = false;
let tipoUsuarioVerificado = null;
let preciosDisponibles = [];

// 🔥 CONFIGURACIÓN MEJORADA DEL CAMPO FECHA - CON HORA LOCAL DE COLOMBIA
function configurarCampoFecha() {
  if (fechaInput) {
    // Obtener fecha actual en hora de Colombia (UTC-5)
    const ahora = new Date();
    const offsetColombia = -5 * 60; // UTC-5 en minutos
    const horaColombia = new Date(ahora.getTime() + offsetColombia * 60 * 1000);
    
    // Ajustar para considerar el cambio de día solo después de media noche
    const horaActualCol = horaColombia.getHours();
    const esAntesDeMediaNoche = horaActualCol < 24; // Cambiar a 24 para considerar siempre el día actual
    
    const hoyColombia = esAntesDeMediaNoche 
      ? horaColombia.toISOString().split('T')[0]
      : new Date(horaColombia.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Establecer valores por defecto
    if (!fechaInput.value) {
      fechaInput.value = hoyColombia;
    }
    
    // 🔥 PERMITIR EDICIÓN PERO RESTRINGIR FECHAS FUTURAS
    fechaInput.max = hoyColombia; // No permitir fechas futuras
    fechaInput.disabled = false; // Asegurar que esté habilitado
    fechaInput.readOnly = false; // Asegurar que no sea solo lectura
    
    // Agregar event listener para validación en tiempo real
    fechaInput.addEventListener('change', function() {
      const fechaSeleccionada = this.value;
      
      if (fechaSeleccionada > hoyColombia) {
        alert("⚠️ No se pueden seleccionar fechas futuras");
        this.value = hoyColombia;
        mostrarAnimacionError("❌ Fecha futura no permitida");
      } else {
        console.log("✅ Fecha válida seleccionada:", fechaSeleccionada);
        mostrarAnimacionExito("✅ Fecha actualizada");
      }
    });
    
    // Event listener para validación cuando el usuario escribe manualmente
    fechaInput.addEventListener('input', function() {
      const fechaSeleccionada = this.value;
      
      if (fechaSeleccionada > hoyColombia) {
        this.setCustomValidity("No se pueden seleccionar fechas futuras");
      } else {
        this.setCustomValidity("");
      }
    });
    
    console.log("✅ Campo fecha configurado con hora de Colombia");
    console.log("⏰ Hora actual en Colombia:", horaColombia.toISOString());
    console.log("📅 Fecha máxima permitida:", hoyColombia);
    console.log("📅 Fecha actual del campo:", fechaInput.value);
  } else {
    console.warn("⚠️ Campo fecha no encontrado");
  }
}

// 🔥 FUNCIÓN PARA MOSTRAR ANIMACIÓN DE ERROR
function mostrarAnimacionError(mensaje) {
  const div = document.createElement("div");
  div.style.position = "fixed";
  div.style.top = "50%";
  div.style.left = "50%";
  div.style.transform = "translate(-50%, -50%)";
  div.style.padding = "20px";
  div.style.background = "#f44336";
  div.style.color = "white";
  div.style.fontSize = "18px";
  div.style.borderRadius = "12px";
  div.style.zIndex = "9999";
  div.style.boxShadow = "0 4px 12px rgba(244, 67, 54, 0.3)";
  div.innerText = mensaje;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2000);
}

// FUNCIÓN PARA VERIFICAR TIPO DE USUARIO
async function verificarTipoUsuario() {
  console.log("=== VERIFICANDO TIPO DE USUARIO ===");
  
  try {
    const storedData = sessionStorage.getItem('userData');
    console.log("📦 Datos en sessionStorage:", storedData);
    
    if (storedData) {
      sessionData = JSON.parse(storedData);
      console.log("✅ SessionData parseado:", sessionData);
      
      if (sessionData.tipo) {
        tipoUsuarioVerificado = sessionData.tipo;
        isSubusuario = sessionData.tipo === 2;
        console.log("✅ Tipo desde sessionStorage:", tipoUsuarioVerificado, "Es subusuario:", isSubusuario);
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
    
    return isSubusuario;
    
  } catch (error) {
    console.error("❌ Error al verificar tipo de usuario:", error);
    return false;
  }
}

// 🔥 FUNCIÓN: Obtener precio para fruta y calidad específicas
function getPrecioPorFrutaYCalidad(fruta, calidad) {
  const frutaObj = preciosDisponibles.find(f => f.nombre === fruta);
  return frutaObj?.precios?.[calidad] || 0;
}

// OBTENER EL ALIAS DEL USUARIO
async function obtenerAliasUsuario() {
  try {
    console.log("🔍 Obteniendo alias del usuario...");
    
    if (sessionData && sessionData.alias) {
      console.log("✅ Alias desde sessionData:", sessionData.alias);
      return sessionData.alias;
    }
    
    if (usuarioAlias) {
      console.log("✅ Alias desde URL params:", usuarioAlias);
      return usuarioAlias;
    }

    if (usuario) {
      const response = await fetch(`https://jc-frutas.onrender.com/auth/get-alias?usuario=${encodeURIComponent(usuario)}`);
      const data = await response.json();
      console.log("✅ Alias desde servidor:", data.alias);
      return data.alias;
    }
    
    console.error("❌ No se pudo obtener el alias");
    return null;
    
  } catch (error) {
    console.error("❌ Error al obtener alias:", error);
    return null;
  }
}

// 🔥 FUNCIÓN MEJORADA PARA LIMPIAR COMPLETAMENTE EL LOCALSTORAGE
function limpiarPesasCompleto() {
  try {
    const clavesALimpiar = [
      "pesas_recogida",
      "pesas_backup",
      "pesas_backup_timestamp"
    ];
    
    clavesALimpiar.forEach(clave => {
      if (localStorage.getItem(clave)) {
        localStorage.removeItem(clave);
        console.log(`🧹 Clave limpiada: ${clave}`);
      }
    });
    
    const todasLasClaves = Object.keys(localStorage);
    const clavesBackupTimestamp = todasLasClaves.filter(key => 
      key.startsWith('pesas_backup_') && key !== 'pesas_backup'
    );
    
    clavesBackupTimestamp.forEach(clave => {
      localStorage.removeItem(clave);
      console.log(`🧹 Backup con timestamp limpiado: ${clave}`);
    });
    
    const clavesAutoguardado = todasLasClaves.filter(key => 
      key.startsWith('pesas_autosave_')
    );
    
    clavesAutoguardado.forEach(clave => {
      localStorage.removeItem(clave);
      console.log(`🧹 Autoguardado limpiado: ${clave}`);
    });
    
    console.log("✅ LocalStorage limpiado completamente");
    return true;
  } catch (error) {
    console.error("❌ Error al limpiar localStorage:", error);
    return false;
  }
}

// 🔥 FUNCIÓN GUARDAR RECOGIDA COMPLETAMENTE CORREGIDA
async function guardarRecogida() {
  console.log("💾 Iniciando guardado de recogida MANTENIENDO frutas y calidades individuales...");
  
  const pesas = getPesas();
  const totalKilos = pesas.reduce((sum, n) => sum + parseInt(n.kilos), 0);

  if (totalKilos === 0) {
    alert("Debe agregar al menos una pesa para guardar la recogida");
    return;
  }

  // 🔥 VALIDACIÓN CRÍTICA: Verificar que cada pesa tenga su fruta y calidad
  const pesasSinInfo = pesas.filter(pesa => !pesa.fruta || !pesa.calidad);
  if (pesasSinInfo.length > 0) {
    console.error("❌ Pesas sin información completa:", pesasSinInfo);
    alert("Hay pesas sin información de fruta o calidad. Por favor revisa los datos.");
    return;
  }

  // 🔥 VALIDAR FECHA ANTES DE GUARDAR
  if (fechaInput) {
    const fechaSeleccionada = fechaInput.value;
    const fechaHoy = new Date().toISOString().split("T")[0];
    
    if (fechaSeleccionada > fechaHoy) {
      alert("⚠️ No se puede guardar con una fecha futura. Por favor seleccione una fecha válida.");
      fechaInput.focus();
      return;
    }
    
    if (!fechaSeleccionada) {
      alert("⚠️ Por favor seleccione una fecha para la recogida.");
      fechaInput.focus();
      return;
    }
  }

  await verificarTipoUsuario();
  
  console.log("=== GUARDANDO RECOGIDA CON FRUTAS INDIVIDUALES ===");
  console.log("- Total pesas:", pesas.length);
  console.log("- Pesas completas:", pesas);

  const currentUserAlias = await obtenerAliasUsuario();
  if (!currentUserAlias) {
    alert("Error: No se pudo obtener el alias del usuario");
    return;
  }

  // 🔥 PROCESAR CADA PESA MANTENIENDO SU INFORMACIÓN INDIVIDUAL
  let valorTotalFinal = 0;
  const pesasParaGuardar = [];

  // 🔥 CRÍTICO: NO MODIFICAR LAS FRUTAS Y CALIDADES DE CADA PESA
  for (const pesa of pesas) {
    let precioParaEstaPesa = 0;
    
    if (isSubusuario) {
      // Para subusuarios: obtener precio desde la base de datos
      precioParaEstaPesa = getPrecioPorFrutaYCalidad(pesa.fruta, pesa.calidad);
    } else {
      // Para administradores: usar el precio que ya tiene la pesa
      precioParaEstaPesa = pesa.precio || getPrecioPorFrutaYCalidad(pesa.fruta, pesa.calidad);
    }
    
    const valorPesa = parseInt(pesa.kilos) * precioParaEstaPesa;
    valorTotalFinal += valorPesa;
    
    // 🔥 MANTENER EXACTAMENTE LA FRUTA Y CALIDAD ORIGINAL
    pesasParaGuardar.push({
      kilos: parseInt(pesa.kilos),
      valor: valorPesa,
      fruta: pesa.fruta, // 🔥 MANTENER FRUTA ORIGINAL
      calidad: pesa.calidad, // 🔥 MANTENER CALIDAD ORIGINAL
      precio: precioParaEstaPesa
    });
  }

  console.log("📊 Pesas procesadas individualmente:", pesasParaGuardar);

  // 🔥 CALCULAR RESÚMENES PARA CAMPOS DE REFERENCIA (SIN SOBRESCRIBIR PESAS)
  const frutaContador = {};
  const calidadContador = {};
  
  pesasParaGuardar.forEach(pesa => {
    frutaContador[pesa.fruta] = (frutaContador[pesa.fruta] || 0) + pesa.kilos;
    calidadContador[pesa.calidad] = (calidadContador[pesa.calidad] || 0) + pesa.kilos;
  });
  
  // Solo para campos de referencia (no afecta las pesas individuales)
  const frutaPrincipal = Object.keys(frutaContador).reduce((a, b) => 
    frutaContador[a] > frutaContador[b] ? a : b
  );
  
  const calidadPrincipal = Object.keys(calidadContador).reduce((a, b) => 
    calidadContador[a] > calidadContador[b] ? a : b
  );
  
  const precioPrincipal = getPrecioPorFrutaYCalidad(frutaPrincipal, calidadPrincipal);

  console.log("📊 Resumen de referencia (NO sobrescribe pesas individuales):", {
    frutaPrincipal,
    calidadPrincipal,
    frutaContador,
    calidadContador
  });

  // 🔥 DATOS FINALES PARA GUARDAR - CON PESAS INDIVIDUALES INTACTAS
  const data = {
    fincaId,
    finca: fincaNombre,
    propietario,
    fecha: fechaInput ? fechaInput.value : new Date().toISOString().split("T")[0], // 🔥 USAR FECHA SELECCIONADA
    usuario: usuario,
    alias: currentUserAlias,
    fruta: frutaPrincipal, // Solo para referencia
    calidad: calidadPrincipal, // Solo para referencia
    precio: precioPrincipal, // Solo para referencia
    totalKilos,
    valorPagar: valorTotalFinal,
    pesas: pesasParaGuardar, // 🔥 CADA PESA CON SU FRUTA Y CALIDAD ESPECÍFICA
    esRecogidaMultiple: true,
    resumenFrutas: frutaContador,
    resumenCalidades: calidadContador
  };

  console.log("📤 DATOS FINALES - Pesas con frutas individuales:", data);
  console.log("📅 Fecha para guardar:", data.fecha);
  console.log("🔍 Verificación de pesas individuales:");
  data.pesas.forEach((pesa, idx) => {
    console.log(`   Pesa ${idx + 1}: ${pesa.kilos}kg de ${pesa.fruta} (${pesa.calidad})`);
  });

  try {
    const metodo = modo === "editar" ? "PUT" : "POST";
    const url = modo === "editar" ? 
      `https://jc-frutas.onrender.com/recogidas/${idRecogida}` : 
      "https://jc-frutas.onrender.com/recogidas/nueva";

    const response = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error del servidor: ${response.status} - ${errorData.error || 'Error desconocido'}`);
    }

    const result = await response.json();
    console.log("✅ Recogida guardada con frutas individuales:", result);

    // Verificar que se guardaron las frutas individuales
    if (result.recogida && result.recogida.pesas) {
      console.log("🔍 Verificación final - Pesas guardadas:");
      result.recogida.pesas.forEach((pesa, idx) => {
        console.log(`   ✓ Pesa ${idx + 1}: ${pesa.kilos}kg de ${pesa.fruta} (${pesa.calidad})`);
      });
    }

    // Limpiar localStorage después del guardado exitoso
    const limpiezaExitosa = limpiarPesasCompleto();
    
    if (limpiezaExitosa) {
      console.log("✅ LocalStorage limpiado exitosamente después de guardar");
      mostrarAnimacionExito("✔ Recogida guardada con frutas individuales");
    } else {
      console.warn("⚠️ Hubo un problema al limpiar el localStorage");
      mostrarAnimacionExito("✔ Recogida guardada (revisar limpieza)");
    }
    
    setTimeout(() => {
      const pesasRestantes = localStorage.getItem("pesas_recogida");
      if (pesasRestantes) {
        console.warn("⚠️ Aún quedan pesas en localStorage, forzando limpieza...");
        localStorage.removeItem("pesas_recogida");
      }
      
      window.location.reload();
    }, 1500);
    
  } catch (err) {
    console.error("❌ Error al guardar recogida:", err);
    alert("Error al guardar recogida: " + err.message);
  }
}

// Resto de funciones (sin cambios críticos, solo mejoras menores)
function configurarBotonGuardar() {
  const guardarBtn = document.getElementById("guardarRecogida");
  if (guardarBtn) {
    guardarBtn.removeEventListener("click", guardarRecogida);
    guardarBtn.addEventListener("click", async () => {
      console.log("🚀 Iniciando guardado con mantención de frutas individuales");
      await guardarRecogida();
    });
    console.log("✅ Botón guardar configurado correctamente");
  } else {
    console.warn("⚠️ Botón 'guardarRecogida' no encontrado");
  }
}

// FUNCIÓN PARA CONFIGURAR INTERFAZ SEGÚN TIPO DE USUARIO
async function configurarInterfazSegunTipoUsuario() {
  console.log("🎨 Configurando interfaz según tipo de usuario...");
  
  await verificarTipoUsuario();
  
  if (isSubusuario) {
    console.log("🚫 Configurando interfaz para subusuario");
    
    if (precioExtraInput) {
      precioExtraInput.style.display = "none";
      const labelPrecioExtra = document.querySelector('label[for="precioExtra"]');
      if (labelPrecioExtra) labelPrecioExtra.style.display = "none";
    }
    
    if (precioPorKiloInput) {
      precioPorKiloInput.style.display = "none";
      const labelPrecioPorKilo = document.querySelector('label[for="precioPorKilo"]');
      if (labelPrecioPorKilo) labelPrecioPorKilo.style.display = "none";
    }
    
    const valorTotalElement = document.getElementById("valorTotal");
    if (valorTotalElement) {
      valorTotalElement.parentElement.style.display = "none";
    }
    
    const enviarReciboBtn = document.getElementById("enviarReciboBtn");
    if (enviarReciboBtn) {
      enviarReciboBtn.innerHTML = "📤 Enviar Registro";
    }
    
    console.log("✅ Interfaz configurada para subusuario");
  } else {
    console.log("✅ Configurando interfaz completa para administrador");
  }
}

// 🔥 FUNCIÓN MODIFICADA: Cargar frutas y precios
async function cargarFrutas() {
  console.log("🍎 Iniciando carga de frutas para finca:", fincaId);
  
  if (!fincaId) {
    console.error("❌ No hay fincaId disponible");
    alert("Error: No se pudo identificar la finca");
    return [];
  }

  try {
    const res = await fetch(`https://jc-frutas.onrender.com/precios/por-finca/${fincaId}`);
    
    if (!res.ok) {
      throw new Error(`Error ${res.status}: No se pudo cargar precios`);
    }
    
    const precios = await res.json();
    console.log("📊 Precios recibidos:", precios);

    let frutasFinales = [];
    for (const doc of precios) {
      if (doc.frutas && doc.frutas.length > frutasFinales.length) {
        frutasFinales = doc.frutas;
      }
    }

    preciosDisponibles = frutasFinales;
    console.log("💰 Precios cargados:", preciosDisponibles.length, "frutas disponibles");

    if (frutaSelect) {
      frutaSelect.innerHTML = '<option value="">Selecciona una fruta</option>';
      frutasFinales.forEach(fruta => {
        const opt = document.createElement("option");
        opt.value = fruta.nombre;
        opt.textContent = fruta.nombre;
        frutaSelect.appendChild(opt);
      });
    }

    if (calidadSelect) {
      calidadSelect.innerHTML = `
        <option value="">Selecciona calidad</option>
        <option value="primera">Primera</option>
        <option value="segunda">Segunda</option>
        <option value="tercera">Tercera</option>
        <option value="extra">Extra</option>
      `;
    }

    return frutasFinales;
  } catch (err) {
    console.error("❌ Error al cargar frutas:", err);
    alert("Error al cargar frutas: " + err.message);
    return [];
  }
}

function getPesas() {
  return JSON.parse(localStorage.getItem("pesas_recogida") || "[]");
}

function mostrarAnimacionExito(mensaje) {
  const div = document.createElement("div");
  div.style.position = "fixed";
  div.style.top = "50%";
  div.style.left = "50%";
  div.style.transform = "translate(-50%, -50%)";
  div.style.padding = "20px";
  div.style.background = "#4CAF50";
  div.style.color = "white";
  div.style.fontSize = "20px";
  div.style.borderRadius = "12px";
  div.style.zIndex = "9999";
  div.innerText = mensaje;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 1300);
}

// 🔥 FUNCIÓN CORREGIDA: Cargar recogida existente manteniendo frutas individuales
async function cargarRecogidaExistente(id) {
  try {
    console.log("📥 Cargando recogida existente con frutas individuales:", id);
    
    const res = await fetch(`https://jc-frutas.onrender.com/recogidas/${id}`);
    if (!res.ok) throw new Error("No se pudo obtener la recogida");
    const recogida = await res.json();

    console.log("📊 Datos de recogida cargados:", recogida);

    // 🔥 CARGAR LA FECHA DE LA RECOGIDA EXISTENTE
    if (fechaInput && recogida.fecha) {
      fechaInput.value = recogida.fecha;
      console.log("📅 Fecha cargada desde recogida existente:", recogida.fecha);
    }

    // Configurar selección inicial
    if (frutaSelect) frutaSelect.value = recogida.fruta || '';
    if (calidadSelect) calidadSelect.value = recogida.calidad || '';

    if (!isSubusuario) {
      if (recogida.calidad === "extra" && precioExtraInput) {
        precioExtraInput.classList.remove("hidden");
        precioExtraInput.value = recogida.precio || 0;
        if (precioPorKiloInput) precioPorKiloInput.value = 0;
      } else {
        if (precioExtraInput) precioExtraInput.classList.add("hidden");
        if (precioPorKiloInput) precioPorKiloInput.value = recogida.precio || 0;
      }
    }

    // 🔥 CARGAR PESAS MANTENIENDO FRUTAS Y CALIDADES INDIVIDUALES
    if (recogida.pesas && recogida.pesas.length > 0) {
      const pesasCompletas = recogida.pesas.map(pesa => ({
        kilos: pesa.kilos,
        valor: pesa.valor,
        fruta: pesa.fruta || recogida.fruta, // Priorizar fruta de la pesa
        calidad: pesa.calidad || recogida.calidad, // Priorizar calidad de la pesa
        precio: pesa.precio || recogida.precio // Priorizar precio de la pesa
      }));
      
      localStorage.setItem("pesas_recogida", JSON.stringify(pesasCompletas));
      console.log("📦 Pesas individuales cargadas:", pesasCompletas.length);
      
      // Mostrar resumen de lo que se cargó
      const frutasEncontradas = [...new Set(pesasCompletas.map(p => p.fruta))];
      const calidadesEncontradas = [...new Set(pesasCompletas.map(p => p.calidad))];
      console.log("🍎 Frutas cargadas individualmente:", frutasEncontradas);
      console.log("⭐ Calidades cargadas individualmente:", calidadesEncontradas);
      
      // Verificación detallada
      pesasCompletas.forEach((pesa, idx) => {
        console.log(`   Pesa ${idx + 1}: ${pesa.kilos}kg de ${pesa.fruta} (${pesa.calidad})`);
      });
    }
    
  } catch (err) {
    console.error("❌ Error al cargar recogida:", err);
    alert("Error al cargar la recogida: " + err.message);
  }
}

// 🔥 FUNCIÓN CORREGIDA: Generar recibo manteniendo frutas individuales
function generarReciboSegunTipoUsuario() {
  const pesas = getPesas();
  const totalKilos = pesas.reduce((sum, n) => sum + parseInt(n.kilos), 0);
  const hoy = fechaInput ? fechaInput.value : new Date().toISOString().split("T")[0];
  
  // 🔥 CREAR RESUMEN RESPETANDO FRUTAS INDIVIDUALES
  const frutaResumen = {};
  const calidadResumen = {};
  
  pesas.forEach(pesa => {
    // Resumen por fruta (usando fruta específica de cada pesa)
    if (!frutaResumen[pesa.fruta]) {
      frutaResumen[pesa.fruta] = { kilos: 0, valor: 0, pesas: 0 };
    }
    frutaResumen[pesa.fruta].kilos += parseInt(pesa.kilos);
    frutaResumen[pesa.fruta].valor += parseInt(pesa.valor || 0);
    frutaResumen[pesa.fruta].pesas += 1;
    
    // Resumen por calidad (usando calidad específica de cada pesa)
    if (!calidadResumen[pesa.calidad]) {
      calidadResumen[pesa.calidad] = { kilos: 0, valor: 0, pesas: 0 };
    }
    calidadResumen[pesa.calidad].kilos += parseInt(pesa.kilos);
    calidadResumen[pesa.calidad].valor += parseInt(pesa.valor || 0);
    calidadResumen[pesa.calidad].pesas += 1;
  });
  
  let contenidoRecibo = `
=== ${isSubusuario ? 'REGISTRO' : 'RECIBO'} DE RECOGIDA MÚLTIPLE ===
Fecha: ${hoy}
Finca: ${fincaNombre || 'N/A'}
Propietario: ${propietario || 'N/A'}
Total Kilos: ${totalKilos}
Total Pesas: ${pesas.length}

=== RESUMEN POR FRUTA ===
`;

  Object.entries(frutaResumen).forEach(([fruta, datos]) => {
    if (isSubusuario) {
      contenidoRecibo += `${fruta}: ${datos.kilos} kg (${datos.pesas} pesas)\n`;
    } else {
      contenidoRecibo += `${fruta}: ${datos.kilos} kg (${datos.pesas} pesas) - ${datos.valor.toLocaleString()}\n`;
    }
  });

  contenidoRecibo += '\n=== RESUMEN POR CALIDAD ===\n';
  
  Object.entries(calidadResumen).forEach(([calidad, datos]) => {
    if (isSubusuario) {
      contenidoRecibo += `${calidad}: ${datos.kilos} kg (${datos.pesas} pesas)\n`;
    } else {
      contenidoRecibo += `${calidad}: ${datos.kilos} kg (${datos.pesas} pesas) - ${datos.valor.toLocaleString()}\n`;
    }
  });

  contenidoRecibo += '\n=== DETALLE INDIVIDUAL DE PESAS ===\n';

  pesas.forEach((pesa, index) => {
    if (isSubusuario) {
      contenidoRecibo += `${index + 1}. ${pesa.kilos} kg → ${pesa.fruta} (${pesa.calidad})\n`;
    } else {
      contenidoRecibo += `${index + 1}. ${pesa.kilos} kg → ${pesa.fruta} (${pesa.calidad}) - ${(pesa.valor || 0).toLocaleString()}\n`;
    }
  });

  if (!isSubusuario) {
    const valorTotal = pesas.reduce((sum, n) => sum + parseInt(n.valor || 0), 0);
    contenidoRecibo += `\n=== TOTAL GENERAL ===\nValor Total: ${valorTotal.toLocaleString()}`;
  }

  return contenidoRecibo;
}

// 🔥 EVENT LISTENERS CON VERIFICACIÓN DE EXISTENCIA
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 DOM cargado - Configurando para mantener frutas individuales...");

  // 🔥 CONFIGURAR CAMPO FECHA PRIMERO
  configurarCampoFecha();

  // Configurar interfaz según tipo de usuario
  await configurarInterfazSegunTipoUsuario();
  
  // Configurar botón de guardar
  configurarBotonGuardar();
  
  // Configurar botón de volver
  const btnVolver = document.getElementById("btnVolverDashboard");
  if (btnVolver) {
    btnVolver.addEventListener("click", () => {
      window.history.back();
    });
    console.log("✅ Botón volver configurado");
  } else {
    console.warn("⚠️ Botón 'btnVolverDashboard' no encontrado");
  }
  
  // Configurar botón de enviar recibo
  const enviarReciboBtn = document.getElementById("enviarReciboBtn");
  if (enviarReciboBtn) {
    enviarReciboBtn.addEventListener("click", () => {
      const contenidoRecibo = generarReciboSegunTipoUsuario();
      
      console.log("📄 Recibo con frutas individuales generado:", contenidoRecibo);
      
      navigator.clipboard.writeText(contenidoRecibo).then(() => {
        mostrarAnimacionExito("📋 Recibo copiado (frutas individuales)");
      }).catch(() => {
        alert("No se pudo copiar el recibo. Contenido:\n\n" + contenidoRecibo);
      });
    });
    console.log("✅ Botón enviar recibo configurado");
  } else {
    console.warn("⚠️ Botón 'enviarReciboBtn' no encontrado");
  }
  
  console.log("✅ Event listeners configurados para frutas individuales");

  // Cargar frutas y datos de edición
  try {
    const frutasCargadas = await cargarFrutas();
    console.log("🍎 Frutas cargadas exitosamente:", frutasCargadas.length);

    if (modo === "editar" && idRecogida) {
      console.log("✏️ Modo edición - cargando datos manteniendo frutas individuales...");
      
      await verificarTipoUsuario();
      await cargarRecogidaExistente(idRecogida);
      
      console.log("✅ Datos de edición cargados respetando frutas individuales");
    }
  } catch (error) {
    console.error("❌ Error en la carga inicial:", error);
  }
});