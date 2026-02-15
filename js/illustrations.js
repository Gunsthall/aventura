/* =============================================
   ILLUSTRATIONS - Scene Renderer
   ============================================= */

class IllustrationRenderer {
  constructor(container) {
    this.container = container;
  }

  render(illustration) {
    if (!illustration) {
      this.container.innerHTML = '';
      this.container.className = 'illustration-container';
      return;
    }

    this.container.innerHTML = '';
    this.container.className = 'illustration-container';

    const scene = document.createElement('div');
    scene.className = 'scene scene-enter';

    // Apply background
    if (illustration.background) {
      scene.classList.add(illustration.background);
    }

    // Render elements
    if (illustration.elements && Array.isArray(illustration.elements)) {
      illustration.elements.forEach((el, index) => {
        const rendered = this._renderElement(el);
        if (rendered) {
          rendered.style.animationDelay = `${index * 0.1}s`;
          scene.appendChild(rendered);
        }
      });
    }

    this.container.appendChild(scene);
  }

  _renderElement(el) {
    if (typeof el === 'string') {
      // Simple emoji element with position hint from the string
      return this._renderEmoji(el);
    }
    if (typeof el === 'object') {
      switch (el.type) {
        case 'emoji': return this._createEmoji(el);
        case 'castle': return this._renderCastle(el);
        case 'stars': return this._renderStars(el);
        case 'bridge': return this._renderBridge(el);
        case 'trees': return this._renderTrees(el);
        case 'crystals': return this._renderCrystals(el);
        case 'numbers': return this._renderFloatingNumbers(el);
        case 'river': return this._renderRiver(el);
        case 'glow': return this._renderGlow(el);
        default: return this._createEmoji(el);
      }
    }
    return null;
  }

  _renderEmoji(str) {
    // Parse format: "emoji:size:x:y:anim" e.g. "👸:large:50:60:float"
    const parts = str.split(':');
    const el = document.createElement('div');
    el.className = 'scene-element emoji-element';
    el.textContent = parts[0];

    if (parts[1]) el.classList.add(parts[1]);
    else el.classList.add('medium');

    if (parts[2] && parts[3]) {
      el.style.left = parts[2] + '%';
      el.style.top = parts[3] + '%';
      el.style.transform = 'translate(-50%, -50%)';
    }
    if (parts[4] === 'float') el.classList.add('float-anim');
    if (parts[4] === 'sparkle') el.classList.add('sparkle-anim');

    return el;
  }

  _createEmoji(cfg) {
    const el = document.createElement('div');
    el.className = 'scene-element emoji-element';
    el.textContent = cfg.emoji || cfg.text || '✨';
    el.classList.add(cfg.size || 'medium');

    if (cfg.x !== undefined && cfg.y !== undefined) {
      el.style.left = cfg.x + '%';
      el.style.top = cfg.y + '%';
      el.style.transform = 'translate(-50%, -50%)';
    }
    if (cfg.anim) el.classList.add(cfg.anim + '-anim');

    return el;
  }

  _renderCastle(cfg) {
    const wrapper = document.createElement('div');
    wrapper.className = 'scene-element';
    wrapper.style.left = (cfg.x || 50) + '%';
    wrapper.style.bottom = (cfg.bottom || 5) + '%';
    wrapper.style.transform = 'translateX(-50%)';

    const scale = cfg.scale || 1;
    wrapper.innerHTML = `
      <svg width="${120 * scale}" height="${100 * scale}" viewBox="0 0 120 100" fill="none">
        <!-- Left tower -->
        <rect x="5" y="25" width="22" height="55" fill="#1a1030" rx="2"/>
        <polygon points="5,25 16,5 27,25" fill="#2a1a45"/>
        <rect x="12" y="35" width="6" height="10" rx="3" fill="rgba(255,215,0,0.4)"/>
        <rect x="12" y="55" width="6" height="10" rx="3" fill="rgba(255,215,0,0.3)"/>
        <!-- Right tower -->
        <rect x="93" y="25" width="22" height="55" fill="#1a1030" rx="2"/>
        <polygon points="93,25 104,5 115,25" fill="#2a1a45"/>
        <rect x="100" y="35" width="6" height="10" rx="3" fill="rgba(255,215,0,0.4)"/>
        <rect x="100" y="55" width="6" height="10" rx="3" fill="rgba(255,215,0,0.3)"/>
        <!-- Center body -->
        <rect x="27" y="35" width="66" height="45" fill="#1a1030" rx="2"/>
        <polygon points="35,35 60,10 85,35" fill="#2a1a45"/>
        <!-- Gate -->
        <rect x="48" y="55" width="24" height="25" rx="12" fill="#0a0a18"/>
        <!-- Center windows -->
        <rect x="37" y="42" width="8" height="12" rx="4" fill="rgba(255,215,0,0.35)"/>
        <rect x="75" y="42" width="8" height="12" rx="4" fill="rgba(255,215,0,0.35)"/>
        <!-- Flag -->
        <line x1="60" y1="10" x2="60" y2="0" stroke="#8a6a3a" stroke-width="1.5"/>
        <polygon points="60,0 75,5 60,10" fill="#e74c3c"/>
      </svg>
    `;
    return wrapper;
  }

