const mongoose = require("mongoose");

const notaFincaSchema = new mongoose.Schema({
  fincaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Finca', 
    required: true 
  },
  fincaNombre: { type: String, required: true }, // Para referencia rápida
  contenido: { type: String, required: true },
  usuario: { type: String, required: true }, // Usuario que creó la nota
  adminAlias: { type: String, required: true }, // Admin al que pertenece
  fechaCreacion: { type: Date, default: Date.now },
  fechaModificacion: { type: Date, default: Date.now },
  activa: { type: Boolean, default: true } // Para soft delete
});

// Índice para búsquedas eficientes
notaFincaSchema.index({ fincaId: 1, activa: 1 });
notaFincaSchema.index({ adminAlias: 1, activa: 1 });

module.exports = mongoose.model("NotaFinca", notaFincaSchema);