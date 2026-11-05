/* CODIVIA platform — department tile painter + React mount */
// ---- Department tile checkerboard ----
// auto-fill/fixed grids reflow, so compute the real column count from tile
// geometry and paint orange where (row+col) is even. Re-run on resize + DOM change.
function paintDeptCheckerboard(){
  document.querySelectorAll('.dept-grid').forEach(function(grid){
    var cards = Array.prototype.slice.call(grid.children);
    if(!cards.length) return;
    var top0 = cards[0].offsetTop, cols = 0;
    for(var i=0;i<cards.length;i++){ if(cards[i].offsetTop===top0) cols++; else break; }
    if(cols<1) cols=1;
    cards.forEach(function(card,idx){
      var row = Math.floor(idx/cols), col = idx%cols;
      if((row+col)%2===0) card.classList.add('orange'); else card.classList.remove('orange');
    });
  });
}
var _cbRAF;
function scheduleCheckerboard(){ cancelAnimationFrame(_cbRAF);
  _cbRAF=requestAnimationFrame(function(){ requestAnimationFrame(paintDeptCheckerboard); }); }
if(typeof window!=='undefined' && window.addEventListener){
  window.addEventListener('resize', scheduleCheckerboard);
  // repaint whenever React swaps views in
  var _root=document.getElementById('root');
  if(typeof MutationObserver!=='undefined' && _root){
    new MutationObserver(scheduleCheckerboard).observe(_root,{childList:true,subtree:true});
  }
  scheduleCheckerboard();
}

ReactDOM.createRoot(document.getElementById('root')).render(e(App));
