const mongoose = require("mongoose");

// Definimos el esquema para los precios de fruta
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
  frutas: [
    {
      nombre: String,
      precios: {
        primera: Number,
        segunda: Number,
        tercera: Number
      }
    }
  ]
});

// Exportamos el modelo para poder usarlo en rutas y controladores
module.exports = mongoose.model("PrecioFruta", precioFrutaSchema);
