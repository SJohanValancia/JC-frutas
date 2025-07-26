// calculadora.js
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
let preciosDisponibles = [];
let editandoIndex = null;

// Variables para control de usuario
let sessionData = {};
let isSubusuario = false;
let tipoUsuarioVerificado = null;
let esAdministradorViendo = false; // 🔥 NUEVA VARIABLE

const urlParams = new URLSearchParams(window.location.search);
const modoEdicion = urlParams.get("modo") === "editar";
const idRecogida = urlParams.get("idRecogida");
const usuario = urlParams.get("usuario");

if (modoEdicion && idRecogida) {
  cargarDatosRecogida(idRecogida);
}

// FUNCIÓN PARA VERIFICAR TIPO DE USUARIO (mejorada)
async function verificarTipoUsuario() {
  console.log("=== VERIFICANDO TIPO DE USUARIO EN CALCULADORA ===");
  
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
        // 🔥 NUEVA LÓGICA: Determinar si es admin viendo
        esAdministradorViendo = sessionData.tipo === 1; // Tipo 1 = Administrador
        console.log("✅ Tipo desde sessionStorage:", tipoUsuarioVerificado, "Es subusuario:", isSubusuario, "Es admin viendo:", esAdministradorViendo);
        return isSubusuario;
      }
    } else {
      console.log("⚠️ No hay datos en sessionStorage");
    }
    
    // 2. Si no hay datos en sessionStorage, verificar desde el servidor
    if (usuario) {
      console.log("🔍 Consultando servidor para usuario:", usuario);
      
      const response = await fetch(`http://localhost:3000/auth/get-alias?usuario=${encodeURIComponent(usuario)}`);
      
      if (!response.ok) {
        console.error("❌ Error en respuesta del servidor:", response.status);
        return false;
      }
      
      const userData = await response.json();
      console.log("📊 Datos recibidos del servidor:", userData);
      
      tipoUsuarioVerificado = userData.tipo;
      isSubusuario = userData.tipo === 2;
      // 🔥 NUEVA LÓGICA: Determinar si es admin viendo
      esAdministradorViendo = userData.tipo === 1; // Tipo 1 = Administrador
      
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

// FUNCIÓN PARA CONFIGURAR INTERFAZ SEGÚN TIPO DE USUARIO (corregida)
async function configurarInterfazCalculadora() {
  console.log("🎨 Configurando interfaz de calculadora según tipo de usuario...");
  
  // Verificar tipo de usuario
  await verificarTipoUsuario();
  
  console.log("🔍 Análisis de visibilidad:");
  console.log("- Es subusuario:", isSubusuario);
  console.log("- Debe ocultar precios:", isSubusuario); // 🔥 SIMPLIFICADO
  
  if (isSubusuario) {
    console.log("🚫 Configurando calculadora para subusuario - ocultando precios");
    
    // Ocultar campo de precio por kilo
    if (precioPorKilo) {
      precioPorKilo.style.display = "none";
      const labelPrecio = document.querySelector('label[for="precioPorKilo"]');
      if (labelPrecio) labelPrecio.style.display = "none";
    }
    
    // Ocultar valor total
    if (valorTotal) {
      const containerValorTotal = valorTotal.parentElement;
      if (containerValorTotal) {
        containerValorTotal.style.display = "none";
      }
    }
    
    // Cambiar texto del botón si existe
    if (enviarReciboBtn) {
      enviarReciboBtn.innerHTML = "📤 Enviar Registro";
    }
    
    console.log("✅ Interfaz de calculadora configurada para subusuario");
  } else {
    console.log("✅ Configurando calculadora para administrador - mostrando todos los elementos");
    
    // ASEGURAR QUE ESTÁN VISIBLES PARA ADMINISTRADORES
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
      enviarReciboBtn.innerHTML = "📤 Enviar Recibo";
    }
  }
}

async function cargarPreciosFrutas() {
  const fincaId = new URLSearchParams(window.location.search).get("fincaId");
  const res = await fetch(`http://localhost:3000/precios/por-finca/${fincaId}`);
  if (!res.ok) throw new Error("No se pudo cargar precios");
  const datos = await res.json();

  let frutasFinales = [];
  for (const doc of datos) {
    if (doc.frutas?.length > frutasFinales.length) {
      frutasFinales = doc.frutas;
    }
  }

  preciosDisponibles = frutasFinales;
  
  // 🔥 NUEVA LÓGICA: Solo actualizar precio si es administrador O no es subusuario
  const debeOcultarPrecios = isSubusuario && !esAdministradorViendo;
  if (!debeOcultarPrecios) {
    actualizarPrecioKiloVisible();
  }
  
  renderPesas();
}

