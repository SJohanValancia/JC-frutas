const express = require("express");
const router = express.Router();
const PrecioFruta = require("../models/PrecioFruta");

// GET /precios/todos-los-precios - Obtener todos los precios base
router.get("/todos-los-precios", async (req, res) => {
  try {
    const precios = await PrecioFruta.findOne({ fincaId: null });
    if (!precios) {
      return res.status(200).json([]);
    }
    res.status(200).json(precios.frutas);
  } catch (err) {
    console.error("Error al buscar precios base:", err);
    res.status(500).json({ error: "Error al buscar precios: " + err.message });
  }
});

// 🔥 NUEVA RUTA: GET /precios/primera-finca-usuario - Obtener precios de la primera finca del usuario
router.get("/primera-finca-usuario", async (req, res) => {
  const { usuario } = req.query;
  
  console.log(`🔍 Buscando primera finca con precios para usuario: ${usuario}`);
  
  if (!usuario) {
    return res.status(400).json({ error: "Usuario requerido" });
  }
  
  try {
    // Buscar la primera finca que tenga frutas y pertenezca al usuario
    const primeraFincaConPrecios = await PrecioFruta.findOne({
      fincaId: { $ne: null }, // Solo fincas específicas (no precios base)
      $or: [
        { usuario: usuario },
        { adminAlias: usuario }
      ],
      frutas: { $exists: true, $not: { $size: 0 } } // Que tenga frutas
    }).sort({ fecha: 1 }); // Ordenar por fecha más antigua (primera creada)
    
    if (!primeraFincaConPrecios) {
      console.log(`ℹ️ Usuario ${usuario} no tiene fincas con precios aún`);
      return res.status(404).json({ 
        message: "Usuario no tiene fincas con precios configurados",
        frutas: []
      });
    }
    
    console.log(`✅ Encontrada primera finca con precios: ${primeraFincaConPrecios.fincaId}`);
    console.log(`📊 Total de frutas en la primera finca: ${primeraFincaConPrecios.frutas.length}`);
    
    res.status(200).json({
      fincaId: primeraFincaConPrecios.fincaId,
      fecha: primeraFincaConPrecios.fecha,
      frutas: primeraFincaConPrecios.frutas,
      mensaje: `Precios cargados desde la primera finca del usuario (${primeraFincaConPrecios.frutas.length} frutas)`
    });
    
  } catch (err) {
    console.error("❌ Error al buscar primera finca del usuario:", err);
    res.status(500).json({ error: "Error al buscar primera finca: " + err.message });
  }
});

// GET /precios/por-finca/:fincaId - Obtener precios específicos de una finca
router.get("/por-finca/:fincaId", async (req, res) => {
  try {
    const fincaId = req.params.fincaId;
    const precios = await PrecioFruta.find({ fincaId: fincaId });
    res.status(200).json(precios);
  } catch (err) {
    console.error("Error al buscar precios por finca:", err);
    res.status(500).json({ error: "Error al buscar precios por finca: " + err.message });
  }
});

// POST /precios/agregar-fruta/:fincaId - Agregar fruta a una finca específica
router.post("/agregar-fruta/:fincaId", async (req, res) => {
  const fincaId = req.params.fincaId;
  const { fruta, usuario, adminAlias } = req.body;

  console.log(`🍎 Agregando fruta a finca ${fincaId}:`, fruta);

  if (!fruta || !fruta.nombre || !fruta.precios) {
    return res.status(400).json({ error: "Datos de fruta incompletos" });
  }

  if (!usuario) {
    return res.status(400).json({ error: "Usuario requerido" });
  }

  try {
    let preciosFinca = await PrecioFruta.findOne({ fincaId: fincaId });
    
    if (!preciosFinca) {
      // Crear nuevo registro de precios para la finca
      preciosFinca = new PrecioFruta({
        fincaId: fincaId,
        frutas: [fruta],
        usuario: usuario,
        adminAlias: adminAlias || usuario,
        fecha: new Date()
      });
    } else {
      // Verificar si la fruta ya existe
      const frutaExistente = preciosFinca.frutas.find(f => 
        f.nombre.toLowerCase() === fruta.nombre.toLowerCase()
      );
      
      if (frutaExistente) {
        return res.status(400).json({ error: "Esta fruta ya existe en la finca" });
      }
      
      // Agregar nueva fruta
      preciosFinca.frutas.push(fruta);
      preciosFinca.usuario = usuario;
      preciosFinca.adminAlias = adminAlias || usuario;
      preciosFinca.fecha = new Date();
    }

    await preciosFinca.save();
    console.log(`✅ Fruta ${fruta.nombre} agregada a finca ${fincaId}`);
    
    res.status(200).json({ 
      success: true,
      message: "Fruta agregada correctamente", 
      preciosFinca: preciosFinca 
    });
  } catch (err) {
    console.error("❌ Error al agregar fruta:", err);
    res.status(500).json({ error: "Error al agregar fruta: " + err.message });
  }
});

