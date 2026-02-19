/* =============================================
   PUZZLE: LABERINTO (grid maze)
   ============================================= */

class PuzzleLaberinto {
  render(engine, page, alreadySolved) {
    const container = engine.els.puzzleOptions;
    const puzzle = page.puzzle;
    const grid = puzzle.grid || [];
    const cols = grid[0]?.length || 5;
    const playerEmoji = puzzle.playerEmoji || '😊';
    const goalEmoji = puzzle.goalEmoji || '⭐';
    const wallEmoji = puzzle.wallEmoji || '🌳';
    const pathEmoji = puzzle.pathEmoji || '';

    if (alreadySolved) {
      this._renderSolved(container, grid, cols, playerEmoji, goalEmoji, wallEmoji, pathEmoji, puzzle, engine);
      return;
    }

    // Find start and goal
    let playerPos = null, goalPos = null;
    grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell === 2) playerPos = { r, c };
        if (cell === 3) goalPos = { r, c };
      });
    });

    const currentPos = { ...playerPos };

    // Status
    const status = document.createElement('div');
    status.className = 'laberinto-status';
    status.textContent = `${playerEmoji} Toca una casilla vecina para moverte hacia ${goalEmoji}`;
    container.appendChild(status);

    // Build grid
    const gridEl = document.createElement('div');
    gridEl.className = 'laberinto-grid';
    gridEl.style.setProperty('--lab-columns', cols);

    const cellEls = [];
    grid.forEach((row, r) => {
      const rowEls = [];
      row.forEach((cell, c) => {
        const el = document.createElement('div');
        el.className = 'laberinto-cell';
        el.dataset.r = r;
        el.dataset.c = c;

        if (cell === 1) {
          el.classList.add('laberinto-wall');
          el.textContent = wallEmoji;
        } else if (cell === 3) {
          el.classList.add('laberinto-goal');
          el.textContent = goalEmoji;
        } else if (cell === 2) {
          el.classList.add('laberinto-player');
          el.textContent = playerEmoji;
        } else {
          el.textContent = pathEmoji;
        }

        el.addEventListener('click', () => {
          const tr = parseInt(el.dataset.r);
          const tc = parseInt(el.dataset.c);

          // Check adjacency
          const dr = Math.abs(tr - currentPos.r);
          const dc = Math.abs(tc - currentPos.c);
          if (!((dr === 1 && dc === 0) || (dr === 0 && dc === 1))) return;

          // Check not wall
          if (grid[tr][tc] === 1) return;

          // Move player
          const oldEl = cellEls[currentPos.r][currentPos.c];
          oldEl.classList.remove('laberinto-player');
          oldEl.classList.add('laberinto-visited');
          oldEl.textContent = '👣';

          currentPos.r = tr;
          currentPos.c = tc;

          el.classList.add('laberinto-player');
          el.textContent = playerEmoji;
          window.audioManager?.click();

          // Check goal
          if (tr === goalPos.r && tc === goalPos.c) {
            status.textContent = '🎉 ¡Has llegado!';
            engine.completePuzzle(engine.currentPageId, 'laberinto-complete');
            IllustrationRenderer.confetti(gridEl);
            engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
          }
        });

        gridEl.appendChild(el);
        rowEls.push(el);
      });
      cellEls.push(rowEls);
    });

    container.appendChild(gridEl);
  }

  _renderSolved(container, grid, cols, playerEmoji, goalEmoji, wallEmoji, pathEmoji, puzzle, engine) {
    const gridEl = document.createElement('div');
    gridEl.className = 'laberinto-grid';
    gridEl.style.setProperty('--lab-columns', cols);

    grid.forEach((row) => {
      row.forEach((cell) => {
        const el = document.createElement('div');
        el.className = 'laberinto-cell';
        if (cell === 1) {
          el.classList.add('laberinto-wall');
          el.textContent = wallEmoji;
        } else if (cell === 3) {
          el.classList.add('laberinto-goal');
          el.textContent = goalEmoji;
        } else if (cell === 2) {
          el.textContent = playerEmoji;
        } else {
          el.textContent = pathEmoji;
        }
        gridEl.appendChild(el);
      });
    });

    container.appendChild(gridEl);
    engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
  }
}

window.puzzleLaberinto = new PuzzleLaberinto();
