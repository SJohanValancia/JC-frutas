const express = require("express");
const router = express.Router();
const PrecioFruta = require("../models/PrecioFruta");
const Finca = require("../models/Finca");

// ✅ Función para normalizar nombres de frutas (sin mayúsculas, tildes, espacios extra)
function normalizarNombre(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes
    .replace(/[^\w\s]/g, '') // Eliminar caracteres especiales excepto espacios
    .replace(/\s+/g, ' ') // Reemplazar múltiples espacios por uno solo
    .trim(); // Eliminar espacios al inicio y final
}

// ✅ Función para formatear nombre para mostrar (Primera letra mayúscula)
function formatearNombreParaMostrar(nombre) {
  return nombre
    .toLowerCase()
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}

// Guardar precios nuevos para una finca
router.post("/guardar", async (req, res) => {
  const { fincaId, frutas, usuario, adminAlias } = req.body;

  if (!fincaId || !frutas || !Array.isArray(frutas) || frutas.length === 0 || !usuario || !adminAlias) {
    return res.status(400).send("Datos incompletos");
  }

  try {
    // ✅ Normalizar nombres de frutas antes de guardar
    const frutasNormalizadas = frutas.map(fruta => ({
      ...fruta,
      nombre: formatearNombreParaMostrar(fruta.nombre),
      nombreNormalizado: normalizarNombre(fruta.nombre)
    }));

    // Guardar para la finca seleccionada, asociando al adminAlias y subusuario
    const nuevo = new PrecioFruta({ 
      fincaId, 
      frutas: frutasNormalizadas, 
      usuario, 
      adminAlias 
    });
    await nuevo.save();

    // Guardar esos mismos como base (opcional, para futuras fincas nuevas)
    await PrecioFruta.deleteMany({ fincaId: null });
    const base = new PrecioFruta({ fincaId: null, frutas: frutasNormalizadas });
    await base.save();

    // Buscar fincas que NO tienen datos todavía
    const fincasConDatos = await PrecioFruta.distinct('fincaId');
    const todasFincas = await Finca.find().lean();

    const fincasSinDatos = todasFincas
      .filter(f => !fincasConDatos.includes(f._id.toString()) && f._id.toString() !== fincaId);

    // Crear precios para esas fincas sin datos
    for (const finca of fincasSinDatos) {
      await new PrecioFruta({ 
        fincaId: finca._id, 
        frutas: frutasNormalizadas, 
        usuario, 
        adminAlias 
      }).save();
    }

    res.status(200).json({ finca: nuevo, base });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al guardar los precios");
  }
});

// Obtener precios por finca
router.get("/por-finca/:id", async (req, res) => {
  const fincaId = req.params.id;
  try {
    let precios = await PrecioFruta.find({ fincaId });
    if (precios.length === 0) {
      precios = await PrecioFruta.find({ fincaId: null });
    }
    res.status(200).json(precios);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al buscar precios");
  }
});

// Obtener precios de todas las fincas sin duplicar frutas
router.get("/todos-los-precios", async (req, res) => {
  try {
    // Obtener precios de todas las fincas
    let precios = await PrecioFruta.find({}).lean();

    // Unir todas las frutas de todas las fincas
    let frutasFinales = [];
    precios.forEach(precio => {
      precio.frutas.forEach(fruta => {
        // Evitar duplicados, si la fruta ya está en frutasFinales, no se agrega
        if (!frutasFinales.some(f => f.nombre === fruta.nombre)) {
          frutasFinales.push(fruta);
        }
      });
    });

    res.status(200).json(frutasFinales); // Enviar todas las frutas sin duplicados
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al buscar precios");
  }
});

// ✅ ACTUALIZAR FRUTA - SOLO EN LA FINCA ESPECÍFICA
router.put("/actualizar/:frutaId", async (req, res) => {
  const frutaId = req.params.frutaId;
  const { nombre, precios, usuario, adminAlias, fincaId } = req.body;

  if (!precios || !usuario || !adminAlias) {
    return res.status(400).send("Datos incompletos");
  }

  try {
    let resultado;

    if (fincaId) {
      // ✅ Si se proporciona fincaId, actualizar SOLO esa finca
      resultado = await PrecioFruta.findOneAndUpdate(
        { 
          fincaId: fincaId,
          "frutas._id": frutaId 
        },
        { 
          $set: { 
            "frutas.$.nombre": nombre, 
            "frutas.$.precios": precios,
            usuario,
            adminAlias,
            fechaActualizacion: new Date()
          } 
        },
        { new: true }
      );
    } else {
      // Si no hay fincaId específica, buscar la primera finca que tenga esa fruta
      resultado = await PrecioFruta.findOneAndUpdate(
        { "frutas._id": frutaId },
        { 
          $set: { 
            "frutas.$.nombre": nombre, 
            "frutas.$.precios": precios,
            usuario,
            adminAlias,
            fechaActualizacion: new Date()
          } 
        },
        { new: true }
      );
    }

    if (!resultado) return res.status(404).send("Fruta no encontrada en la finca especificada");
    
    console.log(`✅ Precios actualizados solo en la finca: ${fincaId || 'primera encontrada'}`);
    res.status(200).json(resultado);
    
  } catch (err) {
    console.error("Error al actualizar precios:", err);
    res.status(500).send("Error al actualizar precios");
  }
});

