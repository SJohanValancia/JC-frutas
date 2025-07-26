const mongoose = require("mongoose");

const fincaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  propietario: { type: String, required: true },
  usuario: { type: String, required: true }, // El subusuario que registró la finca
  adminAlias: { type: String, required: true }, // Alias del administrador al que está vinculada la finca
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Finca", fincaSchema);