// PUT /precios/actualizar/:frutaId - Actualizar una fruta específica en una finca
router.put("/actualizar/:frutaId", async (req, res) => {
  const frutaId = req.params.frutaId;
  const { nombre, precios, usuario, adminAlias, fincaId } = req.body;

  console.log(`📝 Actualizando fruta ${frutaId} en finca ${fincaId}`);

  if (!precios || !usuario || !fincaId) {
    return res.status(400).json({ error: "Datos incompletos para actualización" });
  }

  try {
    const preciosFinca = await PrecioFruta.findOne({ fincaId: fincaId });
    
    if (!preciosFinca) {
      return res.status(404).json({ error: "Precios de finca no encontrados" });
    }

    const frutaIndex = preciosFinca.frutas.findIndex(f => f._id.toString() === frutaId);
    
    if (frutaIndex === -1) {
      return res.status(404).json({ error: "Fruta no encontrada en esta finca" });
    }

    // Actualizar la fruta
    if (nombre) preciosFinca.frutas[frutaIndex].nombre = nombre;
    preciosFinca.frutas[frutaIndex].precios = {
      primera: precios.primera,
      segunda: precios.segunda,
      tercera: precios.tercera
    };
    preciosFinca.usuario = usuario;
    preciosFinca.adminAlias = adminAlias || usuario;
    preciosFinca.fecha = new Date();

    await preciosFinca.save();
    console.log(`✅ Fruta actualizada en finca ${fincaId}`);
    
    res.status(200).json({ 
      success: true,
      message: "Fruta actualizada correctamente en esta finca",
      fruta: preciosFinca.frutas[frutaIndex]
    });
  } catch (err) {
    console.error("❌ Error al actualizar fruta:", err);
    res.status(500).json({ error: "Error al actualizar fruta: " + err.message });
  }
});

// 🔥 PUT /precios/actualizar-global/:frutaId - ACTUALIZACIÓN GLOBAL DE PRECIOS
router.put("/actualizar-global/:frutaId", async (req, res) => {
  const frutaId = req.params.frutaId;
  const { precios, usuario, adminAlias } = req.body;

  console.log(`🌍 INICIANDO ACTUALIZACIÓN GLOBAL para fruta ${frutaId}`);
  console.log("📝 Nuevos precios:", precios);
  console.log("👤 Usuario:", usuario, "Admin:", adminAlias);

  if (!precios || !usuario) {
    return res.status(400).json({ error: "Datos incompletos para actualización global" });
  }

  // Validar precios
  if (typeof precios.primera !== 'number' || typeof precios.segunda !== 'number' || typeof precios.tercera !== 'number') {
    return res.status(400).json({ error: "Los precios deben ser números válidos" });
  }

  if (precios.primera < 0 || precios.segunda < 0 || precios.tercera < 0) {
    return res.status(400).json({ error: "Los precios no pueden ser negativos" });
  }

  try {
    // ✅ Buscar TODAS las fincas que tengan esa fruta Y que pertenezcan al usuario/admin
    const filtrosBusqueda = {
      "frutas._id": frutaId
    };

    // Solo filtrar por usuario si se proporciona adminAlias o usuario
    if (adminAlias || usuario) {
      filtrosBusqueda.$or = [
        { adminAlias: adminAlias || usuario },
        { usuario: usuario }
      ];
    }

    const fincasConFruta = await PrecioFruta.find(filtrosBusqueda);
    
    console.log(`🔍 Encontradas ${fincasConFruta.length} fincas con la fruta para actualizar`);
    
    if (fincasConFruta.length === 0) {
      return res.status(404).json({ 
        error: "No se encontraron fincas con esta fruta para el usuario actual" 
      });
    }

    let fincasActualizadas = 0;
    let erroresActualizacion = [];

    // ✅ Actualizar cada finca que tenga esa fruta
    for (const finca of fincasConFruta) {
      try {
        const frutaIndex = finca.frutas.findIndex(f => f._id.toString() === frutaId);
        
        if (frutaIndex !== -1) {
          console.log(`📝 Actualizando fruta en finca: ${finca.fincaId || 'Base'}`);
          
          // Actualizar los precios de la fruta
          finca.frutas[frutaIndex].precios = {
            primera: precios.primera,
            segunda: precios.segunda,
            tercera: precios.tercera
          };
          
          finca.usuario = usuario;
          finca.adminAlias = adminAlias || usuario;
          finca.fecha = new Date();
          
          await finca.save();
          fincasActualizadas++;
          
          console.log(`✅ Finca actualizada: ${finca.fincaId || 'Base'} - Nuevos precios aplicados`);
        }
      } catch (fincaError) {
        console.error(`❌ Error actualizando finca ${finca.fincaId}:`, fincaError);
        erroresActualizacion.push({
          fincaId: finca.fincaId,
          error: fincaError.message
        });
      }
    }

    // Verificar si hubo errores
    if (erroresActualizacion.length > 0) {
      console.warn(`⚠️ Se encontraron ${erroresActualizacion.length} errores durante la actualización`);
    }

    console.log(`🎉 ACTUALIZACIÓN GLOBAL COMPLETADA: ${fincasActualizadas} registros actualizados`);
    
    res.status(200).json({ 
      success: true,
      message: `Precios actualizados globalmente en ${fincasActualizadas} finca(s)`,
      fincasActualizadas: fincasActualizadas,
      preciosAplicados: precios,
      errores: erroresActualizacion.length > 0 ? erroresActualizacion : undefined,
      detalles: {
        fincasEncontradas: fincasConFruta.length,
        fincasActualizadas: fincasActualizadas,
        errores: erroresActualizacion.length
      }
    });
    
  } catch (err) {
    console.error("❌ Error crítico al actualizar precios globalmente:", err);
    res.status(500).json({ 
      error: "Error interno al actualizar precios globalmente",
      detalles: err.message 
    });
  }
});