// ✅ ELIMINAR FRUTA - SOLO DE LA FINCA ESPECÍFICA
router.delete("/eliminar/:idFruta", async (req, res) => {
  const idFruta = req.params.idFruta;
  const { usuario, adminAlias, fincaId } = req.body;

  try {
    let resultado;

    if (fincaId) {
      // ✅ Si se proporciona fincaId, eliminar SOLO de esa finca
      resultado = await PrecioFruta.findOneAndUpdate(
        { 
          fincaId: fincaId,
          "frutas._id": idFruta 
        },
        { 
          $pull: { frutas: { _id: idFruta } },
          usuario,
          adminAlias,
          fechaActualizacion: new Date()
        },
        { new: true }
      );
    } else {
      // Si no hay fincaId específica, eliminar de la primera finca que la tenga
      resultado = await PrecioFruta.findOneAndUpdate(
        { "frutas._id": idFruta },
        { 
          $pull: { frutas: { _id: idFruta } },
          usuario,
          adminAlias,
          fechaActualizacion: new Date()
        },
        { new: true }
      );
    }

    if (!resultado) return res.status(404).send("Fruta no encontrada en la finca especificada");
    
    console.log(`✅ Fruta eliminada solo de la finca: ${fincaId || 'primera encontrada'}`);
    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al eliminar la fruta");
  }
});

