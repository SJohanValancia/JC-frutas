// recogida.js - CORRECCIÓN PARA HACER EL CAMPO FECHA EDITABLE
const params = new URLSearchParams(window.location.search);
const fincaId = params.get("fincaId");
const fincaNombre = params.get("finca");
const propietario = params.get("propietario");
const usuario = params.get("usuario");
const usuarioAlias = params.get("usuarioAlias");
const modo = params.get("modo");
const idRecogida = params.get("idRecogida");


// recogida.js (fragmento)
import './dbb.js';

async function loadFruitsForFinca(fincaId) {
  console.log("🍎 Cargando frutas para finca:", fincaId);
  
  if (!fincaId) {
    console.error("❌ No hay fincaId");
    return;
  }

  try {
    if (navigator.onLine) {
      console.log("🌐 Online: obteniendo frutas del servidor...");
      const res = await fetch(`https://jc-frutas.onrender.com/precios/por-finca/${fincaId}`);
      if (!res.ok) throw new Error('No data from server');
      
      const data = await res.json();
      let frutas = [];
      
      // Buscar el documento con más frutas
      for (const doc of data) {
        if (doc.frutas?.length > frutas.length) {
          frutas = doc.frutas;
        }
      }
      
      if (frutas.length > 0) {
        // Guardar en IndexedDB
        await window.IDB_HELPER.saveFruits(fincaId, frutas);
        console.log(`✅ ${frutas.length} frutas guardadas en IndexedDB`);
        populateFruitsSelect(frutas);
        return;
      }
    }
    
    // Fallback a IndexedDB
    console.log("📴 Offline: usando frutas de IndexedDB");
    const cached = await window.IDB_HELPER.getFruitsByFinca(fincaId);
    if (cached && cached.length > 0) {
      populateFruitsSelect(cached);
      console.log(`✅ ${cached.length} frutas cargadas desde IndexedDB`);
    } else {
      console.warn("⚠️ No hay frutas disponibles ni online ni offline");
      populateFruitsSelect([]);
    }
    
  } catch (err) {
    console.error("❌ Error al cargar frutas:", err);
    // Intentar con IndexedDB como último recurso
    try {
      const cached = await window.IDB_HELPER.getFruitsByFinca(fincaId);
      populateFruitsSelect(cached || []);
    } catch (idbErr) {
      console.error("❌ Error incluso con IndexedDB:", idbErr);
      populateFruitsSelect([]);
    }
  }
}

function populateFruitsSelect(frutas) {
  const sel = frutaSelect || document.getElementById('frutaSelect');
  if (!sel) return;
  sel.innerHTML = frutas.map(f => `<option value="${f.id || f.key || f.nombre}">${f.nombre}</option>`).join('');
}

// Envío de recogida
async function submitRecogida(recogidaData) {
  // recogidaData: { fincaId, frutaId, cantidad, precio, fecha, userId, ... }
  if (navigator.onLine) {
    try {
      const res = await fetch('/api/recogidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recogidaData)
      });
      if (!res.ok) throw new Error('Server rejected');
      const saved = await res.json();
      mostrarExito('Recogida registrada en el servidor');
      // opcional: actualizar precios/frutas locales si server devuelve info
      return saved;
    } catch (err) {
      console.warn('Fallo al enviar recogida, guardando en pending_local', err);
      await window.IDB_HELPER.addPendingRecogida(recogidaData);
      mostrarExito('Sin internet: Recogida guardada localmente y se sincronizará cuando haya conexión.');
      return { offline: true };
    }
  } else {
    await window.IDB_HELPER.addPendingRecogida(recogidaData);
    mostrarExito('Sin internet: Recogida guardada localmente y se sincronizará cuando haya conexión.');
    return { offline: true };
  }
}

function mostrarExito(msg) {
  // tu UI: toast o aviso
  alert(msg);
}

// Llamar loadFruitsForFinca al abrir la página de recogida
loadFruitsForFinca(fincaId);

// Sincronizar pendientes cuando vuelva la conexión
window.addEventListener('online', async () => {
  console.log('online: intentando sincronizar recogidas pendientes');
  await syncPendingRecogidas();
});

async function syncPendingRecogidas() {
  console.log("🔄 Iniciando sincronización de recogidas pendientes...");

  const pendings = await window.IDB_HELPER.getAllPendingRecogidas();
  if (pendings.length === 0) {
    console.log("✅ No hay recogidas pendientes para sincronizar");
    return;
  }

  console.log(`📦 Se encontraron ${pendings.length} recogidas pendientes`);

  let sincronizadas = 0;
  let errores = 0;

  for (const p of pendings) {
    try {
      const res = await fetch('https://jc-frutas.onrender.com/recogidas/nueva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p.recogida)
      });

      if (res.ok) {
        await window.IDB_HELPER.deletePendingRecogida(p.key);
        console.log('✅ Recogida sincronizada:', p.key);
        sincronizadas++;
      } else {
        console.warn('⚠️ Servidor rechazó recogida pendiente', p.key, await res.text());
        errores++;
      }
    } catch (err) {
      console.error('❌ Error al sincronizar recogida', p.key, err);
      errores++;
    }
  }

  // 🔥 Mostrar feedback al usuario
  if (sincronizadas > 0) {
    mostrarNotificacionElegante(`✅ ${sincronizadas} recogidas sincronizadas con éxito`, "success");
  }

  if (errores > 0) {
    mostrarNotificacionElegante(`⚠️ ${errores} recogidas fallaron al sincronizar`, "warning");
  }

  console.log(`📊 Sincronización finalizada: ${sincronizadas} ok, ${errores} errores`);
}

