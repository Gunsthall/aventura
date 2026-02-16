/* =============================================
   STORY ENGINE - Rendering, Navigation, State
   ============================================= */

class StoryEngine {
  constructor() {
    this.story = null;
    this.currentPageId = null;
    this.moralPoints = 0;
    this.visitedPages = [];
    this.puzzleResults = {};
    this.illustrationRenderer = null;

    // DOM references
    this.els = {
      pageTitle: document.getElementById('page-title'),
      pageProgress: document.getElementById('page-progress'),
      illustrationContainer: document.getElementById('illustration-container'),
      storyText: document.getElementById('story-text'),
      speakerBadge: document.getElementById('speaker-badge'),
      speakerEmoji: document.getElementById('speaker-emoji'),
      speakerName: document.getElementById('speaker-name'),
      choicesContainer: document.getElementById('choices-container'),
      puzzleContainer: document.getElementById('puzzle-container'),
      puzzleQuestion: document.getElementById('puzzle-question'),
      puzzleOptions: document.getElementById('puzzle-options'),
      puzzleFeedback: document.getElementById('puzzle-feedback'),
      endingOverlay: document.getElementById('ending-overlay'),
      endingContent: document.getElementById('ending-content'),
      storyTitle: document.getElementById('game-story-title'),
      scrollArrow: document.getElementById('scroll-arrow'),
      scrollArrowBtn: document.getElementById('scroll-arrow-btn'),
      storyPanel: document.querySelector('.story-panel'),
    };

    this.illustrationRenderer = new IllustrationRenderer(this.els.illustrationContainer);

    // Scroll arrow: click to scroll down
    if (this.els.scrollArrowBtn) {
      this.els.scrollArrowBtn.addEventListener('click', () => {
        if (this.els.storyPanel) {
          this.els.storyPanel.scrollBy({ top: 200, behavior: 'smooth' });
        }
      });
    }

    // Detect scroll position to show/hide arrow
    if (this.els.storyPanel) {
      this.els.storyPanel.addEventListener('scroll', () => this._updateScrollArrow());
    }

    // Callbacks
    this.onNavigate = null; // Called when user makes a choice (for sync)
    this.onPuzzleAttempt = null;
  }

  async loadStory(storyId) {
    try {
      const response = await fetch(`stories/${storyId}.json`);
      if (!response.ok) throw new Error('Historia no encontrada');
      this.story = await response.json();
      this.currentPageId = this.story.meta.startPage;
      this.moralPoints = 0;
      this.visitedPages = [];
      this.puzzleResults = {};

      this.els.storyTitle.textContent = this.story.meta.title;
      this.els.endingOverlay.classList.add('hidden');

      this.goToPage(this.currentPageId);
      return true;
    } catch (err) {
      console.error('Failed to load story:', err);
      return false;
    }
  }

  goToPage(pageId) {
    if (!this.story || !this.story.pages[pageId]) {
      console.error('Page not found:', pageId);
      return;
    }

    this.currentPageId = pageId;
    if (!this.visitedPages.includes(pageId)) {
      this.visitedPages.push(pageId);
    }

    const page = this.story.pages[pageId];

    // Scroll story panel to top before rendering new page
    if (this.els.storyPanel) {
      this.els.storyPanel.scrollTop = 0;
    }

    this._renderPage(page);

    // Play page turn sound
    window.audioManager?.pageTurn();

    // Check if scroll arrow needed after DOM settles
    setTimeout(() => this._updateScrollArrow(), 100);
  }

  _renderPage(page) {
    // Hide ending overlay
    this.els.endingOverlay.classList.add('hidden');

    // Title
    this.els.pageTitle.textContent = page.title || '';

    // Progress
    const totalPages = Object.keys(this.story.pages).length;
    this.els.pageProgress.textContent = `${this.visitedPages.length}/${totalPages}`;

    // Illustration
    this.illustrationRenderer.render(page.illustration);

    // Speaker badge
    if (page.speaker && this.story.characters[page.speaker]) {
      const char = this.story.characters[page.speaker];
      this.els.speakerBadge.classList.remove('hidden');
      this.els.speakerEmoji.textContent = char.emoji;
      this.els.speakerName.textContent = char.name;
      this.els.speakerName.style.color = char.color || 'var(--color-accent)';
    } else {
      this.els.speakerBadge.classList.add('hidden');
    }

    // Text
    this.els.storyText.innerHTML = '';
    const textEl = document.createElement('p');
    textEl.innerHTML = this._formatText(page.text);
    this.els.storyText.appendChild(textEl);

    // Scroll text to top
    this.els.storyText.parentElement.scrollTop = 0;

    // Render based on page type
    switch (page.type) {
      case 'puzzle':
        this._renderPuzzle(page);
        break;
      case 'ending':
        this._renderEnding(page);
        break;
      default:
        this._renderChoices(page);
        break;
    }
  }

  _formatText(text) {
    if (!text) return '';
    // Replace character emoji references and add line breaks
    return text.replace(/\n/g, '<br>');
  }

