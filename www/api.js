export async function apiFetch(endpoint, method = "GET", data = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  };

  if (data) options.body = JSON.stringify(data);

  try {
    console.log(`🌐 API Request: ${method} https://jc-frutas.onrender.com${endpoint}`, data);
    
    const response = await fetch(`https://jc-frutas.onrender.com${endpoint}`, options);
    
    // Intentar parsear la respuesta como JSON primero
    let responseData;
    const contentType = response.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
      try {
        responseData = await response.json();
      } catch (parseError) {
        responseData = { message: await response.text() };
      }
    } else {
      responseData = { message: await response.text() };
    }

    console.log(`📊 API Response (${response.status}):`, responseData);

    // Si la respuesta no es exitosa
    if (!response.ok) {
      // CASO ESPECIAL: Usuario bloqueado (status 403)
      if (response.status === 403 && responseData.error === "CUENTA_BLOQUEADA") {
        const error = new Error("CUENTA_BLOQUEADA");
        error.status = 403;
        error.type = "CUENTA_BLOQUEADA";
        error.data = responseData;
        error.username = responseData.username;
        throw error;
      }
      
      // Para otros errores, usar el mensaje del servidor o texto plano
      const errorMessage = responseData.message || responseData.error || responseData || `Error ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = responseData;
      throw error;
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