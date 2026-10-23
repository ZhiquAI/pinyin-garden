/* Align guide lines to the rendered font baseline, including wrapped syllables. */
'use strict';
window.PinyinGrid = (() => {
  const namespace = 'http://www.w3.org/2000/svg';
  const tracked = new Set();
  const dirty = new Set();
  const context = document.createElement('canvas').getContext('2d');
  let scheduled = false;
  function schedule(element) {
    dirty.add(element);
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      for (const item of dirty) draw(item);
      dirty.clear();
    });
  }
  const observer = new ResizeObserver(entries => entries.forEach(entry => schedule(entry.target)));
  function draw(element) {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const style = getComputedStyle(element);
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const cell = context.measureText('x').actualBoundingBoxAscent;
    if (!cell) return;
    const rows = [];
    for (const marker of element.querySelectorAll('.baseline-marker')) {
      const baseline = marker.getBoundingClientRect().top - rect.top;
      if (!rows.some(row => Math.abs(row - baseline) < 1)) rows.push(baseline);
    }
    const svg = element.querySelector('.pinyin-grid-lines');
    svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    const lines = [];
    for (const baseline of rows) {
      for (let level = -2; level <= 1; level++) {
        const line = document.createElementNS(namespace, 'line');
        line.setAttribute('x1', '0');
        line.setAttribute('x2', String(rect.width));
        line.setAttribute('y1', String(baseline + level * cell));
        line.setAttribute('y2', String(baseline + level * cell));
        if (level === 0) line.classList.add('baseline');
        lines.push(line);
      }
    }
    svg.replaceChildren(...lines);
  }
  function setText(element, text) {
    const svg = document.createElementNS(namespace, 'svg');
    svg.classList.add('pinyin-grid-lines');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const content = [svg];
    text.trim().split(/\s+/).filter(Boolean).forEach((syllable, index) => {
      if (index) content.push(document.createTextNode(' '));
      const span = document.createElement('span');
      span.className = 'pinyin-syllable';
      span.textContent = syllable;
      const marker = document.createElement('span');
      marker.className = 'baseline-marker';
      marker.setAttribute('aria-hidden', 'true');
      span.append(marker);
      content.push(span);
    });
    element.replaceChildren(...content);
    if (!tracked.has(element)) {
      tracked.add(element);
      observer.observe(element);
    }
    schedule(element);
  }
  document.querySelectorAll('.pinyin').forEach(element => setText(element, element.textContent));
  document.fonts.ready.then(() => tracked.forEach(schedule));
  document.fonts.addEventListener('loadingdone', () => tracked.forEach(schedule));
  return {setText};
})();
