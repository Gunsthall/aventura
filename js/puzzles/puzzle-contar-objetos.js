/* =============================================
   PUZZLE: CONTAR OBJETOS ANIMADOS
   ============================================= */

class PuzzleContarObjetos {
  render(engine, page, alreadySolved) {
    const container = engine.els.puzzleOptions;
    const puzzle = page.puzzle;

    // Build the animation arena
    const arena = document.createElement('div');
    arena.className = 'contar-arena';
    arena.style.height = (puzzle.areaHeight || 200) + 'px';

    const targetEmoji = puzzle.targetEmoji || '🦋';
    const targetCount = puzzle.targetCount || 5;
    const distractorEmoji = puzzle.distractorEmoji || '';
    const distractorCount = puzzle.distractorCount || 0;

    // Spawn target objects
    for (let i = 0; i < targetCount; i++) {
      const obj = this._createObject(targetEmoji, 'contar-target', i, targetCount + distractorCount);
      arena.appendChild(obj);
    }

    // Spawn distractors
    if (distractorEmoji) {
      for (let i = 0; i < distractorCount; i++) {
        const obj = this._createObject(distractorEmoji, 'contar-distractor', targetCount + i, targetCount + distractorCount);
        arena.appendChild(obj);
      }
    }

    container.appendChild(arena);

    // Render answer buttons
    this._renderAnswerButtons(container, puzzle, alreadySolved, engine);
  }

  _createObject(emoji, className, index, total) {
    const el = document.createElement('div');
    el.className = `contar-object ${className}`;
    el.textContent = emoji;

    // Random starting position
    const x = 5 + Math.random() * 80;
    const y = 10 + Math.random() * 65;
    el.style.left = x + '%';
    el.style.top = y + '%';

    // Random animation parameters
    const duration = 4 + Math.random() * 6;
    const delay = Math.random() * 3;
    const driftX = (Math.random() - 0.5) * 60;
    const driftY = (Math.random() - 0.5) * 40;
    el.style.setProperty('--drift-x', driftX + 'px');
    el.style.setProperty('--drift-y', driftY + 'px');
    el.style.animationDuration = duration + 's';
    el.style.animationDelay = delay + 's';

    // Staggered entrance
    setTimeout(() => {
      el.classList.add('contar-visible');
      window.audioManager?.objectBounce();
    }, index * 300);

    return el;
  }

  _renderAnswerButtons(container, puzzle, alreadySolved, engine) {
    const btnContainer = document.createElement('div');
    btnContainer.className = 'contar-buttons';

    (puzzle.options || []).forEach(option => {
      const btn = document.createElement('button');
      btn.className = 'puzzle-option contar-option';
      btn.innerHTML = `
        <span class="choice-emoji">${option.emoji || ''}</span>
        <span class="choice-text">${option.label}</span>
      `;

      if (alreadySolved) {
        btn.classList.add('disabled');
        if (option.value === puzzle.correctAnswer) btn.classList.add('correct');
      } else {
        btn.addEventListener('mouseenter', () => window.audioManager?.hover());
        btn.addEventListener('click', () => {
          const correct = option.value === puzzle.correctAnswer;
          const allBtns = btnContainer.querySelectorAll('.puzzle-option');
          allBtns.forEach(b => b.classList.add('disabled'));

          if (correct) {
            btn.classList.add('correct');
            engine.completePuzzle(engine.currentPageId, option.value);
            IllustrationRenderer.confetti(btn);
            engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
          } else {
            btn.classList.add('incorrect');
            window.audioManager?.wrong();
            engine.els.puzzleFeedback.classList.remove('hidden');
            engine.els.puzzleFeedback.className = 'puzzle-feedback fail';
            engine.els.puzzleFeedback.textContent = puzzle.failText || 'Cuenta de nuevo...';
            engine.onPuzzleAttempt?.(engine.currentPageId, option.value, false);

            setTimeout(() => {
              allBtns.forEach(b => {
                if (!b.classList.contains('incorrect')) b.classList.remove('disabled');
              });
            }, 1000);
          }
        });
      }

      btnContainer.appendChild(btn);
    });

    container.appendChild(btnContainer);

    if (alreadySolved) {
      engine._showPuzzleContinue(puzzle.successTarget, puzzle.successText);
    }
  }
}

window.puzzleContarObjetos = new PuzzleContarObjetos();