// 🔥 FUNCIÓN PARA MOSTRAR RECOGIDAS PENDIENTES CON FECHA CORREGIDA
window.verificarRecogidasPendientes = async () => {
  const pendings = await window.IDB_HELPER.getAllPendingRecogidas();
  if (pendings.length === 0) {
    alert("✅ No hay recogidas pendientes");
    return;
  }

  // Crear una interfaz más elegante para mostrar las recogidas pendientes
  const modal = document.createElement("div");
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 20000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  const contenido = document.createElement("div");
  contenido.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 30px;
    border-radius: 15px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  `;

  let html = `
    <h2 style="margin-bottom: 20px; text-align: center;">📦 Recogidas Pendientes (${pendings.length})</h2>
    <div style="margin-bottom: 20px; text-align: center;">
      <button onclick="sincronizarTodasPendientes()" style="
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        color: white;
        border: none;
        border-radius: 25px;
        padding: 12px 25px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        margin-right: 10px;
      ">
        🔄 Sincronizar Todas
      </button>
      <button onclick="cerrarModalPendientes()" style="
        background: linear-gradient(135deg, #fc466b 0%, #3f5efb 100%);
        color: white;
        border: none;
        border-radius: 25px;
        padding: 12px 25px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
      ">
        ❌ Cerrar
      </button>
    </div>
    <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 20px;">
  `;

  pendings.forEach((p, i) => {
    const r = p.recogida;
    
    // 🔥 CORRECCIÓN: Usar la fecha correcta de la recogida
    let fechaFormateada = 'Fecha no disponible';
    let horaFormateada = 'Hora no disponible';
    
    if (r.fecha) {
      try {
        // Crear fecha ajustada a la zona horaria de Colombia (UTC-5)
        const fechaUTC = new Date(r.fecha + 'T00:00:00Z'); // Agregar hora UTC para evitar desfase
        const offsetColombia = -5 * 60 * 60 * 1000; // UTC-5 en milisegundos
        const fechaColombia = new Date(fechaUTC.getTime() + offsetColombia);
        
        fechaFormateada = fechaColombia.toLocaleDateString('es-CO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        
        // Si hay createdAt, usar esa hora, sino usar la hora actual
        if (p.createdAt) {
          const horaColombia = new Date(new Date(p.createdAt).getTime() + offsetColombia);
          horaFormateada = horaColombia.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      } catch (error) {
        console.error('Error al formatear fecha:', error);
        fechaFormateada = r.fecha; // Usar fecha sin formato si hay error
      }
    }
    
    html += `
      <div style="margin-bottom: 15px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 10px; border: 1px solid rgba(255,255,255,0.2);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 250px;">
            <strong style="color: #4CAF50;">#${i + 1}</strong> - <br>
            <span style="font-size: 14px; opacity: 0.9;">${r.finca} - ${r.propietario}</span><br>
            <span style="font-size: 14px;">📊 ${r.totalKilos}kg </span><br>
            <span style="font-size: 12px; opacity: 0.8;">🍎 ${Object.keys(r.resumenFrutas || {}).join(', ')}</span>
          </div>
          <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button onclick="sincronizarRecogidaIndividual('${p.key}')" style="
              background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
              color: white;
              border: none;
              border-radius: 20px;
              padding: 8px 16px;
              font-size: 14px;
              font-weight: bold;
              cursor: pointer;
              transition: all 0.3s ease;
            " onmouseover="this.style.transform='scale(1.05)'" 
               onmouseout="this.style.transform='scale(1)'">
              🔄 Sincronizar
            </button>
            <button onclick="eliminarRecogidaPendiente('${p.key}')" style="
              background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
              color: white;
              border: none;
              border-radius: 20px;
              padding: 8px 16px;
              font-size: 14px;
              font-weight: bold;
              cursor: pointer;
              transition: all 0.3s ease;
            " onmouseover="this.style.transform='scale(1.05)'" 
               onmouseout="this.style.transform='scale(1)'">
              🗑️ Eliminar
            </button>
          </div>
        </div>
      </div>
    `;
  });

  html += `
    </div>
    <div style="margin-top: 20px; text-align: center; font-size: 12px; opacity: 0.7;">
      💡 Las recogidas se sincronizarán automáticamente cuando haya conexión
    </div>
  `;

  contenido.innerHTML = html;
  modal.appendChild(contenido);
  document.body.appendChild(modal);

  // Funciones globales para el modal
  window.cerrarModalPendientes = function() {
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
    delete window.cerrarModalPendientes;
    delete window.sincronizarRecogidaIndividual;
    delete window.eliminarRecogidaPendiente;
    delete window.sincronizarTodasPendientes;
  };
};

// 🔥 FUNCIÓN PARA SINCRONIZAR UNA RECOGIDA INDIVIDUAL
window.sincronizarRecogidaIndividual = async function(keyRecogida) {
  try {
    console.log(`🔄 Intentando sincronizar recogida individual: ${keyRecogida}`);
    
    // Obtener la recogida pendiente específica
    const pendings = await window.IDB_HELPER.getAllPendingRecogidas();
    const recogidaPendiente = pendings.find(p => p.key === keyRecogida);
    
    if (!recogidaPendiente) {
      mostrarNotificacionElegante("❌ Recogida no encontrada", "error");
      return;
    }

    // Verificar conexión
    if (!navigator.onLine) {
      mostrarNotificacionElegante("❌ Sin conexión a Internet", "error");
      return;
    }

    // Intentar enviar al servidor
    const response = await fetch('https://jc-frutas.onrender.com/recogidas/nueva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recogidaPendiente.recogida)
    });

    if (response.ok) {
      // Eliminar de pendientes
      await window.IDB_HELPER.deletePendingRecogida(keyRecogida);
      
      // Mostrar éxito y actualizar la lista
      mostrarNotificacionElegante("✅ Recogida sincronizada con éxito", "success");
      
      // Recargar la lista de pendientes
      setTimeout(() => {
        window.cerrarModalPendientes();
        window.verificarRecogidasPendientes();
      }, 1500);
      
    } else {
      const errorData = await response.json().catch(() => ({}));
      mostrarNotificacionElegante(`⚠️ Error del servidor: ${errorData.error || 'Error desconocido'}`, "warning");
    }
    
  } catch (error) {
    console.error("❌ Error al sincronizar recogida individual:", error);
    mostrarNotificacionElegante("❌ Error al sincronizar", "error");
  }
};

// 🔥 FUNCIÓN PARA ELIMINAR UNA RECOGIDA PENDIENTE
window.eliminarRecogidaPendiente = async function(keyRecogida) {
  try {
    const confirmacion = confirm("¿Está seguro de que desea eliminar esta recogida pendiente? Esta acción no se puede deshacer.");
    
    if (!confirmacion) {
      return;
    }

    await window.IDB_HELPER.deletePendingRecogida(keyRecogida);
    mostrarNotificacionElegante("🗑️ Recogida eliminada", "success");
    
    // Recargar la lista
    setTimeout(() => {
      window.cerrarModalPendientes();
      window.verificarRecogidasPendientes();
    }, 1000);
    
  } catch (error) {
    console.error("❌ Error al eliminar recogida pendiente:", error);
    mostrarNotificacionElegante("❌ Error al eliminar", "error");
  }
};

// 🔥 FUNCIÓN PARA SINCRONIZAR TODAS LAS RECOGIDAS PENDIENTES
window.sincronizarTodasPendientes = async function() {
  try {
    const pendings = await window.IDB_HELPER.getAllPendingRecogidas();
    
    if (pendings.length === 0) {
      mostrarNotificacionElegante("No hay recogidas para sincronizar", "info");
      return;
    }

    if (!navigator.onLine) {
      mostrarNotificacionElegante("❌ Sin conexión a Internet", "error");
      return;
    }

    let sincronizadas = 0;
    let errores = 0;

    // Crear overlay de progreso
    const progressOverlay = document.createElement("div");
    progressOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 30000;
      display: flex;
      justify-content: center;
      align-items: center;
    `;

    const progressContent = document.createElement("div");
    progressContent.style.cssText = `
      background: white;
      color: #333;
      padding: 30px;
      border-radius: 15px;
      text-align: center;
      min-width: 300px;
    `;

    progressContent.innerHTML = `
      <h3>🔄 Sincronizando recogidas...</h3>
      <div style="margin: 20px 0;">
        <div style="width: 100%; background: #f0f0f0; border-radius: 10px; height: 20px; overflow: hidden;">
          <div id="progressBar" style="width: 0%; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); height: 100%; transition: width 0.3s ease;"></div>
        </div>
        <p id="progressText" style="margin-top: 10px; font-size: 14px;">Preparando...</p>
      </div>
    `;

    progressOverlay.appendChild(progressContent);
    document.body.appendChild(progressOverlay);

    for (let i = 0; i < pendings.length; i++) {
      const p = pendings[i];
      
      // Actualizar progreso
      const progress = ((i + 1) / pendings.length) * 100;
      document.getElementById('progressBar').style.width = progress + '%';
      document.getElementById('progressText').textContent = `Sincronizando ${i + 1} de ${pendings.length}...`;

      try {
        const response = await fetch('https://jc-frutas.onrender.com/recogidas/nueva', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p.recogida)
        });

        if (response.ok) {
          await window.IDB_HELPER.deletePendingRecogida(p.key);
          sincronizadas++;
          console.log(`✅ Recogida sincronizada: ${p.key}`);
        } else {
          errores++;
          console.warn(`⚠️ Error al sincronizar: ${p.key}`);
        }
      } catch (error) {
        errores++;
        console.error(`❌ Error al sincronizar ${p.key}:`, error);
      }
    }

    // Remover overlay
    if (progressOverlay.parentNode) {
      progressOverlay.parentNode.removeChild(progressOverlay);
    }

    // Mostrar resultado
    let mensaje = `📊 Sincronización completada:\n`;
    mensaje += `✅ ${sincronizadas} recogidas sincronizadas\n`;
    if (errores > 0) {
      mensaje += `⚠️ ${errores} recogidas fallidas`;
    }

    mostrarNotificacionElegante(mensaje, errores > 0 ? "warning" : "success");

    // Recargar lista
    setTimeout(() => {
      window.cerrarModalPendientes();
      if (sincronizadas > 0) {
        window.verificarRecogidasPendientes();
      }
    }, 2000);

  } catch (error) {
    console.error("❌ Error al sincronizar todas:", error);
    mostrarNotificacionElegante("❌ Error al sincronizar todas las recogidas", "error");
  }
};