  _renderStars(cfg) {
    const wrapper = document.createElement('div');
    wrapper.className = 'scene-element';
    wrapper.style.inset = '0';

    const count = cfg.count || 15;
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.className = 'scene-element css-star';
      if (Math.random() > 0.7) star.classList.add('bright');
      if (cfg.dim && Math.random() > 0.5) star.classList.add('dim');
      star.style.left = Math.random() * 90 + 5 + '%';
      star.style.top = Math.random() * 50 + '%';
      star.style.animationDelay = (Math.random() * 4) + 's';
      wrapper.appendChild(star);
    }
    return wrapper;
  }

  _renderBridge(cfg) {
    const wrapper = document.createElement('div');
    wrapper.className = 'scene-element';
    wrapper.style.left = (cfg.x || 50) + '%';
    wrapper.style.bottom = (cfg.bottom || 20) + '%';
    wrapper.style.transform = 'translateX(-50%)';

    wrapper.innerHTML = `
      <svg width="200" height="60" viewBox="0 0 200 60" fill="none">
        <!-- Bridge arch -->
        <path d="M10,45 Q100,5 190,45" stroke="#8a6a3a" stroke-width="4" fill="none"/>
        <!-- Deck -->
        <rect x="10" y="43" width="180" height="8" fill="#6a4a2a" rx="2"/>
        <!-- Railings -->
        <line x1="30" y1="35" x2="30" y2="43" stroke="#8a6a3a" stroke-width="2"/>
        <line x1="60" y1="25" x2="60" y2="43" stroke="#8a6a3a" stroke-width="2"/>
        <line x1="100" y1="20" x2="100" y2="43" stroke="#8a6a3a" stroke-width="2"/>
        <line x1="140" y1="25" x2="140" y2="43" stroke="#8a6a3a" stroke-width="2"/>
        <line x1="170" y1="35" x2="170" y2="43" stroke="#8a6a3a" stroke-width="2"/>
        <!-- Glow -->
        <ellipse cx="100" cy="43" rx="80" ry="3" fill="rgba(255,215,0,0.15)"/>
      </svg>
    `;
    return wrapper;
  }

  _renderTrees(cfg) {
    const wrapper = document.createElement('div');
    wrapper.className = 'scene-element';
    wrapper.style.inset = '0';

    const positions = cfg.positions || [
      { x: 5, scale: 0.8 }, { x: 15, scale: 1.2 },
      { x: 80, scale: 1.1 }, { x: 92, scale: 0.9 }
    ];

    positions.forEach(pos => {
      const tree = document.createElement('div');
      tree.className = 'scene-element';
      tree.style.left = pos.x + '%';
      tree.style.bottom = '0';
      tree.style.transform = `translateX(-50%) scale(${pos.scale || 1})`;
      const s = pos.scale || 1;
      tree.innerHTML = `
        <svg width="50" height="80" viewBox="0 0 50 80" fill="none">
          <rect x="21" y="50" width="8" height="30" fill="#3a2815"/>
          <polygon points="25,5 5,40 45,40" fill="#0a5a1a"/>
          <polygon points="25,15 10,50 40,50" fill="#0a4a15"/>
        </svg>
      `;
      wrapper.appendChild(tree);
    });
    return wrapper;
  }

  _renderCrystals(cfg) {
    const wrapper = document.createElement('div');
    wrapper.className = 'scene-element';
    wrapper.style.inset = '0';

    const count = cfg.count || 8;
    const colors = ['#64c8ff', '#b478ff', '#ff96c8', '#ffc864', '#78ffb4'];

    for (let i = 0; i < count; i++) {
      const crystal = document.createElement('div');
      crystal.className = 'scene-element css-crystal';
      crystal.style.left = 10 + Math.random() * 80 + '%';
      crystal.style.bottom = Math.random() * 40 + '%';
      crystal.style.animationDelay = (Math.random() * 3) + 's';
      const color = colors[Math.floor(Math.random() * colors.length)];
      crystal.style.background = `linear-gradient(135deg, ${color}aa, ${color}44)`;
      const size = 0.6 + Math.random() * 1;
      crystal.style.transform = `scale(${size})`;
      wrapper.appendChild(crystal);
    }
    return wrapper;
  }

  _renderFloatingNumbers(cfg) {
    const wrapper = document.createElement('div');
    wrapper.className = 'scene-element';
    wrapper.style.inset = '0';

    const nums = cfg.values || ['1', '2', '3', '5', '7', '8'];
    nums.forEach((n, i) => {
      const el = document.createElement('div');
      el.className = 'scene-element floating-number float-anim';
      el.textContent = n;
      el.style.left = 10 + (i / nums.length) * 80 + '%';
      el.style.top = 15 + Math.random() * 50 + '%';
      el.style.animationDelay = (i * 0.5) + 's';
      el.style.fontSize = (1.5 + Math.random()) + 'rem';
      wrapper.appendChild(el);
    });
    return wrapper;
  }

  _renderRiver(cfg) {
    const wrapper = document.createElement('div');
    wrapper.className = 'scene-element';
    wrapper.style.left = '0';
    wrapper.style.right = '0';
    wrapper.style.bottom = (cfg.bottom || 10) + '%';

    wrapper.innerHTML = `
      <div style="width:100%;height:35px;background:linear-gradient(90deg,
        rgba(52,152,219,0.2),rgba(52,152,219,0.5),rgba(52,152,219,0.2));
        animation:waterFlow 3s ease-in-out infinite;border-radius:50%"></div>
    `;
    return wrapper;
  }

  _renderGlow(cfg) {
    const el = document.createElement('div');
    el.className = 'scene-element glow-orb';
    el.style.left = (cfg.x || 50) + '%';
    el.style.top = (cfg.y || 50) + '%';
    el.style.transform = 'translate(-50%, -50%)';
    if (cfg.color) {
      el.style.background = `radial-gradient(circle, ${cfg.color}cc 0%, ${cfg.color}00 70%)`;
    }
    const size = cfg.size || 40;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    return el;
  }

  // Trigger confetti burst (for correct answers / endings)
  static confetti(container) {
    const emojis = ['⭐', '✨', '🌟', '💫', '🎉', '🎊', '💛', '💜'];
    const rect = container ? container.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2 };
    const confettiEl = document.getElementById('confetti-container');

    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'confetti-particle';
      particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];

      const angle = (Math.random() * Math.PI * 2);
      const distance = 60 + Math.random() * 120;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance - 40;
      const tr = (Math.random() - 0.5) * 720;

      particle.style.left = (rect.left + (rect.width || 0) / 2) + 'px';
      particle.style.top = (rect.top + (rect.height || 0) / 2) + 'px';
      particle.style.setProperty('--tx', tx + 'px');
      particle.style.setProperty('--ty', ty + 'px');
      particle.style.setProperty('--tr', tr + 'deg');

      confettiEl.appendChild(particle);
      setTimeout(() => particle.remove(), 1100);
    }
  }

  // Rain confetti from the top of screen
  static confettiRain() {
    const emojis = ['⭐', '✨', '🌟', '💫', '🎉', '🎊', '💛', '💜', '🏆', '👑'];
    const confettiEl = document.getElementById('confetti-container');
    const colors = ['#ffd700', '#ff6b9d', '#8e44ad', '#3498db', '#27ae60', '#e74c3c'];

    for (let i = 0; i < 40; i++) {
      setTimeout(() => {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.top = '-20px';
        piece.style.setProperty('--fall-duration', (2 + Math.random() * 2) + 's');

        if (Math.random() > 0.5) {
          piece.textContent = emojis[Math.floor(Math.random() * emojis.length)];
          piece.style.fontSize = (1 + Math.random()) + 'rem';
          piece.style.background = 'none';
        } else {
          piece.style.background = colors[Math.floor(Math.random() * colors.length)];
          piece.style.width = (6 + Math.random() * 8) + 'px';
          piece.style.height = (6 + Math.random() * 8) + 'px';
        }

        confettiEl.appendChild(piece);
        setTimeout(() => piece.remove(), 5000);
      }, i * 80);
    }
  }
}

window.IllustrationRenderer = IllustrationRenderer;
