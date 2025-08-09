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

        const response = await fetch("/auth/change-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (response.ok) {
            alert("Contraseña actualizada correctamente.");
            window.location.href = "index.html";  // Redirigir al login u otra página.
        } else {
            const data = await response.json();
            alert(data.message || "Error al actualizar la contraseña.");
        }
    } catch (err) {
        alert("Error en la solicitud: " + err.message);
    }
});
