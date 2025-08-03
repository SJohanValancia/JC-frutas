const express = require("express");
const router = express.Router();
const Finca = require("../models/Finca");
const PrecioFruta = require("../models/PrecioFruta");
const User = require("../models/User"); // 🔧 Importar modelo User

// Crear finca nueva
router.post("/agregar", async (req, res) => {
  console.log("📝 Datos recibidos para crear finca:", req.body);
  
  const { nombre, propietario, usuario, adminAlias } = req.body;

  if (!nombre || !propietario || !usuario) {
    return res.status(400).send("Faltan campos obligatorios");
  }

  try {
    // 🔧 OBTENER EL ADMIN ALIAS CORRECTO
    let adminAliasParaGuardar = adminAlias;
    
    if (!adminAliasParaGuardar) {
      console.log("⚠️ adminAlias no recibido, consultando base de datos...");
      const user = await User.findOne({ username: usuario });
      
      if (!user) {
        return res.status(400).json({ error: "Usuario no encontrado" });
      }
      
      if (user.tipo === 1) {
        // Si es admin, su propio alias es el adminAlias
        adminAliasParaGuardar = user.alias;
        console.log("✅ Usuario es admin, usando su alias:", adminAliasParaGuardar);
      } else if (user.tipo === 2 && user.aliasAdmin) {
        // Si es subusuario, usar el aliasAdmin
        adminAliasParaGuardar = user.aliasAdmin;
        console.log("✅ Usuario es subusuario, usando aliasAdmin:", adminAliasParaGuardar);
      }
    }

    console.log("📝 Creando finca con:");
    console.log("- Usuario:", usuario);
    console.log("- AdminAlias:", adminAliasParaGuardar);

    // 1️⃣ Crear la finca con el adminAlias correcto
    const finca = new Finca({ 
      nombre, 
      propietario, 
      usuario, 
      adminAlias: adminAliasParaGuardar 
    });
    await finca.save();

    console.log("✅ Finca creada:", finca);

    // 2️⃣ Verificar si ya tiene precios propios
    const preciosExistentes = await PrecioFruta.findOne({ fincaId: finca._id });

    if (!preciosExistentes) {
      console.log("🔍 Buscando primera finca del usuario para copiar precios...");
      
      // 🔥 BUSCAR LA PRIMERA FINCA QUE EL USUARIO CREÓ (ordenada por fecha más antigua)
      const primeraFincaUsuario = await Finca.findOne({
        $or: [
          { usuario: usuario },
          { adminAlias: adminAliasParaGuardar }
        ],
        _id: { $ne: finca._id } // Excluir la finca recién creada
      }).sort({ fecha: 1 }); // Ordenar por fecha más antigua (primera creada)

      if (primeraFincaUsuario) {
        console.log(`✅ Primera finca del usuario encontrada: ${primeraFincaUsuario.nombre} (${primeraFincaUsuario._id})`);
        
        // 🔍 Buscar los precios de la primera finca del usuario
        const preciosPrimeraFinca = await PrecioFruta.findOne({ 
          fincaId: primeraFincaUsuario._id 
        });

        if (preciosPrimeraFinca && preciosPrimeraFinca.frutas && preciosPrimeraFinca.frutas.length > 0) {
          console.log(`📋 Copiando ${preciosPrimeraFinca.frutas.length} frutas de la primera finca del usuario`);
          
          // 🔥 CREAR COPIA COMPLETA DE LAS FRUTAS (sin los _id para evitar duplicados)
          const frutasCopiadas = preciosPrimeraFinca.frutas.map(fruta => ({
            nombre: fruta.nombre,
            precios: {
              primera: fruta.precios.primera,
              segunda: fruta.precios.segunda,
              tercera: fruta.precios.tercera
            }
          }));

          // Crear registro de precios con las frutas copiadas
          const preciosNuevaFinca = new PrecioFruta({
            fincaId: finca._id,
            frutas: frutasCopiadas,
            usuario: usuario,
            adminAlias: adminAliasParaGuardar
          });
          
          await preciosNuevaFinca.save();
          
          console.log(`✅ Precios copiados exitosamente: ${frutasCopiadas.length} frutas`);
          console.log("📊 Frutas copiadas:", frutasCopiadas.map(f => `${f.nombre} (P:$${f.precios.primera}, S:$${f.precios.segunda}, T:$${f.precios.tercera})`));
          
        } else {
          console.log("ℹ️ La primera finca del usuario no tiene precios configurados, creando registro vacío");
          
          // Crear registro de precios vacío
          const preciosVacios = new PrecioFruta({
            fincaId: finca._id,
            frutas: [],
            usuario: usuario,
            adminAlias: adminAliasParaGuardar
          });
          await preciosVacios.save();
        }
      } else {
        console.log("ℹ️ Esta es la primera finca del usuario, creando registro de precios vacío");
        
        // Crear registro de precios vacío para la primera finca
        const preciosVacios = new PrecioFruta({
          fincaId: finca._id,
          frutas: [],
          usuario: usuario,
          adminAlias: adminAliasParaGuardar
        });
        await preciosVacios.save();
      }
    } else {
      console.log("ℹ️ La finca ya tiene precios configurados, no se copiarán precios");
    }

    res.status(200).json(finca);
  } catch (err) {
    console.error("❌ Error al crear finca:", err);
    res.status(500).send("Error al crear la finca: " + err.message);
  }
});

