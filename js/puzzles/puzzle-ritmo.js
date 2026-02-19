/* =============================================
   PUZZLE: RITMO (tap falling emojis in time)
   ============================================= */

class PuzzleRitmo {
  render(engine, page, alreadySolved) {
    const container = engine.els.puzzleOptions;
    const puzzle = page.puzzle;
    const emojis = puzzle.emojis || ['🎵', '🎶', '⭐', '💫'];
    const speed = puzzle.speed || 3000;
    const lanes = puzzle.lanes || 3;
    const minScore = puzzle.minScore ?? Math.ceil(emojis.length * 0.6);

    if (alreadySolved) {
      this._renderSolved(container, puzzle, engine);
      return;
    }

    let score = 0;
    let missed = 0;
    let totalDropped = 0;
    let gameRunning = true;

    // Score display
    const scoreEl = document.createElement('div');
    scoreEl.className = 'ritmo-score';
    scoreEl.textContent = `${puzzle.scoreLabel || '¡Toca los emojis!'} | Aciertos: 0/${minScore}`;
    container.appendChild(scoreEl);

    // Arena
    const arena = document.createElement('div');
    arena.className = 'ritmo-arena';
    arena.style.setProperty('--ritmo-lanes', lanes);

    // Lane columns
    for (let i = 0; i < lanes; i++) {
      const lane = document.createElement('div');
      lane.className = 'ritmo-lane';
      arena.appendChild(lane);
    }

    // Target zone
    const target = document.createElement('div');
    target.className = 'ritmo-target';
    arena.appendChild(target);

    container.appendChild(arena);

    // Drop emojis
    const dropEmoji = (emoji, index) => {
      if (!gameRunning) return;
      totalDropped++;

      const laneIdx = index % lanes;
      const el = document.createElement('div');
      el.className = 'ritmo-emoji';
      el.textContent = emoji;
      el.style.left = ((laneIdx + 0.5) / lanes * 100) + '%';
      el.style.animationDuration = speed + 'ms';

      let tapped = false;

      el.addEventListener('click', () => {
        if (tapped || !gameRunning) return;
        const rect = el.getBoundingClientRect();
        const arenaRect = arena.getBoundingClientRect();
        const relY = (rect.top - arenaRect.top) / arenaRect.height;

        if (relY > 0.55) {
          // In target zone - success!
          tapped = true;
          score++;
          el.classList.add('ritmo-hit');
          window.audioManager?.cardMatch();
          scoreEl.textContent = `${puzzle.scoreLabel || '¡Toca los emojis!'} | Aciertos: ${score}/${minScore}`;

          if (score >= minScore) {
            gameRunning = false;
            scoreEl.textContent = `🎉 ¡Aciertos: ${score}/${minScore}!`;
            engine.completePuzzle(engine.currentPageId, `ritmo-${score}`);
            IllustrationRenderer.confetti(arena);
            engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
          }
        } else {
          // Too early
          el.classList.add('ritmo-early');
          window.audioManager?.wrong();
          tapped = true;
        }
      });

      // Remove when animation ends
      el.addEventListener('animationend', () => {
        if (!tapped) missed++;
        el.remove();

        // Check if all emojis dropped and game still running
        if (totalDropped >= emojis.length && gameRunning) {
          setTimeout(() => {
            if (!gameRunning) return;
            if (score >= minScore) return;

            // Retry
            engine.els.puzzleFeedback.classList.remove('hidden');
            engine.els.puzzleFeedback.className = 'puzzle-feedback fail';
            engine.els.puzzleFeedback.textContent = puzzle.failText || `Has tocado ${score} de ${minScore}. ¡Inténtalo otra vez!`;
            engine.onPuzzleAttempt?.(engine.currentPageId, `${score}/${minScore}`, false);

            // Restart after delay
            setTimeout(() => {
              if (!gameRunning) return;
              score = 0;
              missed = 0;
              totalDropped = 0;
              scoreEl.textContent = `${puzzle.scoreLabel || '¡Toca los emojis!'} | Aciertos: 0/${minScore}`;
              engine.els.puzzleFeedback.classList.add('hidden');
              startGame();
            }, 2000);
          }, 500);
        }
      });

      arena.appendChild(el);
    };

    const startGame = () => {
      emojis.forEach((emoji, i) => {
        setTimeout(() => dropEmoji(emoji, i), i * (speed / 2.5));
      });
    };

    // Start after brief delay
    setTimeout(startGame, 1000);
  }

  _renderSolved(container, puzzle, engine) {
    const scoreEl = document.createElement('div');
    scoreEl.className = 'ritmo-score';
    scoreEl.textContent = '🎉 ¡Ritmo perfecto! ✅';
    container.appendChild(scoreEl);
    engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
  }
}

window.puzzleRitmo = new PuzzleRitmo();
