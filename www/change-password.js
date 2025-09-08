

// ✅ IMPORTAR la función apiFetch
import { apiFetch } from "./api.js";

document.getElementById("changePasswordForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const oldPassword = document.getElementById("oldPassword").value.trim();
    const newPassword = document.getElementById("newPassword").value.trim();

    if (!username || !oldPassword || !newPassword) {
        return alert("Todos los campos son obligatorios.");
    }

    try {
        const body = {
            username,
            oldPassword,
            newPassword,
        };

        // ✅ USAR apiFetch en lugar de fetch directo
        await apiFetch("/auth/change-password", "POST", body);
        
        alert("Contraseña actualizada correctamente.");
        window.location.href = "index.html";
        
    } catch (err) {
        console.error("Error en la solicitud:", err);
        alert("Error al actualizar la contraseña: " + err.message);
    }
});