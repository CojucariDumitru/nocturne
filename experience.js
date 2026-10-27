'use strict';

(() => {
  const $ = (selector) => document.querySelector(selector);
  const html = document.documentElement;
  const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let savedMotion = null;
  try { savedMotion = localStorage.getItem('nocturne-motion'); } catch (_) {}
  let reduced = savedMotion === null ? systemMotion.matches : savedMotion === 'reduced';
  const motionButton = $('#motion-toggle');
  function setMotion() {
    html.classList.toggle('motion-reduced', reduced);
    motionButton.textContent = 'АНИМАЦИИ: ' + (reduced ? 'ВЫКЛ.' : 'ВКЛ.');
    motionButton.setAttribute('aria-pressed', String(reduced));
  }
  setMotion();
  motionButton.addEventListener('click', () => {
    reduced = !reduced;
    savedMotion = reduced ? 'reduced' : 'full';
    try { localStorage.setItem('nocturne-motion', reduced ? 'reduced' : 'full'); } catch (_) {}
    setMotion();
  });
  systemMotion.addEventListener('change', e => {
    if (savedMotion !== null) return;
    reduced = e.matches;
    setMotion();
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .08 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  const pageProgress = $('.page-progress');
  const heroImage = $('#hero-image');
  const hero = $('.hero');
  let scrollQueued = false;
  function updateScroll() {
    const scroll = window.scrollY;
    const max = html.scrollHeight - window.innerHeight;
    pageProgress.style.transform = `scaleX(${max > 0 ? scroll / max : 0})`;
    if (!reduced && scroll < hero.offsetHeight && window.innerWidth > 700) {
      heroImage.style.translate = `0 ${Math.min(scroll * .13, 110)}px`;
    } else heroImage.style.translate = 'none';
    scrollQueued = false;
  }
  addEventListener('scroll', () => {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); }
  }, { passive: true });
  addEventListener('resize', updateScroll);
  updateScroll();

  const timecode = $('#timecode');
  const pageStarted = performance.now();
  setInterval(() => {
    if (document.hidden) return;
    const s = Math.floor((performance.now() - pageStarted) / 1000);
    timecode.textContent = `00:${String(Math.floor(s / 60) % 60).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  }, 1000);

  let toastTimer;
  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  const modes = {
    midnight: { name: 'MIDNIGHT RUN', bpm: 128, accent: '#d5fa38', filter: 'saturate(.78)', notes: [55,55,65.406,49], subs: ['THE CITY IS YOURS.', 'NO DESTINATION.', 'JUST THE FEELING.', 'AFTER HOURS. ALWAYS.'], words: ['AFTER', 'DARK.', 'NO\nDESTINATION.', 'JUST', 'THE\nFEELING.', 'MIDNIGHT\nRUN', 'STAY', 'AFTER.'] },
    redline: { name: 'REDLINE', bpm: 160, accent: '#ff694c', filter: 'sepia(.7) saturate(2) hue-rotate(315deg)', notes: [49,49,51.913,43.654], subs: ['TURN IT ALL THE WAY UP.', 'FEEL EVERY SECOND.', 'HEARTBEAT IN STEREO.', 'LIVE IN THE RED.'], words: ['RED', 'LINE.', 'FEEL\nEVERYTHING.', 'LOUDER.', 'ALL\nNIGHT.', 'NO\nLIMITS.', 'MORE', 'ALIVE.'] },
    dream: { name: 'SLOW MOTION', bpm: 86, accent: '#d2e0fc', filter: 'saturate(.45) hue-rotate(22deg)', notes: [65.406,82.407,55,73.416], subs: ['LET THE WORLD WAIT.', 'A LITTLE LONGER.', 'LOST IN A GOOD WAY.', 'DON’T WAKE UP.'], words: ['SLOW', 'MOTION.', 'BREATHE\nIT IN.', 'STAY.', 'A LITTLE\nLONGER.', 'TIME\nDISSOLVES.', 'STILL', 'HERE.'] }
  };

  // Original browser-synthesized rhythm. No autoplay or third-party audio requests.
  let audioContext = null;
  let master = null;
  let noiseBuffer = null;
  let soundOn = false;
  let audioTimer = null;
  let nextNote = 0;
  let step = 0;
  let audioMode = 'midnight';
  const audioNodes = new Set();
  function track(node) {
    audioNodes.add(node);
    node.addEventListener('ended', () => { audioNodes.delete(node); try { node.disconnect(); } catch (_) {} });
    return node;
  }
  function createAudio() {
    if (audioContext) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('Web Audio unavailable');
    audioContext = new AC();
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 5;
    master = audioContext.createGain();
    master.gain.value = .22;
    master.connect(compressor);
    compressor.connect(audioContext.destination);
    noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate);
    const noise = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noise.length; i++) noise[i] = Math.random() * 2 - 1;
  }
  function tone(time, freq, duration, volume, wave = 'sine', slide = false) {
    const osc = track(audioContext.createOscillator());
    const envelope = audioContext.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, time);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(freq / 4, 25), time + duration * .75);
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.exponentialRampToValueAtTime(volume, time + .009);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    osc.connect(envelope); envelope.connect(master);
    osc.start(time); osc.stop(time + duration + .02);
  }
  function percussion(time, duration, volume, cutoff, kind = 'highpass') {
    const source = track(audioContext.createBufferSource());
    const filter = audioContext.createBiquadFilter();
    const envelope = audioContext.createGain();
    source.buffer = noiseBuffer;
    filter.type = kind; filter.frequency.value = cutoff;
    envelope.gain.setValueAtTime(volume, time);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(filter); filter.connect(envelope); envelope.connect(master);
    source.start(time); source.stop(time + duration);
  }
  function scheduleBeat() {
    if (!audioContext || !soundOn) return;
    const mode = modes[audioMode];
    const sixteenth = 60 / mode.bpm / 4;
    while (nextNote < audioContext.currentTime + .12) {
      const position = step % 16;
      const note = mode.notes[Math.floor(step / 16) % 4];
      if (position % 4 === 0) tone(nextNote, 146, .26, .95, 'sine', true);
      if (position === 4 || position === 12) {
        percussion(nextNote, .13, .32, 1400, 'bandpass');
        tone(nextNote, 180, .09, .22, 'triangle', true);
      }
      if (position % 2 === 0) percussion(nextNote, .035, position % 4 === 0 ? .12 : .07, 7000);
      if ([0,3,6,8,11,14].includes(position)) tone(nextNote, note, sixteenth * 1.7, .45, 'triangle');
      if ([2,5,10,13].includes(position)) {
        const melody = note * [8,12,10,16][Math.floor(position / 4)];
        tone(nextNote, melody, .11, .055, 'square');
        tone(nextNote + .1, melody, .15, .018, 'sine');
      }
      nextNote += sixteenth; step++;
    }
  }
  async function startAudio(mode = 'midnight') {
    try {
      createAudio();
      audioMode = mode;
      await audioContext.resume();
      master.gain.cancelScheduledValues(audioContext.currentTime);
      master.gain.setTargetAtTime(.22, audioContext.currentTime, .06);
      if (!soundOn || !audioTimer) {
        soundOn = true;
        nextNote = audioContext.currentTime + .04; step = 0;
        clearInterval(audioTimer);
        audioTimer = setInterval(scheduleBeat, 25);
        scheduleBeat();
      }
      updateSoundUI();
    } catch (_) {
      soundOn = false;
      updateSoundUI();
      toast('Браузер не включил звук. Эдит можно смотреть без него.');
    }
  }
  function stopAudio() {
    soundOn = false;
    clearInterval(audioTimer); audioTimer = null;
    if (audioContext && master) {
      master.gain.cancelScheduledValues(audioContext.currentTime);
      master.gain.setTargetAtTime(.0001, audioContext.currentTime, .03);
    }
    updateSoundUI();
  }
  function updateSoundUI() {
    document.body.classList.toggle('sound-on', soundOn);
    $('#sound-toggle').setAttribute('aria-pressed', String(soundOn));
    $('#sound-toggle').setAttribute('aria-label', soundOn ? 'Выключить звук' : 'Включить звук');
    $('.sound-label').textContent = soundOn ? 'ЗВУК ВКЛ.' : 'ЗВУК ВЫКЛ.';
    $('#edit-sound').textContent = soundOn ? 'ЗВУК ВКЛ. ♫' : 'ВКЛЮЧИТЬ ЗВУК ♫';
    $('#edit-sound').setAttribute('aria-pressed', String(soundOn));
  }
  function toggleSound() {
    if (soundOn) stopAudio();
    else startAudio(activeMode);
  }
  $('#sound-toggle').addEventListener('click', toggleSound);
  $('#edit-sound').addEventListener('click', toggleSound);

  const dialog = $('#edit-dialog');
  const editPhoto = $('.edit-photo');
  const editType = $('#edit-type');
  const editSubtitle = $('#edit-subtitle');
  const editProgress = $('#edit-progress');
  const editTime = $('#edit-time');
  const editEnd = $('#edit-end');
  const canvas = $('#speed-canvas');
  const ctx = canvas.getContext('2d');
  let activeMode = 'midnight';
  let playing = false;
  let editStarted = 0;
  let pausedAt = 0;
  let raf = 0;
  let previousWord = -1;
  let returnFocus = null;
  let hadAmbientSound = false;
  let replaySound = false;
  let width = 0, height = 0;
  const trails = Array.from({length:32}, () => ({angle:Math.random() * Math.PI * 2,offset:Math.random(),speed:.4 + Math.random() * .6}));
  function resizeCanvas() {
    width = window.innerWidth; height = window.innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = width * dpr; canvas.height = height * dpr;
    if(ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resizeCanvas);
  function drawTrails(elapsed, impact, accent) {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (reduced) return;
    const cx = width * .55, cy = height * .56;
    const radius = Math.hypot(width, height) * .7;
    ctx.strokeStyle = accent;
    ctx.lineWidth = .7;
    for (const trail of trails) {
      const progress = (trail.offset + elapsed * .00016 * trail.speed) % 1;
      const r = progress * progress * radius;
      if (r < radius * .24) continue;
      const length = (12 + progress * 85) * (.45 + impact * .6);
      ctx.globalAlpha = progress * .21;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(trail.angle) * r, cy + Math.sin(trail.angle) * r);
      ctx.lineTo(cx + Math.cos(trail.angle) * (r + length), cy + Math.sin(trail.angle) * (r + length));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function animateEdit(now) {
    if (!playing) return;
    const elapsed = Math.max(0, now - editStarted);
    const seconds = Math.min(elapsed / 1000, 15);
    const mode = modes[activeMode];
    const progress = seconds / 15;
    const beatLength = 60000 / mode.bpm;
    const beatPhase = (elapsed % beatLength) / beatLength;
    const impact = Math.exp(-beatPhase * 10);
    const wordIndex = Math.min(Math.floor(seconds / 1.875), 7);
    if (wordIndex !== previousWord) {
      previousWord = wordIndex;
      editType.textContent = mode.words[wordIndex];
      editSubtitle.textContent = mode.subs[Math.floor(wordIndex / 2)];
      const longWord = mode.words[wordIndex].split('\n').some(word => word.length > 8);
      editType.style.fontSize = longWord ? 'clamp(60px, 15vw, 240px)' : '';
      editType.style.color = wordIndex % 3 === 1 ? mode.accent : 'var(--paper)';
      const translate = [0, -6, 9, -9, 5, -2, 8, 0][wordIndex];
      const zoom = [1.04,1.28,1.1,1.38,1.12,1.26,1.08,1.17][wordIndex];
      editPhoto.dataset.zoom = String(zoom);
      editPhoto.dataset.pan = String(translate);
    }
    const phase = (seconds % 1.875) / 1.875;
    if (reduced) {
      editPhoto.style.transform = 'scale(1.05)';
      editPhoto.style.filter = mode.filter;
      editType.style.transform = 'translateY(-50%)';
      editType.style.opacity = '1';
      editType.style.filter = 'none';
    } else {
      const zoom = Number(editPhoto.dataset.zoom) + phase * (activeMode === 'dream' ? .03 : .07) + impact * .025;
      const shake = activeMode === 'redline' ? Math.sin(elapsed * .07) * impact * 3 : Math.sin(elapsed * .035) * impact * 1.1;
      editPhoto.style.transform = `translate(${Number(editPhoto.dataset.pan) + shake}px,${shake * .35}px) scale(${zoom})`;
      editPhoto.style.filter = `${mode.filter} brightness(${.72 + impact * .12})`;
      const arrival = Math.min(phase * 9, 1);
      const textScale = .94 + arrival * .06 + impact * .012;
      editType.style.transform = `translate(${(1 - arrival) * 40}px,calc(-50% + ${(1 - arrival) * 24}px)) scale(${textScale})`;
      editType.style.opacity = String(Math.min(phase * 12, 1));
      editType.style.filter = `blur(${(1 - arrival) * 9}px)`;
    }
    editProgress.style.transform = `scaleX(${progress})`;
    editTime.textContent = `00:${String(Math.floor(seconds)).padStart(2,'0')} / 00:15`;
    drawTrails(elapsed, impact, mode.accent);
    if (seconds >= 15) {
      playing = false;
      editEnd.hidden = false;
      editType.style.opacity = '0';
      editSubtitle.style.opacity = '0';
      replaySound = soundOn;
      if (soundOn) stopAudio();
      $('#replay-edit').focus({preventScroll:true});
      return;
    }
    raf = requestAnimationFrame(animateEdit);
  }
  function beginEdit() {
    editEnd.hidden = true;
    editSubtitle.style.opacity = '1';
    previousWord = -1;
    editStarted = performance.now();
    pausedAt = 0;
    playing = true;
    cancelAnimationFrame(raf);
    animateEdit(editStarted);
  }
  function openEdit(modeName, button) {
    if (dialog.open) return;
    activeMode = modes[modeName] ? modeName : 'midnight';
    returnFocus = button;
    hadAmbientSound = soundOn;
    dialog.dataset.mode = activeMode;
    $('#edit-label').textContent = 'NOCTURNE / ' + modes[activeMode].name;
    document.body.classList.add('modal-open');
    dialog.showModal();
    resizeCanvas();
    beginEdit();
    $('#close-edit').focus({preventScroll:true});
    if (soundOn) { stopAudio(); startAudio(activeMode); }
    else updateSoundUI();
  }
  function closeEdit() {
    playing = false;
    cancelAnimationFrame(raf);
    dialog.close();
  }
  dialog.addEventListener('close', () => {
    playing = false;
    cancelAnimationFrame(raf);
    document.body.classList.remove('modal-open');
    if (hadAmbientSound) startAudio('midnight');
    else stopAudio();
    if (returnFocus) returnFocus.focus({preventScroll:true});
  });
  document.querySelectorAll('[data-play]').forEach(button => {
    button.addEventListener('click', () => openEdit(button.dataset.play, button));
  });
  $('#close-edit').addEventListener('click', closeEdit);
  $('#back-to-night').addEventListener('click', closeEdit);
  $('#replay-edit').addEventListener('click', () => { beginEdit(); if (replaySound) startAudio(activeMode); $('#close-edit').focus({preventScroll:true}); });
  addEventListener('keydown', event => {
    if (event.code === 'Space' && !event.repeat && !dialog.open && !$('#home-view')?.hidden && !['BUTTON','A','INPUT','TEXTAREA','SELECT','SUMMARY'].includes(document.activeElement.tagName) && !document.activeElement.isContentEditable) {
      event.preventDefault(); openEdit('midnight', $('[data-play]'));
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (playing) { pausedAt = performance.now(); cancelAnimationFrame(raf); }
      if (audioContext) audioContext.suspend().catch(() => {});
    } else {
      if (playing && pausedAt) { editStarted += performance.now() - pausedAt; pausedAt = 0; raf = requestAnimationFrame(animateEdit); }
      if (audioContext && soundOn) {
        audioContext.resume().then(() => { nextNote = audioContext.currentTime + .05; }).catch(() => {});
      }
    }
  });
  updateSoundUI();
})();
