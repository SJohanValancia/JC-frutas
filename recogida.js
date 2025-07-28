// recogida.js - CORREGIDO PARA MÚLTIPLES FRUTAS Y CALIDADES
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
let preciosDisponibles = []; // 🔥 NUEVA VARIABLE para almacenar precios

// Set defaults - solo si los elementos existen
if (fechaInput) {
  const hoy = new Date().toISOString().split("T")[0];
  fechaInput.value = hoy;
  fechaInput.max = hoy;
}
if (fincaInput) fincaInput.value = fincaNombre || '';
if (propietarioInput) propietarioInput.value = propietario || '';

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
    
    console.log("=== RESULTADO FINAL ===");
    console.log("- Tipo de usuario:", tipoUsuarioVerificado);
    console.log("- Es subusuario:", isSubusuario);
    console.log("- SessionData:", sessionData);
    console.log("========================");
    
    return isSubusuario;
    
  } catch (error) {
    console.error("❌ Error al verificar tipo de usuario:", error);
    return false;
  }
}

// 🔥 NUEVA FUNCIÓN: Obtener precio para fruta y calidad específicas
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
    // Limpiar todas las claves relacionadas con pesas
    const clavesALimpiar = [
      "pesas_recogida",           // Clave principal
      "pesas_backup",             // Backup principal
      "pesas_backup_timestamp"    // Backup con timestamp si existe
    ];
    
    // Limpiar claves específicas
    clavesALimpiar.forEach(clave => {
      if (localStorage.getItem(clave)) {
        localStorage.removeItem(clave);
        console.log(`🧹 Clave limpiada: ${clave}`);
      }
    });
    
    // Limpiar todos los backups con timestamp (formato: pesas_backup_TIMESTAMP)
    const todasLasClaves = Object.keys(localStorage);
    const clavesBackupTimestamp = todasLasClaves.filter(key => 
      key.startsWith('pesas_backup_') && key !== 'pesas_backup'
    );
    
    clavesBackupTimestamp.forEach(clave => {
      localStorage.removeItem(clave);
      console.log(`🧹 Backup con timestamp limpiado: ${clave}`);
    });
    
    // Limpiar autoguardados si existen
    const clavesAutoguardado = todasLasClaves.filter(key => 
      key.startsWith('pesas_autosave_')
    );
    
    clavesAutoguardado.forEach(clave => {
      localStorage.removeItem(clave);
      console.log(`🧹 Autoguardado limpiado: ${clave}`);
    });
    
    console.log("✅ LocalStorage limpiado completamente");
    console.log(`📊 Total claves limpiadas: ${clavesALimpiar.length + clavesBackupTimestamp.length + clavesAutoguardado.length}`);
    
    return true;
  } catch (error) {
    console.error("❌ Error al limpiar localStorage:", error);
    return false;
  }
}

