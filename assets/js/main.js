(function () {
  'use strict';

  // Módulo de Firebase (se carga solo al enviar la ficha)
  var FIREBASE_URL = new URL('firebase.js', document.currentScript.src).href;
  // Largada 14K: 14 nov 2026, 09h00 hora de Ecuador (UTC-5)
  var RACE_START = new Date('2026-11-14T09:00:00-05:00');

  /* ---------- Nav ---------- */
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('navMenu');

  function onScroll() { nav.classList.toggle('is-solid', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toggle.addEventListener('click', function () {
    var open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  /* ---------- Countdown ---------- */
  var cd = document.getElementById('countdown');
  var cells = {};
  ['d', 'h', 'm', 's'].forEach(function (k) { cells[k] = cd.querySelector('[data-cd="' + k + '"]'); });

  function pad(n) { return String(n).padStart(2, '0'); }
  function tick() {
    var diff = RACE_START - new Date();
    if (diff <= 0) {
      cd.classList.add('is-live');
      cd.textContent = '¡La selva ya está corriendo!';
      clearInterval(timer);
      return;
    }
    var s = Math.floor(diff / 1000);
    cells.d.textContent = Math.floor(s / 86400);
    cells.h.textContent = pad(Math.floor(s % 86400 / 3600));
    cells.m.textContent = pad(Math.floor(s % 3600 / 60));
    cells.s.textContent = pad(s % 60);
  }
  var timer = setInterval(tick, 1000);
  tick();

  /* ---------- Hero video ---------- */
  var heroVideo = document.getElementById('heroVideo');
  var soundBtn = document.getElementById('toggleSound');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) heroVideo.pause();
  // Si no existe el archivo de video, queda el póster (imagen) y se oculta el botón de sonido
  heroVideo.addEventListener('error', hideSound, true);
  heroVideo.addEventListener('loadeddata', function () { soundBtn.hidden = false; });
  soundBtn.hidden = true;
  function hideSound() { soundBtn.hidden = true; }

  soundBtn.addEventListener('click', function () {
    heroVideo.muted = !heroVideo.muted;
    if (!heroVideo.muted) heroVideo.play();
    soundBtn.textContent = heroVideo.muted ? '🔇' : '🔊';
    soundBtn.setAttribute('aria-label', heroVideo.muted ? 'Activar sonido' : 'Silenciar');
  });

  /* ---------- Video modal ---------- */
  var modal = document.getElementById('videoModal');
  var modalVideo = document.getElementById('modalVideo');

  function openModal() {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    heroVideo.pause();
    modalVideo.currentTime = 0;
    var p = modalVideo.play();
    if (p && p.catch) p.catch(function () {});
  }
  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    modalVideo.pause();
    if (!reduceMotion) heroVideo.play();
  }
  document.getElementById('openVideo').addEventListener('click', openModal);
  document.getElementById('closeVideo').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal(); });

  /* ---------- Reveal on scroll ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Registration form ---------- */
  var form = document.getElementById('regForm');
  var distSel = document.getElementById('distancia');
  var catInput = document.getElementById('categoria');
  var errorBox = document.getElementById('formError');

  // Preseleccionar distancia desde los botones de las rutas
  document.querySelectorAll('[data-distance]').forEach(function (a) {
    a.addEventListener('click', function () { distSel.value = a.getAttribute('data-distance'); updateCategory(); });
  });

  // Edad cumplida al día de la carrera
  function ageOnRaceDay(dateStr) {
    if (!dateStr) return null;
    var b = new Date(dateStr + 'T12:00:00');
    var age = RACE_START.getFullYear() - b.getFullYear();
    var m = RACE_START.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && RACE_START.getDate() < b.getDate())) age--;
    return age;
  }

  function category(age, dist) {
    if (age == null || !dist) return '';
    var min = dist.indexOf('14K') === 0 ? 15 : 12;
    if (age < min) return 'No habilitado (mínimo ' + min + ' años)';
    if (age <= 19) return 'Juvenil';
    if (age <= 29) return 'Senior';
    if (age <= 39) return 'Máster A';
    if (age <= 49) return 'Máster B';
    return 'Supermáster';
  }

  function updateCategory() {
    var sexo = form.sexo.value;
    var cat = category(ageOnRaceDay(form.nacimiento.value), distSel.value);
    catInput.value = cat && sexo && cat.indexOf('No habilitado') !== 0 ? cat + ' · ' + sexo : cat;
  }
  ['change', 'input'].forEach(function (ev) {
    form.nacimiento.addEventListener(ev, updateCategory);
    distSel.addEventListener(ev, updateCategory);
    form.sexo.addEventListener(ev, updateCategory);
  });

  /* ---------- Comprobante: vista previa y compresión ---------- */
  var fileInput = document.getElementById('comprobante');
  var preview = document.getElementById('comprobantePreview');
  var MAX_CHARS = 900000; // límite del documento en Firestore (1 MB), con margen

  fileInput.addEventListener('change', function () {
    var f = fileInput.files[0];
    if (!f) { preview.hidden = true; return; }
    preview.querySelector('img').src = URL.createObjectURL(f);
    preview.hidden = false;
  });

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('formato')); };
      img.src = URL.createObjectURL(file);
    });
  }

  // Reduce la foto a JPEG hasta que quepa en un documento de Firestore
  async function compress(file) {
    var img = await loadImage(file);
    var side = 1600, quality = 0.8, data = '';
    for (var i = 0; i < 8; i++) {
      var scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      data = canvas.toDataURL('image/jpeg', quality);
      if (data.length <= MAX_CHARS) return data;
      if (quality > 0.55) quality -= 0.1; else side = Math.round(side * 0.8);
    }
    throw new Error('tamaño');
  }

  /* ---------- Envío a Firebase ---------- */
  var submitBtn = document.getElementById('regSubmit');
  var done = document.getElementById('regDone');
  var FIELDS = ['nombre', 'cedula', 'nacimiento', 'sexo', 'distancia', 'categoria', 'talla', 'celular', 'correo', 'club', 'sangre', 'emergencia'];

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorBox.textContent = '';
    var firstBad = null;
    form.querySelectorAll('[required]').forEach(function (el) {
      var ok = el.type === 'checkbox' ? el.checked
        : el.type === 'file' ? el.files.length > 0
        : el.checkValidity() && el.value.trim() !== '';
      el.classList.toggle('invalid', !ok);
      if (!ok && !firstBad) firstBad = el;
    });
    if (firstBad) {
      errorBox.textContent = firstBad.type === 'checkbox'
        ? 'Debes aceptar el Reglamento Oficial y la Guía del Corredor.'
        : firstBad.type === 'file' ? 'Sube la foto o captura de tu comprobante de pago.'
        : 'Revisa los campos marcados en rojo.';
      firstBad.focus();
      return;
    }
    updateCategory();
    if (catInput.value.indexOf('No habilitado') === 0) {
      errorBox.textContent = 'Por edad no puedes inscribirte en esta distancia: ' + catInput.value + '.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando…';
    try {
      var imagen;
      try { imagen = await compress(fileInput.files[0]); }
      catch (err) {
        throw new Error('No pudimos leer la imagen del comprobante. Sube una captura de pantalla en formato JPG o PNG.');
      }

      var data = {};
      FIELDS.forEach(function (k) { data[k] = String(form[k].value || '').trim().slice(0, 200); });
      data.correo = data.correo.toLowerCase();

      var fb = await import(FIREBASE_URL);
      var c = await fb.loadFirebase();
      var ref = c.fs.doc(c.fs.collection(c.db, 'inscripciones'));
      data.codigo = 'PN-' + ref.id.slice(0, 6).toUpperCase();
      data.estado = 'pendiente';
      data.creado = c.fs.serverTimestamp();

      var batch = c.fs.writeBatch(c.db);
      batch.set(ref, data);
      batch.set(c.fs.doc(c.db, 'comprobantes', ref.id), { imagen: imagen, creado: c.fs.serverTimestamp() });
      await batch.commit();

      done.querySelectorAll('[data-done]').forEach(function (el) { el.textContent = data[el.getAttribute('data-done')]; });
      form.hidden = true;
      done.hidden = false;
      done.classList.add('is-in');
      done.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      errorBox.textContent = err && err.message && err.message.indexOf('comprobante') > -1 ? err.message
        : 'No se pudo enviar la inscripción. Revisa tu conexión e inténtalo de nuevo. Si persiste, escríbenos al WhatsApp +593 99 157 0800.';
      if (window.console) console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar inscripción';
    }
  });

  document.getElementById('regAnother').addEventListener('click', function () {
    form.reset();
    preview.hidden = true;
    catInput.value = '';
    done.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
