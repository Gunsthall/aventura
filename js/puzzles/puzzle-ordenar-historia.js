/* =============================================
   PUZZLE: ORDENAR HISTORIA (sort story scenes)
   ============================================= */

class PuzzleOrdenarHistoria {
  render(engine, page, alreadySolved) {
    const container = engine.els.puzzleOptions;
    const puzzle = page.puzzle;
    const scenes = puzzle.scenes || [];

    if (alreadySolved) {
      this._renderSolved(container, scenes, puzzle, engine);
      return;
    }

    // Scramble scenes (keep correct order as index)
    const indexed = scenes.map((s, i) => ({ ...s, correctPos: i }));
    const scrambled = [...indexed];
    do {
      for (let i = scrambled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
      }
    } while (scrambled.every((s, i) => s.correctPos === i) && scenes.length > 1);

    // Slots (numbered targets)
    const slotsArea = document.createElement('div');
    slotsArea.className = 'historia-slots';

    const slots = [];
    for (let i = 0; i < scenes.length; i++) {
      const slot = document.createElement('div');
      slot.className = 'historia-slot';
      slot.dataset.index = i;
      slot.innerHTML = `<span class="historia-number">${i + 1}.</span><span class="historia-slot-content">?</span>`;
      slotsArea.appendChild(slot);
      slots.push(slot);
    }
    container.appendChild(slotsArea);

    // Draggable scene cards
    const cardsArea = document.createElement('div');
    cardsArea.className = 'historia-cards';

    let selectedCard = null;
    const placed = new Array(scenes.length).fill(null);

    scrambled.forEach((scene, i) => {
      const card = document.createElement('div');
      card.className = 'historia-card';
      card.innerHTML = `<span class="historia-card-emoji">${scene.emoji}</span><span class="historia-card-text">${scene.text}</span>`;
      card.dataset.correctPos = scene.correctPos;

      card.addEventListener('click', () => {
        if (card.classList.contains('historia-used')) return;
        container.querySelectorAll('.historia-card.selected').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedCard = card;
        window.audioManager?.click();
      });

      cardsArea.appendChild(card);
    });

    container.appendChild(cardsArea);

    // Click slots to place
    slots.forEach((slot, slotIdx) => {
      slot.addEventListener('click', () => {
        if (placed[slotIdx] && !selectedCard) {
          // Remove from slot
          const prev = placed[slotIdx];
          prev.card.classList.remove('historia-used');
          placed[slotIdx] = null;
          slot.querySelector('.historia-slot-content').textContent = '?';
          slot.classList.remove('historia-filled', 'historia-correct', 'historia-incorrect');
          window.audioManager?.click();
          return;
        }

        if (!selectedCard) return;
        if (placed[slotIdx]) return;

        const correctPos = parseInt(selectedCard.dataset.correctPos);
        placed[slotIdx] = { card: selectedCard, correctPos };
        slot.querySelector('.historia-slot-content').innerHTML =
          `${selectedCard.querySelector('.historia-card-emoji').textContent} ${selectedCard.querySelector('.historia-card-text').textContent}`;
        slot.classList.add('historia-filled');
        selectedCard.classList.add('historia-used');
        selectedCard.classList.remove('selected');
        selectedCard = null;
        window.audioManager?.click();

        // Check if all placed
        if (placed.every(p => p !== null)) {
          const allCorrect = placed.every((p, idx) => p.correctPos === idx);

          if (allCorrect) {
            slots.forEach(s => s.classList.add('historia-correct'));
            engine.completePuzzle(engine.currentPageId, 'historia-complete');
            IllustrationRenderer.confetti(slotsArea);
            engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
          } else {
            window.audioManager?.wrong();
            engine.els.puzzleFeedback.classList.remove('hidden');
            engine.els.puzzleFeedback.className = 'puzzle-feedback fail';
            engine.els.puzzleFeedback.textContent = puzzle.failText || 'Ese no es el orden correcto... Piensa qué pasó primero.';
            engine.onPuzzleAttempt?.(engine.currentPageId, placed.map(p => p.correctPos).join(','), false);

            // Mark correct/incorrect
            placed.forEach((p, idx) => {
              slots[idx].classList.add(p.correctPos === idx ? 'historia-correct' : 'historia-incorrect');
            });

            // Reset after delay
            setTimeout(() => {
              placed.fill(null);
              slots.forEach(s => {
                s.querySelector('.historia-slot-content').textContent = '?';
                s.classList.remove('historia-filled', 'historia-correct', 'historia-incorrect');
              });
              container.querySelectorAll('.historia-card').forEach(c => c.classList.remove('historia-used'));
            }, 2000);
          }
        }
      });
    });
  }

  _renderSolved(container, scenes, puzzle, engine) {
    const slotsArea = document.createElement('div');
    slotsArea.className = 'historia-slots';

    scenes.forEach((scene, i) => {
      const slot = document.createElement('div');
      slot.className = 'historia-slot historia-filled historia-correct';
      slot.innerHTML = `<span class="historia-number">${i + 1}.</span><span class="historia-slot-content">${scene.emoji} ${scene.text}</span>`;
      slotsArea.appendChild(slot);
    });

    container.appendChild(slotsArea);
    engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
  }
}

window.puzzleOrdenarHistoria = new PuzzleOrdenarHistoria();
