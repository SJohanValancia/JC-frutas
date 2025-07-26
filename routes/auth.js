const express = require("express");
const router = express.Router();
const User = require("../models/User");


router.post("/register", async (req, res) => {
  const { username, password, tipo, alias, aliasAdmin } = req.body;

  if (!username || !password || !alias || !tipo) {
    return res.status(400).send("Faltan campos obligatorios");
  }

  try {
    const existeAlias = await User.findOne({ alias });
    if (existeAlias) {
      return res.status(400).send("Ese alias ya está en uso");
    }

    let adminAlias = null;

    if (tipo === 2) {
      if (!aliasAdmin) return res.status(400).send("Debes indicar el alias del administrador");
      const admin = await User.findOne({ alias: aliasAdmin, tipo: 1 });
      if (!admin) return res.status(400).send("Administrador no encontrado");
      adminAlias = aliasAdmin;
    }

    const nuevo = new User({
      username,
      password,
      tipo,
      alias,
      aliasAdmin: adminAlias,
    });

    await nuevo.save();
    res.status(200).json({ mensaje: "Registrado correctamente" });
  } catch (err) {
    console.error("Error en registro:", err);
    res.status(500).send("Error al registrar");
  }
});

// En la ruta de login
// En la ruta de login (solo la parte relevante)
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  
  try {
    const user = await User.findOne({ username, password });
    if (!user) {
      console.log("❌ Usuario no encontrado");
      return res.status(401).send("Credenciales inválidas");
    }



    let datosAdmin = null;

    if (user.tipo === 2 && user.aliasAdmin) {
      const admin = await User.findOne({ alias: user.aliasAdmin });
      if (admin) {
        datosAdmin = {
          username: admin.username,
          alias: admin.alias,
          email: admin.email,
          nombre: admin.nombre,
          tipo: admin.tipo,
        };
        console.log("✅ Datos del admin encontrados:", datosAdmin);
      } else {
        console.log("❌ Admin no encontrado para alias:", user.aliasAdmin);
      }
    }

    req.session.user = user;

    const respuesta = {
      tipo: user.tipo,
      alias: user.alias,
      usuario: user.username,  // ✅ Este es el campo clave
      admin: datosAdmin,
    };

    console.log("=== RESPUESTA QUE SE ENVIARÁ ===");
    console.log(JSON.stringify(respuesta, null, 2));
    console.log("=== FIN RESPUESTA ===");

    res.status(200).json(respuesta);
  } catch (err) {
    console.error("❌ Error en login:", err);
    res.status(500).send("Error en el login");
  }
});


// Nuevo endpoint para obtener la información del administrador
// Nuevo endpoint para obtener la información del administrador
// Nuevo endpoint para obtener la información del administrador
router.get("/get-admin-info", async (req, res) => {
  console.log("=== GET-ADMIN-INFO ENDPOINT ===");
  console.log("Query params:", req.query);
  console.log("Alias recibido:", req.query.alias);
  
  const { alias } = req.query;

  try {
    // Asegúrate de que alias sea recibido correctamente
    if (!alias) {
      console.log("❌ Alias no proporcionado");
      return res.status(400).send("Alias no proporcionado");
    }

    console.log("🔍 Buscando admin con alias:", alias);
    const admin = await User.findOne({ alias });
    console.log("📊 Resultado de búsqueda:", admin);
    
    if (!admin) {
      console.log("❌ Administrador no encontrado");
      
      // Vamos a ver qué usuarios existen para debug
      const todosUsuarios = await User.find({}, { username: 1, alias: 1, tipo: 1 });
      console.log("👥 Todos los usuarios en la DB:", todosUsuarios);
      
      return res.status(404).send("Administrador no encontrado");
    }

    console.log("✅ Admin encontrado:", {
      username: admin.username,
      alias: admin.alias,
      nombre: admin.nombre,
      email: admin.email,
      tipo: admin.tipo
    });

    // Devuelve TODOS los datos del administrador
    const respuesta = {
      _id: admin._id,
      username: admin.username,
      alias: admin.alias,
      nombre: admin.nombre,
      email: admin.email,
      tipo: admin.tipo,
      aliasAdmin: admin.aliasAdmin,
      fecha: admin.fecha,
      // Incluir cualquier otro campo que tenga el modelo User
      ...admin.toObject() // Esto incluye todos los campos
    };
    
    console.log("📤 Enviando respuesta completa:", respuesta);
    res.status(200).json(respuesta);
  } catch (err) {
    console.error("❌ Error en get-admin-info:", err);
    res.status(500).send("Error al obtener la información del administrador");
  }
});


router.get("/logout", (req, res) => {
  req.session.destroy(() => res.status(200).send("Sesión cerrada"));
});


router.get("/get-alias", async (req, res) => {
  try {
    const { usuario } = req.query;
    
    if (!usuario) {
      return res.status(400).json({ error: "Parámetro usuario requerido" });
    }

    console.log("🔍 Buscando alias para usuario:", usuario);
    
    const user = await User.findOne({ username: usuario });
    
    if (!user) {
      console.log("❌ Usuario no encontrado:", usuario);
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    console.log("✅ Alias encontrado:", user.alias);
    res.status(200).json({ 
      alias: user.alias,
      username: user.username,
      tipo: user.tipo 
    });
    
  } catch (error) {
    console.error("❌ Error al obtener alias:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;