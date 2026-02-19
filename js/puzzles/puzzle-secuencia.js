/* =============================================
   PUZZLE: SECUENCIA (what comes next in pattern)
   ============================================= */

class PuzzleSecuencia {
  render(engine, page, alreadySolved) {
    const container = engine.els.puzzleOptions;
    const puzzle = page.puzzle;
    const pattern = puzzle.pattern || [];
    const options = puzzle.options || [];
    const correctAnswer = puzzle.correctAnswer;

    if (alreadySolved) {
      this._renderSolved(container, pattern, options, correctAnswer, puzzle, engine);
      return;
    }

    // Show the pattern
    const patternRow = document.createElement('div');
    patternRow.className = 'secuencia-pattern';

    pattern.forEach((emoji, i) => {
      const cell = document.createElement('div');
      cell.className = 'secuencia-cell';
      cell.textContent = emoji;
      cell.style.animationDelay = (i * 0.15) + 's';
      patternRow.appendChild(cell);
    });

    // Add the question mark cell
    const qCell = document.createElement('div');
    qCell.className = 'secuencia-cell secuencia-question';
    qCell.textContent = '❓';
    patternRow.appendChild(qCell);

    container.appendChild(patternRow);

    // Show options
    const optionsRow = document.createElement('div');
    optionsRow.className = 'secuencia-options';

    options.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'secuencia-option';
      btn.textContent = emoji;

      btn.addEventListener('mouseenter', () => window.audioManager?.hover());
      btn.addEventListener('click', () => {
        const allBtns = optionsRow.querySelectorAll('.secuencia-option');
        allBtns.forEach(b => b.classList.add('disabled'));

        if (emoji === correctAnswer) {
          btn.classList.add('secuencia-correct');
          qCell.textContent = emoji;
          qCell.classList.remove('secuencia-question');
          qCell.classList.add('secuencia-correct');
          window.audioManager?.correct();
          engine.completePuzzle(engine.currentPageId, emoji);
          IllustrationRenderer.confetti(patternRow);
          engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
        } else {
          btn.classList.add('secuencia-wrong');
          window.audioManager?.wrong();
          engine.els.puzzleFeedback.classList.remove('hidden');
          engine.els.puzzleFeedback.className = 'puzzle-feedback fail';
          engine.els.puzzleFeedback.textContent = puzzle.failText || 'Ese no sigue el patrón... Fíjate bien en la secuencia.';
          engine.onPuzzleAttempt?.(engine.currentPageId, emoji, false);

          setTimeout(() => {
            btn.classList.remove('secuencia-wrong');
            allBtns.forEach(b => {
              if (!b.classList.contains('secuencia-wrong')) b.classList.remove('disabled');
            });
          }, 1000);
        }
      });

      optionsRow.appendChild(btn);
    });

    container.appendChild(optionsRow);
  }

  _renderSolved(container, pattern, options, correctAnswer, puzzle, engine) {
    const patternRow = document.createElement('div');
    patternRow.className = 'secuencia-pattern';

    [...pattern, correctAnswer].forEach(emoji => {
      const cell = document.createElement('div');
      cell.className = 'secuencia-cell secuencia-correct';
      cell.textContent = emoji;
      patternRow.appendChild(cell);
    });

    container.appendChild(patternRow);
    engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
  }
}

window.puzzleSecuencia = new PuzzleSecuencia();
