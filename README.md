# PAWPrints — Trabajos Prácticos de PAW

Programación en Ambiente Web (11086) — Universidad Nacional de Luján.

Sitio web de la librería **PAWPrints**. Los TPs son incrementales sobre un mismo proyecto: no hay
una carpeta por entrega, hay un solo sitio que va creciendo, y cada etiqueta de Git marca el
estado con el que se entregó.

| Entrega | Tema | Etiqueta |
| --- | --- | --- |
| [TP1](#tp1--maquetado-web) | Maquetado con HTML5 | `tp1` |
| [TP2](#tp2--estilos) | Identidad visual y CSS | `tp2` |

## Estructura del repositorio

| Ruta | Contenido |
| --- | --- |
| [`pawprints/`](pawprints/) | El sitio: las cinco páginas, [`css/`](pawprints/css/) e [`img/`](pawprints/img/) |
| [`diseño/`](diseño/) | [SiteMap](diseño/SiteMap/), [wireframes](diseño/Wireframes/) y logo de la identidad corporativa |
| [`autores.txt`](autores.txt) | Nombre, apellido y legajo de cada integrante |
| [`VERSION`](VERSION) | Versión del proyecto, con versionado semántico |

Las cinco pantallas: [inicio](pawprints/index.html) · [catálogo](pawprints/catalogo.html) ·
[detalle de libro](pawprints/detalle-libro.html) · [reserva](pawprints/reserva.html) ·
[sobre nosotros](pawprints/sobre-nosotros.html).

## Cómo levantar el sitio

HTML y CSS estáticos: no requiere compilación, base de datos ni dependencias, y no hay archivos
de configuración que modificar.

```bash
git clone https://github.com/mnomico/paw_tps.git
cd paw_tps/pawprints
python3 -m http.server 8080
```

Abrir <http://localhost:8080/index.html>. Para detener el servidor, `Ctrl+C`.

También se pueden abrir los archivos directamente, sin servidor, con `xdg-open index.html`
(Linux), `open` (macOS) o `start` (Windows).

Para verificar que las cinco páginas responden `200`:

```bash
for f in *.html; do
  printf '%-26s %s\n' "$f" \
    "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:8080/$f")"
done
```

## TP1 — Maquetado web

### 1. SiteMap

> Realizar un SiteMap del Sitio, planteando la jerarquía de las secciones y las páginas.

En [`diseño/SiteMap/SiteMap-PAWPrints.png`](diseño/SiteMap/SiteMap-PAWPrints.png). Tres secciones
cuelgan de la raíz (Inicio, Catálogo, Acerca de nosotros); Promociones depende de Inicio, y Libro
de Catálogo, con Reserva colgando de Libro. El contacto no es una página: es un bloque transversal
del footer.

### 2. Wireframes

> Diseñar wireframes low-fi en Figma para representar las pantallas principales del sitio web.

Los cinco están en [`diseño/Wireframes/`](diseño/Wireframes/), uno por pantalla. Las cinco
comparten encabezado y pie, que se maquetaron una vez y se replicaron idénticos.

### 3. Maquetado del sitio

> Maquetar el sitio web usando solo HTML5, siguiendo las pautas de los wireframes.

Las cinco páginas se maquetaron **sin una línea de CSS ni de JavaScript**: no había `<style>`,
`<link rel="stylesheet">`, atributos `style=`, `<script>` ni manejadores `on*`. Los estilos
llegaron recién en el TP2, y lo único que se agregó entonces al maquetado fueron los `<link>`.

Como no hay servidor hasta el TP3 no existen los `include`, así que encabezado y pie se repiten en
cada archivo. Se mantienen idénticos byte a byte, y lo único que cambia es el `aria-current="page"`
que marca la sección activa.

### 4. Elementos semánticos de HTML5

> Demostrar la correcta utilización de los elementos semánticos de HTML5. Refleje en cada sección los tags HTML que mejor consideren que se adaptan al contenido de la página a mostrar.

| Elemento | Por qué |
| --- | --- |
| `<header>` `<main>` `<footer>` | Landmarks del documento, hijos directos de `<body>` |
| `<nav>` | Los dos menús, cada uno con su `aria-label` porque al haber dos no se distinguirían |
| `<aside>` | El carrito: complementario y repetido, por eso queda fuera de `<main>` |
| `<search>` | Agrupa el buscador. Aporta el rol por sí solo, así que el `<form>` no lleva `role="search"` |
| `<article>` | Fichas de libro, eventos y promociones: se sostienen fuera de contexto |
| `<section>` | Agrupaciones temáticas, siempre con encabezado |
| `<figure>` / `<figcaption>` | Imágenes con su descripción |
| `<address>` | Datos de contacto del sitio, en el pie |
| `<time datetime>` | Fechas de eventos y fundación, en ISO 8601 |
| `<data value>` | Precios: valor numérico sin perder el formato legible |
| `<dl>` `<dt>` `<dd>` | Pilares de la empresa: pares nombre–descripción |
| `<abbr>` `<small>` `<strong>` | Asterisco de campo obligatorio, letra chica legal, destaque real |

`aria-current="page"` marca el ítem activo: es el equivalente semántico del resaltado del
wireframe, y el CSS del TP2 se cuelga de ese atributo. Todas las imágenes llevan `alt`, cada
`<input>` su `<label>`, y los encabezados no saltan niveles.

### 5. Formulario de reserva

> Crear un formulario de reserva de libro para demostrar el uso adecuado de los formularios HTML, utilizando los tags y atributos que considere que mejor se adapten al tipo de dato del campo, para facilitar la validación.

En [`pawprints/reserva.html`](pawprints/reserva.html), con los campos agrupados en tres
`<fieldset>`.

| Campo | Tipo | Validación |
| --- | --- | --- |
| Nombre | `text` | `required`, `maxlength="100"` |
| Correo | `email` | `required`, formato, `maxlength="254"` |
| Teléfono | `tel` | `required`, `pattern`, `maxlength="20"` |
| Libro | `<select>` | `required`, lista cerrada del catálogo |
| Cantidad | `number` | `required`, `min="1"`, `max="5"` |
| Comentarios | `<textarea>` | Opcional, `maxlength="500"` |

Los tipos se eligieron para que **la validación la haga el navegador sin JavaScript**. El libro se
elige con un `<select>` y no con texto libre, para garantizar un identificador conocido y evitar
errores de tipeo; la primera opción es un `<option value="" disabled selected>` que guía sin ser un
valor válido. El `<form>` usa `method="post"` porque transmite datos personales que no deben quedar
en la URL ni en el historial. Como indica el enunciado, **no se implementa el procesamiento de la
reserva**.

### Funcionalidades del sitio

| Funcionalidad pedida | Dónde |
| --- | --- |
| Presentación de la librería y sus servicios | [`index.html`](pawprints/index.html) |
| Tienda en línea y tienda física | [`index.html`](pawprints/index.html): un enlace de acción por canal |
| Lista de libros con nombre, autor, imagen, precio y descripción | [`catalogo.html`](pawprints/catalogo.html) |
| Cada libro como tarjeta con opción de ver más | [`catalogo.html`](pawprints/catalogo.html) |
| Descripción completa, autor y botón de compra o reserva | [`detalle-libro.html`](pawprints/detalle-libro.html) |
| Formulario de reserva | [`reserva.html`](pawprints/reserva.html) |
| Promociones, eventos y novedades destacados | [`index.html`](pawprints/index.html) |
| Historia, misión y servicios a la comunidad | [`sobre-nosotros.html`](pawprints/sobre-nosotros.html) |
| Dirección, teléfono, correo y redes | Pie de las cinco páginas |

### Decisiones tomadas

- **Carrito.** El wireframe muestra un contador en "2". Se resolvió como enlace de fragmento
  `#carrito` a un `<aside>` de la misma página. El contador se eliminó: afirmaba un estado que el
  sitio no puede tener sin cliente ni servidor. El panel queda vacío hasta el TP3.
- **Carrusel.** Las recomendaciones son un carrusel en el wireframe; necesita JavaScript, así que
  se maquetaron como lista. El comportamiento llega en el TP4, que pide implementarlo.
- **Íconos.** Lupa, carrito y redes van como texto: sin CSS un ícono no se interpreta, y el texto
  es lo accesible.
- **Redes sociales.** Las cuentas no existen, así que se listan sin `href`, para no dejar enlaces
  rotos contra dominios reales.
- **Imágenes.** Las de [`pawprints/img/`](pawprints/img/) son marcadores generados para el TP,
  guardadas en el repositorio y referenciadas con rutas relativas para no depender de servicios
  externos.

## TP2 — Estilos

> Tomando de base las maquetaciones presentadas, el ejercicio consiste en agregar el contenido CSS necesario para lograr que el maquetado se vea tal como se diseñaron los Wireframes. En caso de ser necesario, ajustar las características de los mismos para que se adapten al manual de identidad corporativa. Tener en cuenta, asimismo, generar el código necesario para que las pantallas se adapten a las versiones mobile, desktop y de impresión.

Se eligió la **Opción Violeta** del manual de identidad
([`diseño/PAWPrints OpcionVioleta.svg`](diseño/PAWPrints%20OpcionVioleta.svg)): violeta `#5C068C`
sobre blanco, con una escala derivada de ese color para hovers, fondos y bordes.

Del maquetado del TP1 solo se tocaron dos cosas: los `<link>` del `<head>` y una clase en `<body>`
que identifica la página. Todo lo demás se estila con selectores estructurales y semánticos
(`header > p:first-child`, `nav a[aria-current="page"]`, `:nth-of-type`), sin ensuciar el HTML con
clases de presentación.

| Hoja | Alcance |
| --- | --- |
| [`css/base.css`](pawprints/css/base.css) | Reset, tipografías y variables globales en `:root` |
| [`css/componentes.css`](pawprints/css/componentes.css) | Lo compartido: header, nav, buscador, carrito, footer y botones |
| [`css/inicio.css`](pawprints/css/inicio.css) | Hero, libros recomendados, promociones y eventos |
| [`css/sobre-nosotros.css`](pawprints/css/sobre-nosotros.css) | Hero full-bleed, historia, servicios y ubicación |
| [`css/reserva.css`](pawprints/css/reserva.css) | Formulario y tarjeta de resumen del libro |
| [`css/print.css`](pawprints/css/print.css) | Versión de impresión, común a todas las páginas |

**Desktop y mobile.** Tres puntos de corte — 1024 px (el sitio pasa a una columna), 768 px
(tablet y teléfono: el menú se vuelve deslizable y el buscador baja de fila) y 480 px (ajustes
finos de las tarjetas).

**Impresión.** [`print.css`](pawprints/css/print.css) se carga con `media="print"`: pasa la paleta
a blanco y negro, fija `@page` en A4, evita cortar tarjetas entre hojas, oculta buscador, carrito y
mapas, y expande los enlaces con su URL entre paréntesis.

**Pendiente:** [`catalogo.html`](pawprints/catalogo.html) y
[`detalle-libro.html`](pawprints/detalle-libro.html) todavía no tienen su hoja propia.

## Entorno de desarrollo

| Componente | Versión |
| --- | --- |
| Sistema operativo | CachyOS (Arch Linux), kernel 7.2.2 |
| Navegador | Mozilla Firefox 155.0 |
| Servidor de pruebas | Python 3.14.7 (`http.server`) |
| Control de versiones | Git 2.55.0 |
| Wireframes · SiteMap | Figma · Whimsical |

Al ser HTML y CSS estáticos, el sitio funciona en cualquier navegador moderno y con cualquier
servidor de archivos estáticos.
