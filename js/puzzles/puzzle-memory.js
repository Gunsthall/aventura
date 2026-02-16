/* =============================================
   PUZZLE: MEMORY / PAREJAS
   ============================================= */

class PuzzleMemory {
  render(engine, page, alreadySolved) {
    const container = engine.els.puzzleOptions;
    const puzzle = page.puzzle;
    const pairs = puzzle.pairs || ['⭐', '🌙', '☀️', '❤️', '🌸', '🦋'];
    const columns = puzzle.columns || 4;

    if (alreadySolved) {
      this._renderSolved(container, pairs, columns, puzzle, engine);
      return;
    }

    // Create cards: 2 of each pair, shuffled
    let cards = [...pairs, ...pairs];
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    const grid = document.createElement('div');
    grid.className = 'memory-grid';
    grid.style.setProperty('--memory-columns', columns);

    // Counter display
    const counter = document.createElement('div');
    counter.className = 'memory-counter';
    counter.textContent = `Parejas: 0/${pairs.length}`;
    container.appendChild(counter);

    let flipped = [];
    let matched = 0;
    let lockBoard = false;

    cards.forEach((emoji, i) => {
      const card = document.createElement('div');
      card.className = 'memory-card';
      card.dataset.emoji = emoji;
      card.dataset.index = i;

      card.innerHTML = `
        <div class="memory-card-inner">
          <div class="memory-card-front">❓</div>
          <div class="memory-card-back">${emoji}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        if (lockBoard) return;
        if (card.classList.contains('memory-flipped')) return;
        if (card.classList.contains('memory-matched')) return;

        // Flip card
        card.classList.add('memory-flipped');
        window.audioManager?.cardFlip();
        flipped.push(card);

        if (flipped.length === 2) {
          lockBoard = true;
          const [a, b] = flipped;

          if (a.dataset.emoji === b.dataset.emoji) {
            // Match!
            a.classList.add('memory-matched');
            b.classList.add('memory-matched');
            window.audioManager?.cardMatch();
            matched++;
            counter.textContent = `Parejas: ${matched}/${pairs.length}`;
            flipped = [];
            lockBoard = false;

            if (matched === pairs.length) {
              // All pairs found!
              setTimeout(() => {
                engine.completePuzzle(engine.currentPageId, 'memory-complete');
                IllustrationRenderer.confetti(grid);
                engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
              }, 500);
            }
          } else {
            // No match - flip back after delay
            setTimeout(() => {
              a.classList.remove('memory-flipped');
              b.classList.remove('memory-flipped');
              flipped = [];
              lockBoard = false;
            }, 1000);
          }
        }
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  _renderSolved(container, pairs, columns, puzzle, engine) {
    const counter = document.createElement('div');
    counter.className = 'memory-counter';
    counter.textContent = `Parejas: ${pairs.length}/${pairs.length} ✅`;
    container.appendChild(counter);

    const grid = document.createElement('div');
    grid.className = 'memory-grid';
    grid.style.setProperty('--memory-columns', columns);

    [...pairs, ...pairs].forEach(emoji => {
      const card = document.createElement('div');
      card.className = 'memory-card memory-flipped memory-matched';
      card.innerHTML = `
        <div class="memory-card-inner">
          <div class="memory-card-front">❓</div>
          <div class="memory-card-back">${emoji}</div>
        </div>
      `;
      grid.appendChild(card);
    });

    container.appendChild(grid);
    engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
  }
}

window.puzzleMemory = new PuzzleMemory();
