const mongoose = require("mongoose");

const recogidaSchema = new mongoose.Schema({
  fincaId: { type: String, required: true },
  finca: { type: String, required: true },
  propietario: { type: String, required: true },
  fecha: { type: String, required: true },
  usuario: { type: String, required: true }, // Username del usuario
  alias: { type: String, required: true }, // Alias del usuario que hizo la recogida
  fruta: { type: String, required: true },
  calidad: { type: String, required: true },
  precio: { type: Number, default: 0 }, // Puede ser 0 para subusuarios
  totalKilos: { type: Number, required: true },
  valorPagar: { type: Number, default: 0 }, // Puede ser 0 para subusuarios
  pesas: [
    {
      kilos: { type: Number, required: true },
      valor: { type: Number, default: 0 }, // Puede ser 0 para subusuarios
      precio: { type: Number, default: 0 } // Precio por kilo usado en esta pesa
    }
  ],
  adminAlias: { type: String }, // Alias del administrador responsable
  tipoUsuario: { type: Number, default: 1 }, // 1: admin, 2: subusuario
  fechaCreacion: { type: Date, default: Date.now },
  fechaModificacion: { type: Date, default: Date.now }
});

// Middleware para actualizar fechaModificacion antes de guardar
recogidaSchema.pre('save', function(next) {
  this.fechaModificacion = new Date();
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
  
  // Filtrar pesas sin valores monetarios
  if (resumen.pesas) {
    resumen.pesas = resumen.pesas.map(pesa => ({
      kilos: pesa.kilos
      // Omitir valor y precio
    }));
  }
  
  return resumen;
};

// Método estático para obtener recogidas filtradas según tipo de usuario
recogidaSchema.statics.getRecogidasParaUsuario = async function(filtros, tipoUsuario) {
  const recogidas = await this.find(filtros).sort({ fecha: -1 });
  
  if (tipoUsuario === 2) {
    // Para subusuarios, filtrar datos monetarios
    return recogidas.map(recogida => recogida.getResumenSinPrecios());
  } else {
    // Para administradores, datos completos
    return recogidas;
  }
};

module.exports = mongoose.model("Recogida", recogidaSchema);