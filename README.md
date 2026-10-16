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

## Publicar y vincular el dominio

**Opción A — Netlify (gratis):** app.netlify.com → *Add new site* → *Deploy manually* → arrastrar esta carpeta. Luego *Domain management* → *Add a domain* y en el proveedor del dominio crear:
- `A` `@` → `75.2.60.5`
- `CNAME` `www` → `<tu-sitio>.netlify.app`

**Opción B — Hosting con cPanel (Hostinger, etc.):** subir todo el contenido de la carpeta a `public_html/` con el administrador de archivos o FTP. El dominio queda vinculado si sus DNS apuntan a ese hosting.

En ambos casos activar HTTPS (SSL gratuito incluido).
