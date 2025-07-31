const express = require("express");
const router = express.Router();
const Recogida = require("../models/Recogida");
const User = require("../models/User");

// POST /recogidas/nueva
router.post("/nueva", async (req, res) => {
  console.log("Datos recibidos en la solicitud:", req.body);

  const { fincaId, finca, propietario, fecha, usuario, usuarioAlias, alias, fruta, calidad, precio, totalKilos, valorPagar, pesas, adminAlias } = req.body;

  // Validaciones básicas - precio y valorPagar son opcionales para subusuarios
  if (!fincaId || !fruta || !calidad || !usuario || !totalKilos || !Array.isArray(pesas)) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  try {
    // Obtener datos del usuario que hace la recogida
    const userData = await User.findOne({ username: usuario });
    if (!userData) {
      return res.status(400).json({ error: "Usuario no encontrado" });
    }

    let aliasParaGuardar = alias || usuarioAlias;

    // Si no viene alias, obtenerlo de la base de datos
    if (!aliasParaGuardar) {
      console.log("⚠️ Alias no recibido, usando el de la BD...");
      aliasParaGuardar = userData.alias;
      console.log("✅ Alias obtenido de BD:", aliasParaGuardar);
    } else {
      console.log("✅ Alias recibido en request:", aliasParaGuardar);
    }

    // Determinar si es subusuario
    const isSubusuario = userData.tipo === 2;
    console.log("🔍 Tipo de usuario:", userData.tipo, "- Es subusuario:", isSubusuario);

    // Obtener adminAlias
    let adminAliasParaGuardar = adminAlias;
    if (!adminAliasParaGuardar) {
      if (isSubusuario && userData.aliasAdmin) {
        // Si es subusuario, usar el alias de su administrador
        adminAliasParaGuardar = userData.aliasAdmin;
        console.log("✅ AdminAlias para subusuario:", adminAliasParaGuardar);
      } else if (userData.tipo === 1) {
        // Si es admin, su propio alias es el adminAlias
        adminAliasParaGuardar = userData.alias;
        console.log("✅ AdminAlias para admin:", adminAliasParaGuardar);
      }
    }

    console.log("📝 Creando recogida con:");
    console.log("- Usuario:", usuario);
    console.log("- Alias:", aliasParaGuardar);
    console.log("- AdminAlias:", adminAliasParaGuardar);
    console.log("- Es subusuario:", isSubusuario);

    // 🔥 CORRECCIÓN PRINCIPAL: SIEMPRE GUARDAR PRECIOS COMPLETOS
    // Solo verificar que los precios vengan en la petición
    if (precio === undefined || valorPagar === undefined) {
      return res.status(400).json({ 
        error: "Datos de precio requeridos. Todos los registros deben incluir información de precios." 
      });
    }

    // Preparar datos de la recogida - SIEMPRE con precios
    const datosRecogida = {
      fincaId,
      finca,
      propietario,
      fecha: new Date(fecha).toISOString(),
      usuario,  // Username del usuario
      alias: aliasParaGuardar,
      fruta,
      calidad,
      precio, // 🔥 SIEMPRE incluir precio
      totalKilos,
      valorPagar, // 🔥 SIEMPRE incluir valorPagar
      pesas,
      adminAlias: adminAliasParaGuardar,
      tipoUsuario: userData.tipo // Guardar el tipo de usuario para referencia
    };

    console.log("💰 Guardando recogida con datos completos de precio");
    console.log("📊 Datos finales:", {
      precio: datosRecogida.precio,
      valorPagar: datosRecogida.valorPagar,
      tipoUsuario: datosRecogida.tipoUsuario
    });

    // Crear la recogida
    const recogida = new Recogida(datosRecogida);
    await recogida.save();
    console.log("✅ Recogida guardada exitosamente con precios completos");

    // Actualizar la lista de recogidas del administrador si es necesario
    let recogidasAdmin = [];
    if (adminAliasParaGuardar) {
      recogidasAdmin = await Recogida.find({ adminAlias: adminAliasParaGuardar }).sort({ fecha: -1 });
    }

    res.status(200).json({ 
      success: true, 
      recogida, 
      recogidasAdmin,
      tipoUsuario: userData.tipo,
      esSubusuario: isSubusuario,
      message: "Recogida guardada con información completa"
    });
  } catch (err) {
    console.error("❌ Error al guardar recogida:", err);
    res.status(500).json({ error: "Error interno: " + err.message });
  }
});

