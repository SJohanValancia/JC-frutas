// server.js (PROGRAMA DE FRUTAS - CORS PERMISIVO + RUTAS CORREGIDAS)

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

// 🔥 RUTAS CORREGIDAS - Buscar en carpeta padre (../)
const authRoutes = require("../routes/auth");
const fincaRoutes = require("../routes/fincas");
const precioRoutes = require("../routes/precios");
const recogidaRoutes = require("../routes/recogidas");
const notaRoutes = require("../routes/nota");

// 🔥 CONFIGURAR .env desde la carpeta padre
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// --- CONFIGURACIÓN CORS ULTRA PERMISIVA ---
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

// 🔥 Servir archivos estáticos desde la carpeta www
app.use(express.static(path.join(__dirname)));

app.use(session({
  secret: process.env.SESSION_SECRET || "secreto_seguro_frutas",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGO_URI,
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === "production", 
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// --- CONEXIÓN A MONGO ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB (Programa Frutas)");
    console.log("📊 Base de datos:", mongoose.connection.name);
  })
  .catch(err => {
    console.error("❌ Error al conectar a MongoDB:", err);
    process.exit(1);
  });

// Eventos de conexión
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose conectado a MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Error de conexión Mongoose:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose desconectado');
});

// --- RUTAS ---
app.use("/auth", authRoutes);
app.use("/fincas", fincaRoutes);
app.use("/precios", precioRoutes);
app.use("/recogidas", recogidaRoutes);
app.use("/notas-finca", notaRoutes);

// --- RUTA RAÍZ ---
app.get("/", (req, res) => {
  res.json({
    message: "🎯 API Sistema de Frutas funcionando correctamente",
    status: "OK",
    programa: "JC Frutas",
    mongodb: mongoose.connection.readyState === 1 ? "Conectado" : "Desconectado",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// --- HEALTH CHECK ---
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    programa: "JC Frutas",
    mongodb: mongoose.connection.readyState === 1 ? "Conectado" : "Desconectado",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// --- TEST CORS ---
app.get("/api/test-cors", (req, res) => {
  res.json({
    message: "✅ CORS funcionando correctamente (Programa Frutas)",
    origin: req.headers.origin || "Sin Origin",
    timestamp: new Date().toISOString(),
    programa: "JC Frutas",
    corsEnabled: true
  });
});

// --- MANEJO DE ERRORES ---
app.use((err, req, res, next) => {
  console.error("🚨 Error:", err.message || err);
  console.error("Stack:", err.stack);
  
  res.status(err.status || 500).json({ 
    error: "Error interno del servidor",
    message: process.env.NODE_ENV === "production" ? "Error del servidor" : err.message,
    timestamp: new Date().toISOString()
  });
});

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({ 
    error: "Ruta no encontrada",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   🎯 JC FRUTAS - SERVIDOR INICIADO    ║
╠═══════════════════════════════════════╣
║ 🚀 Puerto: ${PORT.toString().padEnd(28)} ║
║ 🌐 CORS: Todos los orígenes           ║
║ 📊 MongoDB: Conectado                  ║
║ ⏰ Hora: ${new Date().toLocaleTimeString('es-CO').padEnd(29)} ║
╚═══════════════════════════════════════╝
  `);
});

// Manejo graceful de cierre
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB desconectado');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('⚠️ SIGINT recibido, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB desconectado');
      process.exit(0);
    });
  });
});