/* =============================================
   PUZZLE: ENCUENTRA LAS DIFERENCIAS
   ============================================= */

class PuzzleDiferencias {
  render(engine, page, alreadySolved) {
    const container = engine.els.puzzleOptions;
    const puzzle = page.puzzle;
    const original = puzzle.original || [];
    const modified = puzzle.modified || [];
    const differences = new Set(puzzle.differences || []);
    const columns = puzzle.columns || 4;

    if (alreadySolved) {
      this._renderSolved(container, puzzle, engine);
      return;
    }

    // Counter
    const counter = document.createElement('div');
    counter.className = 'diferencias-counter';
    counter.textContent = `Diferencias: 0/${differences.size}`;
    container.appendChild(counter);

    // Wrapper for both panels
    const wrapper = document.createElement('div');
    wrapper.className = 'diferencias-wrapper';

    // Original panel (non-interactive)
    const origPanel = this._buildPanel('Original', original, columns, false);
    wrapper.appendChild(origPanel);

    // Modified panel (interactive)
    const modPanel = this._buildPanel('¡Toca las diferencias!', modified, columns, true);
    wrapper.appendChild(modPanel);

    container.appendChild(wrapper);

    // Track found differences
    const found = new Set();
    const modCells = modPanel.querySelectorAll('.diferencias-cell');

    modCells.forEach((cell, index) => {
      cell.classList.add('diferencias-clickable');

      cell.addEventListener('click', () => {
        if (found.has(index)) return;

        if (differences.has(index)) {
          // Correct — found a difference!
          found.add(index);
          cell.classList.add('diferencias-found');
          cell.classList.remove('diferencias-clickable');
          window.audioManager?.differenceFound();
          counter.textContent = `Diferencias: ${found.size}/${differences.size}`;

          // Also highlight the corresponding original cell
          const origCells = origPanel.querySelectorAll('.diferencias-cell');
          if (origCells[index]) {
            origCells[index].classList.add('diferencias-found');
          }

          if (found.size === differences.size) {
            // All found!
            engine.completePuzzle(engine.currentPageId, 'diferencias-complete');
            IllustrationRenderer.confetti(wrapper);
            engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
          }
        } else {
          // Wrong — not a difference
          window.audioManager?.wrong();
          cell.classList.add('diferencias-wrong');
          setTimeout(() => cell.classList.remove('diferencias-wrong'), 500);
        }
      });
    });
  }

  _buildPanel(label, emojis, columns, isModified) {
    const panel = document.createElement('div');
    panel.className = 'diferencias-panel';

    const labelEl = document.createElement('div');
    labelEl.className = 'diferencias-label';
    labelEl.textContent = label;
    panel.appendChild(labelEl);

    const grid = document.createElement('div');
    grid.className = 'diferencias-grid';
    grid.style.setProperty('--dif-columns', columns);

    emojis.forEach((emoji, i) => {
      const cell = document.createElement('div');
      cell.className = 'diferencias-cell';
      cell.textContent = emoji;
      cell.dataset.index = i;
      grid.appendChild(cell);
    });

    panel.appendChild(grid);
    return panel;
  }

  _renderSolved(container, puzzle, engine) {
    const original = puzzle.original || [];
    const modified = puzzle.modified || [];
    const differences = new Set(puzzle.differences || []);
    const columns = puzzle.columns || 4;

    const counter = document.createElement('div');
    counter.className = 'diferencias-counter';
    counter.textContent = `Diferencias: ${differences.size}/${differences.size} ✅`;
    container.appendChild(counter);

    const wrapper = document.createElement('div');
    wrapper.className = 'diferencias-wrapper';

    const origPanel = this._buildPanel('Original', original, columns, false);
    const modPanel = this._buildPanel('Diferencias', modified, columns, true);

    // Mark all differences
    const origCells = origPanel.querySelectorAll('.diferencias-cell');
    const modCells = modPanel.querySelectorAll('.diferencias-cell');
    differences.forEach(i => {
      if (origCells[i]) origCells[i].classList.add('diferencias-found');
      if (modCells[i]) modCells[i].classList.add('diferencias-found');
    });

    wrapper.appendChild(origPanel);
    wrapper.appendChild(modPanel);
    container.appendChild(wrapper);

    engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
  }
}

window.puzzleDiferencias = new PuzzleDiferencias();
