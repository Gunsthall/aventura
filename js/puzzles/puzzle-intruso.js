/* =============================================
   PUZZLE: INTRUSO (find the odd one out)
   ============================================= */

class PuzzleIntruso {
  render(engine, page, alreadySolved) {
    const container = engine.els.puzzleOptions;
    const puzzle = page.puzzle;
    const items = puzzle.items || [];
    const intrusoIndex = puzzle.intrusoIndex ?? 0;

    if (alreadySolved) {
      this._renderSolved(container, items, intrusoIndex, puzzle, engine);
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'intruso-grid';
    grid.style.setProperty('--intruso-count', Math.min(items.length, 6));

    items.forEach((emoji, i) => {
      const cell = document.createElement('button');
      cell.className = 'intruso-item';
      cell.textContent = emoji;
      cell.addEventListener('click', () => {
        if (cell.classList.contains('disabled')) return;

        // Disable all
        grid.querySelectorAll('.intruso-item').forEach(c => c.classList.add('disabled'));

        if (i === intrusoIndex) {
          cell.classList.add('intruso-found');
          window.audioManager?.correct();
          engine.completePuzzle(engine.currentPageId, emoji);
          IllustrationRenderer.confetti(cell);

          // Show reason
          if (puzzle.reason) {
            const reason = document.createElement('div');
            reason.className = 'intruso-reason';
            reason.textContent = puzzle.reason;
            container.appendChild(reason);
          }

          engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
        } else {
          cell.classList.add('intruso-wrong');
          window.audioManager?.wrong();
          engine.els.puzzleFeedback.classList.remove('hidden');
          engine.els.puzzleFeedback.className = 'puzzle-feedback fail';
          engine.els.puzzleFeedback.textContent = puzzle.failText || 'Ese no es el intruso... Piensa cuál no encaja.';
          engine.onPuzzleAttempt?.(engine.currentPageId, emoji, false);

          setTimeout(() => {
            cell.classList.remove('intruso-wrong');
            grid.querySelectorAll('.intruso-item').forEach(c => c.classList.remove('disabled'));
          }, 1000);
        }
      });
      grid.appendChild(cell);
    });

    container.appendChild(grid);
  }

  _renderSolved(container, items, intrusoIndex, puzzle, engine) {
    const grid = document.createElement('div');
    grid.className = 'intruso-grid';
    grid.style.setProperty('--intruso-count', Math.min(items.length, 6));

    items.forEach((emoji, i) => {
      const cell = document.createElement('div');
      cell.className = 'intruso-item disabled';
      cell.textContent = emoji;
      if (i === intrusoIndex) cell.classList.add('intruso-found');
      grid.appendChild(cell);
    });

    container.appendChild(grid);
    engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
  }
}

window.puzzleIntruso = new PuzzleIntruso();
