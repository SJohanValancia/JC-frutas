const express = require("express");
const router = express.Router();
const User = require('../models/User')

// Middleware para verificar usuario bloqueado
const verificarUsuarioBloqueado = async (req, res, next) => {
  try {
    // Obtener usuario de la sesión
    if (req.session && req.session.user) {
      const userId = req.session.user._id;
      
      // Consultar el usuario actual en la base de datos
      const usuario = await User.findById(userId);
      
      if (!usuario) {
        console.log('❌ Usuario no encontrado en la base de datos');
        return res.status(401).json({ 
          error: 'USUARIO_NO_ENCONTRADO', 
          message: 'Usuario no encontrado' 
        });
      }
      
      // Verificar si está bloqueado
      if (usuario.bloqueado === true) {
        console.log('🚫 Usuario bloqueado intentando acceder:', usuario.username);
        
        // Destruir la sesión
        req.session.destroy(() => {
          res.status(403).json({ 
            error: 'CUENTA_BLOQUEADA',
            message: 'Su cuenta ha sido suspendida. Contacte al administrador.',
            username: usuario.username,
            blocked: true
          });
        });
        return;
      }
      
      // Actualizar los datos del usuario en la sesión (por si han cambiado)
      req.session.user = usuario;
    }
    
    // Continuar con la siguiente función
    next();
    
  } catch (error) {
    console.error('❌ Error en middleware de verificación de bloqueo:', error);
    res.status(500).json({ 
      error: 'ERROR_SERVIDOR', 
      message: 'Error interno del servidor' 
    });
  }
};

module.exports = verificarUsuarioBloqueado;

// ========== ACTUALIZACIÓN PARA auth.js ==========
// Agregar estas rutas protegidas en auth.js

// Endpoint para verificar sesión activa y estado de bloqueo
router.get("/verify-session", verificarUsuarioBloqueado, async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ 
        error: 'NO_SESSION', 
        message: 'No hay sesión activa' 
      });
    }
    
    const user = req.session.user;
    
    res.status(200).json({
      valid: true,
      usuario: {
        username: user.username,
        alias: user.alias,
        tipo: user.tipo,
        bloqueado: user.bloqueado || false,
        enlazadoAAdmin: user.enlazadoAAdmin || false
      }
    });
    
  } catch (error) {
    console.error('❌ Error al verificar sesión:', error);
    res.status(500).json({ 
      error: 'ERROR_SERVIDOR', 
      message: 'Error interno del servidor' 
    });
  }
});

// Endpoint específico para verificar solo el estado de bloqueo
router.get("/check-block-status/:username", async (req, res) => {
  try {
    const { username } = req.params;
    
    console.log('🔍 Verificando estado de bloqueo para:', username);
    
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({ 
        error: 'USUARIO_NO_ENCONTRADO', 
        message: 'Usuario no encontrado' 
      });
    }
    
    const isBlocked = user.bloqueado === true;
    
    console.log(`📊 Estado de ${username}: ${isBlocked ? 'BLOQUEADO' : 'ACTIVO'}`);
    
    if (isBlocked) {
      return res.status(403).json({ 
        error: 'CUENTA_BLOQUEADA',
        message: 'Cuenta suspendida',
        username: username,
        blocked: true
      });
    }
    
    res.status(200).json({ 
      username: username,
      blocked: false,
      status: 'active'
    });
    
  } catch (error) {
    console.error('❌ Error al verificar estado de bloqueo:', error);
    res.status(500).json({ 
      error: 'ERROR_SERVIDOR', 
      message: 'Error interno del servidor' 
    });
  }
});


