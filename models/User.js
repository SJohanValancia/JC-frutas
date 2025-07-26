const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  tipo: Number, // 1: admin, 2: subusuario
  alias: { type: String, unique: true },
  aliasAdmin: String, // solo si es tipo 2
});

module.exports = mongoose.model("User", userSchema);
