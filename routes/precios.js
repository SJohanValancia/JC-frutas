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
  
  try {
    // Buscar todas las fincas que tengan esa fruta y pertenezcan al usuario
    const filtros = {
      "frutas._id": frutaId
    };
    
    if (usuario || adminAlias) {
      filtros.$or = [
        { adminAlias: adminAlias || usuario },
        { usuario: usuario }
      ];
    }
    
    const fincasConFruta = await PrecioFruta.find(filtros).lean();
    
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

// ✅ GET /precios/todos-los-precios-con-frecuencia - Obtener todos los precios con frecuencias
router.get("/todos-los-precios-con-frecuencia", async (req, res) => {
  const { usuario, adminAlias } = req.query;
  
  console.log(`📊 Consultando todos los precios con frecuencia para usuario: ${usuario || adminAlias}`);
  
  try {
    // Filtrar solo las fincas del usuario/admin
    const filtros = {};
    
    if (usuario || adminAlias) {
      filtros.$or = [
        { adminAlias: adminAlias || usuario },
        { usuario: usuario }
      ];
    }
    
    const precios = await PrecioFruta.find(filtros).lean();
    console.log(`🔍 Encontrados ${precios.length} registros de precios para el usuario`);

    if (precios.length === 0) {
      return res.status(200).json([]);
    }

    // Agrupar todas las frutas por nombre
    const frutasPorNombre = {};
    
    precios.forEach(precio => {
      if (precio.frutas && Array.isArray(precio.frutas)) {
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
      }
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

    console.log(`✅ Devolviendo ${frutasFinales.length} frutas únicas con precios frecuentes`);
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

// 🔥 GET /precios/verificar-estructura - Ruta de diagnóstico (opcional, para debug)
router.get("/verificar-estructura", async (req, res) => {
  try {
    const todosLosPrecios = await PrecioFruta.find({}).lean();
    
    const diagnostico = {
      totalRegistros: todosLosPrecios.length,
      registrosPorTipo: {
        conFincaId: todosLosPrecios.filter(p => p.fincaId !== null).length,
        sinFincaId: todosLosPrecios.filter(p => p.fincaId === null).length
      },
      frutasTotales: 0,
      ejemploEstructura: todosLosPrecios.length > 0 ? {
        _id: todosLosPrecios[0]._id,
        fincaId: todosLosPrecios[0].fincaId,
        totalFrutas: todosLosPrecios[0].frutas?.length || 0,
        primeraFruta: todosLosPrecios[0].frutas?.[0] || null
      } : null
    };
    
    // Contar frutas totales
    todosLosPrecios.forEach(precio => {
      if (precio.frutas) {
        diagnostico.frutasTotales += precio.frutas.length;
      }
    });
    
    res.status(200).json(diagnostico);
  } catch (err) {
    console.error("Error en diagnóstico:", err);
    res.status(500).json({ error: "Error en diagnóstico: " + err.message });
  }
});

module.exports = router;