// 🔥 FUNCIÓN PARA MOSTRAR NOTIFICACIONES ELEGANTES
function mostrarNotificacionElegante(mensaje, tipo = "success") {
  // Remover notificaciones anteriores
  const notificacionesAnteriores = document.querySelectorAll('.notificacion-elegante');
  notificacionesAnteriores.forEach(n => n.remove());

  const colores = {
    success: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    error: "linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)",
    warning: "linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)",
    info: "linear-gradient(135deg, #56ccf2 0%, #2f80ed 100%)"
  };

  const notificacion = document.createElement("div");
  notificacion.className = "notificacion-elegante";
  notificacion.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colores[tipo] || colores.success};
    color: white;
    padding: 15px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: bold;
    z-index: 25000;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    transform: translateX(400px);
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    max-width: 350px;
    line-height: 1.4;
  `;

  notificacion.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 20px;">
        ${tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : tipo === 'warning' ? '⚠️' : 'ℹ️'}
      </span>
      <div>${mensaje.replace(/\n/g, '<br>')}</div>
    </div>
  `;

  document.body.appendChild(notificacion);

  // Animación de entrada
  setTimeout(() => {
    notificacion.style.transform = "translateX(0)";
  }, 100);

  // Animación de salida
  setTimeout(() => {
    notificacion.style.transform = "translateX(400px)";
    setTimeout(() => {
      if (notificacion.parentNode) {
        notificacion.parentNode.removeChild(notificacion);
      }
    }, 300);
  }, 3000);
}

// 🔥 SISTEMA DE INDICADOR DE CONEXIÓN
class IndicadorConexion {
  constructor() {
    this.indicador = null;
    this.bolita = null;
    this.mensaje = null;
    this.mostrarPermanente = false;
    this.init();
  }

  init() {
    this.crearElementos();
    this.verificarConexion();
    this.configurarEventListeners();
  }

  crearElementos() {
    // Crear elementos si no existen
    if (!document.getElementById('indicadorConexion')) {
      const indicador = document.createElement('div');
      indicador.id = 'indicadorConexion';
      indicador.className = 'indicador-conexion';
      
      const bolita = document.createElement('div');
      bolita.id = 'bolitaConexion';
      bolita.className = 'bolita-conexion';
      
      const mensaje = document.createElement('div');
      mensaje.id = 'mensajeConexion';
      mensaje.className = 'mensaje-conexion';
      
      indicador.appendChild(bolita);
      indicador.appendChild(mensaje);
      
      document.body.appendChild(indicador);
    }

    this.indicador = document.getElementById('indicadorConexion');
    this.bolita = document.getElementById('bolitaConexion');
    this.mensaje = document.getElementById('mensajeConexion');
  }

  configurarEventListeners() {
    // Escuchar cambios de conexión
    window.addEventListener('online', () => {
      console.log("🌐 Conexión restablecida");
      this.actualizarEstado(true);
      this.mostrarNotificacionReconexion();
    });

    window.addEventListener('offline', () => {
      console.log("❌ Conexión perdida");
      this.actualizarEstado(false);
    });

    // Verificar periódicamente la conexión
    setInterval(() => {
      this.verificarConexion();
    }, 10000); // Cada 10 segundos
  }

  verificarConexion() {
    const estaOnline = navigator.onLine;
    this.actualizarEstado(estaOnline);
  }

  actualizarEstado(online) {
    if (!this.bolita || !this.mensaje) return;

    if (online) {
      this.bolita.className = 'bolita-conexion conectado';
      this.mensaje.textContent = 'Conectado';
      this.indicador.style.display = 'flex';
      
      // Ocultar después de 3 segundos si está conectado
      setTimeout(() => {
        if (navigator.onLine && !this.mostrarPermanente) {
          this.indicador.style.opacity = '0';
          setTimeout(() => {
            this.indicador.style.display = 'none';
          }, 300);
        }
      }, 3000);
      
    } else {
      this.bolita.className = 'bolita-conexion desconectado';
      this.mensaje.textContent = 'Sin conexión, no olvide sincronizar sus recogidas cuando tenga internet de nuevo';
      this.indicador.style.display = 'flex';
      this.indicador.style.opacity = '1';
      this.mostrarPermanente = true;
    }
  }

