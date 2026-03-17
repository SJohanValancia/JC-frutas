const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  tipo: Number, // 1: admin, 2: subusuario, 3: super admin
  alias: { type: String, unique: true },
  aliasAdmin: String, // Para tipo 2 (subusuario) y tipo 1 (admin enlazado)
  enlazadoAAdmin: { type: Boolean, default: false }, // Para identificar si es un admin enlazado
  bloqueado: { type: Boolean, default: false }, // para controlar acceso
  motivoBloqueo: { type: String, default: '' },
  fechaBloqueo: { type: Date, default: null },
  email: String, // campo adicional para más información
  nombre: String, // campo adicional para nombre completo
  pagado: { type: Boolean, default: false } // para controlar suscripción
}, {
  timestamps: true // Añade createdAt y updatedAt automáticamente
});

module.exports = mongoose.model("User", userSchema);