// DELETE /precios/eliminar/:frutaId - Eliminar fruta de una finca específica
router.delete("/eliminar/:frutaId", async (req, res) => {
  const frutaId = req.params.frutaId;
  const { usuario, adminAlias, fincaId } = req.body;

  console.log(`🗑️ Eliminando fruta ${frutaId} de finca ${fincaId}`);

  if (!usuario || !fincaId) {
    return res.status(400).json({ error: "Datos incompletos para eliminación" });
  }

  try {
    const preciosFinca = await PrecioFruta.findOne({ fincaId: fincaId });
    
    if (!preciosFinca) {
      return res.status(404).json({ error: "Precios de finca no encontrados" });
    }

    const frutaIndex = preciosFinca.frutas.findIndex(f => f._id.toString() === frutaId);
    
    if (frutaIndex === -1) {
      return res.status(404).json({ error: "Fruta no encontrada en esta finca" });
    }

    const nombreFruta = preciosFinca.frutas[frutaIndex].nombre;

    // Eliminar la fruta del array
    preciosFinca.frutas.splice(frutaIndex, 1);
    preciosFinca.usuario = usuario;
    preciosFinca.adminAlias = adminAlias || usuario;
    preciosFinca.fecha = new Date();

    await preciosFinca.save();
    console.log(`✅ Fruta ${nombreFruta} eliminada de finca ${fincaId}`);
    
    res.status(200).json({ 
      success: true,
      message: `Fruta ${nombreFruta} eliminada correctamente de esta finca`
    });
  } catch (err) {
    console.error("❌ Error al eliminar fruta:", err);
    res.status(500).json({ error: "Error al eliminar fruta: " + err.message });
  }
});