  mostrarNotificacionReconexion() {
    // Mostrar notificación temporal cuando se reconecta
    const notificacion = document.createElement('div');
    notificacion.style.cssText = `
      position: fixed;
      top: 80px;
      left: 20px;
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      color: white;
      padding: 12px 18px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      z-index: 10001;
      opacity: 0;
      transform: translateY(-10px);
      transition: all 0.3s ease;
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;
    
    notificacion.innerHTML = '✅ Conexión restablecida';
    document.body.appendChild(notificacion);

    setTimeout(() => {
      notificacion.style.opacity = '1';
      notificacion.style.transform = 'translateY(0)';
    }, 100);

    setTimeout(() => {
      notificacion.style.opacity = '0';
      notificacion.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        if (notificacion.parentNode) {
          notificacion.parentNode.removeChild(notificacion);
        }
      }, 300);
    }, 2000);
  }

  // Método para forzar la visibilidad del indicador
  mostrar() {
    if (this.indicador) {
      this.indicador.style.display = 'flex';
      this.indicador.style.opacity = '1';
    }
  }

  // Método para ocultar el indicador
  ocultar() {
    if (this.indicador) {
      this.indicador.style.opacity = '0';
      setTimeout(() => {
        this.indicador.style.display = 'none';
      }, 300);
    }
  }
}

// 🔥 INICIALIZAR EL INDICADOR CUANDO SE CARGUE LA PÁGINA
document.addEventListener('DOMContentLoaded', function() {
  // Delay para asegurar que el DOM esté completamente cargado
  setTimeout(() => {
    window.indicadorConexion = new IndicadorConexion();
    console.log("✅ Indicador de conexión inicializado");
  }, 100);
});

// 🔥 FUNCIÓN AUXILIAR PARA VERIFICAR CONEXIÓN ANTES DE ACCIONES
function verificarConexionAntesDeAccion(accion) {
  if (!navigator.onLine) {
    mostrarNotificacionElegante("❌ Sin conexión. Esta acción se guardará localmente y se sincronizará cuando tenga internet.", "warning");
    return false;
  }
  return true;
}

window.forzarSincronizacion = async () => {
  if (navigator.onLine) {
    await syncPendingRecogidas();
  } else {
    alert("❌ No hay conexión a Internet");
  }
};

// 🔥 FUNCIÓN PARA CONFIGURAR LA INFORMACIÓN DE LA FINCA Y PROPIETARIO
function configurarInformacionFinca() {
  console.log("🏠 Configurando información de la finca...");
  console.log("📋 Datos recibidos:", {
    fincaId,
    fincaNombre,
    propietario,
    usuario
  });

  // Configurar nombre de la finca
  if (fincaInput && fincaNombre) {
    fincaInput.value = decodeURIComponent(fincaNombre);
    fincaInput.readOnly = true;
    console.log("✅ Nombre de finca configurado:", decodeURIComponent(fincaNombre));
  }

  // 🔥 CONFIGURAR NOMBRE DEL PROPIETARIO (ESTA ES LA CORRECCIÓN PRINCIPAL)
  if (propietarioInput && propietario) {
    const nombrePropietario = decodeURIComponent(propietario);
    propietarioInput.value = nombrePropietario;
    propietarioInput.readOnly = true;
    console.log("✅ Nombre de propietario configurado:", nombrePropietario);
  } else {
    console.warn("⚠️ No se pudo configurar el propietario:", {
      propietarioInputExists: !!propietarioInput,
      propietarioValue: propietario
    });
  }

  // Configurar fecha si no está en modo edición
  if (!modo || modo !== "editar") {
    configurarCampoFecha();
  }
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


function verificarElementosDOM() {
  console.log("🔍 Verificando elementos del DOM...");
  
  const elementos = {
    fechaInput: document.getElementById("fecha"),
    fincaInput: document.getElementById("finca"),
    propietarioInput: document.getElementById("propietario"),
    frutaSelect: document.getElementById("frutaSelect"),
    calidadSelect: document.getElementById("calidadSelect"),
    precioExtraInput: document.getElementById("precioExtra"),
    precioPorKiloInput: document.getElementById("precioPorKilo")
  };

  // Actualizar referencias globales
  Object.assign(window, elementos);

  // Verificar cuáles elementos existen
  Object.entries(elementos).forEach(([nombre, elemento]) => {
    if (elemento) {
      console.log(`✅ ${nombre} encontrado`);
    } else {
      console.warn(`⚠️ ${nombre} NO encontrado`);
    }
  });

  return elementos;
}

// 🔥 FUNCIÓN PARA MOSTRAR UN RESUMEN EN CONSOLA DE LA CONFIGURACIÓN
function mostrarResumenConfiguracion() {
  console.log("=== RESUMEN DE CONFIGURACIÓN ===");
  console.log("🏠 Finca:", fincaNombre ? decodeURIComponent(fincaNombre) : "No especificada");
  console.log("👤 Propietario:", propietario ? decodeURIComponent(propietario) : "No especificado");
  console.log("🆔 ID Finca:", fincaId || "No especificado");
  console.log("👨‍💼 Usuario:", usuario || "No especificado");
  console.log("🏷️ Modo:", modo || "nuevo");

  // Verificar si los campos del DOM tienen los valores correctos
  const fincaInput = document.getElementById("finca");
  const propietarioInput = document.getElementById("propietario");
  
  if (fincaInput) {
    console.log("🏠 Campo finca en DOM:", fincaInput.value);
  }
  
  if (propietarioInput) {
    console.log("👤 Campo propietario en DOM:", propietarioInput.value);
  }
}

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
// 🔥 FUNCIÓN CORREGIDA: Siempre usar subusuario como fallback cuando no hay conexión
async function verificarTipoUsuario() {
  console.log("=== VERIFICANDO TIPO DE USUARIO ===");
  
  try {
    

    // 🌐 SI HAY CONEXIÓN: Intentar obtener datos normales
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
        // 🔥 Fallback a subusuario si el servidor falla
        isSubusuario = true;
        tipoUsuarioVerificado = 2;
        return isSubusuario;
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
      // 🔥 Fallback a subusuario si no hay usuario
      isSubusuario = true;
      tipoUsuarioVerificado = 2;
      return isSubusuario;
    }
    
    return isSubusuario;
    
  } catch (error) {
    console.error("❌ Error al verificar tipo de usuario:", error);
    console.log("🔒 Usando MODO SUBUSUARIO por seguridad");
    
    // 🔥 SIEMPRE usar subusuario como fallback en caso de error
    isSubusuario = true;
    tipoUsuarioVerificado = 2;
    
    return isSubusuario;
  }
}



// 🔥 EJECUTAR INMEDIATAMENTE al cargar la página
document.addEventListener('DOMContentLoaded', function() {
  // Primero aplicar estilo de subusuario por defecto
  
  // Luego intentar verificar el tipo real
  setTimeout(async () => {
    await verificarTipoUsuario();
  }, 100);
});

function getPrecioPorFrutaYCalidad(fruta, calidad) {
  console.log(`💰 Buscando precio para: ${fruta} (${calidad})`);
  console.log("📊 Frutas disponibles:", preciosDisponibles);
  
  const frutaObj = preciosDisponibles.find(f => {
    const nombreNormalizado = (f.nombre || f.name || f.key || '').toLowerCase().trim();
    const frutaBuscada = (fruta || '').toLowerCase().trim();
    return nombreNormalizado === frutaBuscada;
  });
  
  const precio = frutaObj?.precios?.[calidad] || 0;
  console.log(`💰 Precio encontrado: $${precio} para ${fruta} (${calidad})`);
  return precio;
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
try {
  const response = await fetch(`https://jc-frutas.onrender.com/auth/get-alias?usuario=${encodeURIComponent(usuario)}`);
  if (!response.ok) throw new Error("Servidor no respondió");
  const data = await response.json();
  return data.alias;
} catch (err) {
  console.warn("⚠️ Fallo al obtener alias desde servidor, usando fallback offline");
  // Fallback: usar el alias que ya viene en la URL o en sessionStorage
  return usuarioAlias || sessionData?.alias || usuario;
}
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
  
