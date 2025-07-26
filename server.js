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
require("dotenv").config();

const app = express();

// 🔍 DEBUGGING: Log de todas las peticiones
app.use((req, res, next) => {
  console.log(`📡 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log(`📍 Origin: ${req.headers.origin}`);
  next();
});

// ✅ CONFIGURACIÓN CORS
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://jc-frutas.netlify.app",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5500",
      "http://127.0.0.1:5500"
    ];
    
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`✅ CORS: Origen permitido - ${origin}`);
      callback(null, true);
    } else {
      console.log(`❌ CORS: Origen NO permitido - ${origin}`);
      callback(new Error('No permitido por CORS'), false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With", 
    "Content-Type", 
    "Accept",
    "Authorization",
    "Cache-Control"
  ],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// 🔧 CONFIGURACIÓN MEJORADA DE MONGODB
console.log("🔗 Intentando conectar a MongoDB...");
console.log("🔗 MONGO_URI existe:", !!process.env.MONGO_URI);
console.log("🔗 MONGO_URI (primeros 50 chars):", process.env.MONGO_URI?.substring(0, 50) + "...");

const mongoOptions = {
  serverSelectionTimeoutMS: 30000, // 30 segundos en lugar de 10
  socketTimeoutMS: 45000,
  family: 4, // Forzar IPv4
  bufferCommands: false, // Deshabilitar buffering
  maxPoolSize: 10,
  ssl: true,
  sslValidate: true,
  retryWrites: true,
  w: 'majority'
};

mongoose.connect(process.env.MONGO_URI, mongoOptions)
  .then(() => {
    console.log("✅ Conectado exitosamente a MongoDB");
  })
  .catch(err => {
    console.error("❌ Error detallado al conectar a MongoDB:");
    console.error("❌ Tipo de error:", err.constructor.name);
    console.error("❌ Mensaje:", err.message);
    console.error("❌ Código:", err.code);
    
    // Continuar sin MongoDB para debug
    console.log("⚠️  Servidor continuará sin MongoDB para debugging");
  });

// 🔍 Event listeners para MongoDB
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose conectado a MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Error de conexión MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  Mongoose desconectado de MongoDB');
});

// Middleware de sesión CON manejo de errores
app.use(session({
  secret: "secreto_seguro",
  resave: false,
  saveUninitialized: false,
  store: mongoose.connection.readyState === 1 ? 
    MongoStore.create({ mongoUrl: process.env.MONGO_URI }) : 
    undefined, // Solo crear store si MongoDB está conectado
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// 🔍 RUTA DE PRUEBA SIN MONGODB
app.get('/test-server', (req, res) => {
  res.json({ 
    message: 'Servidor funcionando correctamente',
    mongodb: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado',
    timestamp: new Date().toISOString()
  });
});

// 🔍 RUTA DE PRUEBA CORS
app.get('/test-cors', (req, res) => {
  res.json({ 
    message: 'CORS funcionando correctamente',
    origin: req.headers.origin,
    mongodb: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado',
    timestamp: new Date().toISOString()
  });
});

app.use("/auth", authRoutes);
app.use("/fincas", fincaRoutes);
app.use("/precios", precioRoutes);
app.use("/recogidas", recogidaRoutes);

// 🔍 Manejo de errores
app.use((err, req, res, next) => {
  console.error('❌ Error en servidor:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend en https://jc-frutas.onrender.com`);
  console.log(`🌍 Puerto: ${PORT}`);
  console.log(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Estado MongoDB: ${mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'}`);
});