// GET /recogidas/por-finca/:fincaId
router.get("/por-finca/:fincaId", async (req, res) => {
  try {
    const fincaId = req.params.fincaId;
    const recogidas = await Recogida.find({ fincaId }).sort({ fecha: -1 });
    res.status(200).json(recogidas);
  } catch (err) {
    console.error("Error al listar recogidas:", err);
    res.status(500).json({ error: "Error al listar recogidas" });
  }
});

// GET /recogidas/por-usuario/:usuario
router.get("/por-usuario/:usuario", async (req, res) => {
  try {
    const usuario = req.params.usuario;
    const recogidas = await Recogida.find({ usuario }).sort({ fecha: -1 });
    res.status(200).json(recogidas);
  } catch (err) {
    console.error("Error al listar recogidas por usuario:", err);
    res.status(500).json({ error: "Error al listar recogidas" });
  }
});

// GET /recogidas/por-admin/:adminAlias
router.get("/por-admin/:adminAlias", async (req, res) => {
  const { adminAlias } = req.params;

  try {
    const recogidas = await Recogida.find({ adminAlias }).sort({ fecha: -1 });
    res.status(200).json(recogidas);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener las recogidas del administrador" });
  }
});

// GET /recogidas/:id
router.get("/:id", async (req, res) => {
  try {
    const recogida = await Recogida.findById(req.params.id);
    if (!recogida) return res.status(404).send("Recogida no encontrada");
    res.json(recogida);
  } catch (err) {
    res.status(500).send("Error al obtener la recogida");
  }
});

// PUT /recogidas/:id — Actualizar recogida
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const datos = req.body;

  try {
    // Obtener la recogida existente
    const recogidaExistente = await Recogida.findById(id);
    if (!recogidaExistente) {
      return res.status(404).json({ mensaje: "Recogida no encontrada" });
    }

    // Obtener datos del usuario
    const userData = await User.findOne({ username: recogidaExistente.usuario });
    const isSubusuario = userData && userData.tipo === 2;

    // Si viene usuarioAlias en la actualización, asegurarse de guardarlo en alias
    if (datos.usuarioAlias && !datos.alias) {
      datos.alias = datos.usuarioAlias;
    }

    // 🔥 CORRECCIÓN: SIEMPRE PERMITIR ACTUALIZACIÓN DE PRECIOS
    // No eliminar datos de precio basándose en el tipo de usuario que registró
    // Los precios siempre deben guardarse y actualizarse correctamente
    
    console.log("📝 Actualizando recogida ID:", id);
    console.log("💰 Datos de precio en actualización:", {
      precio: datos.precio,
      valorPagar: datos.valorPagar
    });

    const recogida = await Recogida.findByIdAndUpdate(id, datos, { new: true });

    console.log("✅ Recogida actualizada con precios:", recogida);
    res.status(200).json(recogida);
  } catch (error) {
    console.error("❌ Error al actualizar recogida:", error);
    res.status(500).json({ mensaje: "Error interno al actualizar la recogida" });
  }
});