router.post("/register", async (req, res) => {
  const { username, password, tipo, alias, aliasAdmin, enlazadoAAdmin } = req.body;

  console.log("🔍 Datos recibidos en registro:", {
    username,
    tipo,
    alias,
    aliasAdmin,
    enlazadoAAdmin
  });

  if (!username || !password || !alias || !tipo) {
    return res.status(400).send("Faltan campos obligatorios");
  }

  try {
    // Verificar que el alias sea único
    const existeAlias = await User.findOne({ alias });
    if (existeAlias) {
      return res.status(400).send("Ese alias ya está en uso");
    }

    let adminAlias = null;

    // Validación para subusuarios (tipo 2)
    if (tipo === 2) {
      if (!aliasAdmin) {
        return res.status(400).send("Debes indicar el alias del administrador");
      }
      
      const admin = await User.findOne({ alias: aliasAdmin, tipo: 1 });
      if (!admin) {
        return res.status(400).send("Administrador no encontrado");
      }
      
      console.log("✅ Subusuario enlazado al admin:", admin.alias);
      adminAlias = aliasAdmin;
    }

    // Validación para administradores enlazados (tipo 1 con enlazadoAAdmin = true)
    if (tipo === 1 && enlazadoAAdmin === true) {
      if (!aliasAdmin) {
        return res.status(400).send("Debes indicar el alias del administrador al que enlazar");
      }
      
      const adminPrincipal = await User.findOne({ alias: aliasAdmin, tipo: 1 });
      if (!adminPrincipal) {
        return res.status(400).send("Administrador principal no encontrado");
      }
      
      // Verificar que el admin principal no esté ya enlazado a otro
      if (adminPrincipal.enlazadoAAdmin === true) {
        return res.status(400).send("No puedes enlazar a un administrador que ya está enlazado a otro");
      }
      
      console.log("✅ Admin enlazado al admin principal:", adminPrincipal.alias);
      adminAlias = aliasAdmin;
    }

    // Crear el nuevo usuario
    const nuevo = new User({
      username,
      password,
      tipo,
      alias,
      aliasAdmin: adminAlias,
      enlazadoAAdmin: enlazadoAAdmin === true ? true : false,
      bloqueado: false // Asegurar que inicie desbloqueado
    });

    await nuevo.save();
    
    console.log("✅ Usuario registrado exitosamente:", {
      username: nuevo.username,
      tipo: nuevo.tipo,
      alias: nuevo.alias,
      aliasAdmin: nuevo.aliasAdmin,
      enlazadoAAdmin: nuevo.enlazadoAAdmin
    });
    
    res.status(200).json({ 
      mensaje: "Registrado correctamente",
      usuario: {
        username: nuevo.username,
        tipo: nuevo.tipo,
        alias: nuevo.alias,
        enlazadoAAdmin: nuevo.enlazadoAAdmin
      }
    });
    
  } catch (err) {
    console.error("Error en registro:", err);
    res.status(500).send("Error al registrar: " + err.message);
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username, password });
    if (!user) {
      console.log("❌ Usuario no encontrado");
      return res.status(401).json({ error: "CREDENCIALES_INVALIDAS", message: "Credenciales inválidas" });
    }

    // 🚫 VERIFICACIÓN CRÍTICA: Comprobar si el usuario está bloqueado
    if (user.bloqueado === true) {
      console.log("🚫 Usuario bloqueado intentando iniciar sesión:", username);
      
      return res.status(403).json({ 
        error: "CUENTA_BLOQUEADA",
        message: "Su cuenta ha sido suspendida. Contacte al administrador.",
        username: username,
        blocked: true
      });
    }

    let datosAdmin = null;

    // 🔥 MODIFICACIÓN CLAVE: Obtener información del admin para subusuarios Y ADMINS ENLAZADOS
    if ((user.tipo === 2) || (user.tipo === 1 && user.enlazadoAAdmin === true)) {
      if (user.aliasAdmin) {
        const admin = await User.findOne({ alias: user.aliasAdmin });
        if (admin) {
          datosAdmin = {
            username: admin.username,
            alias: admin.alias,
            email: admin.email,
            nombre: admin.nombre,
            tipo: admin.tipo,
          };
          console.log("✅ Datos del admin encontrados para enlace:", datosAdmin);
        } else {
          console.log("❌ Admin no encontrado para alias:", user.aliasAdmin);
        }
      }
    }

    req.session.user = user;

    const respuesta = {
      tipo: user.tipo,
      alias: user.alias,
      usuario: user.username,
      enlazadoAAdmin: user.enlazadoAAdmin || false,
      admin: datosAdmin, // Incluir datos del admin enlazado si existe
    };

    console.log("=== RESPUESTA QUE SE ENVIARÁ ===");
    console.log(JSON.stringify(respuesta, null, 2));
    console.log("=== FIN RESPUESTA ===");

    res.status(200).json(respuesta);
  } catch (err) {
    console.error("❌ Error en login:", err);
    res.status(500).json({ 
      error: "ERROR_SERVIDOR", 
      message: "Error interno del servidor" 
    });
  }
});

