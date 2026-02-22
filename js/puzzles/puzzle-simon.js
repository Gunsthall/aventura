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

    // Controls row: status + replay button
    const controlsRow = document.createElement('div');
    controlsRow.className = 'simon-controls';

    const status = document.createElement('div');
    status.className = 'simon-status';
    status.textContent = '🎵 Escucha la secuencia...';
    controlsRow.appendChild(status);

    const replayBtn = document.createElement('button');
    replayBtn.className = 'simon-replay-btn';
    replayBtn.innerHTML = '🔊 Escuchar otra vez';
    replayBtn.style.display = 'none';
    controlsRow.appendChild(replayBtn);

    container.appendChild(controlsRow);

    let playerInput = [];
    let inputEnabled = false;
    let isPlaying = false;

    const playSequence = () => {
      if (isPlaying) return;
      isPlaying = true;
      inputEnabled = false;
      buttons.forEach(b => b.disabled = true);
      replayBtn.style.display = 'none';
      status.textContent = '🎵 Escucha...';

      sequence.forEach((colorIdx, step) => {
        setTimeout(() => {
          this._lightUp(buttons[colorIdx], colorIdx);
        }, step * speed);
      });

      setTimeout(() => {
        isPlaying = false;
        inputEnabled = true;
        playerInput = [];
        buttons.forEach(b => b.disabled = false);
        status.textContent = '👆 ¡Tu turno! Repite la secuencia';
        replayBtn.style.display = '';
      }, sequence.length * speed + 400);
    };

    replayBtn.addEventListener('click', () => {
      if (!isPlaying) {
        playerInput = [];
        playSequence();
      }
    });

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