  // 🚨 NUEVA VALIDACIÓN: Verificar si hay datos en el input antes de guardar
  const valorInput = inputPeso ? inputPeso.value.trim() : "";
  if (valorInput && valorInput !== "") {
    // Mostrar alerta personalizada
    mostrarAlertaPersonalizada(
      "⚠️ Aún hay un dato que no se ha registrado",
      "Por favor dele al botón + en la calculadora para agregar el peso antes de guardar la recogida.",
      "warning"
    );
    
    // Resaltar el input para llamar la atención
    resaltarInput();
    return; // No continuar con el guardado
  }

  const pesas = getPesas();
  const totalKilos = pesas.reduce((sum, n) => sum + parseInt(n.kilos), 0);

  if (totalKilos === 0) {
    mostrarAlertaPersonalizada(
      "📦 No hay pesas para guardar",
      "Debe agregar al menos una pesa para guardar la recogida.",
      "info"
    );
    return;
  }

  // 🚨 NUEVA CONFIRMACIÓN: Preguntar si está seguro de guardar
  const confirmacion = await mostrarConfirmacionGuardado(pesas.length, totalKilos);
  if (!confirmacion) {
    console.log("❌ Usuario canceló el guardado");
    return;
  }

  // 🔥 VALIDACIÓN CRÍTICA: Verificar que cada pesa tenga su fruta y calidad
  const pesasSinInfo = pesas.filter(pesa => !pesa.fruta || !pesa.calidad);
  if (pesasSinInfo.length > 0) {
    console.error("❌ Pesas sin información completa:", pesasSinInfo);
    mostrarAlertaPersonalizada(
      "❌ Información incompleta",
      "Hay pesas sin información de fruta o calidad. Por favor revisa los datos.",
      "error"
    );
    return;
  }

  // 🔥 VALIDAR FECHA ANTES DE GUARDAR
  if (fechaInput) {
    const fechaSeleccionada = fechaInput.value;
    const fechaHoy = new Date().toISOString().split("T")[0];
    
    if (fechaSeleccionada > fechaHoy) {
      mostrarAlertaPersonalizada(
        "⚠️ Fecha inválida",
        "No se puede guardar con una fecha futura. Por favor seleccione una fecha válida.",
        "warning"
      );
      fechaInput.focus();
      return;
    }
    
    if (!fechaSeleccionada) {
      mostrarAlertaPersonalizada(
        "⚠️ Fecha requerida",
        "Por favor seleccione una fecha para la recogida.",
        "warning"
      );
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
    mostrarAlertaPersonalizada(
      "❌ Error de usuario",
      "No se pudo obtener el alias del usuario.",
      "error"
    );
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
  const url = modo === "editar" 
    ? `https://jc-frutas.onrender.com/recogidas/${idRecogida}` 
    : "https://jc-frutas.onrender.com/recogidas/nueva";

  // Intentamos enviar al servidor si hay conexión
  if (navigator.onLine) {
    const response = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(()=>({}));
      throw new Error(`Error del servidor: ${response.status} - ${errorData.error || 'Error desconocido'}`);
    }

    const result = await response.json();
    console.log("✅ Recogida guardada en servidor:", result);
    // aquí va el código de limpieza/feedback que ya tenías...
    const limpiezaExitosa = limpiarPesasCompleto();
    if (limpiezaExitosa) mostrarAnimacionExito("✔ Recogida guardada");
    setTimeout(() => { window.location.reload(); }, 1200);
    return result;
  } else {
    // Si no hay conexión: usar el submitRecogida que ya existe y guarda en pending_recogidas
    await submitRecogida(data);
    limpiarPesasCompleto();
    mostrarAnimacionExito("✔ Recogida guardada localmente (sin conexión). Se sincronizará al volver online.");
    return { offline: true };
  }
} catch (err) {
  // Si ocurre cualquier error al enviar (ej. servidor caído), guardar en pending local
  console.error("❌ Error al guardar recogida (se guardará localmente):", err);
  try {
    await window.IDB_HELPER.addPendingRecogida(data);
    limpiarPesasCompleto();
    mostrarAnimacionExito("✔ Recogida guardada localmente por error de red/servidor. Se sincronizará luego.");
    return { offline: true };
  } catch (err2) {
    console.error("❌ No se pudo guardar localmente:", err2);
    mostrarAlertaPersonalizada("❌ Error al guardar", "No se pudo guardar la recogida en servidor ni localmente: " + err2.message, "error");
    throw err2;
  }
}

}

