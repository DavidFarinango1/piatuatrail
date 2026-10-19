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
const fmtDate = (ts) => ts && ts.toDate ? ts.toDate().toLocaleString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const LABEL = { pendiente: 'pendiente', aprobada: 'aprobado', rechazada: 'negado' };
const SEXO = { Mujer: 'Damas', Hombre: 'Varones' };
const catOnly = (c) => String(c || '').split(' · ')[0];

// Celular ecuatoriano → formato internacional para wa.me (0991234567 → 593991234567)
function waNumber(cel) {
  let d = String(cel || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('593')) return d;
  if (d.length === 10 && d.startsWith('0')) return '593' + d.slice(1);
  if (d.length === 9 && d.startsWith('9')) return '593' + d;
  return d;
}
const waLink = (r) => `https://wa.me/${waNumber(r.celular)}?text=${encodeURIComponent(r.estado === 'aprobada' ? MSG.aprobadaWhatsapp(r) : MSG.rechazadaWhatsapp(r))}`;
const gmailLink = (r) => {
  const ok = r.estado === 'aprobada';
  return `https://mail.google.com/mail/?view=cm&fs=1&authuser=${encodeURIComponent(user.email)}&to=${encodeURIComponent(r.correo)}` +
    `&su=${encodeURIComponent(ok ? MSG.aprobadaAsunto(r) : MSG.rechazadaAsunto(r))}&body=${encodeURIComponent(ok ? MSG.aprobadaCorreo(r) : MSG.rechazadaCorreo(r))}`;
};

function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 3200);
}

const ICON = {
  wa: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.2-.7-2.7-1.1-4.4-3.8-4.5-4-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.4.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4zm-3 6h12l-1 12H7zm4 2v8h1.5v-8zm2.5 0v8H14v-8z"/></svg>'
};

/* ---------- Estado ---------- */
let user, rows = [], order = {}, unsubscribe = null, unsubConfig = null, abiertas = true;

/* ---------- Acceso ---------- */
const { authMod, auth, fs, db } = await loadAuth();
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
  if (unsubConfig) { unsubConfig(); unsubConfig = null; }
  if (u && !ADMINS.includes((u.email || '').toLowerCase())) {
    loginMsg(`La cuenta ${u.email} no tiene acceso a este panel.`);
    authMod.signOut(auth);
    return;
  }
  user = u;
  $('loginView').hidden = !!u;
  $('appView').hidden = !u;
  if (!u) return;
  $('loginPass').value = '';
  $('whoEmail').textContent = u.email;
  listen();
});

/* ---------- Datos en tiempo real ---------- */
function listen() {
  const q = fs.query(fs.collection(db, 'inscripciones'), fs.orderBy('creado', 'desc'));
  unsubscribe = fs.onSnapshot(q, (snap) => {
    rows = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
    order = {};
    rows.slice().reverse().forEach((r, i) => { order[r.id] = i + 1; }); // N° según orden de llegada
    render();
  }, (err) => {
    $('rows').innerHTML = '';
    $('empty').hidden = false;
    $('empty').textContent = err.code === 'permission-denied' ? 'Tu cuenta no tiene permiso para ver las inscripciones.' : 'No se pudieron cargar las inscripciones: ' + err.message;
  });
  unsubConfig = fs.onSnapshot(fs.doc(db, 'config', 'inscripciones'), (snap) => {
    abiertas = !snap.exists() || snap.data().abiertas !== false;
    $('status').className = 'status ' + (abiertas ? 'open' : 'closed');
    $('statusText').innerHTML = abiertas
      ? '<b>Inscripciones: ABIERTAS</b> — el formulario público está activo.'
      : '<b>Inscripciones: CERRADAS</b> — el formulario público no acepta nuevas inscripciones.';
    $('toggleOpen').textContent = abiertas ? 'Cerrar inscripciones' : 'Abrir inscripciones';
    $('toggleOpen').className = 'btn ' + (abiertas ? 'btn--red' : 'btn--green');
  });
}

$('toggleOpen').addEventListener('click', async () => {
  const next = !abiertas;
  if (!confirm(next ? '¿Abrir las inscripciones? El formulario público volverá a aceptar inscripciones.'
    : '¿Cerrar las inscripciones? El formulario público dejará de aceptar nuevas inscripciones.')) return;
  try {
    await fs.setDoc(fs.doc(db, 'config', 'inscripciones'), { abiertas: next, actualizado: fs.serverTimestamp(), por: user.email });
    toast(next ? 'Inscripciones abiertas.' : 'Inscripciones cerradas.');
  } catch (err) { toast('No se pudo cambiar: ' + (err.code || err.message)); }
});

function visibleRows() {
  const term = $('search').value.trim().toLowerCase();
  const est = $('fEstado').value, dist = $('fDist').value, cat = $('fCat').value, sexo = $('fSexo').value;
  return rows.filter((r) =>
    (!est || r.estado === est) && (!dist || r.distancia === dist) && (!cat || catOnly(r.categoria) === cat) && (!sexo || r.sexo === sexo) &&
    (!term || [r.nombre, r.cedula, r.correo, r.codigo].some((v) => String(v || '').toLowerCase().includes(term))));
}

