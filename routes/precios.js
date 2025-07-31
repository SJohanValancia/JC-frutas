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

// Actualizar precios de una fruta en todas las fincas
router.put("/actualizar/:frutaId", async (req, res) => {
  const frutaId = req.params.frutaId;
  const { precios } = req.body;

  try {
    // Buscar todas las fincas con esa fruta y actualizar sus precios
    const fincas = await PrecioFruta.find({ "frutas._id": frutaId });

    fincas.forEach(async (finca) => {
      const fruta = finca.frutas.find(f => f._id.toString() === frutaId);
      if (fruta) {
        fruta.precios = precios;  // Actualizar los precios de la fruta
      }
      await finca.save();  // Guardar cambios
    });

    res.status(200).send("Precios actualizados");
  } catch (err) {
    console.error("Error al actualizar precios:", err);
    res.status(500).send("Error al actualizar precios");
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
      // Actualizar precios base (fincaId: null)
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
          upsert: true // Crear si no existe
        }
      );
    } else {
      // Actualizar precios de una finca específica
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
          upsert: true // Crear si no existe
        }
      );
    }

    res.status(200).json(resultado);
  } catch (err) {
    console.error("Error en actualización masiva:", err);
    res.status(500).send("Error al actualizar precios masivamente");
  }
});

module.exports = router;

// Actualizar fruta
router.put("/actualizar/:idFruta", async (req, res) => {
  const idFruta = req.params.idFruta;
  const { nombre, precios, usuario, adminAlias } = req.body;

  try {
    const resultado = await PrecioFruta.findOneAndUpdate(
      { "frutas._id": idFruta },
      { 
        $set: { 
          "frutas.$.nombre": nombre, 
          "frutas.$.precios": precios,
          usuario,  // Subusuario que realiza la acción
          adminAlias // Alias del administrador
        } 
      },
      { new: true }
    );

    if (!resultado) return res.status(404).send("Fruta no encontrada");
    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al actualizar la fruta");
  }
});

// Eliminar fruta
router.delete("/eliminar/:idFruta", async (req, res) => {
  const idFruta = req.params.idFruta;
  const { usuario, adminAlias } = req.body; // Registrar qué subusuario hizo la eliminación

  try {
    const resultado = await PrecioFruta.findOneAndUpdate(
      { "frutas._id": idFruta },
      { 
        $pull: { frutas: { _id: idFruta } },
        usuario,  // Subusuario que realiza la acción
        adminAlias // Alias del administrador
      },
      { new: true }
    );

    if (!resultado) return res.status(404).send("Fruta no encontrada");
    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al eliminar la fruta");
  }
});

// Agregar fruta a una finca
router.post("/agregar-fruta/:fincaId", async (req, res) => {
  const fincaId = req.params.fincaId;
  const { fruta, usuario, adminAlias } = req.body;

  try {
    const preciosFinca = await PrecioFruta.findOne({ fincaId });

    if (!preciosFinca) {
      const preciosBase = await PrecioFruta.findOne({ fincaId: null }).lean();
      if (preciosBase) {
        const nuevo = new PrecioFruta({
          fincaId,
          frutas: [...preciosBase.frutas, fruta],
          usuario,  // Subusuario que realiza la acción
          adminAlias // Alias del administrador
        });
        await nuevo.save();
        return res.json(nuevo);
      } else {
        return res.status(404).send("No hay precios base disponibles");
      }
    } else {
      // Agregar fruta a la finca
      preciosFinca.frutas.push(fruta);
      await preciosFinca.save();
    }

    res.json(preciosFinca);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al agregar fruta");
  }
});

// Guardar precios base (opcional)
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