// Listar todas las fincas (endpoint original)
router.get("/listar", async (req, res) => {
  try {
    const fincas = await Finca.find().sort({ fecha: -1 });
    res.status(200).json(fincas);
  } catch (err) {
    console.error("Error al obtener fincas:", err);
    res.status(500).send("Error al obtener fincas");
  }
});

// 🔧 ENDPOINT CORREGIDO: Listar fincas de un administrador
router.get("/por-admin/:adminAlias", async (req, res) => {
  const { adminAlias } = req.params;
  
  console.log("🔍 Buscando fincas para adminAlias:", adminAlias);

  if (!adminAlias) {
    return res.status(400).json({ error: "Falta el adminAlias" });
  }

  try {
    // 🔧 CONSULTA CORREGIDA: Buscar fincas que pertenezcan al admin
    const fincas = await Finca.find({ 
      adminAlias: adminAlias 
    }).sort({ fecha: -1 });

    console.log(`📋 Encontradas ${fincas.length} fincas para adminAlias: ${adminAlias}`);
    console.log("📋 Fincas encontradas:", fincas.map(f => ({ 
      _id: f._id, 
      nombre: f.nombre, 
      usuario: f.usuario, 
      adminAlias: f.adminAlias 
    })));

    res.status(200).json(fincas);
  } catch (err) {
    console.error("❌ Error al obtener las fincas del administrador:", err);
    res.status(500).json({ error: "Error al obtener las fincas del administrador" });
  }
});

// 🔧 ENDPOINT ADICIONAL: Buscar fincas por query parameter (alternativo)
router.get('/por-admin', async (req, res) => {
  try {
    const { adminAlias } = req.query;
    
    console.log("🔍 Buscando fincas para adminAlias (query):", adminAlias);
    
    if (!adminAlias) {
      return res.status(400).json({ error: "adminAlias es requerido" });
    }
    
    const fincas = await Finca.find({
      adminAlias: adminAlias
    }).sort({ fecha: -1 });

    console.log(`📋 Encontradas ${fincas.length} fincas para adminAlias: ${adminAlias}`);
    res.json(fincas);
  } catch (error) {
    console.error("❌ Error en por-admin:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🔧 ENDPOINT DE DEBUG: Ver todas las fincas con sus adminAlias
router.get("/debug/todas", async (req, res) => {
  try {
    const fincas = await Finca.find({}, { nombre: 1, usuario: 1, adminAlias: 1 }).sort({ fecha: -1 });
    console.log("🔍 DEBUG - Todas las fincas:", fincas);
    res.status(200).json(fincas);
  } catch (err) {
    console.error("Error en debug:", err);
    res.status(500).send("Error en debug");
  }
});

module.exports = router;