// GET /recogidas/resumen/:adminAlias - Obtener resumen con filtrado para subusuarios
router.get("/resumen/:adminAlias", async (req, res) => {
  const { adminAlias } = req.params;
  const { usuario } = req.query; // Para identificar si quien consulta es subusuario

  try {
    const recogidas = await Recogida.find({ adminAlias }).sort({ fecha: -1 });
    
    // Verificar si el usuario que consulta es subusuario
    let userData = null;
    let isSubusuario = false;
    
    if (usuario) {
      userData = await User.findOne({ username: usuario });
      isSubusuario = userData && userData.tipo === 2;
    }

    console.log("📊 Consultando resumen para:", usuario, "- Es subusuario:", isSubusuario);

    // 🔥 CORRECCIÓN: Solo filtrar en la RESPUESTA si quien consulta es subusuario
    // Los datos en BD siempre están completos
    const recogidasFiltradas = recogidas.map(recogida => {
      if (isSubusuario) {
        // Para subusuarios, crear una copia sin datos monetarios EN LA RESPUESTA
        const recogidaFiltrada = { ...recogida.toObject() };
        delete recogidaFiltrada.precio;
        delete recogidaFiltrada.valorPagar;
        
        // También filtrar pesas sin valores monetarios EN LA RESPUESTA
        if (recogidaFiltrada.pesas) {
          recogidaFiltrada.pesas = recogidaFiltrada.pesas.map(pesa => ({
            kilos: pesa.kilos,
            // Omitir valor monetario solo en la respuesta
          }));
        }
        
        return recogidaFiltrada;
      } else {
        // Para administradores, devolver datos completos (como siempre están en BD)
        return recogida;
      }
    });

    res.status(200).json({
      recogidas: recogidasFiltradas,
      tipoUsuario: userData ? userData.tipo : 1,
      esSubusuario: isSubusuario,
      message: `Datos ${isSubusuario ? 'filtrados para subusuario' : 'completos para administrador'}`
    });
  } catch (err) {
    console.error("Error al obtener resumen de recogidas:", err);
    res.status(500).json({ error: "Error al obtener resumen de recogidas" });
  }
});

// Ruta para obtener las recogidas filtradas por fecha
router.get("/recogidas/por-fecha/:fincaId", async (req, res) => {
  const { fincaId } = req.params;
  const { startDate, endDate } = req.query;

  try {
    const recogidas = await Recogida.find({
      fincaId,
      fecha: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).sort({ fecha: -1 });

    res.status(200).json(recogidas);
  } catch (err) {
    console.error("Error al obtener las recogidas filtradas:", err);
    res.status(500).json({ error: "Error al obtener las recogidas filtradas" });
  }
});


// GET /recogidas/resumen/:adminAlias - Nuevo endpoint para obtener resumen sin precios para subusuarios
router.get("/resumen/:adminAlias", async (req, res) => {
  const { adminAlias } = req.params;
  const { usuario } = req.query; // Para identificar si quien consulta es subusuario

  try {
    const recogidas = await Recogida.find({ adminAlias }).sort({ fecha: -1 });
    
    // Verificar si el usuario que consulta es subusuario
    let userData = null;
    let isSubusuario = false;
    
    if (usuario) {
      userData = await User.findOne({ username: usuario });
      isSubusuario = userData && userData.tipo === 2;
    }

    // Si es subusuario, filtrar datos monetarios del resumen
    const recogidasFiltradas = recogidas.map(recogida => {
      if (isSubusuario) {
        // Para subusuarios, crear una copia sin datos monetarios
        const recogidaFiltrada = { ...recogida.toObject() };
        delete recogidaFiltrada.precio;
        delete recogidaFiltrada.valorPagar;
        
        // También filtrar pesas sin valores monetarios
        if (recogidaFiltrada.pesas) {
          recogidaFiltrada.pesas = recogidaFiltrada.pesas.map(pesa => ({
            kilos: pesa.kilos,
            // Omitir valor monetario
          }));
        }
        
        return recogidaFiltrada;
      } else {
        // Para administradores, devolver datos completos
        return recogida;
      }
    });

    res.status(200).json({
      recogidas: recogidasFiltradas,
      tipoUsuario: userData ? userData.tipo : 1,
      esSubusuario: isSubusuario
    });
  } catch (err) {
    console.error("Error al obtener resumen de recogidas:", err);
    res.status(500).json({ error: "Error al obtener resumen de recogidas" });
  }
});

module.exports = router;