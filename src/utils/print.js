// Print only the .print-area card (adds body.printing during print, removes after)
export function doPrint() {
  document.body.classList.add('printing');
  var cleanup = function () {
    document.body.classList.remove('printing');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
  // fallback cleanup in case afterprint doesn't fire
  setTimeout(cleanup, 1500);
}
