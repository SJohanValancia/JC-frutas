const express = require("express");
const router = express.Router();
const NotaFinca = require("../models/NotasFincas");
const Finca = require("../models/Finca");

// 📝 Crear nueva nota para una finca
router.post("/agregar", async (req, res) => {
  console.log("📝 Creando nueva nota:", req.body);
  
  const { fincaId, contenido, usuario, adminAlias } = req.body;

  if (!fincaId || !contenido || !usuario) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  try {
    // Verificar que la finca existe
    const finca = await Finca.findById(fincaId);
    if (!finca) {
      return res.status(404).json({ error: "Finca no encontrada" });
    }

    // Crear la nota
    const nota = new NotaFinca({
      fincaId,
      fincaNombre: finca.nombre,
      contenido: contenido.trim(),
      usuario,
      adminAlias: adminAlias || finca.adminAlias
    });

    await nota.save();
    console.log("✅ Nota creada:", nota);

    res.status(201).json(nota);
  } catch (err) {
    console.error("❌ Error al crear nota:", err);
    res.status(500).json({ error: "Error al crear la nota: " + err.message });
  }
});

// 🔍 Obtener una nota específica por ID (NUEVA RUTA)
router.get("/:notaId", async (req, res) => {
  const { notaId } = req.params;
  
  console.log("🔍 Obteniendo nota por ID:", notaId);

  try {
    const nota = await NotaFinca.findById(notaId);
    
    if (!nota) {
      return res.status(404).json({ error: "Nota no encontrada" });
    }

    if (!nota.activa) {
      return res.status(404).json({ error: "Nota no disponible" });
    }

    console.log("✅ Nota encontrada:", nota);
    res.status(200).json(nota);
  } catch (err) {
    console.error("❌ Error al obtener nota:", err);
    res.status(500).json({ error: "Error al obtener la nota: " + err.message });
  }
});

// 📋 Obtener todas las notas de una finca
router.get("/finca/:fincaId", async (req, res) => {
  const { fincaId } = req.params;
  
  console.log("📋 Obteniendo notas para finca:", fincaId);

  try {
    const notas = await NotaFinca.find({ 
      fincaId, 
      activa: true 
    }).sort({ fechaCreacion: -1 });

    console.log(`📋 Encontradas ${notas.length} notas para finca ${fincaId}`);
    res.status(200).json(notas);
  } catch (err) {
    console.error("❌ Error al obtener notas:", err);
    res.status(500).json({ error: "Error al obtener las notas" });
  }
});

// 📊 Obtener conteo de notas por finca para un administrador
router.get("/conteos/:adminAlias", async (req, res) => {
  const { adminAlias } = req.params;
  
  console.log("📊 Obteniendo conteos de notas para admin:", adminAlias);

  try {
    const conteos = await NotaFinca.aggregate([
      {
        $match: {
          adminAlias: adminAlias,
          activa: true
        }
      },
      {
        $group: {
          _id: "$fincaId",
          totalNotas: { $sum: 1 },
          fincaNombre: { $first: "$fincaNombre" }
        }
      }
    ]);

    // Convertir a formato objeto para acceso rápido
    const conteosObj = {};
    conteos.forEach(item => {
      conteosObj[item._id.toString()] = {
        total: item.totalNotas,
        fincaNombre: item.fincaNombre
      };
    });

    console.log(`📊 Conteos calculados para ${Object.keys(conteosObj).length} fincas`);
    res.status(200).json(conteosObj);
  } catch (err) {
    console.error("❌ Error al obtener conteos:", err);
    res.status(500).json({ error: "Error al obtener conteos de notas" });
  }
});

// ✏️ Editar una nota
router.put("/editar/:notaId", async (req, res) => {
  const { notaId } = req.params;
  const { contenido, usuario } = req.body;

  console.log("✏️ Editando nota:", notaId);

  if (!contenido) {
    return res.status(400).json({ error: "El contenido es obligatorio" });
  }

  try {
    const nota = await NotaFinca.findById(notaId);
    if (!nota) {
      return res.status(404).json({ error: "Nota no encontrada" });
    }

    if (!nota.activa) {
      return res.status(400).json({ error: "No se puede editar una nota eliminada" });
    }

    // Actualizar la nota
    nota.contenido = contenido.trim();
    nota.fechaModificacion = new Date();
    
    await nota.save();
    console.log("✅ Nota editada:", nota);

    res.status(200).json(nota);
  } catch (err) {
    console.error("❌ Error al editar nota:", err);
    res.status(500).json({ error: "Error al editar la nota: " + err.message });
  }
});

// 🗑️ Eliminar una nota (soft delete)
router.delete("/eliminar/:notaId", async (req, res) => {
  const { notaId } = req.params;
  
  console.log("🗑️ Eliminando nota:", notaId);

  try {
    const nota = await NotaFinca.findById(notaId);
    if (!nota) {
      return res.status(404).json({ error: "Nota no encontrada" });
    }

    // Soft delete - marcar como inactiva
    nota.activa = false;
    nota.fechaModificacion = new Date();
    
    await nota.save();
    console.log("✅ Nota eliminada (soft delete):", nota);

    res.status(200).json({ message: "Nota eliminada correctamente" });
  } catch (err) {
    console.error("❌ Error al eliminar nota:", err);
    res.status(500).json({ error: "Error al eliminar la nota: " + err.message });
  }
});

// 🔍 Buscar notas por texto (opcional)
router.get("/buscar/:adminAlias", async (req, res) => {
  const { adminAlias } = req.params;
  const { q } = req.query; // query de búsqueda
  
  if (!q || q.length < 2) {
    return res.status(400).json({ error: "La búsqueda debe tener al menos 2 caracteres" });
  }

  try {
    const notas = await NotaFinca.find({
      adminAlias,
      activa: true,
      $or: [
        { contenido: { $regex: q, $options: 'i' } },
        { fincaNombre: { $regex: q, $options: 'i' } }
      ]
    }).sort({ fechaCreacion: -1 }).limit(50);

    res.status(200).json(notas);
  } catch (err) {
    console.error("❌ Error en búsqueda:", err);
    res.status(500).json({ error: "Error en la búsqueda" });
  }
});

module.exports = router;