function getPrecioActual() {
  // 🔥 CORRECCIÓN: Solo retornar 0 si ES subusuario
  if (isSubusuario) {
    return 0;
  }
  
  const fruta = frutaSelect.value;
  const calidad = calidadSelect.value;
  const frutaObj = preciosDisponibles.find(f => f.nombre === fruta);
  return frutaObj?.precios?.[calidad] || 0;
}

function actualizarPrecioKiloVisible() {
  // 🔥 CORRECCIÓN: Solo actualizar si NO es subusuario
  if (!isSubusuario && precioPorKilo) {
    const precio = getPrecioActual();
    precioPorKilo.value = precio;
  }
}

function getPesas() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY_PESAS) || "[]");
}

function savePesas(pesas) {
  localStorage.setItem(STORAGE_KEY_PESAS, JSON.stringify(pesas));
}

function renderPesas() {
  const pesas = getPesas();
  listaPesas.innerHTML = "";
  let totalKilos = 0;
  let totalValor = 0;

  pesas.forEach((pesa, index) => {
    const li = document.createElement("li");
    
    if (isSubusuario) {
      // Para subusuarios: solo mostrar kilos, SIN precios
      li.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Pesa ${index + 1}: <strong>${pesa.kilos} kg</strong></span>
          <div style="display: flex; gap: 6px;">
            <button onclick="editarPesa(${index})" style="background: transparent; border: none; cursor: pointer; font-size: 16px; color: #2196f3;">✏️</button>
            <button onclick="eliminarPesa(${index})" style="background: transparent; border: none; cursor: pointer; font-size: 16px; color: #ff4d4d;">🗑️</button>
          </div>
        </div>
      `;
    } else {
      // Para administradores: mostrar kilos y valores
      li.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Pesa ${index + 1}: <strong>${pesa.kilos} kg</strong> — $<strong>${pesa.valor.toLocaleString()}</strong></span>
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
  
  // 🔥 CORRECCIÓN: Solo mostrar valor total si NO es subusuario
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
  inputPeso.value = "";
  localStorage.removeItem(STORAGE_KEY_PESAS);
  editandoIndex = null;
  renderPesas();
}

function sumarPesa() {
  const kilos = parseInt(inputPeso.value);
  if (isNaN(kilos) || kilos <= 0) return;

  const precio = getPrecioActual(); // Será 0 para subusuarios que no sean admins viendo
  const valor = kilos * precio;
  const nueva = { kilos, valor };

  const pesas = getPesas();

  if (editandoIndex !== null) {
    pesas[editandoIndex] = nueva;
    editandoIndex = null;
  } else {
    pesas.push(nueva);
  }

  savePesas(pesas);
  inputPeso.value = "";
  renderPesas();
}

function eliminarPesa(index) {
  const pesas = getPesas();
  pesas.splice(index, 1);
  savePesas(pesas);
  renderPesas();
}

function editarPesa(index) {
  const pesas = getPesas();
  const pesa = pesas[index];
  inputPeso.value = pesa.kilos;
  editandoIndex = index;
}

function actualizarValoresPesas() {
  // 🔥 CORRECCIÓN: Solo actualizar valores si NO es subusuario
  if (isSubusuario) {
    return;
  }
  
  const pesas = getPesas();
  const nuevoPrecio = getPrecioActual();
  const pesasActualizadas = pesas.map(p => ({
    kilos: p.kilos,
    valor: p.kilos * nuevoPrecio
  }));
  savePesas(pesasActualizadas);
  renderPesas();
}

// Event listeners para cambios de fruta y calidad
if (frutaSelect) {
  frutaSelect.addEventListener("change", () => {
    if (!isSubusuario) {
      actualizarPrecioKiloVisible();
      actualizarValoresPesas();
    }
  });
}

if (calidadSelect) {
  calidadSelect.addEventListener("change", () => {
    if (!isSubusuario) {
      actualizarPrecioKiloVisible();
      actualizarValoresPesas();
    }
  });
}

// Event listeners para cambios de fruta y calidad
if (frutaSelect) {
  frutaSelect.addEventListener("change", () => {
    const debeOcultarPrecios = isSubusuario && !esAdministradorViendo;
    if (!debeOcultarPrecios) {
      actualizarPrecioKiloVisible();
      actualizarValoresPesas();
    }
  });
}

if (calidadSelect) {
  calidadSelect.addEventListener("change", () => {
    const debeOcultarPrecios = isSubusuario && !esAdministradorViendo;
    if (!debeOcultarPrecios) {
      actualizarPrecioKiloVisible();
      actualizarValoresPesas();
    }
  });
}

// Generar recibo visual como imagen con html2canvas y copiar o compartir
let isSharingInProgress = false; // Bandera para controlar si ya se está compartiendo

// FUNCIÓN MEJORADA PARA GENERAR RECIBOS SEGÚN TIPO DE USUARIO (corregida)
async function enviarReciboWhatsApp() {
  if (isSharingInProgress) {
    console.log("Compartir ya está en curso, por favor espera.");
    return;
  }

  isSharingInProgress = true;

  const finca = document.getElementById("finca").value;
  const propietario = document.getElementById("propietario").value;
  const fecha = document.getElementById("fecha").value;
  const fruta = frutaSelect.value.toLowerCase();
  const calidad = calidadSelect.value;
  const precio = getPrecioActual(); // Será 0 para subusuarios
  const pesas = getPesas();
  const totalKilos = pesas.reduce((sum, p) => sum + p.kilos, 0);
  const valorTotal = pesas.reduce((sum, p) => sum + p.valor, 0);

  console.log("📄 Generando recibo para tipo de usuario:", tipoUsuarioVerificado);
  console.log("📄 Es subusuario:", isSubusuario);
  console.log("📄 Debe ocultar precios:", isSubusuario);

  const emojiFrutas = {
    limon: "🍋", limón: "🍋",
    aguacate: "🥑",
    platano: "🍌", plátano: "🍌",
    naranja: "🍊",
    manzana: "🍎",
    uva: "🍇",
    mango: "🥭",
    sandia: "🍉",
    melon: "🍈",
    fresa: "🍓",
    piña: "🍍",
    papaya: "🧡",
  };
  const emojiFruta = emojiFrutas[fruta] || "🍎";

  function crearRecibo(pesasParaEnviar, indexPagina, totalPaginas, offset) {
    const div = document.createElement("div");
    div.style.width = "800000px"; 
    div.style.padding = "28px";
    div.style.background = "#1a1d25";
    div.style.color = "#fff";
    div.style.borderRadius = "20px";
    div.style.fontFamily = "Segoe UI, sans-serif";
    div.style.lineHeight = "1.6";
    div.style.fontSize = "15px";
    div.style.boxShadow = "0 0 20px rgba(0,0,0,0.5)";
    div.style.border = "2px solid #2c2f36";
    div.style.textAlign = "left";

    const mitad = 25;
    const columna1 = pesasParaEnviar.slice(0, mitad);
    const columna2 = pesasParaEnviar.slice(mitad, 50);

    const filaHTML = [];
    for (let i = 0; i < mitad; i++) {
      const p1 = columna1[i];
      const p2 = columna2[i];
      const col1 = p1 ? `Pesa ${i + 1 + offset} = <strong>${p1.kilos} kg</strong>` : "";
      const col2 = p2 ? `Pesa ${i + 1 + mitad + offset} = <strong>${p2.kilos} kg</strong>` : "";
      filaHTML.push(`
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <div>${col1}</div>
          <div>${col2}</div>
        </div>
      `);
    }

    // Título diferente según si es subusuario
    const tituloRecibo = isSubusuario ? "📋 Registro de Recogida" : "🧾 Recibo de Recogida";

    // Sección de precio (solo si NO es subusuario)
    const seccionPrecio = isSubusuario ? "" : `
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span><strong>💰 Precio/kg:</strong> $${precio.toLocaleString()}</span>
      </div>
    `;

    // Sección de totales (solo valor total si NO es subusuario)
    const seccionTotales = isSubusuario ? `
      <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
        <span style="color: #34C759;">📊 Total Kilos:</span>
        <span style="color: #34C759;">${totalKilos} kg</span>
      </div>
    ` : `
      <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
        <span style="color: #34C759;">📊 Total Kilos:</span>
        <span style="color: #34C759;">${totalKilos} kg</span>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
        <span style="color: #FFCC00;">💸 Total a Pagar:</span>
        <span style="color: #FFCC00;">$${valorTotal.toLocaleString()}</span>
      </div>
    `;

    div.innerHTML = `
      <div style="text-align: center; margin-bottom: 14px;">
        <h2 style="color: #ffffff; font-size: 1.5rem;">${tituloRecibo}</h2>
        <p><strong>👤 Propietario:</strong> ${propietario}</p>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span><strong>📅 Fecha:</strong> ${fecha}</span>
        <span><strong>🏡 Finca:</strong> ${finca}</span>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span><strong>${emojiFruta} Fruta:</strong> ${fruta}</span>
        <span><strong>⭐ Calidad:</strong> ${calidad}</span>
      </div>

      ${seccionPrecio}

      <p style="margin-bottom: 6px;"><strong>📦 Pesas:</strong></p>
      <div style="width: 100%; margin-bottom: 14px;">
        ${filaHTML.join("")}
      </div>

      <p style="text-align: center; font-size: 14px;">Página ${indexPagina + 1} de ${totalPaginas}</p>

      <hr style="border: 1px solid rgba(255,255,255,0.15); margin: 16px 0;">

      ${seccionTotales}
    `;
    return div;
  }

  const bloquesPesas = [];
  for (let i = 0; i < pesas.length; i += 50) {
    bloquesPesas.push(pesas.slice(i, i + 50));
  }

  const imagenesGeneradas = [];

  // Generar recibos para cada bloque de pesas
  for (const [indexPagina, bloque] of bloquesPesas.entries()) {
    const offset = indexPagina * 50;
    const divRecibo = crearRecibo(bloque, indexPagina, bloquesPesas.length, offset);
    document.body.appendChild(divRecibo);
    await document.fonts.ready;

    const canvas = await html2canvas(divRecibo, {
      backgroundColor: null,
      scale: window.devicePixelRatio * 2,
      useCORS: true,
    });

    document.body.removeChild(divRecibo);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    const file = new File([blob], `${isSubusuario ? 'registro' : 'recibo'}_${indexPagina + 1}.png`, { type: "image/png" });

    imagenesGeneradas.push(file);
  }

  const mensaje = isSubusuario ? 
    `¡Aquí está el registro de recogida!` : 
    `¡Aquí está el recibo de recogida!`;

  try {
    await navigator.share({
      title: isSubusuario ? 'Registro de Recogida' : 'Recibo de Recogida',
      text: mensaje,
      files: imagenesGeneradas,
    });
    isSharingInProgress = false;
  } catch (err) {
    console.error("Error al compartir:", err);
    isSharingInProgress = false;
  }
}

// Asignar evento al botón de compartir
if (enviarReciboBtn) {
  enviarReciboBtn.addEventListener("click", enviarReciboWhatsApp);
}

async function cargarDatosRecogida(id) {
  try {
    const res = await fetch(`http://localhost:3000/recogidas/${id}`);
    if (!res.ok) throw new Error("No se pudo obtener la recogida");
    const recogida = await res.json();

    document.getElementById("finca").value = recogida.finca;
    document.getElementById("propietario").value = recogida.propietario;
    document.getElementById("fecha").value = recogida.fecha;
    frutaSelect.value = recogida.fruta;
    calidadSelect.value = recogida.calidad;
    
    // 🔥 CORRECCIÓN: Solo actualizar precio si NO es subusuario
    if (!isSubusuario) {
      actualizarPrecioKiloVisible();
    }

    // Guardamos las pesas en localStorage
    savePesas(recogida.pesas);
    renderPesas();

  } catch (err) {
    alert("Error al cargar la recogida: " + err.message);
  }
}

// INICIALIZACIÓN
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Calculadora cargada, configurando interfaz...");
  
  // Configurar interfaz según tipo de usuario
  await configurarInterfazCalculadora();
  
  // Cargar precios solo después de verificar tipo de usuario
  await cargarPreciosFrutas();
  
  console.log("✅ Calculadora configurada completamente");
});

// Cargar precios de frutas al inicio (pero después de verificar tipo de usuario)
// cargarPreciosFrutas(); // Comentado porque ahora se llama en DOMContentLoaded