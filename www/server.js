// server.js (versión corregida con soporte completo CORS para Capacitor, Android y Web)

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

// --- CONFIGURACIÓN CORS ROBUSTA ---
const allowedOrigins = [
  "https://jc-frutas.netlify.app",   // Frontend en Netlify
  "http://localhost:3000",           // React local
  "http://127.0.0.1:3000",           
  "http://localhost:5500",           // Live Server
  "http://127.0.0.1:5500",
  "http://127.0.0.1:5502",
  "http://127.0.0.1:5501",
  "http://localhost:5502",
  "http://localhost:8000",
  "capacitor://localhost",           // Capacitor Android/iOS
  "ionic://localhost",
  "file://",
  "http://localhost",
  "https://localhost"
];

function isValidOrigin(origin) {
  if (!origin) return true; // Permitir requests sin origin (ej: apps nativas)
  if (allowedOrigins.includes(origin)) return true;

  // Patrones comunes para Capacitor / Ionic
  if (
    origin.startsWith("capacitor://") ||
    origin.startsWith("ionic://") ||
    origin.startsWith("file://") ||
    origin.includes("localhost")
  ) {
    return true;
  }

  return false;
}

// Middleware manual CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (isValidOrigin(origin)) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With");
    res.header("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// Middleware cors() adicional (para fallback)
app.use(cors({
  origin: (origin, callback) => {
    if (isValidOrigin(origin)) {
      return callback(null, origin || true);
    }
    return callback(new Error("Origin no permitido por CORS"));
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
  secret: "secreto_seguro",
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
    message: "CORS funcionando correctamente",
    origin: req.headers.origin || "Sin Origin",
    timestamp: new Date().toISOString()
  });
});

// --- ERRORES ---
app.use((err, req, res, next) => {
  console.error("🚨 Error:", err.message || err);
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({ error: "Origen no permitido", origin: req.headers.origin });
  }
  res.status(500).json({ error: "Error interno del servidor" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend en puerto ${PORT}`);
  console.log("🌐 Orígenes CORS permitidos:", allowedOrigins);
});
