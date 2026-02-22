/* =============================================
   PUZZLE: SOPA DE LETRAS (word search)
   Supports horizontal, vertical, and diagonal words
   ============================================= */

class PuzzleSopaLetras {
  render(engine, page, alreadySolved) {
    const container = engine.els.puzzleOptions;
    const puzzle = page.puzzle;
    const grid = puzzle.grid || [];
    const cols = puzzle.columns || 6;
    const rows = Math.ceil(grid.length / cols);
    const words = puzzle.words || [];

    if (alreadySolved) {
      this._renderSolved(container, grid, cols, words, puzzle, engine);
      return;
    }

    // Build word position map
    const wordCells = {};
    words.forEach(w => {
      const cells = [];
      let r = w.row, c = w.col;
      for (let i = 0; i < w.word.length; i++) {
        cells.push(r * cols + c);
        const dir = this._getDirection(w.direction);
        r += dir.dr;
        c += dir.dc;
      }
      wordCells[w.word] = cells;
    });

    // Words to find display
    const wordList = document.createElement('div');
    wordList.className = 'sopa-wordlist';
    const wordEls = {};
    words.forEach(w => {
      const el = document.createElement('span');
      el.className = 'sopa-word';
      el.textContent = w.word;
      wordList.appendChild(el);
      wordEls[w.word] = el;
    });
    container.appendChild(wordList);

    // Grid
    const gridEl = document.createElement('div');
    gridEl.className = 'sopa-grid';
    gridEl.style.setProperty('--sopa-columns', cols);

    const cellEls = [];
    grid.forEach((letter, i) => {
      const cell = document.createElement('div');
      cell.className = 'sopa-cell';
      cell.textContent = letter;
      cell.dataset.index = i;
      gridEl.appendChild(cell);
      cellEls.push(cell);
    });

    container.appendChild(gridEl);

    // Selection state
    let startCell = null;
    const foundWords = new Set();

    cellEls.forEach((cell, idx) => {
      cell.addEventListener('click', () => {
        if (cell.classList.contains('sopa-found')) return;

        if (startCell === null) {
          startCell = idx;
          cell.classList.add('sopa-selected');
          window.audioManager?.click();
        } else {
          const endCell = idx;
          const word = this._checkSelection(startCell, endCell, grid, cols, rows, words, foundWords);

          // Clear selection
          cellEls.forEach(c => c.classList.remove('sopa-selected'));

          if (word) {
            foundWords.add(word);
            wordCells[word].forEach(ci => cellEls[ci].classList.add('sopa-found'));
            wordEls[word].classList.add('sopa-word-found');
            window.audioManager?.cardMatch();

            if (foundWords.size === words.length) {
              engine.completePuzzle(engine.currentPageId, 'sopa-complete');
              IllustrationRenderer.confetti(gridEl);
              engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
            }
          } else {
            window.audioManager?.wrong();
            cellEls[startCell].classList.add('sopa-wrong');
            cell.classList.add('sopa-wrong');
            setTimeout(() => {
              cellEls.forEach(c => c.classList.remove('sopa-wrong'));
            }, 500);
          }

          startCell = null;
        }
      });
    });
  }

  _getDirection(dir) {
    switch (dir) {
      case 'horizontal': return { dr: 0, dc: 1 };
      case 'vertical': return { dr: 1, dc: 0 };
      case 'diagonal-down': return { dr: 1, dc: 1 };
      case 'diagonal-up': return { dr: -1, dc: 1 };
      default: return { dr: 0, dc: 1 };
    }
  }

  _checkSelection(start, end, grid, cols, rows, words, foundWords) {
    const sr = Math.floor(start / cols), sc = start % cols;
    const er = Math.floor(end / cols), ec = end % cols;

    const dr = er - sr;
    const dc = ec - sc;

    // Must be in a straight line (horizontal, vertical, or diagonal)
    const absDr = Math.abs(dr);
    const absDc = Math.abs(dc);
    if (!(absDr === 0 || absDc === 0 || absDr === absDc)) return null;

    // Get letters in selection
    const steps = Math.max(absDr, absDc);
    const stepR = steps === 0 ? 0 : dr / steps;
    const stepC = steps === 0 ? 0 : dc / steps;

    let letters = '';
    for (let i = 0; i <= steps; i++) {
      const r = sr + i * stepR;
      const c = sc + i * stepC;
      letters += grid[r * cols + c];
    }

    // Check forwards and backwards
    const reversed = letters.split('').reverse().join('');
    for (const w of words) {
      if (foundWords.has(w.word)) continue;
      if (letters === w.word || reversed === w.word) return w.word;
    }
    return null;
  }

  _renderSolved(container, grid, cols, words, puzzle, engine) {
    const wordCells = new Set();
    words.forEach(w => {
      let r = w.row, c = w.col;
      for (let i = 0; i < w.word.length; i++) {
        wordCells.add(r * cols + c);
        const dir = this._getDirection(w.direction);
        r += dir.dr;
        c += dir.dc;
      }
    });

    const wordList = document.createElement('div');
    wordList.className = 'sopa-wordlist';
    words.forEach(w => {
      const el = document.createElement('span');
      el.className = 'sopa-word sopa-word-found';
      el.textContent = w.word;
      wordList.appendChild(el);
    });
    container.appendChild(wordList);

    const gridEl = document.createElement('div');
    gridEl.className = 'sopa-grid';
    gridEl.style.setProperty('--sopa-columns', cols);
    grid.forEach((letter, i) => {
      const cell = document.createElement('div');
      cell.className = 'sopa-cell' + (wordCells.has(i) ? ' sopa-found' : '');
      cell.textContent = letter;
      gridEl.appendChild(cell);
    });
    container.appendChild(gridEl);

    engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
  }
}

window.puzzleSopaLetras = new PuzzleSopaLetras();