// 🔥 NUEVA FUNCIÓN PARA MOSTRAR CONFIRMACIÓN DE GUARDADO
function mostrarConfirmacionGuardado(cantidadPesas, totalKilos) {
  return new Promise((resolve) => {
    const confirmacion = document.createElement("div");
    
    confirmacion.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.8);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 35px;
      border-radius: 20px;
      font-family: Arial, sans-serif;
      text-align: center;
      z-index: 15000;
      max-width: 450px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      backdrop-filter: blur(15px);
      border: 2px solid #667eea;
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `;
    
    confirmacion.innerHTML = `
      <div style="font-size: 32px; margin-bottom: 15px;">
        💾
      </div>
      <div style="font-size: 24px; margin-bottom: 15px; font-weight: bold;">
        ¿Está seguro de que ya quiere guardar la recogida?
      </div>
      <div style="font-size: 16px; line-height: 1.4; margin-bottom: 25px; opacity: 0.95; background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px;">
        📊 <strong>${cantidadPesas}</strong> pesas registradas<br>
        ⚖️ <strong>${totalKilos}</strong> kilos en total
      </div>
      <div style="display: flex; gap: 15px; justify-content: center;">
        <button onclick="confirmarGuardado(true)" style="
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          color: white;
          border: none;
          border-radius: 25px;
          padding: 12px 25px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 120px;
        " onmouseover="this.style.transform='scale(1.05)'" 
           onmouseout="this.style.transform='scale(1)'">
          ✅ Sí, Guardar
        </button>
        <button onclick="confirmarGuardado(false)" style="
          background: linear-gradient(135deg, #fc466b 0%, #3f5efb 100%);
          color: white;
          border: none;
          border-radius: 25px;
          padding: 12px 25px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 120px;
        " onmouseover="this.style.transform='scale(1.05)'" 
           onmouseout="this.style.transform='scale(1)'">
          ❌ Cancelar
        </button>
      </div>
    `;
    
    // Crear overlay de fondo
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      z-index: 14999;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(confirmacion);
    
    // Animación de entrada
    setTimeout(() => {
      overlay.style.opacity = "1";
      confirmacion.style.opacity = "1";
      confirmacion.style.transform = "translate(-50%, -50%) scale(1)";
    }, 50);
    
    // Función global para manejar la confirmación
    window.confirmarGuardado = function(decision) {
      confirmacion.style.transform = "translate(-50%, -50%) scale(0.8)";
      confirmacion.style.opacity = "0";
      overlay.style.opacity = "0";
      
      setTimeout(() => {
        if (confirmacion.parentNode) confirmacion.parentNode.removeChild(confirmacion);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        delete window.confirmarGuardado; // Limpiar función global
        resolve(decision);
      }, 400);
    };
  });
}

// Resto de funciones (sin cambios críticos, solo mejoras menores)
function configurarBotonGuardar() {
  const guardarBtn = document.getElementById("guardarRecogida");
  if (guardarBtn) {
    guardarBtn.removeEventListener("click", guardarRecogida);
    guardarBtn.addEventListener("click", async () => {
      console.log("🚀 Iniciando guardado con validaciones y confirmación");
      await guardarRecogida();
    });
    console.log("✅ Botón guardar configurado correctamente con validaciones");
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
        
        // 🔥 OCULTAR CAMPOS INMEDIATAMENTE
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

async function cargarFrutas() {
  console.log("🍎 Iniciando carga de frutas para finca:", fincaId);

  if (!fincaId) {
    console.error("❌ No hay fincaId disponible");
    alert("Error: No se pudo identificar la finca");
    return []; // ← Asegurar retorno de array vacío
  }

  // Función para normalizar frutas
  const normalizeFrutas = (frutasRaw) => {
    return (frutasRaw || []).map(f => ({
      id: f.id ?? f._id ?? f.key ?? f.nombre,
      nombre: f.nombre ?? f.name ?? f.nombreFruta ?? f.key,
      precios: f.precios || {},
      ...f
    }));
  };

  try {
    // Intentar traer precios/frutas desde el servidor
    const res = await fetch(`https://jc-frutas.onrender.com/precios/por-finca/${fincaId}`);
    if (!res.ok) throw new Error(`Error ${res.status}: No se pudo cargar precios`);
    const precios = await res.json();

    // Extraer la lista de frutas
    let frutasFinales = [];
    for (const doc of precios) {
      if (doc.frutas && doc.frutas.length > frutasFinales.length) {
        frutasFinales = doc.frutas;
      }
    }

    // Normalizar y guardar en IndexedDB
    const frutasNormalizadas = normalizeFrutas(frutasFinales);
    
    if (window.IDB_HELPER && frutasNormalizadas.length > 0) {
      await window.IDB_HELPER.saveFruits(fincaId, frutasNormalizadas);
      console.log("✅ Frutas guardadas en IndexedDB para offline");
    }

    preciosDisponibles = frutasNormalizadas;
    renderFrutas(frutasNormalizadas);
    
    console.log(`✅ ${frutasNormalizadas.length} frutas cargadas desde servidor`);
    return frutasNormalizadas;

  } catch (err) {
    console.warn("❌ Error al cargar frutas desde servidor, intentando fallback a IndexedDB:", err);

    // Fallback a IndexedDB
    try {
      const cached = await window.IDB_HELPER.getFruitsByFinca(fincaId);
      const frutasCached = normalizeFrutas(cached);
      
      preciosDisponibles = frutasCached;
      renderFrutas(frutasCached);
      
      console.log("✅ Frutas cargadas desde IndexedDB (offline):", frutasCached.length);
      return frutasCached;
      
    } catch (err2) {
      console.error("❌ No hay frutas en IndexedDB:", err2);
      
      // Si no hay datos en IndexedDB, inicializar con array vacío
      const frutasVacias = [];
      preciosDisponibles = frutasVacias;
      renderFrutas(frutasVacias);
      
      console.log("⚠️ Usando array vacío de frutas");
      return frutasVacias;
    }
  }
}

// Función para renderizar frutas en el select
function renderFrutas(frutas) {
  if (!frutaSelect) return;
  
  frutaSelect.innerHTML = '<option value="">Selecciona una fruta</option>';
  
  frutas.forEach(fruta => {
    const opt = document.createElement("option");
    opt.value = fruta.nombre || fruta.name || fruta.key;
    opt.textContent = fruta.nombre || fruta.name || fruta.key;
    frutaSelect.appendChild(opt);
  });
  
  console.log(`✅ ${frutas.length} frutas renderizadas en select`);
}


function getPesas() {
  try {
    const pesasString = localStorage.getItem(STORAGE_KEY_PESAS);
    return pesasString ? JSON.parse(pesasString) : [];
  } catch (error) {
    console.error("Error al recuperar pesas:", error);
    return [];
  }
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

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 DOM cargado - Iniciando configuración completa...");

  try {
    // 1. Verificar elementos del DOM
    verificarElementosDOM();

    // 2. 🔥 CONFIGURAR INFORMACIÓN DE FINCA Y PROPIETARIO (NUEVA FUNCIÓN)
    configurarInformacionFinca();

    // 3. Configurar campo fecha
    configurarCampoFecha();

    // 4. Configurar interfaz según tipo de usuario
    await configurarInterfazSegunTipoUsuario();
    
    // 5. Configurar botón de guardar
    configurarBotonGuardar();
    
    // 6. Configurar otros botones
    const btnVolver = document.getElementById("btnVolverDashboard");
    if (btnVolver) {
      btnVolver.addEventListener("click", () => {
        window.history.back();
      });
      console.log("✅ Botón volver configurado");
    }
    
    const enviarReciboBtn = document.getElementById("enviarReciboBtn");
    if (enviarReciboBtn) {
      enviarReciboBtn.addEventListener("click", () => {
        const contenidoRecibo = generarReciboSegunTipoUsuario();
        console.log("📄 Recibo generado:", contenidoRecibo);
        
        navigator.clipboard.writeText(contenidoRecibo).then(() => {
          mostrarAnimacionExito("📋 Recibo copiado");
        }).catch(() => {
          alert("No se pudo copiar el recibo. Contenido:\n\n" + contenidoRecibo);
        });
      });
      console.log("✅ Botón enviar recibo configurado");
    }

    // 7. Cargar frutas y datos
    console.log("🍎 Cargando frutas...");
    const frutasCargadas = await cargarFrutas();
    console.log("✅ Frutas cargadas:", frutasCargadas.length);

    // 8. Si estamos en modo edición, cargar datos existentes
    if (modo === "editar" && idRecogida) {
      console.log("✏️ Modo edición - cargando datos existentes...");
      await verificarTipoUsuario();
      await cargarRecogidaExistente(idRecogida);
      console.log("✅ Datos de edición cargados");
    }

    // 9. 🔥 MOSTRAR RESUMEN FINAL
    mostrarResumenConfiguracion();

    console.log("🎉 Configuración completa terminada");

  } catch (error) {
    console.error("❌ Error en la configuración inicial:", error);
    alert("Error al inicializar la página: " + error.message);
  }
});

