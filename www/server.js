// server.js (PROGRAMA DE FRUTAS - CORS OPTIMIZADO PARA IFRAME)

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
// 🔥 CONFIGURACIÓN CORS MEJORADA - SOPORTA IFRAMES
// ============================================
app.use(cors({
  origin: function(origin, callback) {
    // ✅ Permitir peticiones sin origin (como herramientas de desarrollo)
    if (!origin) return callback(null, true);
    
    // ✅ Lista de orígenes permitidos (puedes agregar los tuyos)
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5500',
      'http://localhost:5501',
      'http://localhost:5502',
      'http://localhost:5503',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5500',
      'http://127.0.0.1:5501',
      'http://127.0.0.1:5502',
      'http://127.0.0.1:5503',
      'https://jc-fi.netlify.app',
      'https://jc-frutas.onrender.com',
      'https://jc-frutas.netlify.app'
    ];
    
    // ✅ Permitir todos los subdominios de Netlify y Render
    if (origin.includes('netlify.app') || 
        origin.includes('onrender.com') || 
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // ✅ Verificar si el origen está en la lista
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // ⚠️ Si no está permitido, rechazar
    callback(new Error('No permitido por CORS'));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "X-Requested-With", 
    "Accept",
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers"
  ],
  exposedHeaders: ["Set-Cookie"],
  credentials: false, // ✅ FALSE para permitir iframes de diferentes orígenes
  optionsSuccessStatus: 200,
  preflightContinue: false
}));

// ============================================
// 🔥 HEADERS ADICIONALES PARA IFRAMES
// ============================================
app.use((req, res, next) => {
  // ✅ Permitir que la página sea embebida en iframes
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  
  // ✅ Asegurar que las respuestas tengan CORS correcto
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  
  // ✅ Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// ============================================
// 🔥 MIDDLEWARES PRINCIPALES
// ============================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));

// ============================================
// 🔥 CONFIGURACIÓN DE SESIÓN MEJORADA
// ============================================
app.use(session({
  secret: process.env.SESSION_SECRET || "secreto_seguro_frutas",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGO_URI,
    touchAfter: 24 * 3600,
    crypto: {
      secret: process.env.SESSION_SECRET || "secreto_seguro_frutas"
    }
  }),
  cookie: {
    secure: false, // ✅ FALSE para desarrollo local
    httpOnly: false, // ✅ FALSE para permitir acceso desde iframes
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'none', // ✅ 'none' para iframes cross-origin
    domain: undefined // ✅ Sin dominio específico
  },
  proxy: true, // ✅ Importante si estás detrás de un proxy (Render)
  name: 'jc-frutas.sid' // ✅ Nombre específico de la sesión
}));

// ============================================
// 🔥 CONEXIÓN A MONGODB
// ============================================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
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
// 🔥 LOGGING DE PETICIONES (OPCIONAL - ÚTIL PARA DEBUG)
// ============================================
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
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
    version: "2.0.0",
    cors: "✅ Habilitado con soporte para iframes",
    features: {
      iframe_support: true,
      cross_origin: true,
      session_sharing: true
    }
  });
});

// --- HEALTH CHECK ---
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    programa: "JC Frutas",
    mongodb: mongoose.connection.readyState === 1 ? "Conectado" : "Desconectado",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    }
  });
});

// --- TEST CORS ---
app.get("/api/test-cors", (req, res) => {
  res.json({
    message: "✅ CORS funcionando correctamente",
    origin: req.headers.origin || "Sin Origin",
    timestamp: new Date().toISOString(),
    programa: "JC Frutas",
    corsEnabled: true,
    corsPolicy: "Orígenes específicos + wildcards",
    headers: {
      'access-control-allow-origin': res.getHeader('access-control-allow-origin'),
      'access-control-allow-methods': res.getHeader('access-control-allow-methods')
    }
  });
});

// --- TEST IFRAME ---
app.get("/api/test-iframe", (req, res) => {
  res.json({
    message: "✅ Iframe support activo",
    canBeEmbedded: true,
    xFrameOptions: res.getHeader('x-frame-options') || 'Not set',
    csp: res.getHeader('content-security-policy') || 'Not set',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// 🔥 MANEJO DE ERRORES
// ============================================
app.use((err, req, res, next) => {
  console.error("🚨 Error capturado:", {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
  
  // ✅ Asegurar headers CORS incluso en errores
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
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
      "/notas-finca/*",
      "/api/test-cors",
      "/api/test-iframe",
      "/health"
    ]
  });
});

// ============================================
// 🔥 INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║   🎯 JC FRUTAS - SERVIDOR INICIADO                ║
╠═══════════════════════════════════════════════════╣
║ 🚀 Puerto: ${PORT.toString().padEnd(35)} ║
║ 🌐 CORS: ✅ Configurado para iframes             ║
║ 📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'Conectado'.padEnd(29) : 'Desconectado'.padEnd(29)} ║
║ ⏰ Hora: ${new Date().toLocaleTimeString('es-CO').padEnd(36)} ║
║ 🔧 Modo: ${process.env.NODE_ENV === 'production' ? 'Producción'.padEnd(33) : 'Desarrollo'.padEnd(33)} ║
╠═══════════════════════════════════════════════════╣
║ ✅ CARACTERÍSTICAS ACTIVAS:                       ║
║    • Soporte para iframes cross-origin           ║
║    • CORS con whitelist flexible                 ║
║    • Sesiones sin cookies httpOnly               ║
║    • X-Frame-Options removido                    ║
╚═══════════════════════════════════════════════════╝

✅ Servidor listo para recibir peticiones
🔗 URL: http://localhost:${PORT}
🧪 Test CORS: http://localhost:${PORT}/api/test-cors
🖼️  Test Iframe: http://localhost:${PORT}/api/test-iframe
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

// ============================================
// 🔥 CRON JOBS - Verificación de suscripciones
// ============================================
const User = require('../../models/User');

function startCronJobs() {
    console.log('⏰ Servicio de Cron Jobs iniciado.');
    
    // Ejecutar verificación cada hora (3600000 ms)
    setInterval(checkExpiredSubscriptions, 3600000);
    
    // Ejecutar una vez al inicio para asegurar estado consistente
    checkExpiredSubscriptions();
}

async function checkExpiredSubscriptions() {
    try {
        console.log('🔍 Verificando suscripciones vencidas...');
        const now = new Date();
        
        // Buscar usuarios que cumplieron un mes y no están pagados
        const usersToCheck = await User.find({
            bloqueado: { $ne: true },
            pagado: { $ne: true }
        });
        
        let count = 0;
        for (const user of usersToCheck) {
            const fechaCreacion = new Date(user.createdAt);
            const fechaComparar = new Date(fechaCreacion);
            fechaComparar.setMonth(fechaComparar.getMonth() + 1);
            
            if (now >= fechaComparar) {
                user.bloqueado = true;
                user.motivoBloqueo = 'Su período de prueba ha vencido. Por favor contacte al administrador para continuar.';
                user.fechaBloqueo = now;
                await user.save();
                count++;
            }
        }
        
        if (count > 0) {
            console.log(`⚠️ ${count} usuarios bloqueados por vencimiento de suscripción.`);
        } else {
            console.log('✅ No hay suscripciones por vencer.');
        }
        
    } catch (error) {
        console.error('❌ Error en cron job de suscripciones:', error);
    }
}

startCronJobs();

module.exports = app;