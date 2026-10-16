(function () {
  'use strict';

  var WHATSAPP = '593991570800';
  var EMAILS = 'kinesportssas@gmail.com,quinesclub@gmail.com';
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

  function buildMessage(d) {
    return [
      'INSCRIPCIÓN · PIATÚA ÑAMPY TRAIL RUNNING 2026',
      '',
      'Nombres y apellidos: ' + d.nombre,
      'Cédula / Pasaporte: ' + d.cedula,
      'Fecha de nacimiento: ' + d.nacimiento,
      'Sexo: ' + d.sexo,
      'Distancia: ' + d.distancia,
      'Categoría: ' + d.categoria,
      'Talla de camiseta: ' + d.talla,
      'Celular: ' + d.celular,
      'Correo: ' + d.correo,
      'Ciudad / Club: ' + (d.club || '-'),
      'Tipo de sangre: ' + (d.sangre || '-'),
      'Contacto de emergencia: ' + d.emergencia,
      '',
      'Adjunto el comprobante de pago. Acepto el reglamento y la Guía del Corredor.'
    ].join('\n');
  }

  var channel = 'wa';
  form.querySelectorAll('button[type="submit"]').forEach(function (b) {
    b.addEventListener('click', function () { channel = b.getAttribute('data-channel'); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.textContent = '';
    var firstBad = null;
    form.querySelectorAll('[required]').forEach(function (el) {
      var ok = el.type === 'checkbox' ? el.checked : el.checkValidity() && el.value.trim() !== '';
      el.classList.toggle('invalid', !ok);
      if (!ok && !firstBad) firstBad = el;
    });
    if (firstBad) {
      errorBox.textContent = firstBad.type === 'checkbox'
        ? 'Debes aceptar el reglamento y la Guía del Corredor.'
        : 'Revisa los campos marcados en rojo.';
      firstBad.focus();
      return;
    }
    updateCategory();
    if (catInput.value.indexOf('No habilitado') === 0) {
      errorBox.textContent = 'Por edad no puedes inscribirte en esta distancia: ' + catInput.value + '.';
      return;
    }

    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });
    data.categoria = catInput.value;
    var msg = buildMessage(data);

    if (channel === 'mail') {
      var subject = 'Inscripción Piatúa Ñampy ' + data.distancia + ' - ' + data.nombre;
      window.location.href = 'mailto:' + EMAILS + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(msg);
    } else {
      window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    }
  });
})();
