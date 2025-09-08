// subusuarioUtils.js - Utilidades para manejo de subusuarios

/**
 * Verifica si el usuario actual es un subusuario
 * @returns {boolean} true si es subusuario (tipo 2), false si es admin (tipo 1)
 */
function esSubusuario() {
  try {
    const sessionData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    return sessionData.tipo === 2;
  } catch (error) {
    console.error("Error al verificar tipo de usuario:", error);
    return false;
  }
}

/**
 * Obtiene los datos del usuario actual desde sessionStorage
 * @returns {Object} Datos del usuario o objeto vacío si no existen
 */
function obtenerDatosUsuario() {
  try {
    return JSON.parse(sessionStorage.getItem('userData') || '{}');
  } catch (error) {
    console.error("Error al obtener datos de usuario:", error);
    return {};
  }
}

/**
 * Oculta elementos relacionados con dinero para subusuarios
 * @param {Array<string>} elementos - Array de IDs de elementos a ocultar
 */
function ocultarElementosMonetarios(elementos = []) {
  if (!esSubusuario()) return;

  // Elementos por defecto a ocultar para subusuarios
  const elementosDefault = [
    'precioExtra',
    'precioPorKilo',
    'valorTotal',
    'valorTotalContainer'
  ];

  const todosElementos = [...elementosDefault, ...elementos];

  todosElementos.forEach(elementId => {
    const elemento = document.getElementById(elementId);
    if (elemento) {
      elemento.style.display = 'none';
      // También ocultar labels asociados
      const label = document.querySelector(`label[for="${elementId}"]`);
      if (label) {
        label.style.display = 'none';
      }
    }
  });

  console.log("Elementos monetarios ocultados para subusuario:", todosElementos);
}

/**
 * Configura la interfaz según el tipo de usuario
 * @param {Object} configuracion - Configuración personalizada
 */
function configurarInterfazUsuario(configuracion = {}) {
  const isSubuser = esSubusuario();
  
  if (isSubuser) {
    // Ocultar elementos monetarios
    ocultarElementosMonetarios(configuracion.elementosAdicionales || []);
    
    // Cambiar textos específicos para subusuarios
    if (configuracion.cambiarTextos) {
      const cambios = configuracion.cambiarTextos;
      Object.keys(cambios).forEach(elementId => {
        const elemento = document.getElementById(elementId);
        if (elemento) {
          elemento.textContent = cambios[elementId];
        }
      });
    }
    
    // Aplicar estilos específicos para subusuarios
    if (configuracion.estilosSubusuario) {
      const estilos = configuracion.estilosSubusuario;
      Object.keys(estilos).forEach(elementId => {
        const elemento = document.getElementById(elementId);
        if (elemento) {
          Object.assign(elemento.style, estilos[elementId]);
        }
      });
    }
  }

  console.log("Interfaz configurada para:", isSubuser ? "subusuario" : "administrador");
}

/**
 * Filtra datos monetarios de un objeto si el usuario es subusuario
 * @param {Object} datos - Objeto con datos que pueden contener información monetaria
 * @returns {Object} Datos filtrados según el tipo de usuario
 */
function filtrarDatosSegunUsuario(datos) {
  if (!esSubusuario()) {
    return datos; // Admin ve todo
  }

  // Para subusuarios, crear copia sin datos monetarios
  const datosFiltrados = { ...datos };
  
  // Eliminar campos monetarios
  const camposMonetarios = ['precio', 'valorPagar', 'valor', 'total', 'subtotal'];
  camposMonetarios.forEach(campo => {
    delete datosFiltrados[campo];
  });

  // Filtrar arrays de pesas si existen
  if (datosFiltrados.pesas && Array.isArray(datosFiltrados.pesas)) {
    datosFiltrados.pesas = datosFiltrados.pesas.map(pesa => {
      const pesaFiltrada = { ...pesa };
      camposMonetarios.forEach(campo => {
        delete pesaFiltrada[campo];
      });
      return pesaFiltrada;
    });
  }

  return datosFiltrados;
}

/**
 * Genera un recibo de texto adaptado al tipo de usuario
 * @param {Object} datosRecogida - Datos de la recogida
 * @returns {string} Recibo en formato texto
 */