function render() {
  const list = visibleRows();
  $('count').textContent = `${list.length} inscrito(s)`;
  $('empty').hidden = list.length > 0;
  $('empty').textContent = rows.length ? 'No hay inscripciones con estos filtros.' : 'Todavía no hay inscripciones.';
  $('rows').innerHTML = list.map((r) => {
    const done = r.estado !== 'pendiente';
    return `<tr data-id="${esc(r.id)}">
      <td>${order[r.id]}</td>
      <td><span class="pill ${esc(r.estado)}">${esc(LABEL[r.estado] || r.estado)}</span></td>
      <td>${esc(r.nombre)}</td>
      <td class="nowrap">${esc(r.cedula)}</td>
      <td>${esc(r.nacimiento)}</td>
      <td>${esc(r.distancia)}</td>
      <td>${esc(catOnly(r.categoria))}</td>
      <td>${esc(SEXO[r.sexo] || r.sexo)}</td>
      <td class="nowrap">${esc(r.celular)}</td>
      <td class="mail">${esc(r.correo)}</td>
      <td class="club">${esc(r.club)}</td>
      <td>${esc(r.talla)}</td>
      <td><button class="btn sm btn--orange" data-act="foto">Ver foto</button></td>
      <td>
        <div class="acts">
          <button class="btn sm approve" data-act="aprobar" ${r.estado === 'aprobada' ? 'disabled' : ''}>Aprobar</button>
          <button class="btn sm deny" data-act="negar" ${r.estado === 'rechazada' ? 'disabled' : ''}>Negar</button>
          <div class="icons">
            <button class="icon wa ${r.notificadoWhatsapp ? 'sent' : ''}" data-act="wa" ${done ? '' : 'disabled'} title="${done ? 'Enviar mensaje por WhatsApp' : 'Disponible al aprobar o negar'}">${ICON.wa}</button>
            <button class="icon mail ${r.notificadoCorreo ? 'sent' : ''}" data-act="mail" ${done ? '' : 'disabled'} title="${done ? 'Enviar correo' : 'Disponible al aprobar o negar'}">${ICON.mail}</button>
            <button class="icon" data-act="eliminar" title="Eliminar">${ICON.trash}</button>
          </div>
        </div>
      </td>
    </tr>`;
  }).join('');
}

['search', 'fEstado', 'fDist', 'fCat', 'fSexo'].forEach((id) => $(id).addEventListener(id === 'search' ? 'input' : 'change', render));

/* ---------- Ventanas ---------- */
const openModal = (id) => { $(id).hidden = false; document.body.style.overflow = 'hidden'; };
const closeModals = () => { document.querySelectorAll('.modal').forEach((m) => { m.hidden = true; }); document.body.style.overflow = ''; };
document.querySelectorAll('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) closeModals(); }));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModals(); });

async function showPhoto(r) {
  $('photoTitle').textContent = `Comprobante · ${r.nombre}`;
  $('photoInfo').textContent = `${r.codigo} · ${r.distancia} ($${PRICES[r.distancia] || '—'}) · enviado ${fmtDate(r.creado)}`;
  $('photoBox').innerHTML = '<p class="muted">Cargando…</p>';
  openModal('photoModal');
  try {
    const snap = await fs.getDoc(fs.doc(db, 'comprobantes', r.id));
    const src = snap.exists() ? snap.data().imagen : '';
    if (!src || !src.startsWith('data:image/')) { $('photoBox').innerHTML = '<p class="muted">No hay imagen del comprobante.</p>'; return; }
    $('photoBox').innerHTML = '<img alt="Comprobante de pago" /><p class="muted">Clic en la imagen para verla en tamaño completo.</p>';
    const img = $('photoBox').querySelector('img');
    img.src = src;
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => {
      const w = window.open();
      if (w) w.document.write(`<title>Comprobante ${esc(r.codigo)}</title><body style="margin:0;background:#111"><img src="${src}" style="max-width:100%;display:block;margin:auto">`);
    });
  } catch (err) {
    $('photoBox').innerHTML = `<p class="muted">No se pudo cargar el comprobante (${esc(err.code || err.message)}).</p>`;
  }
}

function showNotify(r) {
  const ok = r.estado === 'aprobada';
  $('notifyTitle').textContent = ok ? 'Inscripción aprobada' : 'Inscripción negada';
  $('notifyWho').innerHTML = `Envía ${ok ? 'la confirmación' : 'el aviso'} a <b>${esc(r.nombre)}</b> · WhatsApp ${esc(waNumber(r.celular))} · ${esc(r.correo)}`;
  $('notifyWa').href = waLink(r);
  $('notifyMail').href = gmailLink(r);
  $('notifyWa').dataset.id = r.id;
  $('notifyMail').dataset.id = r.id;
  openModal('notifyModal');
}

