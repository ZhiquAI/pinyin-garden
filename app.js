/* A local image and Mandarin recording accompany every source entry. */
'use strict';
(() => {
  const lessons = window.LESSONS;
  const illustratedWords = new Set(['w001', 'w002', 'w003', 'w004', 'w005', 'w006', 'w007', 'w008', 'w009', 'w010', 'w011', 'w012', 'w013', 'w014', 'w015', 'w016', 'w017', 'w018', 'w019', 'w020', 'w021', 'w022', 'w023', 'w050']);
  const $ = id => document.getElementById(id);
  let day = 0;
  let index = 0;
  let completedDays = new Set();
  try {
    const savedDays = JSON.parse(localStorage.getItem('pinyin-garden-completed') || '[]');
    if (Array.isArray(savedDays)) completedDays = new Set(savedDays);
  } catch {}

  // 拟真轻柔微音效（Web Audio API，免加载外部音频文件，零体积）
  let audioCtx = null;
  function playPageTurnSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtx) audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      // 轻微的柔和纸张摩擦/弹动声
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, audioCtx.currentTime + 0.08);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch {}
  }
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
          // 朗读完后，如果刚好是当天的最后一个词，触发通关打卡
          if (index === lessons[day].words.length - 1) {
            checkDayCompletion();
          }
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
    $('picture').src = illustratedWords.has(word.id)
      ? `assets/illustrations/${word.id}.webp`
      : `assets/images/${word.id}.png`;
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
    document.querySelectorAll('.day-button').forEach((b, i) => {
      b.setAttribute('aria-current', String(i === day));
      let flower = b.querySelector('.completed-flower');
      if (completedDays.has(i)) {
        if (!flower) {
          flower = document.createElement('span');
          flower.className = 'completed-flower';
          flower.setAttribute('aria-label', '已通关');
          flower.textContent = '🌸';
          b.append(flower);
        }
      } else if (flower) {
        flower.remove();
      }
    });
    $('speak').setAttribute('aria-label', '朗读' + word.word);
    try { localStorage.setItem('pinyin-garden-position', JSON.stringify({day, index})); } catch { /* Local files can deny storage. */ }
  }
  let animating = false;
  function select(newDay, newIndex, direction = null) {
    if (!lessons[newDay]?.words[newIndex]) return;
    if (newDay === day && newIndex === index) return;
    stop('先自己拼一拼，再听听发音');

    // 确定翻页方向：1 为下一张（向左滑出，新卡片从右滑入）；-1 为上一张（向右滑出，新卡片从左滑入）
    if (direction === null) {
      if (newDay !== day) {
        direction = newDay > day ? 1 : -1;
      } else {
        direction = newIndex > index ? 1 : -1;
      }
    }

    const card = $('flashcard');
    // 如果支持动画且用户未开启降低动态效果
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || animating) {
      day = newDay; index = newIndex; render();
      return;
    }

    animating = true;
    playPageTurnSound();
    const outClass = direction > 0 ? 'slide-out-left' : 'slide-out-right';
    const prepareClass = direction > 0 ? 'prepare-in-right' : 'prepare-in-left';

    card.classList.add(outClass);

    setTimeout(() => {
      day = newDay;
      index = newIndex;
      render();

      card.classList.remove(outClass);
      card.classList.add(prepareClass);

      // 触发重排，让 transition: none 的起点位置生效
      void card.offsetWidth;

      card.classList.remove(prepareClass);

      setTimeout(() => {
        animating = false;
      }, 200);
    }, 150);
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

  function playCelebrationSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtx) audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      // 欢快的通关小三和弦 (C5 - E5 - G5 - C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const start = audioCtx.currentTime + idx * 0.1;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + 0.35);
      });
    } catch {}
  }

  function checkDayCompletion() {
    if (!completedDays.has(day)) {
      completedDays.add(day);
      try {
        localStorage.setItem('pinyin-garden-completed', JSON.stringify([...completedDays]));
      } catch {}
      render();
    }

    // 显示通关弹窗
    const modal = $('completion-modal');
    $('modal-desc').textContent = `太棒啦！你已经读完了第 ${day + 1} 天「${lessons[day].title}」所有的词语，送你一朵小红花！🌸`;
    modal.classList.remove('hidden');
    playCelebrationSound();
  }

  $('modal-replay').onclick = () => {
    $('completion-modal').classList.add('hidden');
    select(day, 0);
  };

  $('modal-next-day').onclick = () => {
    $('completion-modal').classList.add('hidden');
    if (day < lessons.length - 1) {
      select(day + 1, 0);
    } else {
      select(0, 0);
    }
  };

  $('completion-modal').onclick = e => {
    if (e.target === $('completion-modal')) {
      $('completion-modal').classList.add('hidden');
    }
  };

  // 支持触屏手势：在卡片区域左右滑动切换词语，以及双击卡片快速朗读
  const cardElement = $('flashcard');
  let touchStartX = 0;
  let touchStartY = 0;
  let lastTapTime = 0;

  function triggerCardPulse() {
    cardElement.classList.remove('pulse-speak');
    void cardElement.offsetWidth;
    cardElement.classList.add('pulse-speak');
  }

  // 双击事件（桌面与部分触屏设备）
  cardElement.addEventListener('dblclick', e => {
    // 忽略具体按钮上的双击，避免与按钮本身的点击逻辑冲突
    if (e.target.closest('button, select, input, a')) return;
    triggerCardPulse();
    start();
  });

  cardElement.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  cardElement.addEventListener('touchend', e => {
    if (e.changedTouches.length !== 1) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    const distance = Math.hypot(deltaX, deltaY);

    // 水平滑动距离超过 45px，且水平位移明显大于垂直位移（避免影响上下滑动看网页）
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        // 向左滑 -> 下一张
        select(day, index + 1);
      } else {
        // 向右滑 -> 上一张
        select(day, index - 1);
      }
      return;
    }

    // 双触（Double-tap）判定：移动距离微小（< 15px），且两次点击间隔在 40ms ~ 320ms 内
    if (distance < 15) {
      const now = Date.now();
      if (now - lastTapTime > 40 && now - lastTapTime < 320) {
        if (!e.target.closest('button, select, input, a')) {
          triggerCardPulse();
          start();
          lastTapTime = 0;
          return;
        }
      }
      lastTapTime = now;
    }
  }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) stop('已暂停，点一下继续练习'); });
  window.addEventListener('pagehide', () => stop());
  render();
})();