function generarReciboAdaptado(datosRecogida) {
  const isSubuser = esSubusuario();
  const datos = filtrarDatosSegunUsuario(datosRecogida);
  
  let recibo = `📋 ${isSubuser ? 'REGISTRO' : 'RECIBO'} DE RECOGIDA\n`;
  recibo += `═══════════════════════════════\n`;
  recibo += `📅 Fecha: ${datos.fecha || 'N/A'}\n`;
  recibo += `🏡 Finca: ${datos.finca || 'N/A'}\n`;
  recibo += `👤 Propietario: ${datos.propietario || 'N/A'}\n`;
  recibo += `🍎 Fruta: ${datos.fruta || 'N/A'}\n`;
  recibo += `⭐ Calidad: ${datos.calidad || 'N/A'}\n`;
  recibo += `⚖️ Total Kilos: ${datos.totalKilos || 0}\n`;
  
  if (!isSubuser && datos.precio) {
    recibo += `💰 Precio/Kg: $${datos.precio}\n`;
  }
  
  recibo += `\n📊 DETALLE DE PESAS:\n`;
  recibo += `─────────────────────────────\n`;
  
  if (datos.pesas && Array.isArray(datos.pesas)) {
    datos.pesas.forEach((pesa, index) => {
      if (isSubuser) {
        recibo += `${index + 1}. ${pesa.kilos} kg\n`;
      } else {
        recibo += `${index + 1}. ${pesa.kilos} kg - $${pesa.valor || 0}\n`;
      }
    });
  }

  if (!isSubuser && datos.valorPagar) {
    recibo += `\n💰 VALOR TOTAL: $${datos.valorPagar}\n`;
  }

  recibo += `\n✅ ${isSubuser ? 'Registro' : 'Recibo'} generado automáticamente`;
  recibo += `\n📱 Sistema de Gestión Agrícola`;

  return recibo;
}

/**
 * Muestra una notificación temporal en pantalla
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - Tipo de notificación ('success', 'error', 'info')
 * @param {number} duracion - Duración en milisegundos
 */
function mostrarNotificacion(mensaje, tipo = 'success', duracion = 3000) {
  const colores = {
    success: '#4CAF50',
    error: '#f44336',
    info: '#2196F3',
    warning: '#ff9800'
  };

  const notificacion = document.createElement('div');
  notificacion.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colores[tipo] || colores.success};
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-size: 14px;
    max-width: 300px;
    word-wrap: break-word;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
  `;
  
  notificacion.textContent = mensaje;
  document.body.appendChild(notificacion);

  // Animar entrada
  setTimeout(() => {
    notificacion.style.opacity = '1';
    notificacion.style.transform = 'translateX(0)';
  }, 10);

  // Animar salida y remover
  setTimeout(() => {
    notificacion.style.opacity = '0';
    notificacion.style.transform = 'translateX(100%)';
    setTimeout(() => notificacion.remove(), 300);
  }, duracion);
}

/**
 * Valida que los datos requeridos estén presentes según el tipo de usuario
 * @param {Object} datos - Datos a validar
 * @returns {Object} Resultado de la validación {esValido: boolean, errores: Array}
 */
function validarDatosRecogida(datos) {
  const errores = [];
  const isSubuser = esSubusuario();

  // Validaciones comunes
  if (!datos.fruta) errores.push("Selecciona una fruta");
  if (!datos.calidad) errores.push("Selecciona una calidad");
  if (!datos.totalKilos || datos.totalKilos <= 0) errores.push("Debe haber al menos 1 kilo");
  if (!datos.pesas || datos.pesas.length === 0) errores.push("Agrega al menos una pesa");

  // Validaciones solo para administradores
  if (!isSubuser) {
    if (!datos.precio || datos.precio <= 0) errores.push("Ingresa un precio válido");
  }

  return {
    esValido: errores.length === 0,
    errores
  };
}

// Exportar funciones para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = {
    esSubusuario,
    obtenerDatosUsuario,
    ocultarElementosMonetarios,
    configurarInterfazUsuario,
    filtrarDatosSegunUsuario,
    generarReciboAdaptado,
    mostrarNotificacion,
    validarDatosRecogida
  };
} else if (typeof window !== 'undefined') {
  // Browser
  window.SubusuarioUtils = {
    esSubusuario,
    obtenerDatosUsuario,
    ocultarElementosMonetarios,
    configurarInterfazUsuario,
    filtrarDatosSegunUsuario,
    generarReciboAdaptado,
    mostrarNotificación,
    validarDatosRecogida
  };
}