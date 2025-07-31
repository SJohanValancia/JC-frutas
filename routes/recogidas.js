const express = require("express");
const router = express.Router();
const Recogida = require("../models/Recogida");
const User = require("../models/User");

// POST /recogidas/nueva - CORREGIDO PARA MANTENER FRUTAS INDIVIDUALES
router.post("/nueva", async (req, res) => {
  console.log("=== GUARDANDO RECOGIDA CON FRUTAS INDIVIDUALES ===");
  console.log("Datos recibidos:", req.body);

  const { 
    fincaId, finca, propietario, fecha, usuario, usuarioAlias, alias, 
    fruta, calidad, precio, totalKilos, valorPagar, pesas, adminAlias,
    esRecogidaMultiple, resumenFrutas, resumenCalidades 
  } = req.body;

  // Validaciones básicas
  if (!fincaId || !fruta || !calidad || !usuario || !totalKilos || !Array.isArray(pesas)) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  // 🔥 VALIDACIÓN CRÍTICA: Verificar que cada pesa tenga fruta y calidad
  const pesasInvalidas = pesas.filter(pesa => !pesa.fruta || !pesa.calidad);
  if (pesasInvalidas.length > 0) {
    console.error("❌ Pesas sin fruta/calidad encontradas:", pesasInvalidas);
    return res.status(400).json({ 
      error: "Todas las pesas deben tener fruta y calidad especificadas",
      pesasInvalidas: pesasInvalidas
    });
  }

  try {
    // Obtener datos del usuario
    const userData = await User.findOne({ username: usuario });
    if (!userData) {
      return res.status(400).json({ error: "Usuario no encontrado" });
    }

    let aliasParaGuardar = alias || usuarioAlias;
    if (!aliasParaGuardar) {
      console.log("⚠️ Alias no recibido, usando el de la BD...");
      aliasParaGuardar = userData.alias;
    }

    const isSubusuario = userData.tipo === 2;
    console.log("🔍 Tipo de usuario:", userData.tipo, "- Es subusuario:", isSubusuario);

    // Obtener adminAlias
    let adminAliasParaGuardar = adminAlias;
    if (!adminAliasParaGuardar) {
      if (isSubusuario && userData.aliasAdmin) {
        adminAliasParaGuardar = userData.aliasAdmin;
      } else if (userData.tipo === 1) {
        adminAliasParaGuardar = userData.alias;
      }
    }

    // 🔥 VALIDAR QUE TODAS LAS PESAS TENGAN INFORMACIÓN COMPLETA
    console.log("🔍 Validando información individual de pesas:");
    pesas.forEach((pesa, idx) => {
      console.log(`   Pesa ${idx + 1}: ${pesa.kilos}kg de ${pesa.fruta} (${pesa.calidad}) - Precio: ${pesa.precio}`);
      
      if (!pesa.fruta || !pesa.calidad) {
        throw new Error(`Pesa ${idx + 1} no tiene información completa de fruta/calidad`);
      }
    });

    // Validar precios
    if (precio === undefined || valorPagar === undefined) {
      return res.status(400).json({ 
        error: "Datos de precio requeridos" 
      });
    }

    // 🔥 PREPARAR DATOS MANTENIENDO PESAS INDIVIDUALES INTACTAS
    const datosRecogida = {
      fincaId,
      finca,
      propietario,
      fecha: new Date(fecha).toISOString(),
      usuario,
      alias: aliasParaGuardar,
      fruta, // Fruta principal (para referencia)
      calidad, // Calidad principal (para referencia)
      precio, // Precio principal (para referencia)
      totalKilos,
      valorPagar,
      pesas, // 🔥 PESAS CON FRUTAS Y CALIDADES INDIVIDUALES INTACTAS
      adminAlias: adminAliasParaGuardar,
      tipoUsuario: userData.tipo,
      
      // 🔥 CAMPOS ADICIONALES PARA RECOGIDAS MÚLTIPLES
      esRecogidaMultiple: esRecogidaMultiple || false,
      resumenFrutas: resumenFrutas || {},
      resumenCalidades: resumenCalidades || {}
    };

    console.log("💾 Guardando recogida con pesas individuales:");
    console.log("📊 Resumen de frutas:", datosRecogida.resumenFrutas);
    console.log("📊 Resumen de calidades:", datosRecogida.resumenCalidades);
    console.log("📦 Total pesas con info individual:", datosRecogida.pesas.length);

    // Crear y guardar la recogida
    const recogida = new Recogida(datosRecogida);
    await recogida.save();

    console.log("✅ Recogida guardada exitosamente manteniendo frutas individuales");
    
    // 🔥 VERIFICACIÓN POST-GUARDADO
    console.log("🔍 Verificación de pesas guardadas:");
    recogida.pesas.forEach((pesa, idx) => {
      console.log(`   ✓ Pesa ${idx + 1}: ${pesa.kilos}kg de ${pesa.fruta} (${pesa.calidad})`);
    });

    // Actualizar lista del administrador
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
      message: "Recogida guardada manteniendo frutas individuales por pesa",
      estadisticas: {
        totalPesas: recogida.pesas.length,
        frutasUnicas: [...new Set(recogida.pesas.map(p => p.fruta))],
        calidadesUnicas: [...new Set(recogida.pesas.map(p => p.calidad))],
        esMultiple: recogida.esRecogidaMultiple
      }
    });
  } catch (err) {
    console.error("❌ Error al guardar recogida con frutas individuales:", err);
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

// GET /recogidas/:id - CORREGIDO PARA MANTENER FRUTAS INDIVIDUALES
router.get("/:id", async (req, res) => {
  try {
    const recogida = await Recogida.findById(req.params.id);
    if (!recogida) return res.status(404).send("Recogida no encontrada");
    
    // 🔥 LOG PARA VERIFICAR QUE SE MANTIENEN LAS FRUTAS INDIVIDUALES
    console.log("📥 Recogida solicitada:", req.params.id);
    console.log("🔍 Pesas individuales en la respuesta:");
    recogida.pesas.forEach((pesa, idx) => {
      console.log(`   Pesa ${idx + 1}: ${pesa.kilos}kg de ${pesa.fruta} (${pesa.calidad})`);
    });
    
    res.json(recogida);
  } catch (err) {
    res.status(500).send("Error al obtener la recogida");
  }
});

// PUT /recogidas/:id - CORREGIDO PARA MANTENER FRUTAS INDIVIDUALES EN ACTUALIZACIÓN
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const datos = req.body;

  try {
    const recogidaExistente = await Recogida.findById(id);
    if (!recogidaExistente) {
      return res.status(404).json({ mensaje: "Recogida no encontrada" });
    }

    const userData = await User.findOne({ username: recogidaExistente.usuario });
    const isSubusuario = userData && userData.tipo === 2;

    if (datos.usuarioAlias && !datos.alias) {
      datos.alias = datos.usuarioAlias;
    }

    // 🔥 VALIDAR PESAS EN ACTUALIZACIÓN
    if (datos.pesas && Array.isArray(datos.pesas)) {
      console.log("🔄 Actualizando recogida manteniendo frutas individuales:");
      
      const pesasInvalidas = datos.pesas.filter(pesa => !pesa.fruta || !pesa.calidad);
      if (pesasInvalidas.length > 0) {
        return res.status(400).json({ 
          error: "Todas las pesas deben mantener su fruta y calidad individual",
          pesasInvalidas: pesasInvalidas
        });
      }
      
      // Log de verificación
      datos.pesas.forEach((pesa, idx) => {
        console.log(`   Actualizando pesa ${idx + 1}: ${pesa.kilos}kg de ${pesa.fruta} (${pesa.calidad})`);
      });
    }

    console.log("📝 Actualizando recogida ID:", id);
    console.log("💰 Datos de precio en actualización:", {
      precio: datos.precio,
      valorPagar: datos.valorPagar
    });

    const recogida = await Recogida.findByIdAndUpdate(id, datos, { new: true });

    // 🔥 VERIFICACIÓN POST-ACTUALIZACIÓN
    console.log("✅ Recogida actualizada manteniendo frutas individuales:");
    if (recogida.pesas) {
      recogida.pesas.forEach((pesa, idx) => {
        console.log(`   ✓ Pesa ${idx + 1}: ${pesa.kilos}kg de ${pesa.fruta} (${pesa.calidad})`);
      });
    }

    res.status(200).json(recogida);
  } catch (error) {
    console.error("❌ Error al actualizar recogida:", error);
    res.status(500).json({ mensaje: "Error interno al actualizar la recogida" });
  }
});

