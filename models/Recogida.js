const mongoose = require("mongoose");

const recogidaSchema = new mongoose.Schema({
  fincaId: { type: String, required: true },
  finca: { type: String, required: true },
  propietario: { type: String, required: true },
  fecha: { type: String, required: true },
  usuario: { type: String, required: true }, // Username del usuario
  alias: { type: String, required: true }, // Alias del usuario que hizo la recogida
  fruta: { type: String, required: true }, // Fruta principal (la más frecuente)
  calidad: { type: String, required: true }, // Calidad principal (la más frecuente)
  precio: { type: Number, default: 0 }, // Precio de referencia principal
  totalKilos: { type: Number, required: true },
  valorPagar: { type: Number, default: 0 },
  estadoLiquidacion: {
  type: String,
  enum: ['pendiente', 'liquidada', 'cancelada'],
  default: undefined // Sin estado por defecto (recogidas normales no tienen estado)
},
fechaMarcadoLiquidacion: {
  type: Date,
  default: undefined
},
usuarioMarcaLiquidacion: {
  type: String,
  default: undefined
},
fechaLiquidacion: {
  type: Date,
  default: undefined
},
usuarioLiquida: {
  type: String,
  default: undefined
},
  pesas: [
    {
      kilos: { type: Number, required: true },
      valor: { type: Number, default: 0 },
      precio: { type: Number, default: 0 },
      fruta: { type: String, required: true }, // 🔥 FRUTA ESPECÍFICA DE CADA PESA
      calidad: { type: String, required: true }, // 🔥 CALIDAD ESPECÍFICA DE CADA PESA
    }
  ],
  adminAlias: { type: String },
  tipoUsuario: { type: Number, default: 1 },
  
  // 🔥 NUEVOS CAMPOS PARA RECOGIDAS MÚLTIPLES
  esRecogidaMultiple: { type: Boolean, default: false },
  resumenFrutas: { type: Map, of: Number }, // { "manzana": 10, "aguacate": 15 }
  resumenCalidades: { type: Map, of: Number }, // { "primera": 20, "segunda": 5 }
  
  fechaCreacion: { type: Date, default: Date.now },
  fechaModificacion: { type: Date, default: Date.now }
});

// Middleware para actualizar fechaModificacion antes de guardar
recogidaSchema.pre('save', function(next) {
  this.fechaModificacion = new Date();
  
  // 🔥 AUTO-DETECTAR SI ES RECOGIDA MÚLTIPLE
  if (this.pesas && this.pesas.length > 0) {
    const frutasUnicas = [...new Set(this.pesas.map(p => p.fruta))];
    const calidadesUnicas = [...new Set(this.pesas.map(p => p.calidad))];
    
    this.esRecogidaMultiple = frutasUnicas.length > 1 || calidadesUnicas.length > 1;
    
    // Calcular resumen automáticamente
    const resumenFrutas = {};
    const resumenCalidades = {};
    
    this.pesas.forEach(pesa => {
      resumenFrutas[pesa.fruta] = (resumenFrutas[pesa.fruta] || 0) + pesa.kilos;
      resumenCalidades[pesa.calidad] = (resumenCalidades[pesa.calidad] || 0) + pesa.kilos;
    });
    
    this.resumenFrutas = resumenFrutas;
    this.resumenCalidades = resumenCalidades;
  }
  
  next();
});

// Middleware para actualizar fechaModificacion antes de actualizar
recogidaSchema.pre('findOneAndUpdate', function(next) {
  this.set({ fechaModificacion: new Date() });
  next();
});

// Método para obtener resumen sin datos monetarios (útil para subusuarios)
recogidaSchema.methods.getResumenSinPrecios = function() {
  const resumen = this.toObject();
  delete resumen.precio;
  delete resumen.valorPagar;
  
  // Filtrar pesas SIN PERDER la información de fruta y calidad
  if (resumen.pesas) {
    resumen.pesas = resumen.pesas.map(pesa => ({
      kilos: pesa.kilos,
      fruta: pesa.fruta, // 🔥 MANTENER FRUTA ESPECÍFICA
      calidad: pesa.calidad // 🔥 MANTENER CALIDAD ESPECÍFICA
      // Omitir solo valor y precio
    }));
  }
  
  return resumen;
};

// Método estático para obtener recogidas filtradas según tipo de usuario
recogidaSchema.statics.getRecogidasParaUsuario = async function(filtros, tipoUsuario) {
  const recogidas = await this.find(filtros).sort({ fecha: -1 });
  
  if (tipoUsuario === 2) {
    // Para subusuarios, filtrar datos monetarios PERO MANTENER frutas y calidades
    return recogidas.map(recogida => recogida.getResumenSinPrecios());
  } else {
    // Para administradores, datos completos
    return recogidas;
  }
};

// 🔥 MÉTODO NUEVO: Obtener estadísticas de la recogida
recogidaSchema.methods.getEstadisticas = function() {
  const stats = {
    totalKilos: this.totalKilos,
    totalPesas: this.pesas.length,
    frutasUnicas: [...new Set(this.pesas.map(p => p.fruta))],
    calidadesUnicas: [...new Set(this.pesas.map(p => p.calidad))],
    esMultiple: this.esRecogidaMultiple,
    resumenPorFruta: {},
    resumenPorCalidad: {}
  };
  
  // Calcular resumen por fruta
  this.pesas.forEach(pesa => {
    if (!stats.resumenPorFruta[pesa.fruta]) {
      stats.resumenPorFruta[pesa.fruta] = { kilos: 0, pesas: 0, valor: 0 };
    }
    stats.resumenPorFruta[pesa.fruta].kilos += pesa.kilos;
    stats.resumenPorFruta[pesa.fruta].pesas += 1;
    stats.resumenPorFruta[pesa.fruta].valor += pesa.valor || 0;
  });
  
  // Calcular resumen por calidad
  this.pesas.forEach(pesa => {
    if (!stats.resumenPorCalidad[pesa.calidad]) {
      stats.resumenPorCalidad[pesa.calidad] = { kilos: 0, pesas: 0, valor: 0 };
    }
    stats.resumenPorCalidad[pesa.calidad].kilos += pesa.kilos;
    stats.resumenPorCalidad[pesa.calidad].pesas += 1;
    stats.resumenPorCalidad[pesa.calidad].valor += pesa.valor || 0;
  });
  
  return stats;
};

module.exports = mongoose.model("Recogida", recogidaSchema);