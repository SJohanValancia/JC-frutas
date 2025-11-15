// server.js (PROGRAMA DE FRUTAS - CORS PERMISIVO)

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

const authRoutes = require("./routes/auth");
const fincaRoutes = require("./routes/fincas");
const precioRoutes = require("./routes/precios");
const recogidaRoutes = require("./routes/recogidas");
const notaRoutes = require("./routes/nota");

dotenv.config();

const app = express();

// --- CONFIGURACIÓN CORS ULTRA PERMISIVA (COMO EL PROGRAMA PRINCIPAL) ---
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // ✅ PERMITIR CUALQUIER ORIGEN
  res.header("Access-Control-Allow-Origin", origin || "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// Middleware cors() adicional
app.use(cors({
  origin: true, // ✅ ACEPTA CUALQUIER ORIGEN
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200
}));

// --- MIDDLEWARES ---
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(__dirname));

app.use(session({
  secret: process.env.SESSION_SECRET || "secreto_seguro_frutas",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    secure: process.env.NODE_ENV === "production", 
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// --- CONEXIÓN A MONGO ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB (Programa Frutas)"))
  .catch(err => console.error("❌ Error al conectar a MongoDB:", err));

// --- RUTAS ---
app.use("/auth", authRoutes);
app.use("/fincas", fincaRoutes);
app.use("/precios", precioRoutes);
app.use("/recogidas", recogidaRoutes);
app.use("/notas-finca", notaRoutes);

// --- TEST CORS ---
app.get("/api/test-cors", (req, res) => {
  res.json({
    message: "✅ CORS funcionando correctamente (Programa Frutas)",
    origin: req.headers.origin || "Sin Origin",
    timestamp: new Date().toISOString(),
    programa: "Frutas"
  });
});

// --- RUTA RAÍZ ---
app.get("/", (req, res) => {
  res.json({
    message: "🍎 API Sistema de Frutas funcionando",
    status: "OK",
    mongodb: mongoose.connection.readyState === 1 ? "Conectado" : "Desconectado",
    timestamp: new Date().toISOString()
  });
});

// --- HEALTH CHECK ---
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    programa: "Frutas",
    mongodb: mongoose.connection.readyState === 1 ? "Conectado" : "Desconectado",
    timestamp: new Date().toISOString()
  });
});

// --- MANEJO DE ERRORES ---
app.use((err, req, res, next) => {
  console.error("🚨 Error:", err.message || err);
  res.status(500).json({ 
    error: "Error interno del servidor",
    message: err.message 
  });
});

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({ 
    error: "Ruta no encontrada",
    path: req.path 
  });
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Frutas corriendo en puerto ${PORT}`);
  console.log(`🌐 CORS: Aceptando TODOS los orígenes`);
  console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'}`);
});