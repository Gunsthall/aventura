/* =============================================
   PUZZLE: LANZAR (physics launch game)
   ============================================= */

class PuzzleLanzar {
  render(engine, page, alreadySolved) {
    const container = engine.els.puzzleOptions;
    const puzzle = page.puzzle;

    const cfg = {
      projectile: puzzle.projectileEmoji || '🎯',
      target: puzzle.targetEmoji || '🏁',
      obstacle: puzzle.obstacleEmoji || '🌊',
      gapColor: puzzle.gapColor || '#2196F3',
      groundColor: puzzle.groundColor || '#4a7c59',
      gravity: puzzle.gravity || 600,
      maxPower: puzzle.maxPower || 500,
      angles: puzzle.angles || { low: 20, mid: 45, high: 70 },
      leftW: puzzle.platformLeftWidth || 30,
      rightW: puzzle.platformRightWidth || 35,
      targetW: puzzle.targetZoneWidth || 25,
      failShort: puzzle.failTextShort || '¡Cayó al vacío! 😅',
      failLong: puzzle.failTextLong || '¡Demasiado lejos! 💨',
    };

    if (alreadySolved) {
      this._renderSolved(container, puzzle, engine);
      return;
    }

    let selectedAngle = null;
    let power = 0;
    let sweepDir = 1;
    let sweepRAF = null;
    let launched = false;
    let lastSweepTime = null;

    const groundH = 60;
    const startLeftPct = cfg.leftW * 0.5;

    // === Arena ===
    const arena = document.createElement('div');
    arena.className = 'lanzar-arena';

    // Ground left
    const groundL = document.createElement('div');
    groundL.className = 'lanzar-ground-left';
    groundL.style.width = cfg.leftW + '%';
    groundL.style.background = 'linear-gradient(to top, ' + cfg.groundColor + ', ' + cfg.groundColor + 'dd)';
    arena.appendChild(groundL);

    // Ground right
    const groundR = document.createElement('div');
    groundR.className = 'lanzar-ground-right';
    groundR.style.width = cfg.rightW + '%';
    groundR.style.background = 'linear-gradient(to top, ' + cfg.groundColor + ', ' + cfg.groundColor + 'dd)';
    arena.appendChild(groundR);

    // Gap
    const gap = document.createElement('div');
    gap.className = 'lanzar-gap';
    gap.style.left = cfg.leftW + '%';
    gap.style.width = (100 - cfg.leftW - cfg.rightW) + '%';
    gap.style.background = 'linear-gradient(to top, ' + cfg.gapColor + '88, ' + cfg.gapColor + '44)';
    const gapEmojis = document.createElement('div');
    gapEmojis.className = 'lanzar-gap-emojis';
    gapEmojis.textContent = cfg.obstacle + ' ' + cfg.obstacle + ' ' + cfg.obstacle;
    gap.appendChild(gapEmojis);
    arena.appendChild(gap);

    // Target zone
    const rightStart = 100 - cfg.rightW;
    const targetZone = document.createElement('div');
    targetZone.className = 'lanzar-target-zone';
    targetZone.style.left = rightStart + '%';
    targetZone.style.width = cfg.targetW + '%';
    targetZone.innerHTML = '<span class="lanzar-target-emoji">' + cfg.target + '</span>';
    arena.appendChild(targetZone);

    // Projectile
    const projectile = document.createElement('div');
    projectile.className = 'lanzar-projectile';
    projectile.textContent = cfg.projectile;
    projectile.style.left = startLeftPct + '%';
    projectile.style.bottom = groundH + 'px';
    arena.appendChild(projectile);

    container.appendChild(arena);

    // === Angle Buttons ===
    const angleRow = document.createElement('div');
    angleRow.className = 'lanzar-angle-buttons';

    const angleOptions = [
      { label: 'Bajo ↗', value: cfg.angles.low },
      { label: 'Medio ⬈', value: cfg.angles.mid },
      { label: 'Alto ⬆', value: cfg.angles.high },
    ];

    const angleBtns = [];
    angleOptions.forEach(function(opt) {
      const btn = document.createElement('button');
      btn.className = 'lanzar-angle-btn';
      btn.textContent = opt.label;
      btn.addEventListener('click', function() {
        if (launched) return;
        selectedAngle = opt.value;
        angleBtns.forEach(function(b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        drawPreviewArc(opt.value);
        powerSection.classList.remove('hidden');
        startSweep();
        window.audioManager?.click();
      });
      angleBtns.push(btn);
      angleRow.appendChild(btn);
    });
    container.appendChild(angleRow);

    // === Power Bar ===
    const powerSection = document.createElement('div');
    powerSection.className = 'lanzar-power-section hidden';

    const powerLabel = document.createElement('div');
    powerLabel.className = 'lanzar-power-label';
    powerLabel.textContent = '⚡ Potencia';
    powerSection.appendChild(powerLabel);

    const powerBarBg = document.createElement('div');
    powerBarBg.className = 'lanzar-power-bar-bg';
    const powerIndicator = document.createElement('div');
    powerIndicator.className = 'lanzar-power-indicator';
    powerBarBg.appendChild(powerIndicator);
    powerSection.appendChild(powerBarBg);
    container.appendChild(powerSection);

    // === Fire Button ===
    const fireBtn = document.createElement('button');
    fireBtn.className = 'lanzar-fire-btn hidden';
    fireBtn.textContent = '¡LANZAR! 🚀';
    fireBtn.addEventListener('click', function() {
      if (launched || selectedAngle === null) return;
      launched = true;
      if (sweepRAF) cancelAnimationFrame(sweepRAF);
      fireBtn.classList.add('disabled');
      arena.querySelectorAll('.lanzar-preview-dot').forEach(function(d) { d.remove(); });
      doLaunch();
    });
    container.appendChild(fireBtn);

    // === Sweep Logic ===
    const startSweep = function() {
      if (sweepRAF) cancelAnimationFrame(sweepRAF);
      fireBtn.classList.remove('hidden');
      power = 0;
      sweepDir = 1;
      lastSweepTime = null;

      const sweep = function(timestamp) {
        if (launched) return;
        if (!lastSweepTime) lastSweepTime = timestamp;
        const dt = (timestamp - lastSweepTime) / 1000;
        lastSweepTime = timestamp;
        power += sweepDir * 50 * dt;
        if (power >= 100) { power = 100; sweepDir = -1; }
        if (power <= 0) { power = 0; sweepDir = 1; }
        powerIndicator.style.left = power + '%';
        sweepRAF = requestAnimationFrame(sweep);
      };
      sweepRAF = requestAnimationFrame(sweep);
    };

    // === Preview Arc ===
    const drawPreviewArc = function(angleDeg) {
      arena.querySelectorAll('.lanzar-preview-dot').forEach(function(d) { d.remove(); });
      const arenaW = arena.offsetWidth;
      const angleRad = angleDeg * Math.PI / 180;
      const speed = cfg.maxPower * 0.6;
      const vx = speed * Math.cos(angleRad);
      const vy = speed * Math.sin(angleRad);
      const startX = arenaW * startLeftPct / 100;

      for (let t = 0.05; t < 2; t += 0.08) {
        const x = startX + vx * t;
        const y = vy * t - 0.5 * cfg.gravity * t * t;
        if (y < -10) break;
        if (x > arenaW) break;
        const dot = document.createElement('div');
        dot.className = 'lanzar-preview-dot';
        dot.style.left = x + 'px';
        dot.style.bottom = (groundH + y) + 'px';
        arena.appendChild(dot);
      }
    };

    // === Reset ===
    const resetForRetry = function() {
      arena.querySelectorAll('.lanzar-trail-dot, .lanzar-preview-dot').forEach(function(d) { d.remove(); });
      projectile.style.left = startLeftPct + '%';
      projectile.style.bottom = groundH + 'px';
      angleBtns.forEach(function(b) { b.classList.remove('selected'); });
      powerSection.classList.add('hidden');
      fireBtn.classList.add('hidden');
      fireBtn.classList.remove('disabled');
      engine.els.puzzleFeedback.classList.add('hidden');
      selectedAngle = null;
      launched = false;
      if (sweepRAF) cancelAnimationFrame(sweepRAF);
    };

    // === Launch ===
    const doLaunch = function() {
      const arenaW = arena.offsetWidth;
      const angleRad = selectedAngle * Math.PI / 180;
      const speed = cfg.maxPower * (power / 100);
      let vx = speed * Math.cos(angleRad);
      let vy = speed * Math.sin(angleRad);
      const startX = arenaW * startLeftPct / 100;
      let x = 0;
      let y = 0;
      let lastTime = null;
      let trailDist = 0;

      const rightStartPx = (100 - cfg.rightW) / 100 * arenaW;
      const targetEndPx = rightStartPx + (cfg.targetW / 100) * arenaW;
      const leftEndPx = (cfg.leftW / 100) * arenaW;

      const animate = function(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
        lastTime = timestamp;

        x += vx * dt;
        y += vy * dt;
        vy -= cfg.gravity * dt;

        const px = startX + x;
        const py = groundH + y;

        projectile.style.left = px + 'px';
        projectile.style.bottom = py + 'px';

        // Trail dots
        trailDist += Math.sqrt((vx * dt) * (vx * dt) + (vy * dt) * (vy * dt));
        if (trailDist > 30) {
          trailDist = 0;
          const dot = document.createElement('div');
          dot.className = 'lanzar-trail-dot';
          dot.style.left = px + 'px';
          dot.style.bottom = py + 'px';
          arena.appendChild(dot);
        }

        // Landing check: projectile descending and reached ground level
        if (y <= 0 && vy < 0 && x > 10) {
          if (px < leftEndPx) {
            handleMiss('¡Muy poquita fuerza! 😅');
          } else if (px < rightStartPx) {
            handleMiss(cfg.failShort);
          } else if (px <= targetEndPx) {
            handleSuccess();
          } else {
            handleMiss(cfg.failLong);
          }
          return;
        }

        // Off-screen check
        if (px > arenaW + 50 || py < -50) {
          handleMiss(cfg.failLong);
          return;
        }

        requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    };

    // === Result Handlers ===
    const handleSuccess = function() {
      projectile.style.bottom = groundH + 'px';
      IllustrationRenderer.confetti(arena);
      window.audioManager?.cardMatch();
      engine.completePuzzle(engine.currentPageId, 'lanzar-success');
      engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
    };

    const handleMiss = function(message) {
      window.audioManager?.wrong();
      engine.els.puzzleFeedback.classList.remove('hidden');
      engine.els.puzzleFeedback.className = 'puzzle-feedback fail';
      engine.els.puzzleFeedback.textContent = message;
      engine.onPuzzleAttempt?.(engine.currentPageId, 'miss', false);
      setTimeout(resetForRetry, 2000);
    };
  }

  _renderSolved(container, puzzle, engine) {
    const msg = document.createElement('div');
    msg.className = 'lanzar-solved-msg';
    msg.textContent = '🎉 ¡Lanzamiento perfecto! ✅';
    container.appendChild(msg);
    engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
  }
}

window.puzzleLanzar = new PuzzleLanzar();
