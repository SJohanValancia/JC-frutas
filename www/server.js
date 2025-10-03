// server.js (CORS CORREGIDO - Sin conflictos)

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

// --- CONFIGURACIÓN CORS SIMPLIFICADA Y FUNCIONAL ---
const allowedOrigins = [
  "https://jc-frutas.netlify.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:5501",
  "http://localhost:5501",
  "http://127.0.0.1:5502",
  "http://localhost:5502",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "capacitor://localhost",
  "ionic://localhost",
];

// SOLO UN MIDDLEWARE DE CORS - usando el paquete cors()
app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (apps nativas, Postman, etc)
    if (!origin) return callback(null, true);
    
    // Verificar si el origin está en la lista o es un patrón válido
    if (
      allowedOrigins.includes(origin) ||
      origin.startsWith("capacitor://") ||
      origin.startsWith("ionic://") ||
      origin.startsWith("file://") ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1")
    ) {
      return callback(null, true);
    }
    
    console.log("🚫 Origin bloqueado:", origin);
    callback(new Error("No permitido por CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200
}));

// --- MIDDLEWARES ---
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(__dirname));

app.use(session({
  secret: process.env.SESSION_SECRET || "secreto_seguro_cambiar_en_produccion",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    secure: process.env.NODE_ENV === "production", 
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
  }
}));

// --- CONEXIÓN A MONGO ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch(err => console.error("❌ Error al conectar:", err));

// --- RUTAS ---
app.use("/auth", authRoutes);
app.use("/fincas", fincaRoutes);
app.use("/precios", precioRoutes);
app.use("/recogidas", recogidaRoutes);
app.use("/notas-finca", notaRoutes);

// --- TEST CORS ---
app.get("/api/test-cors", (req, res) => {
  res.json({
    message: "✅ CORS funcionando correctamente",
    origin: req.headers.origin || "Sin Origin",
    timestamp: new Date().toISOString()
  });
});

// --- HEALTH CHECK ---
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// --- ERRORES ---
app.use((err, req, res, next) => {
  console.error("🚨 Error:", err.message || err);
  
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({ 
      error: "CORS_ERROR",
      message: "Origen no permitido", 
      origin: req.headers.origin 
    });
  }
  
  res.status(500).json({ 
    error: "ERROR_SERVIDOR",
    message: "Error interno del servidor" 
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend en puerto ${PORT}`);
  console.log(`🌍 Orígenes CORS permitidos: ${allowedOrigins.length} configurados`);
  console.log(`🔒 Modo: ${process.env.NODE_ENV || "development"}`);
});