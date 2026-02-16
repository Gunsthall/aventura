/* =============================================
   PUZZLE: SIMON (color + sound sequence)
   ============================================= */

class PuzzleSimon {
  render(engine, page, alreadySolved) {
    const container = engine.els.puzzleOptions;
    const puzzle = page.puzzle;
    const sequence = puzzle.sequence || [0, 1, 2, 3];
    const colors = puzzle.colors || ['#e74c3c', '#3498db', '#27ae60', '#f1c40f'];
    const labels = puzzle.labels || ['Rojo', 'Azul', 'Verde', 'Amarillo'];
    const speed = puzzle.playbackSpeed || 600;

    if (alreadySolved) {
      this._renderSolved(container, colors, labels, puzzle, engine);
      return;
    }

    // Build 2x2 grid
    const grid = document.createElement('div');
    grid.className = 'simon-grid';

    const buttons = colors.map((color, i) => {
      const btn = document.createElement('button');
      btn.className = 'simon-btn';
      btn.dataset.index = i;
      btn.style.setProperty('--simon-color', color);
      btn.innerHTML = `<span class="simon-label">${labels[i]}</span>`;
      btn.disabled = true;
      grid.appendChild(btn);
      return btn;
    });

    container.appendChild(grid);

    // Status text
    const status = document.createElement('div');
    status.className = 'simon-status';
    status.textContent = '🎵 Escucha la secuencia...';
    container.appendChild(status);

    let playerInput = [];
    let inputEnabled = false;

    const playSequence = () => {
      inputEnabled = false;
      buttons.forEach(b => b.disabled = true);
      status.textContent = '🎵 Escucha...';

      sequence.forEach((colorIdx, step) => {
        setTimeout(() => {
          this._lightUp(buttons[colorIdx], colorIdx);
        }, step * speed);
      });

      setTimeout(() => {
        inputEnabled = true;
        playerInput = [];
        buttons.forEach(b => b.disabled = false);
        status.textContent = '👆 ¡Tu turno! Repite la secuencia';
      }, sequence.length * speed + 400);
    };

    // Handle button taps
    buttons.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        if (!inputEnabled) return;
        this._lightUp(btn, i);
        playerInput.push(i);

        const stepIndex = playerInput.length - 1;
        if (playerInput[stepIndex] !== sequence[stepIndex]) {
          // Wrong
          inputEnabled = false;
          window.audioManager?.wrong();
          status.textContent = puzzle.failText || '❌ ¡Ups! Escucha de nuevo...';
          btn.classList.add('simon-wrong');
          engine.onPuzzleAttempt?.(engine.currentPageId, playerInput.join(','), false);
          setTimeout(() => {
            btn.classList.remove('simon-wrong');
            playSequence();
          }, 1500);
          return;
        }

        if (playerInput.length === sequence.length) {
          // Correct!
          inputEnabled = false;
          buttons.forEach(b => b.disabled = true);
          status.textContent = '🎉 ¡¡Perfecto!!';
          engine.completePuzzle(engine.currentPageId, sequence.join(','));
          IllustrationRenderer.confetti(grid);
          engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
        }
      });
    });

    // Start playback after a short delay
    setTimeout(playSequence, 800);
  }

  _lightUp(btn, colorIndex) {
    btn.classList.add('simon-active');
    window.audioManager?.simonTone(colorIndex);
    setTimeout(() => btn.classList.remove('simon-active'), 350);
  }

  _renderSolved(container, colors, labels, puzzle, engine) {
    const grid = document.createElement('div');
    grid.className = 'simon-grid simon-solved';
    colors.forEach((color, i) => {
      const btn = document.createElement('button');
      btn.className = 'simon-btn simon-active';
      btn.style.setProperty('--simon-color', color);
      btn.innerHTML = `<span class="simon-label">${labels[i]}</span>`;
      btn.disabled = true;
      grid.appendChild(btn);
    });
    container.appendChild(grid);
    engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
  }
}

window.puzzleSimon = new PuzzleSimon();