// 🔥 FUNCIÓN GUARDAR RECOGIDA MODIFICADA - PARA RECOGIDA.JS
async function guardarRecogida() {
  console.log("💾 Iniciando guardado de recogida con múltiples frutas/calidades...");
  
  const pesas = getPesas();
  const totalKilos = pesas.reduce((sum, n) => sum + parseInt(n.kilos), 0);

  if (totalKilos === 0) {
    alert("Debe agregar al menos una pesa para guardar la recogida");
    return;
  }

  // Verificar que todas las pesas tengan fruta y calidad
  const pesasSinInfo = pesas.filter(pesa => !pesa.fruta || !pesa.calidad);
  if (pesasSinInfo.length > 0) {
    alert("Hay pesas sin información de fruta o calidad. Por favor revisa los datos.");
    return;
  }

  await verificarTipoUsuario();
  
  console.log("=== DATOS PARA GUARDAR RECOGIDA MÚLTIPLE ===");
  console.log("- Tipo usuario verificado:", tipoUsuarioVerificado);
  console.log("- Es subusuario:", isSubusuario);
  console.log("- Total pesas:", pesas.length);

  // Obtener alias del usuario
  const currentUserAlias = await obtenerAliasUsuario();
  if (!currentUserAlias) {
    alert("Error: No se pudo obtener el alias del usuario");
    return;
  }

  // 🔥 NUEVA LÓGICA: Procesar cada pesa con su precio individual
  let valorTotalFinal = 0;
  const pesasConValoresCorrectos = [];

  for (const pesa of pesas) {
    let precioParaEstaPesa = 0;
    
    if (isSubusuario) {
      // Para subusuarios: obtener precio desde la base de datos
      precioParaEstaPesa = getPrecioPorFrutaYCalidad(pesa.fruta, pesa.calidad);
    } else {
      // Para administradores: usar el precio que ya tiene la pesa (o calcular si no existe)
      precioParaEstaPesa = pesa.precio || getPrecioPorFrutaYCalidad(pesa.fruta, pesa.calidad);
    }
    
    const valorPesa = parseInt(pesa.kilos) * precioParaEstaPesa;
    valorTotalFinal += valorPesa;
    
    pesasConValoresCorrectos.push({
      kilos: parseInt(pesa.kilos),
      valor: valorPesa,
      fruta: pesa.fruta,
      calidad: pesa.calidad,
      precio: precioParaEstaPesa
    });
  }

  // 🔥 NUEVA LÓGICA: Determinar fruta y calidad principales (la más frecuente)
  const frutaContador = {};
  const calidadContador = {};
  
  pesas.forEach(pesa => {
    frutaContador[pesa.fruta] = (frutaContador[pesa.fruta] || 0) + pesa.kilos;
    calidadContador[pesa.calidad] = (calidadContador[pesa.calidad] || 0) + pesa.kilos;
  });
  
  const frutaPrincipal = Object.keys(frutaContador).reduce((a, b) => 
    frutaContador[a] > frutaContador[b] ? a : b
  );
  
  const calidadPrincipal = Object.keys(calidadContador).reduce((a, b) => 
    calidadContador[a] > calidadContador[b] ? a : b
  );
  
  const precioPrincipal = getPrecioPorFrutaYCalidad(frutaPrincipal, calidadPrincipal);

  console.log("📊 Análisis de recogida múltiple:", {
    frutaPrincipal,
    calidadPrincipal,
    precioPrincipal,
    valorTotalFinal,
    totalPesas: pesasConValoresCorrectos.length
  });

  const data = {
    fincaId,
    finca: fincaNombre,
    propietario,
    fecha: fechaInput ? fechaInput.value : new Date().toISOString().split("T")[0],
    usuario: usuario,
    alias: currentUserAlias,
    fruta: frutaPrincipal, // Fruta con más kilos
    calidad: calidadPrincipal, // Calidad con más kilos
    precio: precioPrincipal, // Precio de la combinación principal
    totalKilos,
    valorPagar: valorTotalFinal,
    pesas: pesasConValoresCorrectos, // Cada pesa con su fruta, calidad y precio específico
    esRecogidaMultiple: true, // 🔥 MARCADOR para identificar recogidas múltiples
    resumenFrutas: frutaContador, // Resumen de kilos por fruta
    resumenCalidades: calidadContador // Resumen de kilos por calidad
  };

  console.log("📤 Datos finales de recogida múltiple a enviar:", data);

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
    console.log("✅ Recogida múltiple guardada:", result);

    // 🔥 AQUÍ ESTÁ EL CAMBIO PRINCIPAL: LIMPIAR COMPLETAMENTE EL LOCALSTORAGE
    const limpiezaExitosa = limpiarPesasCompleto();
    
    if (limpiezaExitosa) {
      console.log("✅ LocalStorage limpiado exitosamente después de guardar");
      mostrarAnimacionExito("✔ Recogida guardada y datos limpiados");
    } else {
      console.warn("⚠️ Hubo un problema al limpiar el localStorage");
      mostrarAnimacionExito("✔ Recogida guardada (revisar limpieza de datos)");
    }
    
    // Pequeña pausa antes de recargar para que el usuario vea el mensaje
    setTimeout(() => {
      // Verificar una vez más que esté limpio antes de recargar
      const pesasRestantes = localStorage.getItem("pesas_recogida");
      if (pesasRestantes) {
        console.warn("⚠️ Aún quedan pesas en localStorage, forzando limpieza...");
        localStorage.removeItem("pesas_recogida");
      }
      
      window.location.reload();
    }, 1500);
    
  } catch (err) {
    console.error("❌ Error al guardar recogida múltiple:", err);
    alert("Error al guardar recogida: " + err.message);
  }
}