function markSent(id, field) {
  fs.updateDoc(fs.doc(db, 'inscripciones', id), { [field]: fs.serverTimestamp() }).catch(() => {});
}
$('notifyWa').addEventListener('click', () => markSent($('notifyWa').dataset.id, 'notificadoWhatsapp'));
$('notifyMail').addEventListener('click', () => markSent($('notifyMail').dataset.id, 'notificadoCorreo'));

// Mantiene al día la consulta pública /verificar (solo si ese registro pertenece a esta inscripción)
async function syncVerification(batch, r, estado) {
  const vref = fs.doc(db, 'verificacion', r.cedulaKey || cedulaKey(r.cedula));
  const v = await fs.getDoc(vref);
  if (v.exists() && v.data().ref !== r.id) return;
  if (estado === null) { if (v.exists()) batch.delete(vref); return; }
  batch.set(vref, { ref: r.id, codigo: r.codigo, nombre: shortName(r.nombre), distancia: r.distancia, estado, actualizado: fs.serverTimestamp() });
}

async function setEstado(r, estado, extra = {}) {
  const batch = fs.writeBatch(db);
  batch.update(fs.doc(db, 'inscripciones', r.id), { estado, revisadoPor: user.email, revisadoEn: fs.serverTimestamp(),
    notificadoWhatsapp: fs.deleteField(), notificadoCorreo: fs.deleteField(), ...extra });
  await syncVerification(batch, r, estado);
  await batch.commit();
}

/* ---------- Acciones de la tabla ---------- */
let denyTarget = null;

$('rows').addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  const tr = e.target.closest('tr[data-id]');
  if (!el || !tr || el.disabled) return;
  const r = rows.find((x) => x.id === tr.dataset.id);
  if (!r) return;
  const act = el.dataset.act;

  if (act === 'foto') return showPhoto(r);
  if (act === 'wa') { markSent(r.id, 'notificadoWhatsapp'); window.open(waLink(r), '_blank', 'noopener'); return; }
  if (act === 'mail') { markSent(r.id, 'notificadoCorreo'); window.open(gmailLink(r), '_blank', 'noopener'); return; }
  if (act === 'negar') {
    denyTarget = r;
    $('denyWho').innerHTML = `<b>${esc(r.nombre)}</b> · ${esc(r.cedula)} · ${esc(r.distancia)}`;
    $('motivo').value = '';
    openModal('denyModal');
    $('motivo').focus();
    return;
  }

  el.disabled = true;
  try {
    if (act === 'aprobar') {
      await setEstado(r, 'aprobada', { motivo: fs.deleteField() });
      showNotify({ ...r, estado: 'aprobada' });
    } else if (act === 'eliminar') {
      if (!confirm(`¿Eliminar definitivamente la inscripción de ${r.nombre} (${r.cedula})? No se puede deshacer.`)) { el.disabled = false; return; }
      const batch = fs.writeBatch(db);
      batch.delete(fs.doc(db, 'inscripciones', r.id));
      batch.delete(fs.doc(db, 'comprobantes', r.id));
      await syncVerification(batch, r, null);
      await batch.commit();
      toast('Inscripción eliminada.');
    }
  } catch (err) {
    toast('No se pudo guardar el cambio: ' + (err.code || err.message));
    el.disabled = false;
  }
});

$('denyConfirm').addEventListener('click', async () => {
  const r = denyTarget;
  const motivo = $('motivo').value.trim();
  if (!r) return;
  if (!motivo) { $('motivo').focus(); return; }
  $('denyConfirm').disabled = true;
  try {
    await setEstado(r, 'rechazada', { motivo: motivo.slice(0, 300) });
    closeModals();
    showNotify({ ...r, estado: 'rechazada', motivo });
  } catch (err) {
    toast('No se pudo guardar el cambio: ' + (err.code || err.message));
  } finally {
    $('denyConfirm').disabled = false;
  }
});

/* ---------- Reporte ---------- */
$('exportCsv').addEventListener('click', () => {
  const cols = [['N°', (r) => order[r.id]], ['Estado', (r) => LABEL[r.estado]], ['Código', (r) => r.codigo], ['Nombres', (r) => r.nombre],
    ['Cédula', (r) => r.cedula], ['F. Nac.', (r) => r.nacimiento], ['Distancia', (r) => r.distancia], ['Categoría', (r) => catOnly(r.categoria)],
    ['Sexo', (r) => SEXO[r.sexo] || r.sexo], ['Teléfono', (r) => r.celular], ['Email', (r) => r.correo], ['Club/Provincia', (r) => r.club],
    ['Talla', (r) => r.talla], ['Tipo de sangre', (r) => r.sangre], ['Contacto de emergencia', (r) => r.emergencia],
    ['Motivo negado', (r) => r.motivo], ['Fecha de envío', (r) => fmtDate(r.creado)]];
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const list = visibleRows().slice().reverse();
  const lines = [cols.map((c) => cell(c[0])).join(';')].concat(list.map((r) => cols.map((c) => cell(c[1](r))).join(';')));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `reporte-inscripciones-piatua-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});
