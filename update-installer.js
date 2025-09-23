const fs = require('fs');
const path = require('path');

// RUTAS CONFIGURADAS PARA TU PROYECTO CAPACITOR
const APK_PATH = './android/app/build/outputs/apk/debug/app-debug.apk';
const INSTALLER_HTML = './www/instalador.html';
const WEB_APK_PATH = './www/app-debug.apk';

function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        const fileSizeInBytes = stats.size;
        const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(1);
        return `${fileSizeInMB} MB`;
    } catch (error) {
        console.log('⚠️  No se pudo obtener el tamaño del archivo');
        return '~25 MB';
    }
}

function getCurrentVersion() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return `Versión ${day}/${month}/${year} - ${hours}:${minutes}`;
}

function updateInstaller() {
    console.log('🔄 Actualizando instalador...');
    console.log('📍 Buscando APK en:', APK_PATH);
    
    // Verificar que existe la APK de Capacitor
    if (!fs.existsSync(APK_PATH)) {
        console.error('❌ APK no encontrada en:', APK_PATH);
        console.log('💡 Asegúrate de compilar primero con: npx cap build android');
        return false;
    }
    
    // Copiar APK al directorio web
    try {
        fs.copyFileSync(APK_PATH, WEB_APK_PATH);
        console.log('✅ APK copiada desde Capacitor al directorio web');
    } catch (error) {
        console.error('❌ Error al copiar APK:', error.message);
        return false;
    }
    
    // Obtener información del archivo
    const fileSize = getFileSize(WEB_APK_PATH);
    const version = getCurrentVersion();
    
    console.log(`📊 Tamaño del APK: ${fileSize}`);
    console.log(`🏷️  Nueva versión: ${version}`);
    
    // Verificar que existe instalador.html
    if (!fs.existsSync(INSTALLER_HTML)) {
        console.error('❌ No se encontró instalador.html');
        console.log('💡 Asegúrate de guardar el HTML como "instalador.html"');
        return false;
    }
    
    // Leer el contenido del instalador
    let htmlContent = fs.readFileSync(INSTALLER_HTML, 'utf8');
    
    // Nueva configuración actualizada
    const newConfig = `        // ===== CONFIGURACIÓN DE LA APLICACIÓN =====
        // Esta configuración se actualiza automáticamente con el script
        const APP_CONFIG = {
            name: "Mi Aplicación",
            version: "${version}",
            description: "Una aplicación increíble que transformará tu experiencia digital. Descárgala ahora y disfruta de todas sus características únicas.",
            fileName: "app-debug.apk",
            fileSize: "${fileSize}",
            logoEmoji: "📱",
            downloadUrl: "./app-debug.apk" // Se actualiza automáticamente al path correcto
        };`;
    
    // Buscar y reemplazar la configuración existente
    const configRegex = /        \/\/ ===== CONFIGURACIÓN DE LA APLICACIÓN =====[\s\S]*?        };/;
    
    if (configRegex.test(htmlContent)) {
        htmlContent = htmlContent.replace(configRegex, newConfig);
        
        // Guardar el archivo actualizado
        fs.writeFileSync(INSTALLER_HTML, htmlContent, 'utf8');
        console.log('✅ instalador.html actualizado correctamente');
        console.log(`🚀 Archivos listos para subir al servidor:`);
        console.log(`   📄 instalador.html`);
        console.log(`   📱 app-debug.apk (${fileSize})`);
        console.log('');
        console.log('🔗 El instalador ahora apunta a: ./app-debug.apk');
        return true;
    } else {
        console.error('❌ No se encontró la sección de configuración en instalador.html');
        console.log('💡 Verifica que el HTML tenga la estructura correcta');
        return false;
    }
}

// Ejecutar la función principal
if (updateInstaller()) {
    console.log('🎉 ¡Proceso completado exitosamente!');
} else {
    console.log('💥 Hubo errores en el proceso');
    process.exit(1);
}