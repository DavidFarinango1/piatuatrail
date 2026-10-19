# Piatúa Ñampy Trail Running — sitio web

Sitio estático (HTML + CSS + JS, sin dependencias). Se puede subir tal cual a cualquier hosting.

## Estructura

```
index.html            Página principal (hero con video, rutas, kit, categorías, inscripción, ubicación)
guia.html             Guía del Corredor (incluye la sección 9: Inscripción y confirmación). Botón "Descargar / imprimir PDF"
assets/css/styles.css
assets/js/main.js     Cuenta regresiva, video, menú y ficha de inscripción (WhatsApp / correo)
assets/img/           hero, barro, camiseta, premios, video-poster, qr-pichincha, ruta-14k, ruta-7k, favicon
assets/video/         promo.mp4 (vertical 720×1280, comprimido, 6,7 MB)
_originales/          Vídeo original sin comprimir. NO subir al hosting.
```

## Archivos ya incluidos

QR de pago (`assets/img/qr-pichincha.png`) e imágenes de rutas (`ruta-14k.jpg`, `ruta-7k.jpg`), extraídos de `qrPichincha.pdf` y de las páginas 5 y 6 de `Guia del Corredor.pdf`.



Para reemplazar el vídeo, comprimir el nuevo (ffmpeg ya está instalado en este equipo):

```
ffmpeg -i _originales/promo-original.mp4 -vf scale=720:-2 -c:v libx264 -crf 27 -preset slow -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart assets/video/promo.mp4
```

## Datos a editar

- **Precios de inscripción** (14K $25, 7K $20): sección `#inscripcion` de `index.html` y sección 9 de `guia.html`.
- Dominio: `www.piatuatrail.com` (usado en `og:url`, `canonical` y en el mensaje de confirmación).
- WhatsApp y correos: al inicio de `assets/js/main.js` (`WHATSAPP`, `EMAILS`) y en los enlaces del pie de página.

## Publicación

### Principal: Firebase Hosting → www.piatuatrail.com

- Proyecto Firebase: `piatuatrail-web` (cuenta weygo.ceo@gmail.com). URL interna: https://piatuatrail-web.web.app
- Para actualizar la web: `firebase deploy --only hosting` en esta carpeta. `firebase.json` excluye `_originales/`, `README.md` y archivos internos.
- `piatuatrail.com` (sin www) redirige a `www.piatuatrail.com`.

DNS en Namecheap (Domain List → piatuatrail.com → Advanced DNS):

| Tipo | Host | Valor |
|---|---|---|
| A | @ | 199.36.158.100 |
| CNAME | www | piatuatrail-web.web.app. |
| TXT | @ | hosting-site=piatuatrail-web |
| TXT | @ | v=spf1 include:spf.efwd.registrar-servers.com ~all (de Namecheap, no borrar) |

### Respaldo: GitHub Pages

- Repositorio: https://github.com/DavidFarinango1/piatuatrail → https://davidfarinango1.github.io/piatuatrail/ (sin dominio propio).
- Para actualizarlo: `git add -A && git commit -m "cambio" && git push`.
- `_originales/` no se sube (está en `.gitignore`).

## Inscripciones y panel administrativo

- La ficha de `index.html` guarda cada inscripción en Firestore (`inscripciones/{id}`) y la foto del comprobante, comprimida en el navegador, en `comprobantes/{id}`. Código para el corredor: `PN-XXXXXX`.
- Panel: https://www.piatuatrail.com/admin (`admin.html` + `assets/js/admin.js`). Acceso con Google, solo `nestorquinapanta@gmail.com`.
- Para cambiar quién entra al panel: editar la lista en `assets/js/firebase.js` (`ADMINS`) **y** en `firestore.rules` (`isAdmin`), luego `firebase deploy --only firestore:rules,hosting`.
- Al aprobar o rechazar, el panel abre WhatsApp (wa.me) y Gmail con el mensaje listo; los textos están al inicio de `assets/js/admin.js` (`MSG`).
- El dominio usado para el panel debe estar en Firebase → Authentication → Configuración → Dominios autorizados.