// 🔥 SISTEMA DE LIMPIEZA DE LOCALSTORAGE PARA MODO EDITAR
// Agregar este código al final de recogida.js

// Variables de control para la limpieza
let limpiezaConfigurada = false;
let yaLimpiado = false;

// 🔥 FUNCIÓN PRINCIPAL PARA LIMPIAR DATOS DE EDICIÓN
function limpiarDatosEdicion() {
  if (yaLimpiado) {
    console.log("🔄 Ya se limpiaron los datos previamente");
    return;
  }

  console.log("🧹 Iniciando limpieza de datos de edición...");
  
  const clavesEdicion = [
    "pesas_recogida",
    "pesas_backup", 
    "pesas_backup_timestamp",
    "recogidaEditando",
    "datosRecogidaOriginal",
    "pesasEditando",
    "datosEdicion",
    "recogidaTemp",
    "editMode",
    "recogidaId"
  ];
  
  let clavesLimpiadas = 0;
  
  // Limpiar claves específicas
  clavesEdicion.forEach(clave => {
    if (localStorage.getItem(clave)) {
      localStorage.removeItem(clave);
      console.log(`✅ Clave limpiada: ${clave}`);
      clavesLimpiadas++;
    }
  });
  
  // Limpiar claves con patrones (backup con timestamp, autoguardado, etc.)
  const todasLasClaves = Object.keys(localStorage);
  const patronesALimpiar = [
    'pesas_backup_',
    'pesas_autosave_',
    'recogida_temp_',
    'edit_session_'
  ];
  
  patronesALimpiar.forEach(patron => {
    const clavesConPatron = todasLasClaves.filter(key => key.startsWith(patron));
    clavesConPatron.forEach(clave => {
      localStorage.removeItem(clave);
      console.log(`🧹 Clave con patrón limpiada: ${clave}`);
      clavesLimpiadas++;
    });
  });
  
  yaLimpiado = true;
  console.log(`✅ Limpieza completada - ${clavesLimpiadas} claves eliminadas`);
  
  return clavesLimpiadas;
}

// 🔥 FUNCIÓN PARA DETECTAR SI ESTAMOS EN MODO EDITAR
function esModoEditar() {
  const params = new URLSearchParams(window.location.search);
  const modo = params.get('modo');
  const idRecogida = params.get('idRecogida');
  
  return modo === 'editar' && idRecogida;
}

// 🔥 FUNCIÓN PARA CONFIGURAR LA LIMPIEZA AL SALIR
function configurarLimpiezaAlSalir() {
  if (limpiezaConfigurada) {
    console.log("🔄 Limpieza ya configurada");
    return;
  }
  
  console.log("⚙️ Configurando limpieza automática al salir del modo editar...");
  
  // 1. Al cerrar/recargar la página
  window.addEventListener('beforeunload', function(e) {
    if (esModoEditar()) {
      console.log("🚪 Saliendo de modo editar - limpiando datos");
      limpiarDatosEdicion();
    }
  });
  
  // 2. Al navegar hacia atrás/adelante
  window.addEventListener('popstate', function(e) {
    // Pequeño delay para verificar la nueva URL
    setTimeout(() => {
      if (!esModoEditar()) {
        console.log("🔙 Navegación detectada - verificando limpieza");
        limpiarDatosEdicion();
      }
    }, 100);
  });
  
  // 3. Interceptar cambios de URL programáticos
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function() {
    if (esModoEditar()) {
      console.log("🔄 Cambio de URL detectado - limpiando antes de navegar");
      limpiarDatosEdicion();
    }
    return originalPushState.apply(history, arguments);
  };
  
  history.replaceState = function() {
    if (esModoEditar()) {
      console.log("🔄 Reemplazo de URL detectado - limpiando");
      limpiarDatosEdicion();
    }
    return originalReplaceState.apply(history, arguments);
  };
  
  // 4. Al hacer clic en enlaces externos o botones de navegación
  document.addEventListener('click', function(e) {
    const elemento = e.target.closest('a, button');
    if (elemento && esModoEditar()) {
      // Verificar si es un enlace externo o botón de navegación
      const esEnlaceExterno = elemento.tagName === 'A' && elemento.href && !elemento.href.includes('#');
      const esBotonNavegacion = elemento.onclick && elemento.onclick.toString().includes('history') ||
                               elemento.getAttribute('onclick') && elemento.getAttribute('onclick').includes('history');
      
      if (esEnlaceExterno || esBotonNavegacion) {
        console.log("🔗 Navegación externa detectada - limpiando datos");
        limpiarDatosEdicion();
      }
    }
  });
  
  limpiezaConfigurada = true;
  console.log("✅ Sistema de limpieza configurado correctamente");
}

