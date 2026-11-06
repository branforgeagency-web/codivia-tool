/* CODIVIA platform — department tile checkerboard (orange / white tiles) */
// auto-fill/fixed grids reflow, so compute the real column count from tile
// geometry and paint orange where (row+col) is even. Re-run on resize + DOM change.
export function paintDeptCheckerboard() {
  document.querySelectorAll('.dept-grid').forEach(function (grid) {
    var cards = Array.prototype.slice.call(grid.children);
    if (!cards.length) return;
    var top0 = cards[0].offsetTop,
      cols = 0;
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].offsetTop === top0) cols++;
      else break;
    }
    if (cols < 1) cols = 1;
    cards.forEach(function (card, idx) {
      var row = Math.floor(idx / cols),
        col = idx % cols;
      if ((row + col) % 2 === 0) card.classList.add('orange');
      else card.classList.remove('orange');
    });
  });
}

let rafId;
export function scheduleCheckerboard() {
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(function () {
    requestAnimationFrame(paintDeptCheckerboard);
  });
}

// repaint on resize and whenever React swaps views in
export function initCheckerboard() {
  window.addEventListener('resize', scheduleCheckerboard);
  const root = document.getElementById('root');
  if (typeof MutationObserver !== 'undefined' && root) {
    new MutationObserver(scheduleCheckerboard).observe(root, { childList: true, subtree: true });
  }
  scheduleCheckerboard();
}
