/* A local image and Mandarin recording accompany every source entry. */
'use strict';
(() => {
  const lessons = window.LESSONS;
  const $ = id => document.getElementById(id);
  let day = 0;
  let index = 0;
  try {
    const saved = JSON.parse(localStorage.getItem('pinyin-garden-position'));
    if (saved && Number.isInteger(saved.day) && lessons[saved.day] &&
        Number.isInteger(saved.index) && lessons[saved.day].words[saved.index]) {
      day = saved.day; index = saved.index;
    }
  } catch { /* Storage may be unavailable when opening local files. */ }
  const audio = new Audio();
  audio.preload = 'auto';
  let playing = false;
  let timer = null;
  let run = 0;
  let readCount = 0;
  const current = () => lessons[day].words[index];
  function stop(message = '已停止，点一下可以重新听') {
    run++;
    playing = false;
    clearTimeout(timer);
    timer = null;
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    $('speak-label').textContent = '听一听';
    $('speak').classList.remove('playing');
    $('speak').setAttribute('aria-label', '朗读' + current().word);
    $('status').textContent = message;
  }
  function start() {
    stop();
    const token = run;
    const limit = Number($('repeat').value);
    readCount = 0;
    playing = true;
    $('speak-label').textContent = '停止朗读';
    $('speak').classList.add('playing');
    $('speak').setAttribute('aria-label', '停止朗读');
    const fail = () => {
      if (token !== run) return;
      stop('音频未能播放，请检查 assets 文件夹是否完整，再点一下重试');
    };
    const playOnce = () => {
      if (token !== run || !playing) return;
      readCount++;
      $('status').textContent = limit === 0 ? `循环朗读中 · 第 ${readCount} 次` : `正在朗读 · ${readCount} / ${limit} 次`;
      audio.src = `assets/audio/${current().id}.mp3?v=xiaoxiao-1`;
      audio.playbackRate = Number($('speed').value);
      audio.onended = () => {
        if (token !== run) return;
        if (limit === 0 || readCount < limit) {
          $('status').textContent = '跟着读一遍，稍后再听一次…';
          timer = setTimeout(playOnce, 1300);
        } else {
          stop(`已读完 ${readCount} 次，你也来读一遍吧！`);
        }
      };
      audio.onerror = fail;
      audio.play().catch(fail);
    };
    playOnce();
  }
  const toggle = () => playing ? stop() : start();
  function render() {
    const lesson = lessons[day], word = current();
    $('day-label').textContent = `第 ${day + 1} 天`;
    $('lesson-title').textContent = lesson.title;
    $('position').textContent = `${index + 1} / ${lesson.words.length}`;
    $('progress').style.width = `${(index + 1) / lesson.words.length * 100}%`;
    $('picture').src = `assets/images/${word.id}.png`;
    $('picture').alt = `${word.word}的词义提示图`;
    $('picture-button').setAttribute('aria-label', `朗读${word.word}`);
    window.PinyinGrid.setText($('pinyin'), word.pinyin);
    $('pinyin').classList.toggle('long', word.pinyin.length > 14);
    $('hanzi').textContent = word.word;
    $('hanzi').classList.toggle('hidden', !$('show-hanzi').checked);
    $('hanzi').setAttribute('aria-hidden', String(!$('show-hanzi').checked));
    $('previous').disabled = index === 0;
    $('next').disabled = index === lesson.words.length - 1;
    $('day-select').value = day;
    document.querySelectorAll('.day-button').forEach((b, i) => b.setAttribute('aria-current', String(i === day)));
    $('words').replaceChildren(...lesson.words.map((w, i) => {
      const b = document.createElement('button');
      b.className = 'word-chip'; b.textContent = w.word;
      b.setAttribute('aria-current', String(i === index));
      b.setAttribute('aria-label', `选择${w.word}，${w.pinyin}`);
      b.onclick = () => { select(day, i); };
      return b;
    }));
    $('speak').setAttribute('aria-label', '朗读' + word.word);
    try { localStorage.setItem('pinyin-garden-position', JSON.stringify({day, index})); } catch { /* Local files can deny storage. */ }
  }
  function select(newDay, newIndex) {
    if (!lessons[newDay]?.words[newIndex]) return;
    stop('先自己拼一拼，再听听发音');
    day = newDay; index = newIndex; render();
  }
  lessons.forEach((lesson, i) => {
    const button = document.createElement('button');
    button.className = 'day-button';
    const number = document.createElement('span'); number.className = 'day-number'; number.textContent = String(i + 1).padStart(2, '0');
    const label = document.createElement('span'); label.className = 'day-text'; label.textContent = lesson.title;
    const small = document.createElement('small'); small.textContent = `${lesson.words.length} 个词语`;
    label.append(small); button.append(number, label);
    button.setAttribute('aria-label', `第${i+1}天，${lesson.title}`);
    button.onclick = () => select(i, 0);
    $('days').append(button);
    const option = document.createElement('option'); option.value = i; option.textContent = `第 ${i + 1} 天 · ${lesson.title}`; $('day-select').append(option);
  });
  $('day-select').onchange = e => select(Number(e.target.value), 0);
  $('previous').onclick = () => select(day, index - 1);
  $('next').onclick = () => select(day, index + 1);
  $('speak').onclick = toggle;
  $('picture-button').onclick = toggle;
  $('repeat').onchange = () => stop('已更改重复次数，点「听一听」开始');
  $('speed').onchange = () => { audio.playbackRate = Number($('speed').value); };
  $('show-hanzi').onchange = () => {
    $('hanzi').classList.toggle('hidden', !$('show-hanzi').checked);
    $('hanzi').setAttribute('aria-hidden', String(!$('show-hanzi').checked));
  };
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('button, select, input, textarea, a')) return;
    if (event.code === 'Space') { event.preventDefault(); toggle(); }
    if (event.code === 'ArrowLeft') { event.preventDefault(); select(day, index - 1); }
    if (event.code === 'ArrowRight') { event.preventDefault(); select(day, index + 1); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) stop('已暂停，点一下继续练习'); });
  window.addEventListener('pagehide', () => stop());
  render();
})();
