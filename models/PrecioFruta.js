const mongoose = require("mongoose");

// ✅ ESQUEMA CORREGIDO: Agregamos los campos usuario y adminAlias que faltaban
const precioFrutaSchema = new mongoose.Schema({
  fincaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Finca",
    default: null // ✅ si es null, son precios base que aplican a todas las fincas
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  // ✅ CAMPOS AGREGADOS: Necesarios para filtrar por usuario
  usuario: {
    type: String,
    required: true,
    index: true // Agregamos índice para optimizar consultas por usuario
  },
  adminAlias: {
    type: String,
    index: true // Agregamos índice para optimizar consultas por adminAlias
  },
  frutas: [
    {
      nombre: {
        type: String,
        required: true
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
    }
  ]
});

// ✅ Agregamos índices compuestos para optimizar consultas complejas
precioFrutaSchema.index({ usuario: 1, fincaId: 1 });
precioFrutaSchema.index({ adminAlias: 1, fincaId: 1 });
precioFrutaSchema.index({ "frutas._id": 1 });

// Exportamos el modelo para poder usarlo en rutas y controladores
module.exports = mongoose.model("PrecioFruta", precioFrutaSchema);