// GET /recogidas/resumen/:adminAlias - CORREGIDO PARA MANTENER FRUTAS INDIVIDUALES
router.get("/resumen/:adminAlias", async (req, res) => {
  const { adminAlias } = req.params;
  const { usuario } = req.query;

  try {
    const recogidas = await Recogida.find({ adminAlias }).sort({ fecha: -1 });
    
    let userData = null;
    let isSubusuario = false;
    
    if (usuario) {
      userData = await User.findOne({ username: usuario });
      isSubusuario = userData && userData.tipo === 2;
    }

    console.log("📊 Consultando resumen para:", usuario, "- Es subusuario:", isSubusuario);

    // 🔥 FILTRAR SOLO PRECIOS, NO FRUTAS/CALIDADES INDIVIDUALES
    const recogidasFiltradas = recogidas.map(recogida => {
      if (isSubusuario) {
        const recogidaFiltrada = { ...recogida.toObject() };
        delete recogidaFiltrada.precio;
        delete recogidaFiltrada.valorPagar;
        
        // 🔥 MANTENER FRUTAS Y CALIDADES, SOLO QUITAR VALORES MONETARIOS
        if (recogidaFiltrada.pesas) {
          recogidaFiltrada.pesas = recogidaFiltrada.pesas.map(pesa => ({
            kilos: pesa.kilos,
            fruta: pesa.fruta, // 🔥 MANTENER FRUTA INDIVIDUAL
            calidad: pesa.calidad, // 🔥 MANTENER CALIDAD INDIVIDUAL
            // Omitir solo valor y precio monetarios
          }));
        }
        
        return recogidaFiltrada;
      } else {
        return recogida;
      }
    });

    res.status(200).json({
      recogidas: recogidasFiltradas,
      tipoUsuario: userData ? userData.tipo : 1,
      esSubusuario: isSubusuario,
      message: `Datos ${isSubusuario ? 'filtrados (sin precios) manteniendo frutas individuales' : 'completos'}`
    });
  } catch (err) {
    console.error("Error al obtener resumen de recogidas:", err);
    res.status(500).json({ error: "Error al obtener resumen de recogidas" });
  }
});

