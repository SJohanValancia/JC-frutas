// Obtener parámetros de la URL
const params = new URLSearchParams(window.location.search);
const fincaId = params.get("fincaId");
const fincaNombre = params.get("finca");
const propietario = params.get("propietario");
const usuario = params.get("usuario");
const usuarioAlias = params.get("usuarioAlias");
const modo = params.get("modo");  // "editar"
const idRecogida = params.get("idRecogida");

if (modo !== "editar") {
  localStorage.removeItem("pesas_recogida");
}

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

// Set defaults
const hoy = new Date().toISOString().split("T")[0];
fechaInput.value = hoy;
fechaInput.max = hoy;
fincaInput.value = fincaNombre;
propietarioInput.value = propietario;

// FUNCIÓN MEJORADA PARA VERIFICAR TIPO DE USUARIO
async function verificarTipoUsuario() {
  console.log("=== VERIFICANDO TIPO DE USUARIO ===");
  
  try {
    // 1. Primero intentar desde sessionStorage
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
    
    // 2. Si no hay datos en sessionStorage, verificar desde el servidor
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
      
      // Guardar en sessionStorage para futuras consultas
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

// OBTENER EL ALIAS DEL USUARIO MEJORADO
async function obtenerAliasUsuario() {
  try {
    console.log("🔍 Obteniendo alias del usuario...");
    
    // 1. Desde sessionData ya cargado
    if (sessionData && sessionData.alias) {
      console.log("✅ Alias desde sessionData:", sessionData.alias);
      return sessionData.alias;
    }
    
    // 2. Desde parámetros URL
    if (usuarioAlias) {
      console.log("✅ Alias desde URL params:", usuarioAlias);
      return usuarioAlias;
    }

    // 3. Consultar servidor
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

async function guardarRecogida() {
  const fruta = frutaSelect.value;
  const calidad = calidadSelect.value;
  const precioExtra = parseFloat(precioExtraInput.value || 0);
  const precioBase = parseFloat(precioPorKiloInput.value || 0);
  const pesas = getPesas();
  const totalKilos = pesas.reduce((sum, n) => sum + parseInt(n.kilos), 0);

  if (!fruta || !calidad || totalKilos === 0) {
    alert("Completa todos los campos correctamente");
    return;
  }

  // VERIFICAR TIPO DE USUARIO ANTES DE GUARDAR
  await verificarTipoUsuario();
  
  console.log("=== DATOS PARA GUARDAR RECOGIDA ===");
  console.log("- Tipo usuario verificado:", tipoUsuarioVerificado);
  console.log("- Es subusuario:", isSubusuario);

  // Obtener alias del usuario
  const currentUserAlias = await obtenerAliasUsuario();
  if (!currentUserAlias) {
    alert("Error: No se pudo obtener el alias del usuario");
    return;
  }

  console.log("📝 Preparando datos de recogida:");
  console.log("- Usuario:", usuario);
  console.log("- Alias:", currentUserAlias);
  console.log("- Tipo:", tipoUsuarioVerificado);
  console.log("- Es subusuario:", isSubusuario);

  // 🔥 NUEVA LÓGICA: CALCULAR PRECIOS SIEMPRE, PERO SOLO MOSTRAR A ADMINS
  let precioFinal = 0;
  let valorPagarFinal = 0;

  if (isSubusuario) {
    // Para subusuarios: obtener precio desde la base de datos de precios
    console.log("🔍 Subusuario detectado - obteniendo precios desde BD...");
    
    try {
      const fincaId = new URLSearchParams(window.location.search).get("fincaId");
      const res = await fetch(`https://jc-frutas.onrender.com/precios/por-finca/${fincaId}`);
      if (res.ok) {
        const precios = await res.json();
        
        // Buscar el precio más reciente para esta fruta y calidad
        let frutasFinales = [];
        for (const doc of precios) {
          if (doc.frutas?.length > frutasFinales.length) {
            frutasFinales = doc.frutas;
          }
        }
        
        const frutaObj = frutasFinales.find(f => f.nombre === fruta);
        precioFinal = frutaObj?.precios?.[calidad] || 0;
        
        console.log("💰 Precio obtenido de BD para subusuario:", precioFinal);
      }
    } catch (error) {
      console.error("❌ Error al obtener precios para subusuario:", error);
      alert("Error al obtener precios. Contacta al administrador.");
      return;
    }
  } else {
    // Para administradores: usar el precio que ven en pantalla
    precioFinal = calidad === "extra" ? precioExtra : precioBase;
    console.log("💰 Precio obtenido de interfaz para admin:", precioFinal);
  }

  // Calcular valor total con el precio correcto
  valorPagarFinal = pesas.reduce((sum, n) => sum + (parseInt(n.kilos) * precioFinal), 0);

  // Actualizar las pesas con los valores correctos
  const pesasConValores = pesas.map(pesa => ({
    kilos: parseInt(pesa.kilos),
    valor: parseInt(pesa.kilos) * precioFinal
  }));

  console.log("📊 Cálculos finales:", {
    precioFinal,
    valorPagarFinal,
    pesasConValores: pesasConValores.length
  });

  const data = {
    fincaId,
    finca: fincaNombre,
    propietario,
    fecha: hoy,
    usuario: usuario,
    alias: currentUserAlias,
    fruta,
    calidad,
    precio: precioFinal, // 🔥 SIEMPRE enviar precio
    totalKilos,
    valorPagar: valorPagarFinal, // 🔥 SIEMPRE enviar valorPagar
    pesas: pesasConValores // 🔥 SIEMPRE enviar pesas con valores
  };

  console.log("📤 Datos finales a enviar:", data);

  try {
    const metodo = modo === "editar" ? "PUT" : "POST";
    const url = modo === "editar" ? `https://jc-frutas.onrender.com/recogidas/${idRecogida}` : "https://jc-frutas.onrender.com/recogidas/nueva";

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
    console.log("✅ Respuesta del servidor:", result);

    mostrarAnimacionExito("✔ Recogida guardada correctamente");
    localStorage.removeItem("pesas_recogida");
    setTimeout(() => window.location.reload(), 1500);
  } catch (err) {
    console.error("❌ Error al guardar recogida:", err);
    alert("Error al guardar recogida: " + err.message);
  }
}


// FUNCIÓN PARA OCULTAR ELEMENTOS RELACIONADOS CON DINERO PARA SUBUSUARIOS
async function configurarInterfazSegunTipoUsuario() {
  console.log("🎨 Configurando interfaz según tipo de usuario...");
  
  // Primero verificar el tipo de usuario
  await verificarTipoUsuario();
  
  console.log("🎨 Configurando para tipo:", tipoUsuarioVerificado, "Es subusuario:", isSubusuario);
  
  // 🔥 CORRECCIÓN: Solo ocultar si ES subusuario (sin importar quién esté viendo)
  if (isSubusuario) {
    console.log("🚫 Configurando interfaz para subusuario - ocultando elementos de dinero");
    
    // Ocultar campos de precio
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
    
    // Ocultar valor total en la calculadora
    const valorTotalElement = document.getElementById("valorTotal");
    if (valorTotalElement) {
      valorTotalElement.parentElement.style.display = "none";
    }
    
    // Modificar el texto del botón de enviar recibo
    const enviarReciboBtn = document.getElementById("enviarReciboBtn");
    if (enviarReciboBtn) {
      enviarReciboBtn.innerHTML = "📤 Enviar Registro";
    }
    
    console.log("✅ Interfaz configurada para subusuario");
  } else {
    console.log("✅ Configurando interfaz para administrador - mostrando todos los elementos");
    
    // ASEGURAR QUE LOS ELEMENTOS DE PRECIO ESTÉN VISIBLES PARA ADMINISTRADORES
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
    
    // Mostrar valor total en la calculadora para administradores
    const valorTotalElement = document.getElementById("valorTotal");
    if (valorTotalElement && valorTotalElement.parentElement) {
      valorTotalElement.parentElement.style.display = "block";
    }
  }
}

// Cargar frutas
async function cargarFrutas() {
  try {
    const res = await fetch(`https://jc-frutas.onrender.com/precios/por-finca/${fincaId}`);
    if (!res.ok) throw new Error("No se pudo cargar precios");
    const precios = await res.json();

    let frutasFinales = [];
    for (const doc of precios) {
      if (doc.frutas?.length > frutasFinales.length) {
        frutasFinales = doc.frutas;
      }
    }

    frutaSelect.innerHTML = '<option value="">Selecciona una fruta</option>';
    frutasFinales.forEach(fruta => {
      const opt = document.createElement("option");
      opt.value = fruta.nombre;
      opt.textContent = fruta.nombre;
      frutaSelect.appendChild(opt);
    });

    return frutasFinales;
  } catch (err) {
    alert("Error al cargar frutas: " + err.message);
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

async function cargarRecogidaExistente(id) {
  try {
    console.log("📥 Cargando recogida existente:", id);
    
    const res = await fetch(`https://jc-frutas.onrender.com/recogidas/${id}`);
    if (!res.ok) throw new Error("No se pudo obtener la recogida");
    const recogida = await res.json();

    console.log("📊 Datos de recogida cargados:", recogida);

    // Autocompletar campos básicos
    frutaSelect.value = recogida.fruta;
    calidadSelect.value = recogida.calidad;

    // 🔥 CORRECCIÓN: MOSTRAR PRECIOS SIEMPRE PARA ADMINISTRADORES
    // (independientemente de quién registró la recogida)
    if (!isSubusuario) {
      console.log("💰 Administrador detectado - mostrando precios de recogida");
      
      // Mostrar precio según la calidad
      if (recogida.calidad === "extra") {
        precioExtraInput.classList.remove("hidden");
        precioExtraInput.value = recogida.precio || 0;
        precioPorKiloInput.value = 0; // Limpiar el otro campo
      } else {
        precioExtraInput.classList.add("hidden");
        precioPorKiloInput.value = recogida.precio || 0;
      }
      
      console.log("✅ Precios configurados:", {
        calidad: recogida.calidad,
        precio: recogida.precio,
        precioExtra: precioExtraInput.value,
        precioPorKilo: precioPorKiloInput.value
      });
    } else {
      console.log("🚫 Subusuario detectado - ocultando precios");
    }

    // Cargar pesas al localStorage
    if (recogida.pesas && recogida.pesas.length > 0) {
      localStorage.setItem("pesas_recogida", JSON.stringify(recogida.pesas));
      console.log("📦 Pesas cargadas:", recogida.pesas.length);
    }
    
  } catch (err) {
    console.error("❌ Error al cargar recogida:", err);
    alert("Error al cargar la recogida: " + err.message);
  }
}

// FUNCIÓN PARA GENERAR RECIBO SIN DATOS DE DINERO PARA SUBUSUARIOS
function generarReciboSegunTipoUsuario() {
  const pesas = getPesas();
  const totalKilos = pesas.reduce((sum, n) => sum + parseInt(n.kilos), 0);
  const fruta = frutaSelect.value;
  const calidad = calidadSelect.value;
  
  let contenidoRecibo = `
=== ${isSubusuario ? 'REGISTRO' : 'RECIBO'} DE RECOGIDA ===
Fecha: ${hoy}
Finca: ${fincaNombre}
Propietario: ${propietario}
Fruta: ${fruta}
Calidad: ${calidad}
Total Kilos: ${totalKilos}

=== DETALLE DE PESAS ===
`;

  pesas.forEach((pesa, index) => {
    if (isSubusuario) {
      // Para subusuarios: solo mostrar kilos, SIN valores monetarios
      contenidoRecibo += `${index + 1}. ${pesa.kilos} kg\n`;
    } else {
      // Para administradores: mostrar datos completos
      contenidoRecibo += `${index + 1}. ${pesa.kilos} kg - $${pesa.valor}\n`;
    }
  });

  if (!isSubusuario) {
    // Solo agregar total monetario para administradores
    const valorTotal = pesas.reduce((sum, n) => sum + parseInt(n.valor), 0);
    contenidoRecibo += `\n=== TOTAL ===\nValor Total: $${valorTotal}`;
  }

  return contenidoRecibo;
}

// Event listeners
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 DOM cargado, iniciando configuración...");
  
  // Configurar interfaz según tipo de usuario
  await configurarInterfazSegunTipoUsuario();
  
  // Configurar botón de guardar
  document.getElementById("guardarRecogida").addEventListener("click", guardarRecogida);
  
  // Configurar botón de volver
  document.getElementById("btnVolverDashboard").addEventListener("click", () => {
    window.history.back();
  });
  
  // Configurar botón de enviar recibo
  const enviarReciboBtn = document.getElementById("enviarReciboBtn");
  if (enviarReciboBtn) {
    enviarReciboBtn.addEventListener("click", () => {
      const contenidoRecibo = generarReciboSegunTipoUsuario();
      
      console.log("📄 Recibo generado:", contenidoRecibo);
      
      // Copiar al portapapeles
      navigator.clipboard.writeText(contenidoRecibo).then(() => {
        mostrarAnimacionExito("📋 Recibo copiado al portapapeles");
      }).catch(() => {
        alert("No se pudo copiar el recibo. Contenido:\n\n" + contenidoRecibo);
      });
    });
  }
  
  console.log("✅ Event listeners configurados");
});

// Cargar frutas y luego cargar datos si hay modo edición
cargarFrutas().then(async () => {
  console.log("🍎 Frutas cargadas exitosamente");
  
  if (modo === "editar" && idRecogida) {
    console.log("✏️ Modo edición detectado, cargando datos existentes...");
    
    // Asegurarse de que el tipo de usuario esté verificado antes de cargar datos
    await verificarTipoUsuario();
    await cargarRecogidaExistente(idRecogida);
    
    console.log("✅ Datos de edición cargados completamente");
  }
});