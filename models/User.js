const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  tipo: Number, // 1: admin, 2: subusuario, 3: super admin
  alias: { type: String, unique: true },
  aliasAdmin: String, // solo si es tipo 2
  bloqueado: { type: Boolean, default: false }, // para controlar acceso
  email: String, // campo adicional para más información
  nombre: String // campo adicional para nombre completo
}, {
  timestamps: true // Añade createdAt y updatedAt automáticamente
});

module.exports = mongoose.model("User", userSchema);