  _renderChoices(page) {
    this.els.choicesContainer.classList.remove('hidden');
    this.els.puzzleContainer.classList.add('hidden');
    this.els.choicesContainer.innerHTML = '';

    if (!page.choices || page.choices.length === 0) return;

    page.choices.forEach((choice, index) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `
        <span class="choice-emoji">${choice.emoji || '▸'}</span>
        <span class="choice-text">${choice.text}</span>
      `;

      btn.addEventListener('mouseenter', () => window.audioManager?.hover());
      btn.addEventListener('click', () => this._handleChoice(choice, index));

      this.els.choicesContainer.appendChild(btn);
    });
  }

  _handleChoice(choice, index) {
    window.audioManager?.click();

    // Track moral points
    if (choice.points !== undefined) {
      this.moralPoints += choice.points;
    }

    // Determine target
    let target = choice.target;

    // Handle special targets
    if (target === '__menu__') {
      this.onNavigate?.('__menu__', index);
      return;
    }
    if (target === '__restart__') {
      this.onNavigate?.('__restart__', index);
      this.goToPage(this.story.meta.startPage);
      this.moralPoints = 0;
      this.visitedPages = [];
      this.puzzleResults = {};
      return;
    }

    // For ending pages that depend on moral points
    if (choice.conditionalTarget) {
      target = this.moralPoints >= choice.conditionalThreshold
        ? choice.conditionalTarget.high
        : choice.conditionalTarget.low;
    }

    // Notify sync
    this.onNavigate?.(target, index);

    // Navigate
    this.goToPage(target);
  }

  _renderPuzzle(page) {
    this.els.choicesContainer.classList.add('hidden');
    this.els.puzzleContainer.classList.remove('hidden');
    this.els.puzzleFeedback.classList.add('hidden');
    this.els.puzzleQuestion.innerHTML = this._formatText(page.puzzle.question);
    this.els.puzzleOptions.innerHTML = '';

    const alreadySolved = this.puzzleResults[this.currentPageId] === true;

    // Route to the correct puzzle handler based on inputType
    switch (page.puzzle.inputType) {
      case 'simon':
        window.puzzleSimon?.render(this, page, alreadySolved);
        break;
      case 'ordenarLetras':
        window.puzzleOrdenarLetras?.render(this, page, alreadySolved);
        break;
      case 'memory':
        window.puzzleMemory?.render(this, page, alreadySolved);
        break;
      case 'contarObjetos':
        window.puzzleContarObjetos?.render(this, page, alreadySolved);
        break;
      default:
        this._renderChoicesPuzzle(page, alreadySolved);
        break;
    }
  }

  _renderChoicesPuzzle(page, alreadySolved) {
    page.puzzle.options.forEach((option, index) => {
      const btn = document.createElement('button');
      btn.className = 'puzzle-option';
      btn.innerHTML = `
        <span class="choice-emoji">${option.emoji || '🔢'}</span>
        <span class="choice-text">${option.label}</span>
      `;

      if (alreadySolved) {
        btn.classList.add('disabled');
        if (option.value === page.puzzle.correctAnswer) {
          btn.classList.add('correct');
        }
      } else {
        btn.addEventListener('mouseenter', () => window.audioManager?.hover());
        btn.addEventListener('click', () => this._handlePuzzleAnswer(page, option, btn));
      }

      this.els.puzzleOptions.appendChild(btn);
    });

    // If already solved, show continue button
    if (alreadySolved) {
      this._showPuzzleContinue(page.puzzle.successTarget, page.puzzle.successText);
    }
  }

  // Called by external puzzle handlers when puzzle is solved
  completePuzzle(pageId, answer) {
    this.puzzleResults[pageId] = true;
    window.audioManager?.correct();
    this.onPuzzleAttempt?.(pageId, answer, true);
  }

  _handlePuzzleAnswer(page, option, btnEl) {
    const correct = option.value === page.puzzle.correctAnswer;

    // Disable all options temporarily
    const allBtns = this.els.puzzleOptions.querySelectorAll('.puzzle-option');
    allBtns.forEach(b => b.classList.add('disabled'));

    if (correct) {
      btnEl.classList.add('correct');
      this.puzzleResults[this.currentPageId] = true;

      // Sound & visual feedback
      window.audioManager?.correct();
      IllustrationRenderer.confetti(btnEl);

      // Show success message & continue
      this._showPuzzleContinue(page.puzzle.successTarget, page.puzzle.successText);

      // Notify sync
      this.onPuzzleAttempt?.(this.currentPageId, option.value, true);
    } else {
      btnEl.classList.add('incorrect');
      window.audioManager?.wrong();

      // Show hint
      this.els.puzzleFeedback.classList.remove('hidden');
      this.els.puzzleFeedback.className = 'puzzle-feedback fail';
      this.els.puzzleFeedback.textContent = page.puzzle.failText || 'Hmm, inténtalo de nuevo...';

      // Re-enable after a moment (except the wrong one)
      setTimeout(() => {
        allBtns.forEach(b => {
          if (!b.classList.contains('incorrect')) {
            b.classList.remove('disabled');
          }
        });
      }, 1000);

      // If there's a failTarget (hint page), show option to go there
      if (page.puzzle.failTarget) {
        setTimeout(() => {
          const hintBtn = document.createElement('button');
          hintBtn.className = 'choice-btn';
          hintBtn.style.marginTop = '12px';
          hintBtn.innerHTML = `
            <span class="choice-emoji">💡</span>
            <span class="choice-text">Pedir una pista</span>
          `;
          hintBtn.addEventListener('click', () => {
            this.onNavigate?.(page.puzzle.failTarget, -1);
            this.goToPage(page.puzzle.failTarget);
          });

          // Only add if not already added
          if (!this.els.puzzleContainer.querySelector('.choice-btn')) {
            this.els.puzzleContainer.appendChild(hintBtn);
          }
        }, 500);
      }

      this.onPuzzleAttempt?.(this.currentPageId, option.value, false);
    }
  }

  _showPuzzleContinue(target, successText) {
    this.els.puzzleFeedback.classList.remove('hidden');
    this.els.puzzleFeedback.className = 'puzzle-feedback success';
    this.els.puzzleFeedback.textContent = successText || '¡Correcto!';

    // Remove any existing continue button
    const existing = this.els.puzzleContainer.querySelector('.choice-btn');
    if (existing) existing.remove();

    const continueBtn = document.createElement('button');
    continueBtn.className = 'choice-btn';
    continueBtn.style.marginTop = '12px';
    continueBtn.innerHTML = `
      <span class="choice-emoji">➡️</span>
      <span class="choice-text">¡Continuar la aventura!</span>
    `;
    continueBtn.addEventListener('click', () => {
      this.onNavigate?.(target, 0);
      this.goToPage(target);
    });
    this.els.puzzleContainer.appendChild(continueBtn);

    // Scroll to show the continue button and update arrow
    setTimeout(() => {
      if (this.els.storyPanel) {
        this.els.storyPanel.scrollTo({ top: this.els.storyPanel.scrollHeight, behavior: 'smooth' });
      }
      this._updateScrollArrow();
    }, 150);
  }

  _renderEnding(page) {
    this.els.choicesContainer.classList.add('hidden');
    this.els.puzzleContainer.classList.add('hidden');

    // Determine ending rank visuals
    const rankVisuals = {
      best: { icon: '🏆👑🌟', badge: '¡FINAL PERFECTO!' },
      good: { icon: '⭐🎉', badge: '¡BUEN FINAL!' },
      neutral: { icon: '🌅', badge: 'FIN' },
    };
    const rank = rankVisuals[page.endingRank] || rankVisuals.neutral;

    // Show ending overlay with delay for dramatic effect
    setTimeout(() => {
      this.els.endingOverlay.classList.remove('hidden');
      this.els.endingContent.innerHTML = `
        <div class="ending-rank">${rank.icon}</div>
        <div class="ending-badge" style="font-size:0.9rem;color:var(--color-accent);margin-bottom:8px;letter-spacing:2px">${rank.badge}</div>
        <div class="ending-title">${page.title}</div>
        <div class="ending-text">${this._formatText(page.text)}</div>
        <div style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:20px">
          Puntos morales: ${'⭐'.repeat(this.moralPoints)}${'☆'.repeat(Math.max(0, 4 - this.moralPoints))} (${this.moralPoints}/4)
        </div>
        <div class="ending-actions">
          ${(page.choices || []).map((c, i) => `
            <button class="btn btn-primary" data-target="${c.target}" data-index="${i}">
              ${c.emoji || ''} ${c.text}
            </button>
          `).join('')}
        </div>
      `;

      // Bind ending choice buttons
      this.els.endingContent.querySelectorAll('[data-target]').forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.dataset.target;
          const index = parseInt(btn.dataset.index);
          this._handleChoice({ target, text: btn.textContent }, index);
        });
      });

      // Fanfare & confetti
      if (page.endingRank === 'best') {
        window.audioManager?.fanfare();
        IllustrationRenderer.confettiRain();
      } else {
        window.audioManager?.sparkle();
      }
    }, 500);
  }

  _updateScrollArrow() {
    if (!this.els.scrollArrow || !this.els.storyPanel) return;
    const panel = this.els.storyPanel;
    const hasOverflow = panel.scrollHeight > panel.clientHeight + 20;
    const nearBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 30;

    if (hasOverflow && !nearBottom) {
      this.els.scrollArrow.classList.remove('hidden');
    } else {
      this.els.scrollArrow.classList.add('hidden');
    }
  }

  // State serialization for sync
  getState() {
    return {
      storyId: this.story?.meta?.id,
      currentPage: this.currentPageId,
      moralPoints: this.moralPoints,
      visitedPages: [...this.visitedPages],
      puzzleResults: { ...this.puzzleResults },
    };
  }

  loadState(state) {
    if (!state) return;
    this.moralPoints = state.moralPoints || 0;
    this.visitedPages = state.visitedPages || [];
    this.puzzleResults = state.puzzleResults || {};
    if (state.currentPage && this.story) {
      this.goToPage(state.currentPage);
    }
  }
}

window.StoryEngine = StoryEngine;