// 🔥 FUNCIÓN ADICIONAL PARA VERIFICAR SI EL LOCALSTORAGE ESTÁ LIMPIO
function verificarLimpiezaLocalStorage() {
  const clavesRelacionadas = [
    "pesas_recogida",
    "pesas_backup"
  ];
  
  const clavesEncontradas = [];
  
  clavesRelacionadas.forEach(clave => {
    if (localStorage.getItem(clave)) {
      clavesEncontradas.push(clave);
    }
  });
  
  // Verificar también backups con timestamp
  const todasLasClaves = Object.keys(localStorage);
  const backupsEncontrados = todasLasClaves.filter(key => 
    key.startsWith('pesas_backup_') || key.startsWith('pesas_autosave_')
  );
  
  const totalClaves = clavesEncontradas.length + backupsEncontrados.length;
  
  if (totalClaves > 0) {
    console.warn(`⚠️ Se encontraron ${totalClaves} claves sin limpiar:`, 
                 [...clavesEncontradas, ...backupsEncontrados]);
    return false;
  } else {
    console.log("✅ LocalStorage completamente limpio");
    return true;
  }
}

// 🔥 FUNCIÓN PARA LIMPIAR MANUALMENTE (útil para debugging)
function limpiarManual() {
  const limpio = limpiarPesasCompleto();
  const verificado = verificarLimpiezaLocalStorage();
  
  if (limpio && verificado) {
    console.log("🎉 Limpieza manual completada exitosamente");
    alert("✅ LocalStorage limpiado completamente");
  } else {
    console.error("❌ Problemas en la limpieza manual");
    alert("⚠️ Hubo problemas en la limpieza. Revisar consola.");
  }
}


function configurarBotonGuardar() {
  const guardarBtn = document.getElementById("guardarRecogida");
  if (guardarBtn) {
    // Remover cualquier listener existente
    guardarBtn.removeEventListener("click", guardarRecogida);
    
    // Agregar el nuevo listener con limpieza mejorada
    guardarBtn.addEventListener("click", async () => {
      console.log("🚀 Botón guardar presionado - iniciando proceso con limpieza completa");
      await guardarRecogida();
    });
    
    console.log("✅ Botón guardar configurado con limpieza completa de localStorage");
  } else {
    console.warn("⚠️ Botón 'guardarRecogida' no encontrado en el DOM");
  }
}

//


