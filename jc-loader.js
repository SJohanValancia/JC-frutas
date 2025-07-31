/**
 * JC AUTO-LOADER - Script Universal Automático
 * Se activa automáticamente al cargar cualquier página
 * Solo incluir: <script src="jc-loader.js"></script>
 */

const JCAutoLoader = {
  // Configuración del loader
  config: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    letterColor: '#ffffff',
    lineColor: '#00d4ff',
    lineWidth: 4,
    animationDuration: 3000,
    autoHideDelay: 1000, // Tiempo extra después de que carga la página
    showOnFetch: true, // Mostrar automáticamente en fetch requests
    minimumShowTime: 800 // Tiempo mínimo que se muestra el loader
  },

  // Estado del loader
  isVisible: false,
  loaderElement: null,
  animationInterval: null,
  startTime: null,
  originalFetch: null,

  // Crear el HTML y CSS del loader
  createLoader() {
    const loaderContainer = document.createElement('div');
    loaderContainer.id = 'jc-auto-loader';
    loaderContainer.innerHTML = `
      <div class="jc-loader-content">
        <svg class="jc-letters" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
          <!-- Letra J -->
          <path id="letter-j" d="M50 50 L50 120 Q50 140 70 140 Q90 140 90 120 L90 100" 
                fill="none" 
                stroke="${this.config.letterColor}" 
                stroke-width="8" 
                stroke-linecap="round" 
                stroke-linejoin="round"/>
          
          <!-- Letra C -->
          <path id="letter-c" d="M200 80 Q170 50 140 80 Q140 100 140 120 Q170 150 200 120" 
                fill="none" 
                stroke="${this.config.letterColor}" 
                stroke-width="8" 
                stroke-linecap="round" 
                stroke-linejoin="round"/>
          
          <!-- Línea animada que traza las letras -->
          <path id="tracing-line" d="M50 50 L50 120 Q50 140 70 140 Q90 140 90 120 L90 100 M200 80 Q170 50 140 80 Q140 100 140 120 Q170 150 200 120" 
                fill="none" 
                stroke="${this.config.lineColor}" 
                stroke-width="${this.config.lineWidth}" 
                stroke-linecap="round" 
                stroke-linejoin="round"
                stroke-dasharray="1000"
                stroke-dashoffset="1000"/>
        </svg>
        
        <div class="loading-text" id="auto-loading-text">Cargando...</div>
        <div class="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;

    // Agregar estilos CSS
    const style = document.createElement('style');
    style.textContent = `
      #jc-auto-loader {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: ${this.config.backgroundColor};
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        opacity: 1;
        visibility: visible;
        transition: opacity 0.5s ease, visibility 0.5s ease;
        backdrop-filter: blur(5px);
      }

      #jc-auto-loader.hide {
        opacity: 0;
        visibility: hidden;
      }

      .jc-loader-content {
        text-align: center;
        color: ${this.config.letterColor};
      }

      .jc-letters {
        width: 300px;
        height: 200px;
        margin: 0 auto 30px;
        filter: drop-shadow(0 0 20px ${this.config.lineColor});
      }

      #letter-j, #letter-c {
        opacity: 0.3;
        transition: opacity 0.5s ease;
      }

      #letter-j.traced, #letter-c.traced {
        opacity: 1;
      }

      #tracing-line {
        animation: tracePath ${this.config.animationDuration}ms linear infinite;
        filter: drop-shadow(0 0 10px ${this.config.lineColor});
      }

      @keyframes tracePath {
        0% {
          stroke-dashoffset: 1000;
        }
        50% {
          stroke-dashoffset: 500;
        }
        100% {
          stroke-dashoffset: 0;
        }
      }

      .loading-text {
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 20px;
        text-transform: uppercase;
        letter-spacing: 2px;
        animation: pulse 2s ease-in-out infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1; }
      }

      .loading-dots {
        display: flex;
        justify-content: center;
        gap: 8px;
      }

      .loading-dots span {
        width: 12px;
        height: 12px;
        background: ${this.config.lineColor};
        border-radius: 50%;
        animation: bounce 1.4s ease-in-out infinite both;
        box-shadow: 0 0 10px ${this.config.lineColor};
      }

      .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
      .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
      .loading-dots span:nth-child(3) { animation-delay: 0s; }

      @keyframes bounce {
        0%, 80%, 100% {
          transform: scale(0);
          opacity: 0.5;
        }
        40% {
          transform: scale(1);
          opacity: 1;
        }
      }

      /* Responsive */
      @media (max-width: 768px) {
        .jc-letters {
          width: 250px;
          height: 160px;
        }
        
        .loading-text {
          font-size: 20px;
        }
      }

      @media (max-width: 480px) {
        .jc-letters {
          width: 200px;
          height: 130px;
        }
        
        .loading-text {
          font-size: 18px;
        }
      }

      /* Prevenir scroll cuando el loader está activo */
      body.jc-auto-loader-active {
        overflow: hidden;
      }
    `;

    document.head.appendChild(style);
    this.loaderElement = loaderContainer;
    return loaderContainer;
  },

  // Inicializar el loader automático
  init() {
    console.log('🎨 JC Auto-Loader inicializando...');
    
    // Crear y mostrar loader inmediatamente
    const loader = this.createLoader();
    document.body.appendChild(loader);
    
    // Prevenir scroll
    document.body.classList.add('jc-auto-loader-active');
    
    this.isVisible = true;
    this.startTime = Date.now();
    this.startTracingAnimation();
    
    // Interceptar fetch automáticamente
    this.interceptFetch();
    
    // Configurar auto-hide cuando la página termine de cargar
    this.setupAutoHide();
    
    console.log('🔄 JC Auto-Loader activo');
  },

  // Configurar ocultación automática
  setupAutoHide() {
    const hideLoader = () => {
      const elapsedTime = Date.now() - this.startTime;
      const remainingTime = Math.max(0, this.config.minimumShowTime - elapsedTime);
      
      setTimeout(() => {
        this.updateMessage('¡Listo!');
        setTimeout(() => {
          this.hide();
        }, this.config.autoHideDelay);
      }, remainingTime);
    };

    // Si la página ya está cargada
    if (document.readyState === 'complete') {
      setTimeout(hideLoader, 100);
    } else {
      // Escuchar cuando termine de cargar
      window.addEventListener('load', hideLoader);
      
      // Backup: ocultar después de DOMContentLoaded + delay
      document.addEventListener('DOMContentLoaded', () => {
        this.updateMessage('Finalizando...');
        setTimeout(hideLoader, 500);
      });
    }
  },

  // Interceptar fetch requests automáticamente
  interceptFetch() {
    if (!this.config.showOnFetch) return;
    
    // Guardar fetch original
    this.originalFetch = window.fetch;
    
    // Contador de requests activos
    let activeRequests = 0;
    
    // Sobrescribir fetch
    window.fetch = (...args) => {
      activeRequests++;
      
      // Mostrar loader si no está visible y hay requests
      if (!this.isVisible && activeRequests > 0) {
        this.show('Cargando datos...');
      } else if (this.isVisible) {
        this.updateMessage('Cargando datos...');
      }
      
      // Ejecutar fetch original
      return this.originalFetch(...args)
        .then(response => {
          activeRequests--;
          
          // Ocultar loader si no hay más requests activos
          if (activeRequests <= 0 && this.isVisible) {
            setTimeout(() => {
              if (activeRequests <= 0) {
                this.updateMessage('¡Completado!');
                setTimeout(() => this.hide(), 800);
              }
            }, 300);
          }
          
          return response;
        })
        .catch(error => {
          activeRequests--;
          
          // Ocultar loader en caso de error
          if (activeRequests <= 0 && this.isVisible) {
            this.updateMessage('Error en carga');
            setTimeout(() => this.hide(), 1000);
          }
          
          throw error;
        });
    };
  },

  // Mostrar el loader manualmente
  show(mensaje = 'Cargando...') {
    if (this.isVisible) {
      this.updateMessage(mensaje);
      return;
    }

    if (!this.loaderElement) {
      this.init();
      return;
    }

    this.updateMessage(mensaje);
    document.body.classList.add('jc-auto-loader-active');
    this.loaderElement.classList.remove('hide');
    this.isVisible = true;
    this.startTime = Date.now();
    this.startTracingAnimation();
  },

  // Ocultar el loader
  hide() {
    if (!this.isVisible || !this.loaderElement) return;

    this.stopTracingAnimation();
    this.loaderElement.classList.add('hide');
    this.isVisible = false;
    document.body.classList.remove('jc-auto-loader-active');

    // Remover completamente después de la transición
    setTimeout(() => {
      if (this.loaderElement && this.loaderElement.parentNode) {
        this.loaderElement.parentNode.removeChild(this.loaderElement);
        this.loaderElement = null;
      }
    }, 500);

    console.log('✅ JC Auto-Loader ocultado');
  },

  // Actualizar mensaje
  updateMessage(nuevoMensaje) {
    if (this.loaderElement) {
      const loadingText = this.loaderElement.querySelector('#auto-loading-text');
      if (loadingText) {
        loadingText.textContent = nuevoMensaje;
      }
    }
  },

  // Animación de trazado de letras
  startTracingAnimation() {
    if (!this.loaderElement) return;
    
    const letterJ = this.loaderElement.querySelector('#letter-j');
    const letterC = this.loaderElement.querySelector('#letter-c');
    
    if (!letterJ || !letterC) return;
    
    this.animationInterval = setInterval(() => {
      // Resetear opacidad
      letterJ.classList.remove('traced');
      letterC.classList.remove('traced');
      
      // Animar J primero
      setTimeout(() => {
        letterJ.classList.add('traced');
      }, 500);
      
      // Luego animar C
      setTimeout(() => {
        letterC.classList.add('traced');
      }, 1500);
    }, this.config.animationDuration);
  },

  // Parar animación
  stopTracingAnimation() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  }
};

// 🚀 AUTO-INICIALIZACIÓN INMEDIATA
// Se ejecuta tan pronto como se carga el script
(function() {
  // Inicializar inmediatamente
  JCAutoLoader.init();
  
  // Exportar para uso manual si es necesario
  window.JCLoader = {
    show: (msg) => JCAutoLoader.show(msg),
    hide: () => JCAutoLoader.hide(),
    updateMessage: (msg) => JCAutoLoader.updateMessage(msg)
  };
  
  console.log('🎨 JC Auto-Loader configurado y activo');
})();

/**
 * 🎯 USO AUTOMÁTICO:
 * 
 * 1. Solo incluir: <script src="jc-loader.js"></script>
 * 2. El loader aparece automáticamente al cargar la página
 * 3. Se oculta automáticamente cuando termina de cargar
 * 4. Aparece automáticamente en llamadas fetch()
 * 
 * USO MANUAL (opcional):
 * JCLoader.show('Mensaje personalizado');
 * JCLoader.hide();
 * JCLoader.updateMessage('Nuevo mensaje');
 */