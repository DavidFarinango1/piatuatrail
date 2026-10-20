import { loadAuth, ADMINS, cedulaKey, shortName } from './firebase.js';

const PRICES = { '14K Jaguar': 25, '7K Armadillo': 20 };

/* ---------- Utilidades ---------- */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (ts) => ts && ts.toDate ? ts.toDate().toLocaleString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const LABEL = { pendiente: 'pendiente', aprobada: 'aprobado', rechazada: 'negado' };
const SEXO = { Mujer: 'Damas', Hombre: 'Varones' };
const catOnly = (c) => String(c || '').split(' · ')[0];

function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 3200);
}

const ICON = {
  trash: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4zm-3 6h12l-1 12H7zm4 2v8h1.5v-8zm2.5 0v8H14v-8z"/></svg>'
};

/* ---------- Estado ---------- */
const openPhotos = new Set(), photoCache = {};
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
      <td><button class="btn sm btn--orange" data-act="foto">${openPhotos.has(r.id) ? 'Ocultar' : 'Ver foto'}</button></td>
      <td>
        <div class="acts">
          <button class="btn sm approve" data-act="aprobar" ${r.estado === 'aprobada' ? 'disabled' : ''}>Aprobar</button>
          <button class="btn sm deny" data-act="negar" ${r.estado === 'rechazada' ? 'disabled' : ''}>Negar</button>
          <button class="icon" data-act="eliminar" title="Eliminar">${ICON.trash}</button>
        </div>
      </td>
    </tr>${openPhotos.has(r.id) ? photoRow(r) : ''}`;
  }).join('');
}

['search', 'fEstado', 'fDist', 'fCat', 'fSexo'].forEach((id) => $(id).addEventListener(id === 'search' ? 'input' : 'change', render));

function photoRow(r) {
  const src = photoCache[r.id];
  const body = src === undefined ? '<p>Cargando comprobante…</p>'
    : src ? `<img src="${src}" alt="Comprobante de pago de ${esc(r.nombre)}" />` : '<p>No hay imagen del comprobante.</p>';
  return `<tr class="photo-row" data-id="${esc(r.id)}"><td colspan="14">
    <div class="photo-head">
      <h3>Comprobante de pago de ${esc(r.nombre)}</h3>
      ${src ? '<button class="btn btn--chip" data-act="tab">Abrir en pestaña</button>' : ''}
      <button class="btn btn--chip" data-act="foto">Cerrar ✕</button>
    </div>
    <div class="photo-frame">${body}</div>
  </td></tr>`;
}

async function togglePhoto(r) {
  if (openPhotos.has(r.id)) { openPhotos.delete(r.id); render(); return; }
  openPhotos.add(r.id);
  render();
  if (photoCache[r.id] !== undefined) return;
  try {
    const snap = await fs.getDoc(fs.doc(db, 'comprobantes', r.id));
    const src = snap.exists() ? snap.data().imagen : '';
    photoCache[r.id] = src && src.startsWith('data:image/') ? src : '';
  } catch (err) {
    photoCache[r.id] = '';
    toast('No se pudo cargar el comprobante: ' + (err.code || err.message));
  }
  render();
}

// Abre la imagen en una pestaña nueva (como archivo, porque los navegadores bloquean abrir data: directamente)
async function openInTab(r) {
  const blob = await (await fetch(photoCache[r.id])).blob();
  window.open(URL.createObjectURL(blob), '_blank');
}

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
    ...extra });
  await syncVerification(batch, r, estado);
  await batch.commit();
}

/* ---------- Acciones de la tabla ---------- */

$('rows').addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  const tr = e.target.closest('tr[data-id]');
  if (!el || !tr || el.disabled) return;
  const r = rows.find((x) => x.id === tr.dataset.id);
  if (!r) return;
  const act = el.dataset.act;

  if (act === 'foto') return togglePhoto(r);
  if (act === 'tab') return openInTab(r);
  el.disabled = true;
  try {
    if (act === 'aprobar') {
      await setEstado(r, 'aprobada');
      toast(`Inscripción de ${r.nombre} aprobada.`);
    } else if (act === 'negar') {
      await setEstado(r, 'rechazada');
      toast(`Inscripción de ${r.nombre} negada.`);
    } else if (act === 'eliminar') {
      if (!confirm(`¿Eliminar definitivamente la inscripción de ${r.nombre} (${r.cedula})? No se puede deshacer.`)) { el.disabled = false; return; }
      const batch = fs.writeBatch(db);
      batch.delete(fs.doc(db, 'inscripciones', r.id));
      batch.delete(fs.doc(db, 'comprobantes', r.id));
      await syncVerification(batch, r, null);
      await batch.commit();
      openPhotos.delete(r.id);
      delete photoCache[r.id];
      toast('Inscripción eliminada.');
    }
  } catch (err) {
    toast('No se pudo guardar el cambio: ' + (err.code || err.message));
    el.disabled = false;
  }
});

/* ---------- Reporte ---------- */
$('exportCsv').addEventListener('click', () => {
  const cols = [['N°', (r) => order[r.id]], ['Estado', (r) => LABEL[r.estado]], ['Código', (r) => r.codigo], ['Nombres', (r) => r.nombre],
    ['Cédula', (r) => r.cedula], ['F. Nac.', (r) => r.nacimiento], ['Distancia', (r) => r.distancia], ['Categoría', (r) => catOnly(r.categoria)],
    ['Sexo', (r) => SEXO[r.sexo] || r.sexo], ['Teléfono', (r) => r.celular], ['Email', (r) => r.correo], ['Club/Provincia', (r) => r.club],
    ['Talla', (r) => r.talla], ['Tipo de sangre', (r) => r.sangre], ['Contacto de emergencia', (r) => r.emergencia],
['Fecha de envío', (r) => fmtDate(r.creado)]];
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
