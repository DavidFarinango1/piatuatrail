import { loadAuth, ADMINS, cedulaKey, shortName } from './firebase.js';

const PRICES = { '14K Jaguar': 25, '7K Armadillo': 20 };

/* ---------- Mensajes (editables) ---------- */
const MSG = {
  aprobadaWhatsapp: () => `¡Hola, Trail Runner! 🏃‍♂️⛰️ ¡Tu inscripción al Piatúa Ñampy Trail Running está 100% confirmada! Nos vemos este 14 de noviembre de 2026 en el Balneario del Río Piatúa (Santa Clara, Pastaza).

Entrega de kits:

Viernes 13 de noviembre, en el GAD Municipal de Santa Clara de 13h00 a 18h00.

Sábado 14 de noviembre (mismo día del evento), de 06h00 a 08h00 (exclusivo para personas de fuera de la provincia).

Concentración: 07h00

Salida 14K: 09h00

Salida 7K: 09h20

Por favor, revisa todos los detalles, cronograma y recomendaciones en la Guía del Corredor ingresando a www.piatuatrail.com. ¡Prepárate para vivir la magia de la Amazonía! 🌿`,

  aprobadaAsunto: () => '¡Inscripción confirmada! - Piatúa Ñampy Trail Running 2026',
  aprobadaCorreo: () => `¡Hola, Trail Runner!

Nos alegra confirmar tu participación oficial en la primera edición del Piatúa Ñampy Trail Running, que se llevará a cabo el 14 de noviembre de 2026 en el cantón Santa Clara, provincia de Pastaza.

Para que tengas una experiencia increíble y estés al tanto de toda la logística, toma en cuenta la siguiente información importante:

1. Entrega de Kits:

Viernes 13 de noviembre: En el GAD Municipal de Santa Clara, de 13h00 a 18h00.

Sábado 14 de noviembre (Día del evento): De 06h00 a 08h00 (horario preferencial para participantes que viajan desde fuera de la provincia).

2. Cronograma del Evento (Sábado 14 de noviembre):

Concentración: 07h00

Salida 14K: 09h00

Salida 7K: 09h20

Premiación: 12h00

Te invitamos a revisar la Guía del Corredor completa, altimetrías y recomendaciones de seguridad visitando nuestra página oficial: www.piatuatrail.com.

¡Nos vemos en la línea de partida para conquistar la ruta!

Atentamente,

Organización Kinesport Eventos`,

  rechazadaWhatsapp: (r) => `Hola, ${r.nombre}. Revisamos tu inscripción ${r.codigo} al Piatúa Ñampy Trail Running 2026 y no pudimos validarla.

Motivo: ${r.motivo || 'comprobante de pago no válido'}.

Por favor, responde a este mensaje para ayudarte a completar tu inscripción.

Organización Kinesport Eventos`,
  rechazadaAsunto: (r) => `Inscripción ${r.codigo} no validada - Piatúa Ñampy Trail Running 2026`,
  rechazadaCorreo: (r) => `Hola, ${r.nombre}:

Revisamos tu inscripción ${r.codigo} al Piatúa Ñampy Trail Running 2026 y no pudimos validarla.

Motivo: ${r.motivo || 'comprobante de pago no válido'}.

Para completar tu inscripción, responde a este correo o escríbenos al WhatsApp +593 99 157 0800 indicando tu código.

Atentamente,

Organización Kinesport Eventos`
};

/* ---------- Utilidades ---------- */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (ts) => ts && ts.toDate ? ts.toDate().toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

