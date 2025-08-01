const mongoose = require("mongoose");

const precioFrutaSchema = new mongoose.Schema({
  fincaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Finca",
    default: null
  },
  frutas: [{
    nombre: {
      type: String,
      required: true,
      trim: true
    },
    // ✅ Nuevo campo para búsquedas normalizadas
    nombreNormalizado: {
      type: String,
      trim: true,
      lowercase: true
    },
    precios: {
      primera: {
        type: Number,
        required: true,
        min: 0
      },
      segunda: {
        type: Number,
        required: true,
        min: 0
      },
      tercera: {
        type: Number,
        required: true,
        min: 0
      }
    }
  }],
  usuario: {
    type: String,
    required: true
  },
  adminAlias: {
    type: String,
    required: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
});

// ✅ Middleware para normalizar nombres antes de guardar
precioFrutaSchema.pre('save', function(next) {
  if (this.frutas && this.frutas.length > 0) {
    this.frutas.forEach(fruta => {
      if (fruta.nombre && !fruta.nombreNormalizado) {
        fruta.nombreNormalizado = fruta.nombre
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      }
    });
  }
  next();
});

// ✅ Índice compuesto para búsquedas eficientes
precioFrutaSchema.index({ 
  usuario: 1, 
  adminAlias: 1, 
  "frutas.nombreNormalizado": 1 
});

precioFrutaSchema.index({ 
  fincaId: 1, 
  "frutas.nombreNormalizado": 1 
});

module.exports = mongoose.model("PrecioFruta", precioFrutaSchema);