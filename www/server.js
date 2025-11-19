// server.js (PROGRAMA DE FRUTAS - CORS CORREGIDO)

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

// 🔥 RUTAS
const authRoutes = require("../routes/auth");
const fincaRoutes = require("../routes/fincas");
const precioRoutes = require("../routes/precios");
const recogidaRoutes = require("../routes/recogidas");
const notaRoutes = require("../routes/nota");

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// ============================================
// 🔥 CONFIGURACIÓN CORS CORREGIDA
// ============================================

// Lista de orígenes permitidos
const allowedOrigins = [
  'https://jc-fi.netlify.app',
  'https://jc-fi.onrender.com',
  'https://jc-frutas.onrender.com',
  'https://jc-frutas.netlify.app',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

// 🔥 MIDDLEWARE CORS PRINCIPAL (antes de todo)
app.use(cors({
  origin: function(origin, callback) {
    // Permitir peticiones sin origin (Postman, servidor a servidor)
    if (!origin) {
      return callback(null, true);
    }
    
    // Verificar si el origin está en la lista permitida
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // 🔥 IMPORTANTE: No permitir otros orígenes cuando usas credentials
    console.log('⚠️ Origen no permitido:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // 🔥 MANTENER credentials: true
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  optionsSuccessStatus: 200
}));

// ============================================
// 🔥 MIDDLEWARES PRINCIPALES
// ============================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));

// ============================================
// 🔥 CONFIGURACIÓN DE SESIÓN
// ============================================
app.use(session({
  secret: process.env.SESSION_SECRET || "secreto_seguro_frutas",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGO_URI,
    touchAfter: 24 * 3600
  }),
  cookie: {
    secure: process.env.NODE_ENV === "production", 
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax'
  }
}));

// ============================================
// 🔥 CONEXIÓN A MONGODB
// ============================================
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

// ============================================
// 🔥 RUTAS DE LA API
// ============================================
app.use("/auth", authRoutes);
app.use("/fincas", fincaRoutes);
app.use("/precios", precioRoutes);
app.use("/recogidas", recogidaRoutes);
app.use("/notas-finca", notaRoutes);

// ============================================
// 🔥 RUTAS DE UTILIDAD
// ============================================

// --- RUTA RAÍZ ---
app.get("/", (req, res) => {
  res.json({
    message: "🎯 API Sistema de Frutas funcionando correctamente",
    status: "OK",
    programa: "JC Frutas",
    mongodb: mongoose.connection.readyState === 1 ? "Conectado" : "Desconectado",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    cors: "Habilitado con orígenes específicos"
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
    message: "✅ CORS funcionando correctamente",
    origin: req.headers.origin || "Sin Origin",
    timestamp: new Date().toISOString(),
    programa: "JC Frutas",
    corsEnabled: true
  });
});

// ============================================
// 🔥 MANEJO DE ERRORES
// ============================================
app.use((err, req, res, next) => {
  console.error("🚨 Error capturado:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    origin: req.headers.origin
  });
  
  res.status(err.status || 500).json({ 
    error: "Error interno del servidor",
    message: process.env.NODE_ENV === "production" ? "Error del servidor" : err.message,
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

// ============================================
// 🔥 MANEJO 404
// ============================================
app.use((req, res) => {
  res.status(404).json({ 
    error: "Ruta no encontrada",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableRoutes: [
      "/auth/*",
      "/fincas/*",
      "/precios/*",
      "/recogidas/*",
      "/notas-finca/*"
    ]
  });
});

// ============================================
// 🔥 INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   🎯 JC FRUTAS - SERVIDOR INICIADO            ║
╠═══════════════════════════════════════════╣
║ 🚀 Puerto: ${PORT.toString().padEnd(35)} ║
║ 🌐 CORS: Orígenes específicos permitidos ║
║ 📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'Conectado'.padEnd(29) : 'Desconectado'.padEnd(29)} ║
║ ⏰ Hora: ${new Date().toLocaleTimeString('es-CO').padEnd(36)} ║
║ 🔒 Modo: ${process.env.NODE_ENV === 'production' ? 'Producción'.padEnd(33) : 'Desarrollo'.padEnd(33)} ║
╠═══════════════════════════════════════════╣
║ 📝 Orígenes permitidos:                       ║
║    • jc-fi.netlify.app                        ║
║    • jc-fi.onrender.com                       ║
║    • jc-frutas.onrender.com                   ║
║    • localhost:5000                           ║
║    • localhost:3000                           ║
╚═══════════════════════════════════════════╝

✅ Servidor listo para recibir peticiones
🔗 URL: http://localhost:${PORT}
🧪 Test CORS: http://localhost:${PORT}/api/test-cors
  `);
});

// ============================================
// 🔥 MANEJO GRACEFUL DE CIERRE
// ============================================
const gracefulShutdown = (signal) => {
  console.log(`\n⚠️ ${signal} recibido, iniciando cierre graceful...`);
  
  server.close(() => {
    console.log('✅ Servidor HTTP cerrado');
    
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB desconectado');
      console.log('👋 Proceso terminado exitosamente');
      process.exit(0);
    });
  });
  
  setTimeout(() => {
    console.error('⚠️ Forzando cierre después de timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('💥 Excepción no capturada:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promesa rechazada no manejada:', reason);
  gracefulShutdown('unhandledRejection');
});

module.exports = app;