// 🔥 FUNCIÓN PARA LIMPIAR DESPUÉS DE GUARDAR EXITOSAMENTE
function limpiarDespuesDeGuardarEdicion() {
  if (esModoEditar()) {
    console.log("💾 Guardado exitoso en modo editar - limpiando datos");
    setTimeout(() => {
      limpiarDatosEdicion();
    }, 500); // Pequeño delay para asegurar que el guardado se completó
  }
}

// 🔥 FUNCIÓN PARA LIMPIAR AL CANCELAR EDICIÓN
function limpiarAlCancelarEdicion() {
  if (esModoEditar()) {
    console.log("❌ Edición cancelada - limpiando datos");
    limpiarDatosEdicion();
  }
}

// 🔥 MODIFICAR LA FUNCIÓN EXISTENTE limpiarPesasCompleto PARA INCLUIR MODO EDITAR
function limpiarPesasCompletoConEdicion() {
  console.log("🧹 Ejecutando limpieza completa incluyendo datos de edición...");
  
  // Ejecutar la limpieza original
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
    
    // Limpiar backups con timestamp
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
    
    // 🔥 AGREGAR LIMPIEZA DE DATOS DE EDICIÓN
    if (esModoEditar()) {
      limpiarDatosEdicion();
    }
    
    console.log("✅ LocalStorage limpiado completamente (incluyendo edición)");
    return true;
  } catch (error) {
    console.error("❌ Error al limpiar localStorage:", error);
    return false;
  }
}

// 🔥 FUNCIÓN PARA INICIALIZAR EL SISTEMA DE LIMPIEZA
function inicializarSistemaLimpieza() {
  console.log("🚀 Inicializando sistema de limpieza para modo editar...");
  
  if (esModoEditar()) {
    console.log("✅ Modo editar detectado - configurando limpieza automática");
    configurarLimpiezaAlSalir();
    
    // Configurar limpieza en botones específicos
    configurarBotonesParaLimpieza();
  } else {
    console.log("ℹ️ No estamos en modo editar");
    // Verificar si hay datos residuales de ediciones anteriores
    verificarYLimpiarDatosResiduales();
  }
}

// 🔥 FUNCIÓN PARA CONFIGURAR BOTONES ESPECÍFICOS
function configurarBotonesParaLimpieza() {
  // Configurar botón "Volver"
  const btnVolver = document.getElementById("btnVolverDashboard");
  if (btnVolver) {
    const originalClickHandler = btnVolver.onclick;
    
    btnVolver.addEventListener('click', function(e) {
      console.log("🔙 Botón volver presionado - limpiando datos de edición");
      limpiarDatosEdicion();
      
      // Ejecutar handler original si existe
      if (originalClickHandler) {
        originalClickHandler.call(this, e);
      }
    });
    
    console.log("✅ Botón volver configurado para limpieza");
  }
  
  // Configurar otros botones de navegación
  const botonesNavegacion = document.querySelectorAll('[onclick*="history"], [onclick*="window.location"]');
  botonesNavegacion.forEach(boton => {
    boton.addEventListener('click', function() {
      console.log("🔄 Botón de navegación presionado - limpiando datos");
      limpiarDatosEdicion();
    });
  });
}

// 🔥 FUNCIÓN PARA VERIFICAR Y LIMPIAR DATOS RESIDUALES
// 🔥 FUNCIÓN CORREGIDA PARA VERIFICAR Y LIMPIAR DATOS RESIDUALES
function verificarYLimpiarDatosResiduales() {
  const clavesEdicion = [
    // "pesas_recogida",  // ← COMENTADO: NO eliminar las pesas normales
    "recogidaEditando", 
    "datosRecogidaOriginal",
    "pesasEditando",
    "datosEdicion",
    "recogidaTemp",
    "editMode",
    "recogidaId"
  ];
  
  const hayDatosResiduales = clavesEdicion.some(clave => localStorage.getItem(clave));
  
  if (hayDatosResiduales) {
    console.log("🧹 Detectados datos residuales de edición anterior - limpiando...");
    // Solo limpiar datos específicos de edición, NO las pesas normales
    clavesEdicion.forEach(clave => {
      if (localStorage.getItem(clave)) {
        localStorage.removeItem(clave);
        console.log(`🧹 Clave limpiada: ${clave}`);
      }
    });
  } else {
    console.log("✅ No hay datos residuales de edición");
  }
}

// 🔥 FUNCIÓN PARA INTEGRAR CON LA FUNCIÓN DE GUARDADO EXISTENTE
function integrarConGuardadoExistente() {
  // Encontrar la función guardarRecogida original y modificarla
  const originalGuardarRecogida = window.guardarRecogida;
  
  if (originalGuardarRecogida) {
    window.guardarRecogida = async function() {
      try {
        // Ejecutar guardado original
        const resultado = await originalGuardarRecogida.call(this);
        
        // Si el guardado fue exitoso y estamos en modo editar, limpiar
        if (esModoEditar()) {
          console.log("💾 Guardado exitoso en edición - programando limpieza");
          setTimeout(() => {
            limpiarDespuesDeGuardarEdicion();
          }, 1000);
        }
        
        return resultado;
      } catch (error) {
        console.error("❌ Error en guardado:", error);
        throw error;
      }
    };
    
    console.log("✅ Función de guardado integrada con sistema de limpieza");
  }
}

// 🔥 EJECUTAR CUANDO EL DOM ESTÉ LISTO
document.addEventListener('DOMContentLoaded', function() {
  // Delay pequeño para asegurar que todo está cargado
  setTimeout(() => {
    inicializarSistemaLimpieza();
    integrarConGuardadoExistente();
  }, 500);
});

// 🔥 TAMBIÉN EJECUTAR AL CARGAR LA PÁGINA COMPLETAMENTE
window.addEventListener('load', function() {
  // Verificación adicional después de que todo esté cargado
  setTimeout(() => {
    if (!limpiezaConfigurada && esModoEditar()) {
      console.log("🔄 Configuración tardía del sistema de limpieza");
      inicializarSistemaLimpieza();
    }
  }, 1000);
});


// 🔥 EXPORTAR FUNCIONES PARA USO MANUAL SI ES NECESARIO
window.limpiarDatosEdicion = limpiarDatosEdicion;
window.limpiarAlSalirEdicion = limpiarAlCancelarEdicion;


// Ejecutar cuando se cargue la página
window.addEventListener('load', () => {
    setTimeout(verificarConstantementeSubusuario, 2000);
});