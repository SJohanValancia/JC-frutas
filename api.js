export async function apiFetch(endpoint, method = "GET", data = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  };

  if (data) options.body = JSON.stringify(data);

  const response = await fetch(`http://localhost:3000${endpoint}`, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Error en la solicitud");
  }

  return await response.json().catch(() => ({}));
}
