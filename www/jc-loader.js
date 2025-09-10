/**
 * 🔥 JC ULTRA PROFESSIONAL LOADER - Executive Edition
 * Loader elegante y profesional que causa impacto visual
 * Solo incluir: <script src="jc-loader.js"></script> en el <head>
 */

const JCUltraLoader = {
  // Configuración profesional
  config: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    backdropBlur: '10px',
    primaryColor: '#ffffff',
    accentColor: '#3b82f6',
    glowColor: '#60a5fa',
    animationSpeed: 3000,
    lineDrawSpeed: 2000,
    autoHideDelay: 1200,
    minimumShowTime: 1000
  },

  // Estado del loader
  isActive: false,
  loaderContainer: null,
  animationId: null,
  startTime: null,
  lineProgress: 0,

  // 🎨 Crear el loader profesional
  createProfessionalLoader() {
    const container = document.createElement('div');
    container.id = 'jc-professional-loader';
    container.innerHTML = `
      <div class="backdrop-blur"></div>
      
      <div class="loader-main-content">
        <!-- Logo JC Profesional -->
        <div class="jc-logo-container">
          <svg class="jc-professional-logo" viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg">
            <!-- Filtros y efectos -->
            <defs>
              <linearGradient id="letterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:${this.config.primaryColor};stop-opacity:0.3" />
                <stop offset="50%" style="stop-color:${this.config.accentColor};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${this.config.primaryColor};stop-opacity:0.3" />
              </linearGradient>
              
              <filter id="subtleGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              <filter id="letterGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="${this.config.glowColor}" flood-opacity="0.6"/>
              </filter>
            </defs>
            
            <!-- Letra J Profesional -->
            <path id="letter-j" 
                  d="M80 20 L80 20 L80 75 Q80 95 95 95 Q110 95 110 75 L110 60" 
                  fill="none" 
                  stroke="${this.config.primaryColor}" 
                  stroke-width="3" 
                  stroke-linecap="round" 
                  stroke-linejoin="round"
                  filter="url(#letterGlow)"
                  class="letter-path"/>
            
            <!-- Letra C Profesional -->
            <path id="letter-c" 
                  d="M190 45 Q170 25 150 45 Q150 57.5 150 70 Q170 90 190 70" 
                  fill="none" 
                  stroke="${this.config.primaryColor}" 
                  stroke-width="3" 
                  stroke-linecap="round" 
                  stroke-linejoin="round"
                  filter="url(#letterGlow)"
                  class="letter-path"/>
            
            <!-- Línea de trazado elegante -->
            <path id="drawing-line" 
                  d="M80 20 L80 75 Q80 95 95 95 Q110 95 110 75 L110 60 M190 45 Q170 25 150 45 Q150 57.5 150 70 Q170 90 190 70" 
                  fill="none" 
                  stroke="url(#letterGradient)" 
                  stroke-width="2" 
                  stroke-linecap="round" 
                  stroke-linejoin="round"
                  stroke-dasharray="500"
                  stroke-dashoffset="500"
                  filter="url(#subtleGlow)"
                  class="drawing-line"/>
          </svg>
        </div>
        
        <!-- Texto de carga minimalista -->
        <div class="loading-text-container">
          <span id="loading-message">cargando</span>
          <div class="loading-dots">
            <span class="dot">.</span>
            <span class="dot">.</span>
            <span class="dot">.</span>
          </div>
        </div>
        
        <!-- Línea de progreso sutil -->
        <div class="progress-line">
          <div class="progress-fill"></div>
        </div>
      </div>
      
      <!-- Efecto de partículas sutiles -->
      <canvas id="particles-canvas"></canvas>
    `;

    this.injectProfessionalStyles();
    this.loaderContainer = container;
    return container;
  },

  // 🎨 Estilos profesionales
  injectProfessionalStyles() {
    const style = document.createElement('style');
    style.id = 'jc-professional-styles';
    style.textContent = `
      #jc-professional-loader {
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
        transition: all 1s cubic-bezier(0.23, 1, 0.32, 1);
        overflow: hidden;
      }

      #jc-professional-loader.fade-out {
        opacity: 0;
        visibility: hidden;
      }

      .backdrop-blur {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        backdrop-filter: blur(${this.config.backdropBlur});
        background: linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(20,20,30,0.9) 100%);
      }

      #particles-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
        opacity: 0.3;
      }

      .loader-main-content {
        position: relative;
        z-index: 2;
        text-align: center;
        animation: subtleFloat 4s ease-in-out infinite;
      }

      @keyframes subtleFloat {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-5px); }
      }

      .jc-logo-container {
        margin-bottom: 50px;
        position: relative;
      }

      .jc-professional-logo {
        width: 300px;
        height: 120px;
        filter: drop-shadow(0 0 20px rgba(96, 165, 250, 0.3));
      }

      .letter-path {
        stroke-dasharray: 200;
        stroke-dashoffset: 200;
        animation: drawLetters ${this.config.lineDrawSpeed}ms ease-out forwards;
        animation-delay: 500ms;
      }

      .drawing-line {
        animation: drawingAnimation ${this.config.lineDrawSpeed}ms linear infinite;
        animation-delay: 800ms;
      }

      @keyframes drawLetters {
        0% { 
          stroke-dashoffset: 200; 
          opacity: 0;
        }
        20% {
          opacity: 1;
        }
        100% { 
          stroke-dashoffset: 0; 
          opacity: 1;
        }
      }

      @keyframes drawingAnimation {
        0% { stroke-dashoffset: 500; }
        100% { stroke-dashoffset: 0; }
      }

      .loading-text-container {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 40px;
        height: 30px;
      }

      #loading-message {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 18px;
        font-weight: 300;
        color: ${this.config.primaryColor};
        letter-spacing: 2px;
        margin-right: 8px;
        opacity: 0.9;
      }

      .loading-dots {
        display: flex;
        gap: 2px;
      }

      .loading-dots .dot {
        color: ${this.config.accentColor};
        font-size: 20px;
        animation: dotFade 1.5s ease-in-out infinite;
        opacity: 0.3;
      }

      .loading-dots .dot:nth-child(1) { animation-delay: 0s; }
      .loading-dots .dot:nth-child(2) { animation-delay: 0.3s; }
      .loading-dots .dot:nth-child(3) { animation-delay: 0.6s; }

      @keyframes dotFade {
        0%, 80% { opacity: 0.3; }
        40% { opacity: 1; }
      }

      .progress-line {
        width: 200px;
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
        margin: 0 auto;
        position: relative;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, 
          transparent, 
          ${this.config.accentColor}, 
          ${this.config.glowColor}, 
          ${this.config.accentColor}, 
          transparent
        );
        animation: progressSlide 3s ease-in-out infinite;
        box-shadow: 0 0 10px ${this.config.glowColor};
      }

      @keyframes progressSlide {
        0% { width: 0%; transform: translateX(-100%); }
        50% { width: 100%; transform: translateX(0%); }
        100% { width: 0%; transform: translateX(100%); }
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .jc-professional-logo {
          width: 250px;
          height: 100px;
        }
        
        #loading-message {
          font-size: 16px;
          letter-spacing: 1.5px;
        }
        
        .progress-line {
          width: 150px;
        }
      }

      @media (max-width: 480px) {
        .jc-professional-logo {
          width: 200px;
          height: 80px;
        }
        
        #loading-message {
          font-size: 14px;
          letter-spacing: 1px;
        }
        
        .progress-line {
          width: 120px;
        }
      }

      /* Prevenir scroll */
      body.jc-professional-active {
        overflow: hidden;
        height: 100vh;
      }
    `;

    document.head.appendChild(style);
  },

  // 🎆 Sistema de partículas sutiles
  initSubtleParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Crear partículas sutiles
    const particles = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.3 + 0.1,
        color: this.config.glowColor
      });
    }

    // Animar partículas
    const animate = () => {
      if (!this.isActive) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Rebotar suavemente
        if (particle.x <= 0 || particle.x >= canvas.width) particle.vx *= -1;
        if (particle.y <= 0 || particle.y >= canvas.height) particle.vy *= -1;
        
        // Dibujar partícula sutil
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color + Math.floor(particle.opacity * 255).toString(16).padStart(2, '0');
        ctx.fill();
        
        // Conectar partículas cercanas
        particles.forEach(otherParticle => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.strokeStyle = particle.color + '0a';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  },

  // 🚀 Inicialización profesional
  init() {
    console.log('🔥 JC Professional Loader iniciando...');
    
    // Crear loader inmediatamente
    const loader = this.createProfessionalLoader();
    document.body.appendChild(loader);
    document.body.classList.add('jc-professional-active');
    
    this.isActive = true;
    this.startTime = Date.now();
    
    // Inicializar efectos
    setTimeout(() => this.initSubtleParticles(), 100);
    
    // Configurar auto-hide
    this.setupAutoHide();
    
    // Interceptar fetch
    this.interceptFetch();
    
    console.log('✨ JC Professional Loader activo');
  },

  // ⏰ Sistema de auto-hide inteligente
  setupAutoHide() {
    const hideLoader = () => {
      const elapsed = Date.now() - this.startTime;
      const remaining = Math.max(0, this.config.minimumShowTime - elapsed);
      
      setTimeout(() => {
        this.updateMessage('Complete');
        setTimeout(() => this.hide(), this.config.autoHideDelay);
      }, remaining);
    };

    if (document.readyState === 'complete') {
      setTimeout(hideLoader, 200);
    } else {
      window.addEventListener('load', hideLoader);
      document.addEventListener('DOMContentLoaded', () => {
        this.updateMessage('Finishing');
        setTimeout(hideLoader, 500);
      });
    }
  },

  // 🌐 Interceptor de fetch (con exclusión de endpoints sensibles)
  interceptFetch() {
    const originalFetch = window.fetch;
    let activeRequests = 0;

    // Endpoints que NO deben activar el loader
    const excludedUrls = [
      '/auth/check-block-status',
      '/auth/verify-session',
      '/auth/get-alias'
    ];

    window.fetch = (...args) => {
      const url = args[0];
      const isExcluded = excludedUrls.some(excluded => url.includes(excluded));

      if (!isExcluded) {
        activeRequests++;
        if (!this.isActive && activeRequests > 0) {
          this.show('');
        } else if (this.isActive) {
          this.updateMessage('ya casi');
        }
      }

      return originalFetch(...args)
        .then(response => {
          if (!isExcluded) {
            activeRequests--;
            if (activeRequests <= 0 && this.isActive) {
              setTimeout(() => {
                if (activeRequests <= 0) {
                  this.updateMessage('Complete');
                  setTimeout(() => this.hide(), 600);
                }
              }, 300);
            }
          }
          return response;
        })
        .catch(error => {
          if (!isExcluded) {
            activeRequests--;
            if (activeRequests <= 0 && this.isActive) {
              this.updateMessage('Error');
              setTimeout(() => this.hide(), 1200);
            }
          }
          throw error;
        });
    };
  },

  // 👁️ Mostrar loader
  show(mensaje = 'Loading') {
    if (this.isActive) {
      this.updateMessage(mensaje);
      return;
    }

    if (!this.loaderContainer) {
      this.init();
      return;
    }

    this.updateMessage(mensaje);
    this.loaderContainer.classList.remove('fade-out');
    document.body.classList.add('jc-professional-active');
    this.isActive = true;
    this.startTime = Date.now();
    
    setTimeout(() => this.initSubtleParticles(), 100);
  },

  // 🫥 Ocultar loader
  hide() {
    if (!this.isActive || !this.loaderContainer) return;

    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.loaderContainer.classList.add('fade-out');
    document.body.classList.remove('jc-professional-active');

    setTimeout(() => {
      if (this.loaderContainer && this.loaderContainer.parentNode) {
        this.loaderContainer.remove();
        this.loaderContainer = null;
      }
      
      const styles = document.getElementById('jc-professional-styles');
      if (styles) styles.remove();
    }, 1000);

    console.log('✅ JC Professional Loader ocultado');
  },

  // 💬 Actualizar mensaje
  updateMessage(mensaje) {
    const messageElement = document.getElementById('loading-message');
    if (messageElement) {
      messageElement.textContent = mensaje;
    }
  }
};

// 🔥 AUTO-EJECUCIÓN INMEDIATA AL CARGAR EL SCRIPT
(function() {
  // Si el DOM ya está listo, ejecutar inmediatamente
  if (document.readyState === 'loading') {
    // Si aún está cargando, esperar a que esté listo
    document.addEventListener('DOMContentLoaded', function() {
      JCUltraLoader.init();
    });
  } else {
    // Si ya está listo, ejecutar inmediatamente
    JCUltraLoader.init();
  }
  
  // Exportar API global para uso manual
  window.JCLoader = {
    show: (msg) => JCUltraLoader.show(msg),
    hide: () => JCUltraLoader.hide(),
    updateMessage: (msg) => JCUltraLoader.updateMessage(msg)
  };
  
  console.log('✨ JC Professional Loader listo');
})();