// GET /recogidas/recogidas/por-fecha/:fincaId - Filtrar por fecha manteniendo frutas individuales
router.get("/recogidas/por-fecha/:fincaId", async (req, res) => {
  const { fincaId } = req.params;
  const { startDate, endDate } = req.query;

  try {
    const recogidas = await Recogida.find({
      fincaId,
      fecha: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).sort({ fecha: -1 });

    // Log para verificar que se mantienen las frutas individuales
    console.log("📅 Recogidas filtradas por fecha - verificando frutas individuales:");
    recogidas.forEach((recogida, idx) => {
      if (recogida.pesas && recogida.pesas.length > 0) {
        console.log(`   Recogida ${idx + 1}: ${recogida.pesas.length} pesas`);
        const frutasUnicas = [...new Set(recogida.pesas.map(p => p.fruta))];
        console.log(`   Frutas individuales: ${frutasUnicas.join(', ')}`);
      }
    });

    res.status(200).json(recogidas);
  } catch (err) {
    console.error("Error al obtener las recogidas filtradas:", err);
    res.status(500).json({ error: "Error al obtener las recogidas filtradas" });
  }
});



// 🔥 NUEVA RUTA: Estadísticas de recogidas múltiples
router.get("/estadisticas/:adminAlias", async (req, res) => {
  const { adminAlias } = req.params;
  
  try {
    const recogidas = await Recogida.find({ adminAlias });
    
    const estadisticas = {
      totalRecogidas: recogidas.length,
      recogidasMultiples: recogidas.filter(r => r.esRecogidaMultiple).length,
      frutasMasRecogidas: {},
      calidadesMasRecogidas: {},
      promedioKilosPorRecogida: 0,
      totalKilosGeneral: 0
    };
    
    // Calcular estadísticas detalladas
    recogidas.forEach(recogida => {
      estadisticas.totalKilosGeneral += recogida.totalKilos;
      
      if (recogida.pesas) {
        recogida.pesas.forEach(pesa => {
          // Contar frutas individuales
          if (!estadisticas.frutasMasRecogidas[pesa.fruta]) {
            estadisticas.frutasMasRecogidas[pesa.fruta] = 0;
          }
          estadisticas.frutasMasRecogidas[pesa.fruta] += pesa.kilos;
          
          // Contar calidades individuales
          if (!estadisticas.calidadesMasRecogidas[pesa.calidad]) {
            estadisticas.calidadesMasRecogidas[pesa.calidad] = 0;
          }
          estadisticas.calidadesMasRecogidas[pesa.calidad] += pesa.kilos;
        });
      }
    });
    
    estadisticas.promedioKilosPorRecogida = estadisticas.totalKilosGeneral / estadisticas.totalRecogidas || 0;
    
    res.status(200).json(estadisticas);
  } catch (err) {
    console.error("Error al obtener estadísticas:", err);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

router.put("/actualizar-global/:frutaId", async (req, res) => {
  const frutaId = req.params.frutaId;
  const { nombre, precios, usuario, adminAlias } = req.body;

  if (!precios || !usuario || !adminAlias) {
    return res.status(400).send("Datos incompletos");
  }

  try {
    // ✅ Buscar TODAS las fincas que tengan esa fruta
    const fincasConFruta = await PrecioFruta.find({ "frutas._id": frutaId });
    
    let fincasActualizadas = 0;

    // ✅ Actualizar cada finca que tenga esa fruta
    for (const finca of fincasConFruta) {
      const frutaIndex = finca.frutas.findIndex(f => f._id.toString() === frutaId);
      
      if (frutaIndex !== -1) {
        // Actualizar los precios de la fruta
        if (nombre) finca.frutas[frutaIndex].nombre = nombre;
        finca.frutas[frutaIndex].precios = precios;
        finca.usuario = usuario;
        finca.adminAlias = adminAlias;
        finca.fechaActualizacion = new Date();
        
        await finca.save();
        fincasActualizadas++;
      }
    }

    // ✅ También actualizar los precios base (fincaId: null) si existe
    const preciosBase = await PrecioFruta.findOne({ fincaId: null });
    if (preciosBase) {
      const frutaBaseIndex = preciosBase.frutas.findIndex(f => f._id.toString() === frutaId);
      if (frutaBaseIndex !== -1) {
        if (nombre) preciosBase.frutas[frutaBaseIndex].nombre = nombre;
        preciosBase.frutas[frutaBaseIndex].precios = precios;
        preciosBase.usuario = usuario;
        preciosBase.adminAlias = adminAlias;
        preciosBase.fechaActualizacion = new Date();
        await preciosBase.save();
        fincasActualizadas++;
      }
    }

    console.log(`✅ Precios actualizados GLOBALMENTE en ${fincasActualizadas} registros`);
    res.status(200).json({ 
      message: "Precios actualizados globalmente en todas las fincas",
      fincasActualizadas: fincasActualizadas
    });
    
  } catch (err) {
    console.error("Error al actualizar precios globalmente:", err);
    res.status(500).send("Error al actualizar precios globalmente");
  }
});

// ✅ NUEVA RUTA: Obtener precios con frecuencias (precio más común)
router.get("/fruta-con-frecuencia/:frutaId", async (req, res) => {
  const frutaId = req.params.frutaId;
  
  try {
    // Buscar todas las fincas que tengan esa fruta
    const fincasConFruta = await PrecioFruta.find({ "frutas._id": frutaId }).lean();
    
    if (fincasConFruta.length === 0) {
      return res.status(404).send("Fruta no encontrada");
    }
    
    // Recopilar todos los precios de esa fruta
    const todosLosPrecios = [];
    let nombreFruta = "";
    
    fincasConFruta.forEach(finca => {
      const fruta = finca.frutas.find(f => f._id.toString() === frutaId);
      if (fruta) {
        nombreFruta = fruta.nombre;
        todosLosPrecios.push({
          primera: fruta.precios?.primera || 0,
          segunda: fruta.precios?.segunda || 0,
          tercera: fruta.precios?.tercera || 0
        });
      }
    });

    // ✅ Calcular el precio más frecuente para cada calidad
    const precioMasFrecuente = {
      primera: calcularPrecioMasFrecuente(todosLosPrecios.map(p => p.primera)),
      segunda: calcularPrecioMasFrecuente(todosLosPrecios.map(p => p.segunda)),
      tercera: calcularPrecioMasFrecuente(todosLosPrecios.map(p => p.tercera))
    };

    const resultado = {
      _id: frutaId,
      nombre: nombreFruta,
      precios: precioMasFrecuente,
      estadisticas: {
        totalFincas: todosLosPrecios.length,
        variacionesPrecios: todosLosPrecios
      }
    };
    
    res.status(200).json(resultado);
  } catch (err) {
    console.error("Error al buscar fruta con frecuencia:", err);
    res.status(500).send("Error al buscar fruta");
  }
});

// ✅ Función auxiliar para calcular el precio más frecuente
function calcularPrecioMasFrecuente(precios) {
  if (precios.length === 0) return 0;
  
  // Contar frecuencias
  const frecuencias = {};
  precios.forEach(precio => {
    const precioStr = precio.toString();
    frecuencias[precioStr] = (frecuencias[precioStr] || 0) + 1;
  });
  
  // Encontrar el precio con mayor frecuencia
  let maxFrecuencia = 0;
  let precioMasFrecuente = precios[0];
  
  Object.entries(frecuencias).forEach(([precio, frecuencia]) => {
    if (frecuencia > maxFrecuencia) {
      maxFrecuencia = frecuencia;
      precioMasFrecuente = parseFloat(precio);
    }
  });
  
  return precioMasFrecuente;
}

// ✅ NUEVA RUTA: Obtener todos los precios con frecuencias
router.get("/todos-los-precios-con-frecuencia", async (req, res) => {
  try {
    // Obtener precios de todas las fincas
    const precios = await PrecioFruta.find({}).lean();

    // Agrupar todas las frutas por nombre
    const frutasPorNombre = {};
    
    precios.forEach(precio => {
      precio.frutas.forEach(fruta => {
        const nombreLower = fruta.nombre.toLowerCase();
        if (!frutasPorNombre[nombreLower]) {
          frutasPorNombre[nombreLower] = {
            _id: fruta._id,
            nombre: fruta.nombre,
            precios: []
          };
        }
        frutasPorNombre[nombreLower].precios.push(fruta.precios || { primera: 0, segunda: 0, tercera: 0 });
      });
    });

    // Calcular precio más frecuente para cada fruta
    const frutasFinales = Object.values(frutasPorNombre).map(fruta => {
      const precioMasFrecuente = {
        primera: calcularPrecioMasFrecuente(fruta.precios.map(p => p.primera)),
        segunda: calcularPrecioMasFrecuente(fruta.precios.map(p => p.segunda)),
        tercera: calcularPrecioMasFrecuente(fruta.precios.map(p => p.tercera))
      };

      return {
        _id: fruta._id,
        nombre: fruta.nombre,
        precios: precioMasFrecuente,
        estadisticas: {
          totalVariaciones: fruta.precios.length
        }
      };
    });

    res.status(200).json(frutasFinales);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al buscar precios");
  }
});

module.exports = router;