// Define this route in your backend
router.get("/todos-los-precios-con-frecuencia", async (req, res) => {
  try {
    const { usuario, adminAlias } = req.query;
    
    let filtro = {};
    if (usuario || adminAlias) {
      filtro = {
        $or: [
          { usuario: usuario },
          { adminAlias: usuario },
          { usuario: adminAlias },
          { adminAlias: adminAlias }
        ]
      };
    }

    const precios = await PrecioFruta.find(filtro).lean();

    // ✅ Agrupar todas las frutas por nombre normalizado (evitar duplicados)
    const frutasPorNombre = {};
    
    precios.forEach(precio => {
      precio.frutas.forEach(fruta => {
        // ✅ Usar nombre normalizado para agrupar
        const nombreNormalizado = fruta.nombreNormalizado || normalizarNombre(fruta.nombre);
        
        if (!frutasPorNombre[nombreNormalizado]) {
          frutasPorNombre[nombreNormalizado] = {
            _id: fruta._id,
            nombre: fruta.nombre, // Mantener el nombre original para mostrar
            nombreNormalizado: nombreNormalizado,
            precios: []
          };
        }
        frutasPorNombre[nombreNormalizado].precios.push(fruta.precios || { primera: 0, segunda: 0, tercera: 0 });
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
        nombreNormalizado: fruta.nombreNormalizado,
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


// ✅ NUEVA RUTA: Actualizar precios GLOBALMENTE (solo desde gestion-precios.html)
router.put("/actualizar-global/:frutaId", async (req, res) => {
  const frutaId = req.params.frutaId;
  const { nombre, precios, usuario, adminAlias } = req.body;

  if (!precios || !usuario || !adminAlias) {
    return res.status(400).send("Datos incompletos");
  }

  try {
    // ✅ CLAVE: Buscar SOLO las fincas que pertenecen al usuario actual Y que tengan esa fruta
    const fincasConFruta = await PrecioFruta.find({ 
      "frutas._id": frutaId,
      $or: [
        { usuario: usuario },
        { adminAlias: usuario },
        { usuario: adminAlias },
        { adminAlias: adminAlias }
      ]
    });

    let fincasActualizadas = 0;

    // ✅ Actualizar cada finca DEL USUARIO que tenga esa fruta
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

    // ✅ También actualizar los precios base (fincaId: null) solo si pertenecen al usuario
    const preciosBase = await PrecioFruta.findOne({ 
      fincaId: null,
      $or: [
        { usuario: usuario },
        { adminAlias: usuario },
        { usuario: adminAlias },
        { adminAlias: adminAlias }
      ]
    });
    
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

    console.log(`✅ Precios actualizados GLOBALMENTE para el usuario ${usuario} en ${fincasActualizadas} registros`);
    res.status(200).json({ 
      message: `Precios actualizados globalmente en todas TUS fincas (${fincasActualizadas} registros)`,
      fincasActualizadas: fincasActualizadas,
      usuario: usuario
    });
    
  } catch (err) {
    console.error("Error al actualizar precios globalmente:", err);
    res.status(500).send("Error al actualizar precios globalmente");
  }
});

// ✅ NUEVA RUTA: Obtener precios con frecuencias (precio más común)
router.get("/fruta-con-frecuencia/:frutaId", async (req, res) => {
  const frutaId = req.params.frutaId;
  const { usuario, adminAlias } = req.query;
  
  try {
    // ✅ Buscar solo fincas del usuario que tengan esa fruta
    let filtro = { "frutas._id": frutaId };
    
    if (usuario || adminAlias) {
      filtro = {
        "frutas._id": frutaId,
        $or: [
          { usuario: usuario },
          { adminAlias: usuario },
          { usuario: adminAlias },
          { adminAlias: adminAlias }
        ]
      };
    }

    const fincasConFruta = await PrecioFruta.find(filtro).lean();
    
    if (fincasConFruta.length === 0) {
      return res.status(404).send("Fruta no encontrada en tus fincas");
    }
    
    // Recopilar todos los precios de esa fruta (solo del usuario)
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

router.get("/todos-los-precios-con-frecuencia", async (req, res) => {
  try {
    // ✅ Obtener solo precios de las fincas del usuario actual
    const { usuario, adminAlias } = req.query;
    
    let filtro = {};
    if (usuario || adminAlias) {
      filtro = {
        $or: [
          { usuario: usuario },
          { adminAlias: usuario },
          { usuario: adminAlias },
          { adminAlias: adminAlias }
        ]
      };
    }

    const precios = await PrecioFruta.find(filtro).lean();

    // Agrupar todas las frutas por nombre (solo del usuario)
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


// ✅ AGREGAR FRUTA - SOLO A LA FINCA ESPECÍFICA
router.post("/agregar-fruta/:fincaId", async (req, res) => {
  const fincaId = req.params.fincaId;
  const { fruta, usuario, adminAlias } = req.body;

  try {
    let preciosFinca = await PrecioFruta.findOne({ fincaId });

    if (!preciosFinca) {
      // Si la finca no tiene precios, crear un nuevo documento
      const preciosBase = await PrecioFruta.findOne({ fincaId: null }).lean();
      const frutasIniciales = preciosBase ? preciosBase.frutas : [];
      
      preciosFinca = new PrecioFruta({
        fincaId,
        frutas: [...frutasIniciales, fruta],
        usuario,
        adminAlias
      });
      await preciosFinca.save();
    } else {
      // ✅ Agregar fruta SOLO a esta finca específica
      preciosFinca.frutas.push(fruta);
      preciosFinca.usuario = usuario;
      preciosFinca.adminAlias = adminAlias;
      preciosFinca.fechaActualizacion = new Date();
      await preciosFinca.save();
    }

    console.log(`✅ Fruta agregada solo a la finca: ${fincaId}`);
    res.json(preciosFinca);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al agregar fruta");
  }
});

// Las demás rutas permanecen igual...
router.get("/fruta/:frutaId", async (req, res) => {
  const frutaId = req.params.frutaId;
  
  try {
    const documentoConFruta = await PrecioFruta.findOne({ "frutas._id": frutaId }).lean();
    
    if (!documentoConFruta) {
      return res.status(404).send("Fruta no encontrada");
    }
    
    const fruta = documentoConFruta.frutas.find(f => f._id.toString() === frutaId);
    
    if (!fruta) {
      return res.status(404).send("Fruta no encontrada");
    }
    
    res.status(200).json(fruta);
  } catch (err) {
    console.error("Error al buscar fruta:", err);
    res.status(500).send("Error al buscar fruta");
  }
});

// Actualizar precios de forma masiva
router.post("/actualizar-masivo", async (req, res) => {
  const { fincaId, frutas, usuario, adminAlias, actualizarBase } = req.body;

  if (!frutas || !Array.isArray(frutas) || frutas.length === 0 || !usuario || !adminAlias) {
    return res.status(400).send("Datos incompletos");
  }

  try {
    let resultado;

    if (actualizarBase) {
      resultado = await PrecioFruta.findOneAndUpdate(
        { fincaId: null },
        { 
          frutas: frutas,
          usuario: usuario,
          adminAlias: adminAlias,
          fechaActualizacion: new Date()
        },
        { 
          new: true, 
          upsert: true
        }
      );
    } else {
      resultado = await PrecioFruta.findOneAndUpdate(
        { fincaId: fincaId },
        { 
          frutas: frutas,
          usuario: usuario,
          adminAlias: adminAlias,
          fechaActualizacion: new Date()
        },
        { 
          new: true, 
          upsert: true
        }
      );
    }

    res.status(200).json(resultado);
  } catch (err) {
    console.error("Error en actualización masiva:", err);
    res.status(500).send("Error al actualizar precios masivamente");
  }
});

router.post("/guardar-base", async (req, res) => {
  const { frutas, usuario, adminAlias } = req.body;

  if (!frutas || !Array.isArray(frutas) || frutas.length === 0 || !usuario || !adminAlias) {
    return res.status(400).send("Datos incompletos");
  }

  try {
    const baseExistente = await PrecioFruta.findOne({ fincaId: null });
    if (baseExistente) {
      return res.status(400).send("Precios base ya guardados");
    }

    const nuevo = new PrecioFruta({ fincaId: null, frutas, usuario, adminAlias });
    await nuevo.save();
    res.status(200).json(nuevo);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al guardar los precios base");
  }
});

module.exports = router;