// FUNCIÓN PARA CONFIGURAR INTERFAZ SEGÚN TIPO DE USUARIO
async function configurarInterfazSegunTipoUsuario() {
  console.log("🎨 Configurando interfaz según tipo de usuario...");
  
  await verificarTipoUsuario();
  
  console.log("🎨 Configurando para tipo:", tipoUsuarioVerificado, "Es subusuario:", isSubusuario);
  
  if (isSubusuario) {
    console.log("🚫 Configurando interfaz para subusuario - ocultando elementos de dinero");
    
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
    console.log("✅ Configurando interfaz para administrador - mostrando todos los elementos");
    
    if (precioExtraInput) {
      precioExtraInput.style.display = "block";
      const labelPrecioExtra = document.querySelector('label[for="precioExtra"]');
      if (labelPrecioExtra) labelPrecioExtra.style.display = "block";
    }
    
    if (precioPorKiloInput) {
      precioPorKiloInput.style.display = "block";
      const labelPrecioPorKilo = document.querySelector('label[for="precioPorKilo"]');
      if (labelPrecioPorKilo) labelPrecioPorKilo.style.display = "block";
    }
    
    const valorTotalElement = document.getElementById("valorTotal");
    if (valorTotalElement && valorTotalElement.parentElement) {
      valorTotalElement.parentElement.style.display = "block";
    }
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
    console.log("🔄 Haciendo petición a:", `https://jc-frutas.onrender.com/precios/por-finca/${fincaId}`);
    
    const res = await fetch(`https://jc-frutas.onrender.com/precios/por-finca/${fincaId}`);
    
    if (!res.ok) {
      throw new Error(`Error ${res.status}: No se pudo cargar precios`);
    }
    
    const precios = await res.json();
    console.log("📊 Precios recibidos del servidor:", precios);

    let frutasFinales = [];
    for (const doc of precios) {
      if (doc.frutas && doc.frutas.length > frutasFinales.length) {
        frutasFinales = doc.frutas;
      }
    }

    // 🔥 GUARDAR precios disponibles para uso posterior
    preciosDisponibles = frutasFinales;
    console.log("💰 Precios cargados:", preciosDisponibles.length, "frutas disponibles");
    console.log("🍎 Frutas cargadas:", preciosDisponibles.map(f => f.nombre));

    if (frutaSelect) {
      frutaSelect.innerHTML = '<option value="">Selecciona una fruta</option>';
      frutasFinales.forEach(fruta => {
        const opt = document.createElement("option");
        opt.value = fruta.nombre;
        opt.textContent = fruta.nombre;
        frutaSelect.appendChild(opt);
      });
      console.log("✅ Select de frutas poblado con", frutasFinales.length, "opciones");
    } else {
      console.warn("⚠️ Elemento frutaSelect no encontrado en el DOM");
    }

    // Configurar calidades si existe el select
    if (calidadSelect) {
      calidadSelect.innerHTML = `
        <option value="">Selecciona calidad</option>
        <option value="primera">Primera</option>
        <option value="segunda">Segunda</option>
        <option value="tercera">Tercera</option>
        <option value="extra">Extra</option>
      `;
      console.log("✅ Select de calidades configurado");
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

// 🔥 FUNCIÓN MODIFICADA: Cargar recogida existente con soporte múltiple
async function cargarRecogidaExistente(id) {
  try {
    console.log("📥 Cargando recogida existente con soporte múltiple:", id);
    
    const res = await fetch(`https://jc-frutas.onrender.com/recogidas/${id}`);
    if (!res.ok) throw new Error("No se pudo obtener la recogida");
    const recogida = await res.json();

    console.log("📊 Datos de recogida cargados:", recogida);

    // Configurar selección inicial con la fruta/calidad principal
    if (frutaSelect) frutaSelect.value = recogida.fruta || '';
    if (calidadSelect) calidadSelect.value = recogida.calidad || '';

    if (!isSubusuario) {
      console.log("💰 Administrador detectado - mostrando precios de recogida");
      
      if (recogida.calidad === "extra" && precioExtraInput) {
        precioExtraInput.classList.remove("hidden");
        precioExtraInput.value = recogida.precio || 0;
        if (precioPorKiloInput) precioPorKiloInput.value = 0;
      } else {
        if (precioExtraInput) precioExtraInput.classList.add("hidden");
        if (precioPorKiloInput) precioPorKiloInput.value = recogida.precio || 0;
      }
      
      console.log("✅ Precios configurados:", {
        calidad: recogida.calidad,
        precio: recogida.precio
      });
    } else {
      console.log("🚫 Subusuario detectado - ocultando precios");
    }

    // 🔥 NUEVA LÓGICA: Cargar pesas con información completa
    if (recogida.pesas && recogida.pesas.length > 0) {
      const pesasCompletas = recogida.pesas.map(pesa => ({
        kilos: pesa.kilos,
        valor: pesa.valor,
        fruta: pesa.fruta || recogida.fruta, // Usar fruta de la pesa o la principal
        calidad: pesa.calidad || recogida.calidad, // Usar calidad de la pesa o la principal
        precio: pesa.precio || recogida.precio // Usar precio de la pesa o el principal
      }));
      
      localStorage.setItem("pesas_recogida", JSON.stringify(pesasCompletas));
      console.log("📦 Pesas múltiples cargadas:", pesasCompletas.length);
      
      // Mostrar resumen de frutas/calidades cargadas
      const frutasEncontradas = [...new Set(pesasCompletas.map(p => p.fruta))];
      const calidadesEncontradas = [...new Set(pesasCompletas.map(p => p.calidad))];
      console.log("🍎 Frutas en la recogida:", frutasEncontradas);
      console.log("⭐ Calidades en la recogida:", calidadesEncontradas);
    }
    
  } catch (err) {
    console.error("❌ Error al cargar recogida:", err);
    alert("Error al cargar la recogida: " + err.message);
  }
}

// 🔥 FUNCIÓN MODIFICADA: Generar recibo con múltiples frutas/calidades
function generarReciboSegunTipoUsuario() {
  const pesas = getPesas();
  const totalKilos = pesas.reduce((sum, n) => sum + parseInt(n.kilos), 0);
  const hoy = fechaInput ? fechaInput.value : new Date().toISOString().split("T")[0];
  
  // Crear resumen de frutas y calidades
  const frutaResumen = {};
  const calidadResumen = {};
  
  pesas.forEach(pesa => {
    // Resumen por fruta
    if (!frutaResumen[pesa.fruta]) {
      frutaResumen[pesa.fruta] = { kilos: 0, valor: 0 };
    }
    frutaResumen[pesa.fruta].kilos += parseInt(pesa.kilos);
    frutaResumen[pesa.fruta].valor += parseInt(pesa.valor);
    
    // Resumen por calidad
    if (!calidadResumen[pesa.calidad]) {
      calidadResumen[pesa.calidad] = { kilos: 0, valor: 0 };
    }
    calidadResumen[pesa.calidad].kilos += parseInt(pesa.kilos);
    calidadResumen[pesa.calidad].valor += parseInt(pesa.valor);
  });
  
  let contenidoRecibo = `
=== ${isSubusuario ? 'REGISTRO' : 'RECIBO'} DE RECOGIDA MÚLTIPLE ===
Fecha: ${hoy}
Finca: ${fincaNombre || 'N/A'}
Propietario: ${propietario || 'N/A'}
Total Kilos: ${totalKilos}

=== RESUMEN POR FRUTA ===
`;

  Object.entries(frutaResumen).forEach(([fruta, datos]) => {
    if (isSubusuario) {
      contenidoRecibo += `${fruta}: ${datos.kilos} kg\n`;
    } else {
      contenidoRecibo += `${fruta}: ${datos.kilos} kg - ${datos.valor}\n`;
    }
  });

  contenidoRecibo += '\n=== RESUMEN POR CALIDAD ===\n';
  
  Object.entries(calidadResumen).forEach(([calidad, datos]) => {
    if (isSubusuario) {
      contenidoRecibo += `${calidad}: ${datos.kilos} kg\n`;
    } else {
      contenidoRecibo += `${calidad}: ${datos.kilos} kg - ${datos.valor}\n`;
    }
  });

  contenidoRecibo += '\n=== DETALLE DE PESAS ===\n';

  pesas.forEach((pesa, index) => {
    if (isSubusuario) {
      contenidoRecibo += `${index + 1}. ${pesa.kilos} kg (${pesa.fruta} - ${pesa.calidad})\n`;
    } else {
      contenidoRecibo += `${index + 1}. ${pesa.kilos} kg (${pesa.fruta} - ${pesa.calidad}) - ${pesa.valor}\n`;
    }
  });

  if (!isSubusuario) {
    const valorTotal = pesas.reduce((sum, n) => sum + parseInt(n.valor), 0);
    contenidoRecibo += `\n=== TOTAL ===\nValor Total: ${valorTotal}`;
  }

  return contenidoRecibo;
}

// 🔥 EVENT LISTENERS MODIFICADOS CON VERIFICACIÓN DE EXISTENCIA
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 DOM cargado para recogida múltiple, iniciando configuración...");

  // Configurar interfaz según tipo de usuario
  await configurarInterfazSegunTipoUsuario();
  
  // Configurar botón de guardar - CON VERIFICACIÓN
  const guardarBtn = document.getElementById("guardarRecogida");
  if (guardarBtn) {
    guardarBtn.addEventListener("click", guardarRecogida);
    console.log("✅ Botón guardar configurado");
  } else {
    console.warn("⚠️ Botón 'guardarRecogida' no encontrado en el DOM");
  }
  
  // Configurar botón de volver - CON VERIFICACIÓN
  const btnVolver = document.getElementById("btnVolverDashboard");
  if (btnVolver) {
    btnVolver.addEventListener("click", () => {
      window.history.back();
    });
    console.log("✅ Botón volver configurado");
  } else {
    console.warn("⚠️ Botón 'btnVolverDashboard' no encontrado en el DOM");
  }
  
  // Configurar botón de enviar recibo - CON VERIFICACIÓN
  const enviarReciboBtn = document.getElementById("enviarReciboBtn");
  if (enviarReciboBtn) {
    enviarReciboBtn.addEventListener("click", () => {
      const contenidoRecibo = generarReciboSegunTipoUsuario();
      
      console.log("📄 Recibo múltiple generado:", contenidoRecibo);
      
      navigator.clipboard.writeText(contenidoRecibo).then(() => {
        mostrarAnimacionExito("📋 Recibo múltiple copiado al portapapeles");
      }).catch(() => {
        alert("No se pudo copiar el recibo. Contenido:\n\n" + contenidoRecibo);
      });
    });
    console.log("✅ Botón enviar recibo configurado");
  } else {
    console.warn("⚠️ Botón 'enviarReciboBtn' no encontrado en el DOM");
  }
  
  console.log("✅ Event listeners configurados para múltiples frutas/calidades");

  // Cargar frutas y datos de edición
  try {
    const frutasCargadas = await cargarFrutas();
    console.log("🍎 Frutas cargadas exitosamente:", frutasCargadas.length);

    if (modo === "editar" && idRecogida) {
      console.log("✏️ Modo edición detectado, cargando datos existentes...");
      
      await verificarTipoUsuario();
      await cargarRecogidaExistente(idRecogida);
      
      console.log("✅ Datos de edición múltiple cargados completamente");
    }
  } catch (error) {
    console.error("❌ Error en la carga inicial:", error);
  }
});