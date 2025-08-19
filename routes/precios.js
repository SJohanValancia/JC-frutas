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

// ✅ FUNCIÓN AUXILIAR para calcular el precio más frecuente
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

// 🔥 FUNCIÓN DE ACTUALIZACIÓN GLOBAL CORREGIDA - Incluye Primera Finca
// 🔥 FUNCIÓN DE ACTUALIZACIÓN GLOBAL ULTRA-ROBUSTA - INCLUYE PRIMERA FINCA OBLIGATORIAMENTE
router.put("/actualizar-global/:frutaId", async (req, res) => {
  const frutaId = req.params.frutaId;
  const { precios, usuario, adminAlias } = req.body;

  console.log(`🌍 INICIANDO ACTUALIZACIÓN GLOBAL ULTRA-ROBUSTA para fruta ${frutaId}`);
  console.log(`👤 Usuario que inició sesión: ${usuario}`);
  console.log(`🏢 Admin alias: ${adminAlias}`);
  console.log(`💰 Nuevos precios:`, precios);
  
  // Validaciones
  if (!precios || !usuario) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  try {
    // 1. Primero encontrar la fruta para obtener su nombre
    const frutaOriginal = await PrecioFruta.findOne({
      "frutas._id": frutaId
    });

    if (!frutaOriginal) {
      return res.status(404).json({ error: "Fruta no encontrada" });
    }

    const frutaEncontrada = frutaOriginal.frutas.find(f => f._id.toString() === frutaId);
    const nombreFruta = frutaEncontrada.nombre;

    console.log(`🔍 Nombre de fruta encontrado: "${nombreFruta}"`);

    // 2. 🔥 BÚSQUEDA EXHAUSTIVA: Encontrar TODAS las fincas del usuario (incluyendo la primera)
    const usuarioActual = adminAlias || usuario;
    
    console.log(`🔍 Buscando TODAS las fincas para usuario: "${usuarioActual}"`);
    
    // PASO 1: Buscar con todos los criterios posibles
    const criteriosBusqueda = [
      { usuario: usuario },
      { adminAlias: usuario },
      { usuario: usuarioActual },
      { adminAlias: usuarioActual }
    ];

    let todasLasFincasDelUsuario = [];
    
    for (const criterio of criteriosBusqueda) {
      console.log(`🔍 Aplicando criterio:`, criterio);
      const fincasEncontradas = await PrecioFruta.find({
        $and: [
          { fincaId: { $ne: null } }, // Solo fincas específicas
          criterio
        ]
      }).sort({ fecha: 1 }); // Ordenar por fecha más antigua primero
      
      console.log(`📊 Fincas encontradas con este criterio: ${fincasEncontradas.length}`);
      
      // Agregar fincas que no estén ya en la lista
      fincasEncontradas.forEach(finca => {
        if (!todasLasFincasDelUsuario.some(f => f._id.toString() === finca._id.toString())) {
          todasLasFincasDelUsuario.push(finca);
        }
      });
    }

    console.log(`📈 Total de fincas únicas encontradas: ${todasLasFincasDelUsuario.length}`);

    // PASO 2: 🔥 IDENTIFICAR Y GARANTIZAR LA PRIMERA FINCA
    let primeraFinca = null;
    if (todasLasFincasDelUsuario.length > 0) {
      // Ordenar por fecha para asegurar que la primera sea realmente la más antigua
      todasLasFincasDelUsuario.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      primeraFinca = todasLasFincasDelUsuario[0];
      
      console.log(`🏆 PRIMERA FINCA IDENTIFICADA:`);
      console.log(`   - ID: ${primeraFinca._id}`);
      console.log(`   - FincaId: ${primeraFinca.fincaId}`);
      console.log(`   - Usuario: "${primeraFinca.usuario}"`);
      console.log(`   - AdminAlias: "${primeraFinca.adminAlias}"`);
      console.log(`   - Fecha: ${primeraFinca.fecha}`);
      console.log(`   - Total frutas: ${primeraFinca.frutas?.length || 0}`);
    }

    // PASO 3: 🔥 BÚSQUEDA ADICIONAL SI NO HAY PRIMERA FINCA
    if (!primeraFinca) {
      console.log(`⚠️ No se encontró primera finca, buscando con criterios más amplios...`);
      
      // Buscar cualquier finca relacionada con el usuario (criterios más flexibles)
      const fincasAdicionales = await PrecioFruta.find({
        $and: [
          { fincaId: { $ne: null } },
          {
            $or: [
              { usuario: { $regex: new RegExp(usuario, 'i') } },
              { adminAlias: { $regex: new RegExp(usuario, 'i') } },
              { usuario: { $regex: new RegExp(usuarioActual, 'i') } },
              { adminAlias: { $regex: new RegExp(usuarioActual, 'i') } }
            ]
          }
        ]
      }).sort({ fecha: 1 });
      
      if (fincasAdicionales.length > 0) {
        primeraFinca = fincasAdicionales[0];
        todasLasFincasDelUsuario = [...todasLasFincasDelUsuario, ...fincasAdicionales.filter(f => 
          !todasLasFincasDelUsuario.some(existing => existing._id.toString() === f._id.toString())
        )];
        
        console.log(`✅ Primera finca encontrada con búsqueda ampliada: ${primeraFinca.fincaId}`);
      }
    }

    // 3. 🔥 FILTRAR SOLO LAS FINCAS QUE TIENEN LA FRUTA ESPECÍFICA
    const fincasConLaFruta = todasLasFincasDelUsuario.filter(finca => 
      finca.frutas && finca.frutas.some(fruta => 
        fruta.nombre && fruta.nombre.toLowerCase() === nombreFruta.toLowerCase()
      )
    );
    
    console.log(`🎯 Fincas que tienen la fruta "${nombreFruta}": ${fincasConLaFruta.length}`);

    // 4. 🔥 VERIFICACIÓN ESPECIAL: Si la primera finca tiene la fruta pero no está en la lista
    if (primeraFinca) {
      const primeraFincaTieneLaFruta = primeraFinca.frutas && primeraFinca.frutas.some(f => 
        f.nombre && f.nombre.toLowerCase() === nombreFruta.toLowerCase()
      );
      
      const primeraFincaEnLista = fincasConLaFruta.some(f => 
        f._id.toString() === primeraFinca._id.toString()
      );
      
      console.log(`🔍 Primera finca tiene la fruta "${nombreFruta}": ${primeraFincaTieneLaFruta}`);
      console.log(`🔍 Primera finca está en lista para actualizar: ${primeraFincaEnLista}`);
      
      if (primeraFincaTieneLaFruta && !primeraFincaEnLista) {
        console.log(`🚨 AGREGANDO FORZOSAMENTE la primera finca a la lista de actualización`);
        fincasConLaFruta.unshift(primeraFinca); // Agregar al inicio
      }
    }

    // 5. 🔥 MOSTRAR DETALLES COMPLETOS DE CADA FINCA A ACTUALIZAR
    console.log(`📋 === RESUMEN DETALLADO DE FINCAS A ACTUALIZAR ===`);
    fincasConLaFruta.forEach((finca, index) => {
      const frutasCoincidentes = finca.frutas.filter(f => 
        f.nombre && f.nombre.toLowerCase() === nombreFruta.toLowerCase()
      );
      
      const esPrimeraFinca = primeraFinca && 
        finca._id.toString() === primeraFinca._id.toString();
      
      console.log(`📋 Finca ${index + 1} ${esPrimeraFinca ? '⭐ (PRIMERA FINCA)' : ''}:`);
      console.log(`   - ID Documento: ${finca._id}`);
      console.log(`   - FincaId: ${finca.fincaId}`);
      console.log(`   - Usuario: "${finca.usuario}"`);
      console.log(`   - AdminAlias: "${finca.adminAlias}"`);
      console.log(`   - Fecha: ${finca.fecha}`);
      console.log(`   - Frutas coincidentes: ${frutasCoincidentes.length}`);
      
      frutasCoincidentes.forEach((fruta, fIndex) => {
        console.log(`     ${fIndex + 1}. ID: ${fruta._id}, Precios actuales: P:$${fruta.precios.primera}, S:$${fruta.precios.segunda}, T:$${fruta.precios.tercera}`);
      });
    });

    if (fincasConLaFruta.length === 0) {
      return res.status(404).json({ 
        error: `No se encontraron fincas del usuario "${usuarioActual}" que tengan la fruta "${nombreFruta}"`,
        detalles: {
          usuarioBuscado: usuarioActual,
          frutaBuscada: nombreFruta,
          totalFincasDelUsuario: todasLasFincasDelUsuario.length,
          primeraFincaEncontrada: !!primeraFinca
        }
      });
    }

    // 6. 🔥 ACTUALIZACIÓN ROBUSTA CON DOBLE VERIFICACIÓN
    let fincasActualizadas = 0;
    let frutasActualizadas = 0;
    let primeraFincaActualizada = false;
    let propietariosActualizados = new Set();
    const errores = [];
    const detallesActualizacion = [];

    for (const finca of fincasConLaFruta) {
      try {
        let fincaActualizada = false;
        let frutasEnEstaFinca = 0;
        
        const esPrimeraFinca = primeraFinca && 
          finca._id.toString() === primeraFinca._id.toString();
        
        console.log(`🔄 Procesando finca ${finca.fincaId} ${esPrimeraFinca ? '⭐ (PRIMERA FINCA)' : ''}`);

        // 🔥 ACTUALIZACIÓN DIRECTA: Buscar y actualizar cada fruta coincidente
        for (let i = 0; i < finca.frutas.length; i++) {
          if (finca.frutas[i].nombre && 
              finca.frutas[i].nombre.toLowerCase() === nombreFruta.toLowerCase()) {
            
            // Guardar precios anteriores para logging
            const preciosAnteriores = { ...finca.frutas[i].precios };
            
            console.log(`🔄 Actualizando fruta "${finca.frutas[i].nombre}" (ID: ${finca.frutas[i]._id})`);
            console.log(`   Precios anteriores:`, preciosAnteriores);
            console.log(`   Precios nuevos:`, precios);
            
            // 🔥 ACTUALIZACIÓN GARANTIZADA
            finca.frutas[i].precios = {
              primera: Number(precios.primera),
              segunda: Number(precios.segunda),
              tercera: Number(precios.tercera)
            };
            
            frutasActualizadas++;
            frutasEnEstaFinca++;
            fincaActualizada = true;
            
            if (esPrimeraFinca) {
              primeraFincaActualizada = true;
              console.log(`⭐ PRIMERA FINCA ACTUALIZADA EXITOSAMENTE`);
            }
            
            // Agregar propietario al set
            propietariosActualizados.add(finca.usuario || 'Sin propietario');
            
            console.log(`✅ Fruta actualizada en ${esPrimeraFinca ? 'PRIMERA FINCA' : 'finca'} ${finca.fincaId}`);
          }
        }
        
        if (fincaActualizada) {
          // 🔥 GUARDAR CON VERIFICACIÓN
          finca.fecha = new Date();
          
          try {
            await finca.save();
            fincasActualizadas++;
            
            console.log(`💾 Finca ${finca.fincaId} guardada exitosamente ${esPrimeraFinca ? '⭐ (PRIMERA FINCA)' : ''}`);
            
            detallesActualizacion.push({
              fincaId: finca.fincaId,
              propietario: finca.usuario,
              frutasActualizadas: frutasEnEstaFinca,
              esPrimeraFinca: esPrimeraFinca,
              documentoId: finca._id.toString()
            });
            
          } catch (saveError) {
            console.error(`❌ Error al guardar finca ${finca.fincaId}:`, saveError);
            throw saveError;
          }
        } else {
          console.log(`⚠️ No se encontraron frutas para actualizar en finca ${finca.fincaId}`);
        }
        
      } catch (fincaError) {
        console.error(`❌ Error procesando finca ${finca.fincaId}:`, fincaError);
        errores.push({
          fincaId: finca.fincaId,
          propietario: finca.usuario,
          error: fincaError.message,
          esPrimeraFinca: primeraFinca && finca._id.toString() === primeraFinca._id.toString()
        });
      }
    }

    // 7. 🔥 VERIFICACIÓN FINAL Y ACTUALIZACIÓN FORZADA SI ES NECESARIO
    if (primeraFinca && !primeraFincaActualizada) {
      console.log(`🚨 EJECUTANDO ACTUALIZACIÓN FORZADA DE LA PRIMERA FINCA`);
      
      try {
        // Recargar la primera finca directamente desde la BD
        const primeraFincaFresca = await PrecioFruta.findById(primeraFinca._id);
        
        if (primeraFincaFresca) {
          let actualizacionForzadaExitosa = false;
          
          for (let i = 0; i < primeraFincaFresca.frutas.length; i++) {
            if (primeraFincaFresca.frutas[i].nombre && 
                primeraFincaFresca.frutas[i].nombre.toLowerCase() === nombreFruta.toLowerCase()) {
              
              console.log(`🔧 Actualizando forzosamente fruta "${primeraFincaFresca.frutas[i].nombre}"`);
              
              primeraFincaFresca.frutas[i].precios = {
                primera: Number(precios.primera),
                segunda: Number(precios.segunda),
                tercera: Number(precios.tercera)
              };
              
              actualizacionForzadaExitosa = true;
            }
          }
          
          if (actualizacionForzadaExitosa) {
            primeraFincaFresca.fecha = new Date();
            await primeraFincaFresca.save();
            
            primeraFincaActualizada = true;
            fincasActualizadas++;
            frutasActualizadas++;
            
            console.log(`✅ ACTUALIZACIÓN FORZADA EXITOSA DE LA PRIMERA FINCA`);
            
            detallesActualizacion.push({
              fincaId: primeraFincaFresca.fincaId,
              propietario: primeraFincaFresca.usuario,
              frutasActualizadas: 1,
              esPrimeraFinca: true,
              actualizacionForzada: true,
              documentoId: primeraFincaFresca._id.toString()
            });
          }
        }
      } catch (errorForzado) {
        console.error(`❌ Error en actualización forzada:`, errorForzado);
        errores.push({
          fincaId: primeraFinca.fincaId,
          propietario: primeraFinca.usuario,
          error: `Actualización forzada falló: ${errorForzado.message}`,
          esPrimeraFinca: true
        });
      }
    }

    // 8. 🔥 LOGGING FINAL COMPLETO
    console.log(`🎉 ========= ACTUALIZACIÓN GLOBAL COMPLETADA =========`);
    console.log(`👤 Usuario de sesión: ${usuarioActual}`);
    console.log(`🍎 Fruta actualizada: "${nombreFruta}"`);
    console.log(`📊 Estadísticas:`);
    console.log(`   - Total fincas del usuario encontradas: ${todasLasFincasDelUsuario.length}`);
    console.log(`   - Fincas con esta fruta: ${fincasConLaFruta.length}`);
    console.log(`   - Fincas actualizadas exitosamente: ${fincasActualizadas}`);
    console.log(`   - Total frutas actualizadas: ${frutasActualizadas}`);
    console.log(`   - ⭐ Primera finca actualizada: ${primeraFincaActualizada ? 'SÍ ✅' : 'NO ❌'}`);
    console.log(`   - Propietarios afectados: ${propietariosActualizados.size} (${Array.from(propietariosActualizados).join(', ')})`);
    console.log(`   - Errores encontrados: ${errores.length}`);
    
    if (detallesActualizacion.length > 0) {
      console.log(`📋 Detalles de actualización:`);
      detallesActualizacion.forEach((detalle, index) => {
        console.log(`   ${index + 1}. Finca ${detalle.fincaId} ${detalle.esPrimeraFinca ? '⭐' : ''} - ${detalle.frutasActualizadas} fruta(s) ${detalle.actualizacionForzada ? '(Forzada)' : ''}`);
      });
    }

    // 9. Respuesta final
    const respuesta = {
      success: true,
      message: `Precios de "${nombreFruta}" actualizados en ${fincasActualizadas} finca(s) de ${propietariosActualizados.size} propietario(s) ✅ ${primeraFincaActualizada ? '(Incluye primera finca)' : '⚠️ Primera finca NO se pudo actualizar'}`,
      fruta: nombreFruta,
      precios: precios,
      estadisticas: {
        usuarioSesion: usuarioActual,
        totalFincasEncontradas: todasLasFincasDelUsuario.length,
        fincasConEstaFruta: fincasConLaFruta.length,
        fincasActualizadas: fincasActualizadas,
        frutasActualizadas: frutasActualizadas,
        primeraFincaActualizada: primeraFincaActualizada,
        propietariosAfectados: Array.from(propietariosActualizados),
        totalPropietarios: propietariosActualizados.size,
        detallesActualizacion: detallesActualizacion,
        errores: errores.length,
        nuevosPrecios: {
          primera: Number(precios.primera),
          segunda: Number(precios.segunda),
          tercera: Number(precios.tercera)
        }
      }
    };

    if (errores.length > 0) {
      respuesta.errores = errores;
      respuesta.message += ` (${errores.length} errores encontrados - revisar logs)`;
    }

    // Verificar que la primera finca se actualizó
    if (!primeraFincaActualizada && primeraFinca) {
      respuesta.advertencia = "La primera finca no se pudo actualizar automáticamente. Puede requerir actualización manual.";
    }

    res.status(200).json(respuesta);
    
  } catch (err) {
    console.error("❌ Error crítico en actualización global:", err);
    res.status(500).json({ 
      error: "Error al actualizar precios", 
      detalles: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// 🔥 RUTA DE VERIFICACIÓN POST-ACTUALIZACIÓN
router.get("/verificar-actualizacion/:frutaId", async (req, res) => {
  const { frutaId } = req.params;
  const { usuario, adminAlias } = req.query;
  
  try {
    const usuarioActual = adminAlias || usuario;
    
    // Encontrar el nombre de la fruta
    const frutaOriginal = await PrecioFruta.findOne({ "frutas._id": frutaId });
    if (!frutaOriginal) {
      return res.status(404).json({ error: "Fruta no encontrada" });
    }
    
    const nombreFruta = frutaOriginal.frutas.find(f => f._id.toString() === frutaId)?.nombre;
    
    // Buscar todas las fincas del usuario
    const todasLasFincas = await PrecioFruta.find({
      $and: [
        { fincaId: { $ne: null } },
        {
          $or: [
            { usuario: usuarioActual },
            { adminAlias: usuarioActual },
            { usuario: usuario },
            { adminAlias: usuario }
          ]
        }
      ]
    }).sort({ fecha: 1 });
    
    const fincasConLaFruta = todasLasFincas.filter(finca =>
      finca.frutas.some(f => f.nombre?.toLowerCase() === nombreFruta.toLowerCase())
    );
    
    const verificacion = {
      frutaVerificada: nombreFruta,
      usuarioConsultado: usuarioActual,
      totalFincasUsuario: todasLasFincas.length,
      fincasConEstaFruta: fincasConLaFruta.length,
      primeraFinca: todasLasFincas.length > 0 ? {
        fincaId: todasLasFincas[0].fincaId,
        tieneEstaFruta: todasLasFincas[0].frutas.some(f => 
          f.nombre?.toLowerCase() === nombreFruta.toLowerCase()
        ),
        preciosActuales: todasLasFincas[0].frutas
          .filter(f => f.nombre?.toLowerCase() === nombreFruta.toLowerCase())
          .map(f => f.precios)
      } : null,
      resumenPrecios: fincasConLaFruta.map(finca => ({
        fincaId: finca.fincaId,
        fechaActualizacion: finca.fecha,
        preciosEncontrados: finca.frutas
          .filter(f => f.nombre?.toLowerCase() === nombreFruta.toLowerCase())
          .map(f => ({
            nombre: f.nombre,
            precios: f.precios,
            frutaId: f._id
          }))
      }))
    };
    
    res.status(200).json(verificacion);
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔥 RUTA DE DIAGNÓSTICO ESPECÍFICA PARA PRIMERA FINCA
router.get("/diagnosticar-primera-finca/:frutaId", async (req, res) => {
  const { frutaId } = req.params;
  const { usuario, adminAlias } = req.query;
  
  try {
    const usuarioActual = adminAlias || usuario;
    
    console.log(`🔍 DIAGNÓSTICO PRIMERA FINCA para fruta ${frutaId} y usuario ${usuarioActual}`);
    
    // Encontrar el nombre de la fruta
    const frutaOriginal = await PrecioFruta.findOne({ "frutas._id": frutaId });
    const nombreFruta = frutaOriginal ? 
      frutaOriginal.frutas.find(f => f._id.toString() === frutaId)?.nombre : 
      'No encontrada';
    
    // Buscar la primera finca del usuario
    const primeraFinca = await PrecioFruta.findOne({
      $and: [
        { fincaId: { $ne: null } },
        {
          $or: [
            { usuario: usuarioActual },
            { adminAlias: usuarioActual },
            { usuario: usuario },
            { adminAlias: usuario }
          ]
        }
      ]
    }).sort({ fecha: 1 });
    
    // Obtener todas las fincas del usuario
    const todasLasFincas = await PrecioFruta.find({
      $and: [
        { fincaId: { $ne: null } },
        {
          $or: [
            { usuario: usuarioActual },
            { adminAlias: usuarioActual },
            { usuario: usuario },
            { adminAlias: usuario }
          ]
        }
      ]
    }).sort({ fecha: 1 });
    
    const diagnostico = {
      usuarioConsultado: usuarioActual,
      frutaBuscada: nombreFruta,
      frutaId: frutaId,
      primeraFinca: primeraFinca ? {
        _id: primeraFinca._id,
        fincaId: primeraFinca.fincaId,
        usuario: primeraFinca.usuario,
        adminAlias: primeraFinca.adminAlias,
        fecha: primeraFinca.fecha,
        totalFrutas: primeraFinca.frutas.length,
        tieneEstaFruta: primeraFinca.frutas.some(f => 
          f.nombre?.toLowerCase() === nombreFruta.toLowerCase()
        ),
        preciosDeEstaFruta: primeraFinca.frutas
          .filter(f => f.nombre?.toLowerCase() === nombreFruta.toLowerCase())
          .map(f => ({
            id: f._id,
            nombre: f.nombre,
            precios: f.precios
          }))
      } : null,
      totalFincasUsuario: todasLasFincas.length,
      fincasConEstaFruta: todasLasFincas.filter(finca => 
        finca.frutas.some(f => f.nombre?.toLowerCase() === nombreFruta.toLowerCase())
      ).length,
      resumenFincas: todasLasFincas.map((finca, index) => ({
        orden: index + 1,
        esPrimera: index === 0,
        fincaId: finca.fincaId,
        usuario: finca.usuario,
        adminAlias: finca.adminAlias,
        fecha: finca.fecha,
        tieneEstaFruta: finca.frutas.some(f => 
          f.nombre?.toLowerCase() === nombreFruta.toLowerCase()
        )
      }))
    };
    
    res.status(200).json(diagnostico);
    
  } catch (err) {
    console.error("Error en diagnóstico primera finca:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔥 RUTA DE DIAGNÓSTICO ESPECÍFICA: GET /precios/diagnosticar-primera-finca
router.get("/diagnosticar-primera-finca", async (req, res) => {
  const { usuario, adminAlias, nombreFruta } = req.query;
  
  try {
    console.log(`🔍 DIAGNÓSTICO ESPECÍFICO PARA PRIMERA FINCA`);
    console.log(`👤 Usuario: ${usuario}`);
    console.log(`🏢 AdminAlias: ${adminAlias}`);
    console.log(`🍎 Fruta: ${nombreFruta}`);
    
    // Obtener TODAS las fincas
    const todasLasFincas = await PrecioFruta.find({}).sort({ fecha: 1 }); // Ordenar por fecha de creación
    
    const diagnostico = todasLasFincas.map((finca, index) => {
      const tieneFruta = nombreFruta ? 
        finca.frutas?.some(f => f.nombre?.toLowerCase() === nombreFruta.toLowerCase()) : 
        'No especificada';
        
      return {
        orden: index + 1,
        esPrimeraFinca: index === 0,
        fincaId: finca.fincaId,
        usuario: finca.usuario,
        adminAlias: finca.adminAlias,
        fecha: finca.fecha,
        totalFrutas: finca.frutas?.length || 0,
        tieneFrutaBuscada: tieneFruta,
        coincideConUsuario: finca.usuario === usuario || finca.adminAlias === usuario || 
                           finca.usuario === adminAlias || finca.adminAlias === adminAlias,
        estructuraCompleta: {
          tieneUsuario: !!finca.usuario,
          tieneAdminAlias: !!finca.adminAlias,
          tieneFrutas: !!(finca.frutas && finca.frutas.length > 0)
        }
      };
    });
    
    res.status(200).json({
      totalFincas: todasLasFincas.length,
      usuarioBuscado: usuario,
      adminAliasBuscado: adminAlias,
      frutaBuscada: nombreFruta || 'No especificada',
      diagnostico: diagnostico,
      primeraFinca: diagnostico[0] || null
    });
    
  } catch (err) {
    console.error("Error en diagnóstico:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/debug-fincas-usuario", async (req, res) => {
  const { usuario, adminAlias } = req.query;
  
  try {
    const usuarioSesion = adminAlias || usuario;
    
    const filtros = {
      $or: [
        { usuario: usuarioSesion },
        { adminAlias: usuarioSesion }
      ]
    };
    
    const fincas = await PrecioFruta.find(filtros);
    
    const resumen = fincas.map(finca => ({
      fincaId: finca.fincaId,
      propietario: finca.usuario,
      adminAlias: finca.adminAlias,
      totalFrutas: finca.frutas?.length || 0,
      frutas: finca.frutas?.map(f => f.nombre) || [],
      fecha: finca.fecha
    }));
    
    res.status(200).json({
      usuarioConsultado: usuarioSesion,
      totalFincas: fincas.length,
      fincas: resumen
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/debug-fruta-global/:nombreFruta", async (req, res) => {
  const { nombreFruta } = req.params;
  const { usuario, adminAlias } = req.query;
  
  try {
    const usuarioSesion = adminAlias || usuario;
    
    // Buscar todas las fincas del usuario que tienen esta fruta
    const fincasConFruta = await PrecioFruta.find({
      $and: [
        {
          $or: [
            { usuario: usuarioSesion },
            { adminAlias: usuarioSesion }
          ]
        },
        {
          "frutas.nombre": { $regex: new RegExp(`^${nombreFruta}$`, 'i') }
        }
      ]
    });
    
    const detalles = fincasConFruta.map(finca => {
      const frutasCoincidentes = finca.frutas.filter(f => 
        f.nombre.toLowerCase() === nombreFruta.toLowerCase()
      );
      
      return {
        fincaId: finca.fincaId,
        propietario: finca.usuario,
        adminAlias: finca.adminAlias,
        frutasEncontradas: frutasCoincidentes.length,
        precios: frutasCoincidentes.map(f => ({
          id: f._id,
          precios: f.precios
        }))
      };
    });
    
    res.status(200).json({
      fruta: nombreFruta,
      usuarioSesion: usuarioSesion,
      totalFincasConFruta: fincasConFruta.length,
      detalles: detalles
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔥 NUEVA RUTA ADICIONAL: PUT /precios/actualizar-global-por-nombre
// Esta ruta permite actualizar directamente por nombre de fruta
router.put("/actualizar-global-por-nombre", async (req, res) => {
  const { nombreFruta, precios, usuario, adminAlias } = req.body;

  console.log(`🌍 ACTUALIZANDO POR NOMBRE: "${nombreFruta}"`);
  
  if (!nombreFruta || !precios || !usuario) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  try {
    // Buscar TODAS las fincas del usuario que tengan frutas con este nombre
    const filtros = {
      "frutas.nombre": { $regex: new RegExp(`^${nombreFruta}$`, 'i') },
      $or: [
        { usuario: adminAlias || usuario },
        { adminAlias: adminAlias || usuario }
      ]
    };

    const fincasConFruta = await PrecioFruta.find(filtros);
    
    let fincasActualizadas = 0;
    let frutasActualizadas = 0;

    for (const finca of fincasConFruta) {
      let fincaActualizada = false;
      
      for (let i = 0; i < finca.frutas.length; i++) {
        if (finca.frutas[i].nombre.toLowerCase() === nombreFruta.toLowerCase()) {
          finca.frutas[i].precios = precios;
          frutasActualizadas++;
          fincaActualizada = true;
        }
      }
      
      if (fincaActualizada) {
        finca.fecha = new Date();
        await finca.save();
        fincasActualizadas++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Precios de "${nombreFruta}" actualizados en ${fincasActualizadas} finca(s)`,
      fincasActualizadas,
      frutasActualizadas
    });
    
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
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
    
    // ✅ Filtrar por usuario ESTRICTAMENTE
    if (usuario || adminAlias) {
      const usuarioActual = adminAlias || usuario;
      filtros.$or = [
        { adminAlias: usuarioActual },
        { usuario: usuarioActual }
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
// En /todos-los-precios-con-frecuencia
router.get("/todos-los-precios-con-frecuencia", async (req, res) => {
  const { usuario, adminAlias } = req.query;
  
  try {
    const usuarioActual = adminAlias || usuario;
    const filtros = {
      $or: [
        { usuario: usuarioActual },
        { adminAlias: usuarioActual }
      ]
    };
    
    const precios = await PrecioFruta.find(filtros).lean();
    
    // Agrupar por nombre de fruta ignorando mayúsculas/minúsculas
    const frutasAgrupadas = {};
    
    precios.forEach(doc => {
      doc.frutas.forEach(fruta => {
        const nombreNormalizado = fruta.nombre.toLowerCase().trim();
        
        if (!frutasAgrupadas[nombreNormalizado]) {
          frutasAgrupadas[nombreNormalizado] = {
            ids: [fruta._id.toString()],
            nombre: fruta.nombre,
            precios: [],
            documentos: []
          };
        }
        
        frutasAgrupadas[nombreNormalizado].precios.push(fruta.precios);
        frutasAgrupadas[nombreNormalizado].documentos.push({
          fincaId: doc.fincaId,
          docId: doc._id
        });
      });
    });
    
    // Calcular precios más frecuentes
    const resultado = Object.values(frutasAgrupadas).map(grupo => {
      return {
        _id: grupo.ids[0], // Usar el primer ID como referencia
        nombre: grupo.nombre,
        ids: grupo.ids, // Todos los IDs de esta fruta
        precios: {
          primera: calcularPrecioMasFrecuente(grupo.precios.map(p => p.primera)),
          segunda: calcularPrecioMasFrecuente(grupo.precios.map(p => p.segunda)),
          tercera: calcularPrecioMasFrecuente(grupo.precios.map(p => p.tercera))
        },
        estadisticas: {
          totalVariaciones: grupo.precios.length,
          fincas: grupo.documentos.length
        }
      };
    });
    
    res.status(200).json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔥 GET /precios/verificar-estructura - Ruta de diagnóstico mejorada
router.get("/verificar-estructura", async (req, res) => {
  try {
    const { usuario } = req.query;
    
    console.log(`🔧 DIAGNÓSTICO para usuario: ${usuario}`);
    
    const todosLosPrecios = await PrecioFruta.find({}).lean();
    
    // ✅ FILTRO MEJORADO: Solo mostrar datos del usuario específico
    let preciosUsuario = [];
    if (usuario) {
      preciosUsuario = todosLosPrecios.filter(p => 
        p.usuario === usuario || 
        p.adminAlias === usuario
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

// 🔥 NUEVA RUTA: GET /precios/contar-fincas-con-fruta/:frutaId - Contar cuántas fincas tienen una fruta específica
router.get("/contar-fincas-con-fruta/:frutaId", async (req, res) => {
  const frutaId = req.params.frutaId;
  const { usuario, adminAlias } = req.query;
  
  console.log(`🔢 Contando fincas con fruta ${frutaId} para usuario: ${usuario || adminAlias}`);
  
  try {
    const filtros = {
      "frutas._id": frutaId
    };
    
    // Filtrar por usuario si se proporciona
    if (usuario || adminAlias) {
      const usuarioActual = adminAlias || usuario;
      filtros.$or = [
        { usuario: usuarioActual },
        { adminAlias: usuarioActual }
      ];
    }
    
    const fincasConFruta = await PrecioFruta.find(filtros).lean();
    
    const resultado = {
      frutaId: frutaId,
      totalFincas: fincasConFruta.length,
      fincas: fincasConFruta.map(finca => ({
        fincaId: finca.fincaId,
        usuario: finca.usuario,
        adminAlias: finca.adminAlias,
        fecha: finca.fecha
      }))
    };
    
    console.log(`📊 Resultado: ${resultado.totalFincas} fincas tienen la fruta ${frutaId}`);
    
    res.status(200).json(resultado);
  } catch (err) {
    console.error("❌ Error al contar fincas:", err);
    res.status(500).json({ error: "Error al contar fincas: " + err.message });
  }
});

module.exports = router;