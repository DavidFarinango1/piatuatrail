// Conexión con Firebase (proyecto piatuatrail-web). La apiKey de una app web es pública por diseño:
// la seguridad la dan las reglas de Firestore (firestore.rules).
const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';

export const firebaseConfig = {
  apiKey: 'AIzaSyDN7fenIJQ5jtyLXkw0O1sBpyaZ8GnkXnQ',
  authDomain: 'piatuatrail-web.firebaseapp.com',
  projectId: 'piatuatrail-web',
  storageBucket: 'piatuatrail-web.firebasestorage.app',
  messagingSenderId: '752081707965',
  appId: '1:752081707965:web:66b500abafc4343e9368d4'
};

// Correos con acceso al panel administrativo (deben coincidir con firestore.rules)
export const ADMINS = ['nestorquinapanta@gmail.com'];

// Cédula/pasaporte normalizado: id del documento de consulta pública (verificacion/{key})
export const cedulaKey = (v) => String(v || '').toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 40);

// Nombre abreviado para la consulta pública: "Juan Pérez López" → "Juan P."
export function shortName(full) {
  const p = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '—';
  const first = p[0].charAt(0).toUpperCase() + p[0].slice(1).toLowerCase();
  return (p[1] ? `${first} ${p[1].charAt(0).toUpperCase()}.` : first).slice(0, 60);
}

let cache;
export async function loadFirebase() {
  if (cache) return cache;
  const [appMod, fs] = await Promise.all([
    import(SDK + 'firebase-app.js'),
    import(SDK + 'firebase-firestore.js')
  ]);
  const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseConfig);
  cache = { app, db: fs.getFirestore(app), fs };
  return cache;
}

export async function loadAuth() {
  const base = await loadFirebase();
  const auth = await import(SDK + 'firebase-auth.js');
  return { ...base, auth: auth.getAuth(base.app), authMod: auth };
}
