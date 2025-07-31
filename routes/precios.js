const express = require("express");
const router = express.Router();
const PrecioFruta = require("../models/PrecioFruta");
const Finca = require("../models/Finca");

// Guardar precios nuevos para una finca
router.post("/guardar", async (req, res) => {
  const { fincaId, frutas, usuario, adminAlias } = req.body;

  if (!fincaId || !frutas || !Array.isArray(frutas) || frutas.length === 0 || !usuario || !adminAlias) {
    return res.status(400).send("Datos incompletos");
  }

  try {
    // Guardar para la finca seleccionada, asociando al adminAlias y subusuario
    const nuevo = new PrecioFruta({ fincaId, frutas, usuario, adminAlias });
    await nuevo.save();

    // Guardar esos mismos como base (opcional, para futuras fincas nuevas)
    await PrecioFruta.deleteMany({ fincaId: null });
    const base = new PrecioFruta({ fincaId: null, frutas });
    await base.save();

    // Buscar fincas que NO tienen datos todavía
    const fincasConDatos = await PrecioFruta.distinct('fincaId'); // fincas que ya tienen precios
    const todasFincas = await Finca.find().lean();

    const fincasSinDatos = todasFincas
      .filter(f => !fincasConDatos.includes(f._id.toString()) && f._id.toString() !== fincaId);

    // Crear precios para esas fincas sin datos
    for (const finca of fincasSinDatos) {
      await new PrecioFruta({ fincaId: finca._id, frutas, usuario, adminAlias }).save();
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
    // Implement the logic to get all prices with frequency
    let precios = await PrecioFruta.find({}).lean();
    let frutasFinales = [];
    
    // Logic to calculate the frequency of prices or any necessary data
    precios.forEach(precio => {
      precio.frutas.forEach(fruta => {
        if (!frutasFinales.some(f => f.nombre === fruta.nombre)) {
          frutasFinales.push(fruta);
        }
      });
    });

    // Send response back
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