// ✅ GET /precios/fruta-con-frecuencia/:frutaId - Obtener precios con frecuencias de una fruta específica
router.get("/fruta-con-frecuencia/:frutaId", async (req, res) => {
  const frutaId = req.params.frutaId;
  const { usuario, adminAlias } = req.query;
  
  console.log(`📊 Consultando precios con frecuencia para fruta ${frutaId}`);
  console.log(`👤 Filtros: usuario=${usuario}, adminAlias=${adminAlias}`);
  
  try {
    // 🔥 CONSULTA MEJORADA: Buscar todas las fincas que tengan esa fruta
    const filtros = {
      "frutas._id": frutaId
    };
    
    // ✅ Filtrar por usuario solo si se proporciona
    if (usuario || adminAlias) {
      filtros.$or = [
        { adminAlias: adminAlias || usuario },
        { usuario: usuario },
        // ✅ FALLBACK: También buscar documentos sin estos campos (compatibilidad hacia atrás)
        { usuario: { $exists: false } },
        { adminAlias: { $exists: false } }
      ];
    }
    
    console.log("🔍 Filtros aplicados:", JSON.stringify(filtros, null, 2));
    
    const fincasConFruta = await PrecioFruta.find(filtros).lean();
    console.log(`📊 Documentos encontrados: ${fincasConFruta.length}`);
    
    if (fincasConFruta.length === 0) {
      return res.status(404).json({ error: "Fruta no encontrada en las fincas del usuario" });
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

    // Calcular el precio más frecuente para cada calidad
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
    
    console.log(`✅ Precios con frecuencia calculados para ${nombreFruta}`);
    res.status(200).json(resultado);
  } catch (err) {
    console.error("❌ Error al buscar fruta con frecuencia:", err);
    res.status(500).json({ error: "Error al buscar fruta: " + err.message });
  }
});

// ✅ GET /precios/todos-los-precios-con-frecuencia - RUTA CORREGIDA
router.get("/todos-los-precios-con-frecuencia", async (req, res) => {
  const { usuario, adminAlias } = req.query;
  
  console.log(`📊 Consultando todos los precios con frecuencia para usuario: ${usuario || adminAlias}`);
  
  try {
    // 🔥 CONSULTA MEJORADA: Incluir compatibilidad hacia atrás
    const filtros = {};
    
    if (usuario || adminAlias) {
      filtros.$or = [
        { adminAlias: adminAlias || usuario },
        { usuario: usuario },
        // ✅ FALLBACK: También buscar documentos antiguos sin estos campos
        { usuario: { $exists: false } },
        { adminAlias: { $exists: false } }
      ];
    }
    
    console.log("🔍 Filtros aplicados:", JSON.stringify(filtros, null, 2));
    
    const precios = await PrecioFruta.find(filtros).lean();
    console.log(`🔍 Encontrados ${precios.length} registros de precios totales`);

    if (precios.length === 0) {
      console.log("⚠️ No se encontraron registros de precios");
      return res.status(200).json([]);
    }

    // ✅ DEBUG: Mostrar algunos documentos encontrados
    console.log("📋 Primeros 3 documentos encontrados:");
    precios.slice(0, 3).forEach((doc, index) => {
      console.log(`  ${index + 1}. FincaId: ${doc.fincaId}, Usuario: ${doc.usuario}, AdminAlias: ${doc.adminAlias}, Frutas: ${doc.frutas?.length || 0}`);
    });

    // Agrupar todas las frutas por nombre
    const frutasPorNombre = {};
    let totalFrutasEncontradas = 0;
    
    precios.forEach(precio => {
      if (precio.frutas && Array.isArray(precio.frutas)) {
        precio.frutas.forEach(fruta => {
          totalFrutasEncontradas++;
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
      }
    });

    console.log(`🍎 Total de frutas individuales encontradas: ${totalFrutasEncontradas}`);
    console.log(`🏷️ Frutas únicas agrupadas: ${Object.keys(frutasPorNombre).length}`);

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

    console.log(`✅ Devolviendo ${frutasFinales.length} frutas únicas con precios frecuentes`);
    
    // ✅ DEBUG: Mostrar las primeras frutas que se van a devolver
    if (frutasFinales.length > 0) {
      console.log("🎯 Primeras frutas a devolver:");
      frutasFinales.slice(0, 3).forEach((fruta, index) => {
        console.log(`  ${index + 1}. ${fruta.nombre} - Primera: $${fruta.precios.primera}, Variaciones: ${fruta.estadisticas.totalVariaciones}`);
      });
    }
    
    res.status(200).json(frutasFinales);
  } catch (err) {
    console.error("❌ Error al buscar precios con frecuencia:", err);
    res.status(500).json({ error: "Error al buscar precios: " + err.message });
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

// 🔥 GET /precios/verificar-estructura - Ruta de diagnóstico mejorada
router.get("/verificar-estructura", async (req, res) => {
  try {
    const { usuario } = req.query;
    
    console.log(`🔧 DIAGNÓSTICO para usuario: ${usuario}`);
    
    const todosLosPrecios = await PrecioFruta.find({}).lean();
    
    // Filtrar por usuario si se proporciona
    let preciosUsuario = [];
    if (usuario) {
      preciosUsuario = todosLosPrecios.filter(p => 
        p.usuario === usuario || 
        p.adminAlias === usuario ||
        !p.usuario || // Documentos sin campo usuario
        !p.adminAlias  // Documentos sin campo adminAlias
      );
    }
    
    const diagnostico = {
      totalRegistrosGlobal: todosLosPrecios.length,
      registrosDelUsuario: usuario ? preciosUsuario.length : 'No especificado',
      registrosPorTipo: {
        conFincaId: todosLosPrecios.filter(p => p.fincaId !== null).length,
        sinFincaId: todosLosPrecios.filter(p => p.fincaId === null).length,
        conUsuario: todosLosPrecios.filter(p => p.usuario).length,
        sinUsuario: todosLosPrecios.filter(p => !p.usuario).length,
        conAdminAlias: todosLosPrecios.filter(p => p.adminAlias).length,
        sinAdminAlias: todosLosPrecios.filter(p => !p.adminAlias).length
      },
      frutasTotales: 0,
      ejemploEstructura: todosLosPrecios.length > 0 ? {
        _id: todosLosPrecios[0]._id,
        fincaId: todosLosPrecios[0].fincaId,
        usuario: todosLosPrecios[0].usuario || 'NO DEFINIDO',
        adminAlias: todosLosPrecios[0].adminAlias || 'NO DEFINIDO',
        totalFrutas: todosLosPrecios[0].frutas?.length || 0,
        primeraFruta: todosLosPrecios[0].frutas?.[0] || null
      } : null,
      // ✅ Información específica del usuario consultado
      infoUsuario: usuario ? {
        registrosEncontrados: preciosUsuario.length,
        fincasDelUsuario: preciosUsuario.map(p => ({
          fincaId: p.fincaId,
          usuario: p.usuario,
          adminAlias: p.adminAlias,
          totalFrutas: p.frutas?.length || 0,
          fecha: p.fecha
        }))
      } : null
    };
    
    // Contar frutas totales
    todosLosPrecios.forEach(precio => {
      if (precio.frutas) {
        diagnostico.frutasTotales += precio.frutas.length;
      }
    });
    
    console.log("🔧 Diagnóstico completado:", JSON.stringify(diagnostico, null, 2));
    
    res.status(200).json(diagnostico);
  } catch (err) {
    console.error("Error en diagnóstico:", err);
    res.status(500).json({ error: "Error en diagnóstico: " + err.message });
  }
});

// 🔥 NUEVA RUTA: POST /precios/migrar-datos-usuario - Migrar datos antiguos sin usuario
router.post("/migrar-datos-usuario", async (req, res) => {
  const { usuario, adminAlias } = req.body;
  
  if (!usuario) {
    return res.status(400).json({ error: "Usuario requerido para migración" });
  }
  
  console.log(`🔄 INICIANDO MIGRACIÓN de datos sin usuario para: ${usuario}`);
  
  try {
    // Buscar documentos que no tengan campos usuario o adminAlias
    const documentosSinUsuario = await PrecioFruta.find({
      $or: [
        { usuario: { $exists: false } },
        { adminAlias: { $exists: false } },
        { usuario: null },
        { adminAlias: null }
      ]
    });
    
    console.log(`📊 Encontrados ${documentosSinUsuario.length} documentos para migrar`);
    
    if (documentosSinUsuario.length === 0) {
      return res.status(200).json({
        message: "No hay documentos que necesiten migración",
        documentosMigrados: 0
      });
    }
    
    let documentosMigrados = 0;
    
    // Actualizar cada documento
    for (const doc of documentosSinUsuario) {
      try {
        doc.usuario = usuario;
        doc.adminAlias = adminAlias || usuario;
        doc.fecha = doc.fecha || new Date();
        
        await doc.save();
        documentosMigrados++;
        
        console.log(`✅ Documento migrado: ${doc._id} (FincaId: ${doc.fincaId})`);
      } catch (docError) {
        console.error(`❌ Error migrando documento ${doc._id}:`, docError);
      }
    }
    
    console.log(`🎉 MIGRACIÓN COMPLETADA: ${documentosMigrados} documentos actualizados`);
    
    res.status(200).json({
      success: true,
      message: `Migración completada exitosamente`,
      documentosEncontrados: documentosSinUsuario.length,
      documentosMigrados: documentosMigrados,
      usuarioAsignado: usuario,
      adminAliasAsignado: adminAlias || usuario
    });
    
  } catch (err) {
    console.error("❌ Error en migración:", err);
    res.status(500).json({ 
      error: "Error durante la migración", 
      detalles: err.message 
    });
  }
});

module.exports = router;