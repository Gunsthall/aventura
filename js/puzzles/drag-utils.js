/* =============================================
   DRAG UTILS - Touch + Mouse drag utility
   ============================================= */

window.DragUtils = {
  makeDraggable(element, options = {}) {
    let isDragging = false;
    let offsetX, offsetY;
    let currentTarget = null;

    const getPos = (e) => {
      if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    };

    const onStart = (e) => {
      e.preventDefault();
      isDragging = true;
      const pos = getPos(e);
      const rect = element.getBoundingClientRect();
      offsetX = pos.x - rect.left;
      offsetY = pos.y - rect.top;
      element.classList.add('dragging');
      options.onStart?.(element);
    };

    const onMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const pos = getPos(e);
      element.style.position = 'fixed';
      element.style.left = (pos.x - offsetX) + 'px';
      element.style.top = (pos.y - offsetY) + 'px';
      element.style.zIndex = '100';

      // Hit-test snap targets
      if (options.snapTargets) {
        currentTarget = null;
        options.snapTargets.forEach(t => {
          t.classList.remove('drag-hover');
          const tr = t.getBoundingClientRect();
          if (pos.x >= tr.left && pos.x <= tr.right &&
              pos.y >= tr.top && pos.y <= tr.bottom) {
            t.classList.add('drag-hover');
            currentTarget = t;
          }
        });
      }
      options.onMove?.(element, pos);
    };

    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      element.classList.remove('dragging');
      if (options.snapTargets) {
        options.snapTargets.forEach(t => t.classList.remove('drag-hover'));
      }
      options.onEnd?.(element, currentTarget);
    };

    element.addEventListener('mousedown', onStart);
    element.addEventListener('touchstart', onStart, { passive: false });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);

    return () => {
      element.removeEventListener('mousedown', onStart);
      element.removeEventListener('touchstart', onStart);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchend', onEnd);
    };
  }
};
