// Detectar si Capacitor está disponible
let isCapacitor = false;
let CapacitorHttp = null;

// Intentar importar Capacitor (solo si está disponible)
try {
  if (window.Capacitor) {
    isCapacitor = window.Capacitor.isNativePlatform();
    if (isCapacitor && window.Capacitor.Plugins.CapacitorHttp) {
      CapacitorHttp = window.Capacitor.Plugins.CapacitorHttp;
      console.log("📱 Capacitor HTTP Plugin disponible");
    }
  }
} catch (error) {
  console.log("🌐 Ejecutándose en navegador web");
}

export async function apiFetch(endpoint, method = "GET", data = null) {
  const url = `https://jc-frutas.onrender.com${endpoint}`;
  
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    credentials: "include",
  };

  if (data) options.body = JSON.stringify(data);

  try {
    console.log(`🌐 API Request (${isCapacitor ? 'Capacitor' : 'Web'}): ${method} ${url}`, data);
    
    let response;
    let responseData;

    if (isCapacitor && CapacitorHttp) {
      // *** USAR CAPACITOR HTTP PLUGIN ***
      try {
        const capacitorResponse = await CapacitorHttp.request({
          url: url,
          method: method,
          headers: options.headers,
          data: data, // Capacitor espera el objeto directamente, no JSON string
          webFetchExtra: {
            credentials: 'include'
          }
        });

        console.log(`📱 Capacitor Response:`, capacitorResponse);

        // Transformar respuesta de Capacitor al formato estándar
        response = {
          ok: capacitorResponse.status >= 200 && capacitorResponse.status < 300,
          status: capacitorResponse.status,
          statusText: capacitorResponse.status.toString(),
          headers: {
            get: (name) => capacitorResponse.headers[name] || capacitorResponse.headers[name.toLowerCase()]
          }
        };

        responseData = capacitorResponse.data;

      } catch (capacitorError) {
        console.error("❌ Capacitor HTTP Error:", capacitorError);
        // Fallback a fetch normal si Capacitor falla
        response = await fetch(url, options);
        responseData = await parseResponse(response);
      }

    } else {
      // *** USAR FETCH NORMAL (WEB) ***
      response = await fetch(url, options);
      responseData = await parseResponse(response);
    }

    console.log(`📊 API Response (${response.status}):`, responseData);

    // Si la respuesta no es exitosa
    if (!response.ok) {
      return handleErrorResponse(response.status, responseData);
    }

    return responseData;
    
  } catch (error) {
    console.error(`❌ API Error:`, error);
    
    // Si ya es nuestro error personalizado, re-lanzarlo
    if (error.type === "CUENTA_BLOQUEADA") {
      throw error;
    }
    
    // Si es un error de red o parsing sin status
    if (!error.status) {
      const networkError = new Error("Error de conexión con el servidor");
      networkError.status = 0;
      throw networkError;
    }
    
    // Re-lanzar cualquier otro error
    throw error;
  }
}

// Función auxiliar para parsear respuesta (solo para fetch web)
async function parseResponse(response) {
  const contentType = response.headers.get("content-type");
  
  if (contentType && contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch (parseError) {
      return { message: await response.text() };
    }
  } else {
    return { message: await response.text() };
  }
}

// Función auxiliar para manejar errores
function handleErrorResponse(status, responseData) {
  // CASO ESPECIAL: Usuario bloqueado (status 403)
  if (status === 403 && responseData.error === "CUENTA_BLOQUEADA") {
    const error = new Error("CUENTA_BLOQUEADA");
    error.status = 403;
    error.type = "CUENTA_BLOQUEADA";
    error.data = responseData;
    error.username = responseData.username;
    throw error;
  }
  
  // Para otros errores, usar el mensaje del servidor o texto plano
  const errorMessage = responseData.message || responseData.error || responseData || `Error ${status}`;
  const error = new Error(errorMessage);
  error.status = status;
  error.data = responseData;
  throw error;
}

// Función de test para verificar conectividad
export async function testApiConnection() {
  try {
    console.log("🔍 Probando conexión API...");
    const result = await apiFetch("/debug/cors", "GET");
    console.log("✅ Test de API exitoso:", result);
    return true;
  } catch (error) {
    console.error("❌ Test de API falló:", error);
    return false;
  }
}

// Auto-test al cargar (solo en Capacitor)
if (isCapacitor) {
  console.log("🚀 Iniciando en modo Capacitor");
  
  // Test automático después de un breve delay
  setTimeout(() => {
    testApiConnection();
  }, 1000);
} else {
  console.log("🌐 Iniciando en modo Web");
}