router.post("/change-password", async (req, res) => {
    const { username, oldPassword, newPassword } = req.body;

    if (!username || !oldPassword || !newPassword) {
        return res.status(400).send({ message: "Faltan campos obligatorios" });
    }

    try {
        // Verificar si el usuario existe
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).send({ message: "Usuario no encontrado" });
        }

        // Verificar si la contraseña anterior es correcta
        if (user.password !== oldPassword) {
            return res.status(401).send({ message: "Contraseña anterior incorrecta" });
        }

        // Actualizar la contraseña
        user.password = newPassword;
        await user.save();

        res.status(200).send({ message: "Contraseña actualizada correctamente" });
    } catch (err) {
        console.error("Error al cambiar la contraseña:", err);
        res.status(500).send({ message: "Error al cambiar la contraseña" });
    }
});

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
      enlazadoAAdmin: admin.enlazadoAAdmin,
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

    console.log("🔍 Buscando información para usuario:", usuario);
    
    const user = await User.findOne({ username: usuario });
    
    if (!user) {
      console.log("❌ Usuario no encontrado:", usuario);
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    console.log("✅ Usuario encontrado:", user.username, "- Bloqueado:", user.bloqueado);
    
    // ⚠️ VERIFICACIÓN CRÍTICA: Si el usuario está bloqueado
    if (user.bloqueado === true) {
      console.log("🚫 Usuario bloqueado detectado:", usuario);
      
      return res.status(403).json({ 
        error: "CUENTA_BLOQUEADA",
        message: "Su cuenta ha sido suspendida. Contacte al administrador.",
        username: usuario,
        blocked: true
      });
    }
    
    // Incluir información completa del usuario
    res.status(200).json({ 
      alias: user.alias,
      username: user.username,
      tipo: user.tipo,
      bloqueado: user.bloqueado || false,
      enlazadoAAdmin: user.enlazadoAAdmin || false,
      aliasAdmin: user.aliasAdmin,
      email: user.email,
      nombre: user.nombre
    });
    
  } catch (error) {
    console.error("❌ Error al obtener información de usuario:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ========== NUEVOS ENDPOINTS PARA SUPER ADMINISTRADOR ==========

// Obtener todos los usuarios administradores (tipo 1)
router.get("/get-all-admins", async (req, res) => {
  try {
    console.log("🔍 Obteniendo todos los usuarios administradores...");
    
    const adminUsers = await User.find({ tipo: 1 }).sort({ username: 1 });
    
    console.log(`✅ Se encontraron ${adminUsers.length} administradores`);
    
    res.status(200).json(adminUsers);
  } catch (error) {
    console.error("❌ Error al obtener administradores:", error);
    res.status(500).json({ error: "Error al obtener administradores" });
  }
});

// Nuevo endpoint: Obtener administradores disponibles para enlazar (que no estén enlazados a otros)
router.get("/get-available-admins", async (req, res) => {
  try {
    console.log("🔍 Obteniendo administradores disponibles para enlazar...");
    
    // Obtener administradores que NO estén enlazados a otros (enlazadoAAdmin = false o no existe)
    const availableAdmins = await User.find({ 
      tipo: 1, 
      $or: [
        { enlazadoAAdmin: false },
        { enlazadoAAdmin: { $exists: false } },
        { enlazadoAAdmin: null }
      ]
    }).sort({ username: 1 });
    
    console.log(`✅ Se encontraron ${availableAdmins.length} administradores disponibles`);
    
    res.status(200).json(availableAdmins);
  } catch (error) {
    console.error("❌ Error al obtener administradores disponibles:", error);
    res.status(500).json({ error: "Error al obtener administradores disponibles" });
  }
});

// Actualizar un usuario
router.put("/update-user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log("🔍 Actualizando usuario:", id);
    console.log("🔍 Datos a actualizar:", updates);
    
    const user = await User.findByIdAndUpdate(
      id, 
      updates, 
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    console.log("✅ Usuario actualizado:", user);
    res.status(200).json({ message: "Usuario actualizado correctamente", user });
    
  } catch (error) {
    console.error("❌ Error al actualizar usuario:", error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// Bloquear usuario
router.put("/block-user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log("🚫 Bloqueando usuario:", id);
    
    const user = await User.findByIdAndUpdate(
      id,
      { bloqueado: true },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    console.log("✅ Usuario bloqueado:", user.username);
    res.status(200).json({ message: "Usuario bloqueado correctamente", user });
    
  } catch (error) {
    console.error("❌ Error al bloquear usuario:", error);
    res.status(500).json({ error: "Error al bloquear usuario" });
  }
});

// Desbloquear usuario
router.put("/unblock-user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log("✅ Desbloqueando usuario:", id);
    
    const user = await User.findByIdAndUpdate(
      id,
      { bloqueado: false },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    console.log("✅ Usuario desbloqueado:", user.username);
    res.status(200).json({ message: "Usuario desbloqueado correctamente", user });
    
  } catch (error) {
    console.error("❌ Error al desbloquear usuario:", error);
    res.status(500).json({ error: "Error al desbloquear usuario" });
  }
});

// Obtener información detallada de un usuario (para inspeccionar)
router.get("/inspect-user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log("🔍 Inspeccionando usuario:", id);
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    // Si es subusuario o admin enlazado, obtener también información del admin
    let adminInfo = null;
    if ((user.tipo === 2 || (user.tipo === 1 && user.enlazadoAAdmin)) && user.aliasAdmin) {
      adminInfo = await User.findOne({ alias: user.aliasAdmin }, {
        username: 1,
        alias: 1,
        email: 1,
        tipo: 1,
        enlazadoAAdmin: 1
      });
    }
    
    // Contar cuántos subusuarios tiene este admin (si es tipo 1)
    let subusuariosCount = 0;
    if (user.tipo === 1) {
      subusuariosCount = await User.countDocuments({ 
        aliasAdmin: user.alias,
        tipo: 2 
      });
    }
    
    // Contar cuántos admins enlazados tiene este admin (si es tipo 1)
    let adminsEnlazadosCount = 0;
    if (user.tipo === 1) {
      adminsEnlazadosCount = await User.countDocuments({ 
        aliasAdmin: user.alias,
        tipo: 1,
        enlazadoAAdmin: true 
      });
    }
    
    const inspection = {
      ...user.toObject(),
      adminInfo,
      subusuariosCount,
      adminsEnlazadosCount,
      fechaCreacion: user.createdAt || "No disponible",
      ultimaActualizacion: user.updatedAt || "No disponible"
    };
    
    console.log("✅ Inspección completa:", inspection);
    res.status(200).json(inspection);
    
  } catch (error) {
    console.error("❌ Error al inspeccionar usuario:", error);
    res.status(500).json({ error: "Error al inspeccionar usuario" });
  }
});

module.exports = router;