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