// Celular ecuatoriano → formato internacional para wa.me (0991234567 → 593991234567)
function waNumber(cel) {
  let d = String(cel || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('593')) return d;
  if (d.length === 10 && d.startsWith('0')) return '593' + d.slice(1);
  if (d.length === 9 && d.startsWith('9')) return '593' + d;
  return d;
}
const waLink = (r, text) => `https://wa.me/${waNumber(r.celular)}?text=${encodeURIComponent(text)}`;
const gmailLink = (r, subject, body, from) =>
  `https://mail.google.com/mail/?view=cm&fs=1&authuser=${encodeURIComponent(from)}&to=${encodeURIComponent(r.correo)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 3200);
}

/* ---------- Estado ---------- */
let user, rows = [], filter = 'pendiente', current = null, unsubscribe = null;

/* ---------- Acceso ---------- */
const fb = await loadAuth();
const { authMod, auth, fs, db } = fb;

const loginMsg = (text, ok = false) => { $('loginMsg').textContent = text; $('loginMsg').classList.toggle('ok', ok); };

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  loginMsg('');
  $('loginBtn').disabled = true;
  try {
    await authMod.signInWithEmailAndPassword(auth, $('loginEmail').value.trim().toLowerCase(), $('loginPass').value);
  } catch (err) {
    loginMsg(['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(err.code)
      ? 'Correo o contraseña incorrectos.'
      : err.code === 'auth/too-many-requests' ? 'Demasiados intentos. Espera unos minutos o restablece la contraseña.'
      : 'No se pudo iniciar sesión (' + (err.code || err.message) + ').');
  } finally {
    $('loginBtn').disabled = false;
  }
});

$('forgot').addEventListener('click', async () => {
  const email = $('loginEmail').value.trim().toLowerCase();
  if (!ADMINS.includes(email)) { loginMsg('Escribe primero el correo de administración y vuelve a pulsar aquí.'); $('loginEmail').focus(); return; }
  try {
    await authMod.sendPasswordResetEmail(auth, email);
    loginMsg('Te enviamos un correo a ' + email + ' para crear una nueva contraseña.', true);
  } catch (err) {
    loginMsg('No se pudo enviar el correo (' + (err.code || err.message) + ').');
  }
});
$('logout').addEventListener('click', () => authMod.signOut(auth));

authMod.onAuthStateChanged(auth, (u) => {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  if (u && !ADMINS.includes((u.email || '').toLowerCase())) {
    $('loginMsg').textContent = `La cuenta ${u.email} no tiene acceso a este panel.`;
    authMod.signOut(auth);
    return;
  }
  user = u;
  if (u) $('loginPass').value = '';
  $('loginView').hidden = !!u;
  $('appView').hidden = !u;
  $('who').hidden = !u;
  $('topBar').hidden = !u;
  if (!u) return;
  $('whoEmail').textContent = u.email;
  listen();
});

/* ---------- Datos en tiempo real ---------- */
function listen() {
  const q = fs.query(fs.collection(db, 'inscripciones'), fs.orderBy('creado', 'desc'));
  unsubscribe = fs.onSnapshot(q, (snap) => {
    rows = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
    render();
    if (current) {
      const fresh = rows.find((r) => r.id === current.id);
      const key = (r) => [r.estado, r.motivo, !!r.notificadoWhatsapp, !!r.notificadoCorreo, !!r.revisadoEn].join('|');
      if (fresh) {
        const changed = key(fresh) !== key(current);
        current = fresh;
        if (changed) renderReview(); // no repinta si nada cambió (conserva el motivo que se esté escribiendo)
      }
    }
  }, (err) => {
    $('rows').innerHTML = '';
    $('empty').hidden = false;
    $('empty').textContent = err.code === 'permission-denied'
      ? 'Tu cuenta no tiene permiso para ver las inscripciones.'
      : 'No se pudieron cargar las inscripciones: ' + err.message;
  });
}

function duplicates() {
  const count = {};
  rows.filter((r) => r.estado !== 'rechazada').forEach((r) => {
    const k = String(r.cedula || '').replace(/\W/g, '');
    count[k] = (count[k] || 0) + 1;
  });
  return (r) => count[String(r.cedula || '').replace(/\W/g, '')] > 1 && r.estado !== 'rechazada';
}

function visibleRows() {
  const term = $('search').value.trim().toLowerCase();
  const dist = $('fDist').value;
  return rows.filter((r) =>
    (filter === 'todas' || r.estado === filter) &&
    (!dist || r.distancia === dist) &&
    (!term || [r.nombre, r.cedula, r.codigo, r.celular, r.correo].some((v) => String(v || '').toLowerCase().includes(term))));
}

function render() {
  const by = (e) => rows.filter((r) => r.estado === e).length;
  const ok = rows.filter((r) => r.estado === 'aprobada');
  $('sTotal').textContent = rows.length;
  $('sPend').textContent = by('pendiente');
  $('sOk').textContent = ok.length;
  $('sNo').textContent = by('rechazada');
  const d14 = ok.filter((r) => r.distancia === '14K Jaguar').length;
  $('sDist').textContent = `Aprobadas: 14K ${d14} · 7K ${ok.length - d14}`;
  $('sMoney').textContent = `$${ok.reduce((s, r) => s + (PRICES[r.distancia] || 0), 0)} validados`;

  const isDup = duplicates();
  const list = visibleRows();
  $('empty').hidden = list.length > 0;
  $('empty').textContent = 'No hay inscripciones en esta vista.';
  $('rows').innerHTML = list.map((r) => `
    <tr data-id="${esc(r.id)}">
      <td>${esc(fmtDate(r.creado))}<span class="sub">${esc(r.codigo)}</span></td>
      <td><b>${esc(r.nombre)}</b>${isDup(r) ? '<span class="flag">Cédula repetida</span>' : ''}<span class="sub">${esc(r.cedula)}</span></td>
      <td class="hide-sm">${esc(r.distancia)}<span class="sub">${esc(r.categoria)} · Talla ${esc(r.talla)}</span></td>
      <td class="hide-sm">${esc(r.celular)}<span class="sub">${esc(r.correo)}</span></td>
      <td><span class="pill ${esc(r.estado)}">${esc(label(r.estado))}</span></td>
      <td class="hide-sm sent">${r.estado === 'pendiente' ? '—' :
        `<span class="${r.notificadoWhatsapp ? 'on' : ''}">WhatsApp ${r.notificadoWhatsapp ? '✓' : '·'}</span><br><span class="${r.notificadoCorreo ? 'on' : ''}">Correo ${r.notificadoCorreo ? '✓' : '·'}</span>`}</td>
    </tr>`).join('');
}

const label = (e) => ({ pendiente: 'Pendiente', aprobada: 'Aprobada', rechazada: 'Rechazada' }[e] || e);

$('tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  filter = b.dataset.f;
  $('tabs').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  render();
});
$('search').addEventListener('input', render);
$('fDist').addEventListener('change', render);
$('rows').addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-id]');
  if (tr) openDetail(tr.dataset.id);
});

/* ---------- Detalle ---------- */
async function openDetail(id) {
  current = rows.find((r) => r.id === id);
  if (!current) return;
  $('detail').hidden = false;
  document.body.style.overflow = 'hidden';
  const r = current;
  $('dName').textContent = r.nombre;
  $('dData').innerHTML = [
    ['Código', r.codigo], ['Enviada', fmtDate(r.creado)], ['Cédula / pasaporte', r.cedula], ['Nacimiento', r.nacimiento],
    ['Sexo', r.sexo], ['Distancia', `${r.distancia} ($${PRICES[r.distancia] || '—'})`], ['Categoría', r.categoria],
    ['Talla', r.talla], ['Celular', r.celular], ['Correo', r.correo], ['Ciudad / club', r.club || '—'],
    ['Tipo de sangre', r.sangre || '—'], ['Emergencia', r.emergencia]
  ].map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  renderReview();

  const box = $('dReceipt');
  box.innerHTML = '<p>Cargando comprobante…</p>';
  try {
    const snap = await fs.getDoc(fs.doc(db, 'comprobantes', id));
    if (current?.id !== id) return;
    const src = snap.exists() ? snap.data().imagen : '';
    box.innerHTML = src && src.startsWith('data:image/') ? '<img alt="Comprobante de pago" />' : '<p>No hay imagen del comprobante.</p>';
    const img = box.querySelector('img');
    if (img) {
      img.src = src;
      img.addEventListener('click', () => {
        const w = window.open();
        if (w) w.document.write(`<title>Comprobante ${esc(r.codigo)}</title><body style="margin:0;background:#111"><img src="${src}" style="max-width:100%;display:block;margin:auto">`);
      });
    }
  } catch (e) {
    box.innerHTML = `<p>No se pudo cargar el comprobante (${esc(e.code || e.message)}).</p>`;
  }
}

function closeDetail() {
  $('detail').hidden = true;
  document.body.style.overflow = '';
  current = null;
}
$('dClose').addEventListener('click', closeDetail);
$('detail').addEventListener('click', (e) => { if (e.target === $('detail')) closeDetail(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('detail').hidden) closeDetail(); });

function renderReview() {
  const r = current;
  const st = $('dState');
  st.className = 'pill ' + r.estado;
  st.textContent = label(r.estado);
  const reviewed = r.revisadoPor ? `<p class="hint">${label(r.estado)} por ${esc(r.revisadoPor)} · ${esc(fmtDate(r.revisadoEn))}</p>` : '';

  if (r.estado === 'pendiente') {
    $('dReview').innerHTML = `
      <p>Verifica que el comprobante corresponda al valor de <b>${esc(r.distancia)} ($${PRICES[r.distancia] || '—'})</b>.</p>
      <div class="actions">
        <button class="btn btn--ok" data-act="aprobar">✓ Aprobar inscripción</button>
        <button class="btn btn--no" data-act="mostrar-rechazo">✕ Rechazar</button>
      </div>
      <div id="rejectBox" hidden style="margin-top:12px">
        <label class="hint" for="motivo">Motivo del rechazo (se incluye en el mensaje al participante)</label>
        <textarea id="motivo" placeholder="Ej.: el monto no corresponde a la distancia, comprobante ilegible…"></textarea>
        <div class="actions"><button class="btn btn--no" data-act="rechazar">Confirmar rechazo</button></div>
      </div>
      <div class="actions" style="margin-top:18px"><button class="btn btn--ghost btn--sm" data-act="eliminar">Eliminar (pruebas o envíos duplicados)</button></div>`;
    return;
  }

  const ok = r.estado === 'aprobada';
  const wa = ok ? MSG.aprobadaWhatsapp(r) : MSG.rechazadaWhatsapp(r);
  const mail = gmailLink(r, ok ? MSG.aprobadaAsunto(r) : MSG.rechazadaAsunto(r), ok ? MSG.aprobadaCorreo(r) : MSG.rechazadaCorreo(r), user.email);
  $('dReview').innerHTML = `
    ${reviewed}
    ${!ok && r.motivo ? `<p><b>Motivo:</b> ${esc(r.motivo)}</p>` : ''}
    <div class="notify ${ok ? '' : 'no'}">
      <p><b>${ok ? 'Envía la confirmación al participante:' : 'Avisa al participante del rechazo:'}</b></p>
      <div class="actions">
        <a class="btn btn--wa" href="${esc(waLink(r, wa))}" target="_blank" rel="noopener" data-act="sent-wa">WhatsApp ${r.notificadoWhatsapp ? '✓ enviado' : ''}</a>
        <a class="btn btn--mail" href="${esc(mail)}" target="_blank" rel="noopener" data-act="sent-mail">Correo (Gmail) ${r.notificadoCorreo ? '✓ enviado' : ''}</a>
      </div>
      <p class="hint" style="margin-top:8px">Se abre el chat o el correo con el mensaje listo; solo pulsa <b>Enviar</b>. WhatsApp: ${esc(waNumber(r.celular))} · Correo: ${esc(r.correo)}</p>
    </div>
    <div class="actions" style="margin-top:14px">
      <button class="btn btn--ghost btn--sm" data-act="pendiente">Volver a pendiente</button>
      <button class="btn btn--ghost btn--sm" data-act="eliminar">Eliminar</button>
    </div>`;
}

// Mantiene al día la consulta pública /verificar (solo si ese registro pertenece a esta inscripción)
async function syncVerification(batch, r, estado) {
  const vref = fs.doc(db, 'verificacion', r.cedulaKey || cedulaKey(r.cedula));
  const v = await fs.getDoc(vref);
  const mine = !v.exists() || v.data().ref === r.id;
  if (!mine) return;
  if (estado === null) { if (v.exists()) batch.delete(vref); return; }
  batch.set(vref, { ref: r.id, codigo: r.codigo, nombre: shortName(r.nombre), distancia: r.distancia, estado, actualizado: fs.serverTimestamp() });
}

$('dReview').addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || !current) return;
  const act = el.dataset.act;
  const ref = fs.doc(db, 'inscripciones', current.id);

  if (act === 'mostrar-rechazo') { $('rejectBox').hidden = false; $('motivo').focus(); return; }
  if (act === 'sent-wa' || act === 'sent-mail') {
    // El enlace se abre normalmente; solo registramos el aviso
    fs.updateDoc(ref, { [act === 'sent-wa' ? 'notificadoWhatsapp' : 'notificadoCorreo']: fs.serverTimestamp() }).catch(() => {});
    return;
  }

  el.disabled = true;
  try {
    const batch = fs.writeBatch(db);
    if (act === 'aprobar') {
      batch.update(ref, { estado: 'aprobada', revisadoPor: user.email, revisadoEn: fs.serverTimestamp(), motivo: fs.deleteField() });
      await syncVerification(batch, current, 'aprobada');
      await batch.commit();
      toast('Inscripción aprobada. Envía la confirmación por WhatsApp y correo.');
    } else if (act === 'rechazar') {
      const motivo = $('motivo').value.trim();
      if (!motivo) { $('motivo').focus(); el.disabled = false; return; }
      batch.update(ref, { estado: 'rechazada', motivo: motivo.slice(0, 300), revisadoPor: user.email, revisadoEn: fs.serverTimestamp() });
      await syncVerification(batch, current, 'rechazada');
      await batch.commit();
      toast('Inscripción rechazada. Avisa al participante.');
    } else if (act === 'eliminar') {
      if (!confirm(`¿Eliminar definitivamente la inscripción ${current.codigo} de ${current.nombre}? No se puede deshacer.`)) { el.disabled = false; return; }
      batch.delete(ref);
      batch.delete(fs.doc(db, 'comprobantes', current.id));
      await syncVerification(batch, current, null);
      await batch.commit();
      closeDetail();
      toast('Inscripción eliminada.');
    } else if (act === 'pendiente') {
      batch.update(ref, { estado: 'pendiente', revisadoPor: fs.deleteField(), revisadoEn: fs.deleteField(), motivo: fs.deleteField(),
        notificadoWhatsapp: fs.deleteField(), notificadoCorreo: fs.deleteField() });
      await syncVerification(batch, current, 'pendiente');
      await batch.commit();
      toast('La inscripción volvió a pendiente.');
    }
  } catch (err) {
    toast('No se pudo guardar el cambio: ' + (err.code || err.message));
    el.disabled = false;
  }
});

/* ---------- Exportar ---------- */
$('exportCsv').addEventListener('click', () => {
  const cols = [['codigo', 'Código'], ['estado', 'Estado'], ['nombre', 'Nombres y apellidos'], ['cedula', 'Cédula / pasaporte'],
    ['nacimiento', 'Fecha de nacimiento'], ['sexo', 'Sexo'], ['distancia', 'Distancia'], ['categoria', 'Categoría'], ['talla', 'Talla'],
    ['celular', 'Celular'], ['correo', 'Correo'], ['club', 'Ciudad / club'], ['sangre', 'Tipo de sangre'], ['emergencia', 'Contacto de emergencia'],
    ['motivo', 'Motivo de rechazo'], ['revisadoPor', 'Revisado por']];
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.map((c) => cell(c[1])).concat(cell('Fecha de envío')).join(';')]
    .concat(visibleRows().map((r) => cols.map((c) => cell(r[c[0]])).concat(cell(fmtDate(r.creado))).join(';')));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `inscripciones-piatua-${filter}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});
