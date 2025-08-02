const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/auth");
const fincaRoutes = require("./routes/fincas");
const precioRoutes = require("./routes/precios");
const recogidaRoutes = require("./routes/recogidas");
// 🔥 AGREGAR: Importar las rutas de notas
const notaRoutes = require("./routes/nota");

require("dotenv").config();

const app = express();

// ✅ CONFIGURACIÓN CORS CORREGIDA
app.use(cors({
  origin: [
    "https://jc-frutas.netlify.app",  // Tu frontend en Netlify
    "http://localhost:3000",          // Para desarrollo local
    "http://127.0.0.1:3000",         // Para desarrollo local alternativo
    "http://localhost:5500",          // Para Live Server u otros puertos
    "http://127.0.0.1:5500"          // Para Live Server alternativo
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200 // Para navegadores legacy
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.use(session({
  secret: "secreto_seguro",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch(err => console.error("❌ Error al conectar:", err));

// ✅ RUTAS EXISTENTES
app.use("/auth", authRoutes);
app.use("/fincas", fincaRoutes);
app.use("/precios", precioRoutes);
app.use("/recogidas", recogidaRoutes);

// 🔥 AGREGAR: Rutas de notas de fincas
app.use("/notas-finca", notaRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend en https://jc-frutas.onrender.com`);
});