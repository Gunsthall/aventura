/* =============================================
   PUZZLE: ORDENAR LETRAS (drag + tap to reorder)
   ============================================= */

class PuzzleOrdenarLetras {
  render(engine, page, alreadySolved) {
    const container = engine.els.puzzleOptions;
    const puzzle = page.puzzle;
    const word = (puzzle.word || '').toUpperCase();
    const letters = word.split('');

    if (alreadySolved) {
      this._renderSolved(container, word, puzzle, engine);
      return;
    }

    // Scramble letters (Fisher-Yates), ensure not identical to original
    let scrambled;
    do {
      scrambled = [...letters];
      for (let i = scrambled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
      }
    } while (scrambled.join('') === word && word.length > 1);

    // Build target slots
    const slotsRow = document.createElement('div');
    slotsRow.className = 'letras-slots';
    const slots = letters.map((_, i) => {
      const slot = document.createElement('div');
      slot.className = 'letras-slot';
      slot.dataset.index = i;
      slotsRow.appendChild(slot);
      return slot;
    });
    container.appendChild(slotsRow);

    // Hint
    if (puzzle.hint) {
      const hintEl = document.createElement('div');
      hintEl.className = 'letras-hint';
      hintEl.textContent = '💡 Pista: ' + puzzle.hint;
      container.appendChild(hintEl);
    }

    // Build source tiles
    const tilesRow = document.createElement('div');
    tilesRow.className = 'letras-tiles';
    let selectedTile = null;
    const placed = new Array(letters.length).fill(null);

    scrambled.forEach((letter, i) => {
      const tile = document.createElement('div');
      tile.className = 'letras-tile';
      tile.textContent = letter;
      tile.dataset.letter = letter;
      tile.dataset.origIndex = i;

      // Tap-to-select, then tap slot to place
      tile.addEventListener('click', (e) => {
        // Skip if this click is from a drag end
        if (tile.classList.contains('letras-used')) return;
        if (tile._wasDragged) { tile._wasDragged = false; return; }

        // Deselect previous
        container.querySelectorAll('.letras-tile.selected').forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');
        selectedTile = tile;
        window.audioManager?.click();
      });

      // Drag support
      if (window.DragUtils) {
        DragUtils.makeDraggable(tile, {
          snapTargets: slots,
          onEnd: (el, target) => {
            if (target && !target.dataset.filled) {
              tile._wasDragged = true;
              this._placeTile(tile, target, placed, letters, word, engine, page, container);
            } else {
              // Snap back
              el.style.position = '';
              el.style.left = '';
              el.style.top = '';
              el.style.zIndex = '';
            }
          }
        });
      }

      tilesRow.appendChild(tile);
    });

    container.appendChild(tilesRow);

    // Tap-to-place on slots
    slots.forEach((slot) => {
      slot.addEventListener('click', () => {
        if (selectedTile && !slot.dataset.filled) {
          this._placeTile(selectedTile, slot, placed, letters, word, engine, page, container);
          selectedTile = null;
        } else if (slot.dataset.filled) {
          // Tap filled slot to remove letter
          this._removeTile(slot, placed);
        }
      });
    });
  }

  _placeTile(tile, slot, placed, letters, word, engine, page, container) {
    const slotIndex = parseInt(slot.dataset.index);
    const letter = tile.dataset.letter;

    slot.textContent = letter;
    slot.dataset.filled = 'true';
    slot.classList.add('letras-filled');
    tile.classList.add('letras-used');
    tile.classList.remove('selected');
    // Reset drag positioning
    tile.style.position = '';
    tile.style.left = '';
    tile.style.top = '';
    tile.style.zIndex = '';

    placed[slotIndex] = { letter, tile };
    window.audioManager?.click();

    // Check if correct letter in correct slot
    if (letter === letters[slotIndex]) {
      slot.classList.add('letras-correct');
    }

    // Check if all slots filled
    const filledCount = placed.filter(p => p !== null).length;
    if (filledCount === letters.length) {
      const result = placed.map(p => p.letter).join('');
      if (result === word) {
        // Correct!
        engine.completePuzzle(engine.currentPageId, word);
        // Mark all as correct
        container.querySelectorAll('.letras-slot').forEach(s => s.classList.add('letras-correct'));
        IllustrationRenderer.confetti(engine.els.puzzleOptions);
        engine._showPuzzleContinue(page.puzzle.successTarget, page.puzzle.successText);
      } else {
        // Wrong order
        window.audioManager?.wrong();
        engine.els.puzzleFeedback.classList.remove('hidden');
        engine.els.puzzleFeedback.className = 'puzzle-feedback fail';
        engine.els.puzzleFeedback.textContent = page.puzzle.failText || 'Hmm, ese no es el orden correcto...';
        engine.onPuzzleAttempt?.(engine.currentPageId, result, false);

        // Shake and reset
        container.querySelectorAll('.letras-slot').forEach(s => s.classList.add('letras-shake'));
        setTimeout(() => {
          placed.fill(null);
          container.querySelectorAll('.letras-slot').forEach(s => {
            s.textContent = '';
            delete s.dataset.filled;
            s.classList.remove('letras-filled', 'letras-correct', 'letras-shake');
          });
          container.querySelectorAll('.letras-tile').forEach(t => {
            t.classList.remove('letras-used');
          });
        }, 1200);
      }
    }
  }

  _removeTile(slot, placed) {
    const slotIndex = parseInt(slot.dataset.index);
    if (placed[slotIndex]) {
      placed[slotIndex].tile.classList.remove('letras-used');
      placed[slotIndex] = null;
      slot.textContent = '';
      delete slot.dataset.filled;
      slot.classList.remove('letras-filled', 'letras-correct');
      window.audioManager?.click();
    }
  }

  _renderSolved(container, word, puzzle, engine) {
    const slotsRow = document.createElement('div');
    slotsRow.className = 'letras-slots';
    word.split('').forEach(letter => {
      const slot = document.createElement('div');
      slot.className = 'letras-slot letras-filled letras-correct';
      slot.textContent = letter;
      slotsRow.appendChild(slot);
    });
    container.appendChild(slotsRow);
    engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
  }
}

window.puzzleOrdenarLetras = new PuzzleOrdenarLetras();
