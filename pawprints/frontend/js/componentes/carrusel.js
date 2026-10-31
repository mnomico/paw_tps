/**
 * Carrusel de imágenes propio (TP4, consigna 1). Convierte las <img> de un contenedor en
 * diapositivas, con barra de progreso de la descarga, tres transiciones, pantalla completa y
 * navegación por miniaturas, botones, swipe y flechas del teclado.
 *
 * Uso: new Carrusel(contenedor)
 *
 * El enunciado pide que reciba sólo el contenedor, así que las opciones se leen de sus atributos:
 *   data-transicion="fundido|deslizar|zoom"  la transición (por defecto, fundido)
 *   data-intervalo="5000"                    cada cuántos milisegundos pasa solo
 *   data-elegir-transicion                   suma un desplegable para cambiar la transición
 *   aria-label="…"                           el nombre del carrusel para los lectores de pantalla
 *
 * Las imágenes vienen en el HTML y no las agrega el JS: si el script falla o no carga, la página
 * muestra igual la primera foto.
 */

const TRANSICIONES = {
  fundido: 'Fundido',
  deslizar: 'Deslizar',
  zoom: 'Zoom',
};

const INTERVALO = 5000;

// Cuánto hay que arrastrar en horizontal para que cuente como swipe y no como un toque.
const UMBRAL_SWIPE = 50;

export class Carrusel {
  constructor(contenedor) {
    // Un contenedor que no existe no rompe la página: el resto de los scripts sigue andando.
    if (!(contenedor instanceof HTMLElement)) {
      console.warn('Carrusel: no se encontró el contenedor; no se arma nada.');
      return;
    }
    this.imagenes = [...contenedor.querySelectorAll('img')];
    if (this.imagenes.length === 0) {
      console.warn('Carrusel: el contenedor no tiene imágenes; no se arma nada.', contenedor);
      return;
    }

    this.contenedor = contenedor;
    this.actual = 0;
    this.cargado = false;
    this.temporizador = null;
    // Por qué está pausado en este momento: el pase automático corre sólo si no hay ninguno.
    this.pausas = new Set();
    this.movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (this.movimientoReducido.matches) this.pausas.add('movimiento');

    this.armar();
    this.escuchar();
    this.esperarCarga();
  }

  // ---- Estructura --------------------------------------------------------------------------

  armar() {
    const c = this.contenedor;
    const total = this.imagenes.length;
    this.intervalo = Number(c.dataset.intervalo) || INTERVALO;

    c.classList.add('carrusel', 'carrusel--armado');
    c.setAttribute('role', 'region');
    c.setAttribute('aria-roledescription', 'carrusel');
    // El foco en el carrusel es lo que habilita las flechas: así no se las roba al resto de la página.
    c.tabIndex = 0;

    this.pantalla = crear('div', 'carrusel__pantalla');
    this.pista = crear('ul', 'carrusel__pista');
    this.diapositivas = this.imagenes.map((img, i) => {
      const li = crear('li', 'carrusel__diapositiva');
      li.setAttribute('aria-roledescription', 'diapositiva');
      li.setAttribute('aria-label', `${i + 1} de ${total}`);
      img.draggable = false; // si no, arrastrar con el mouse levanta la imagen en lugar de pasarla
      img.loading = 'eager';
      li.append(img);
      this.pista.append(li);
      return li;
    });
    this.diapositivas[0].classList.add('es-actual');

    this.botonAnterior = boton('carrusel__flecha carrusel__flecha--anterior', 'Foto anterior', '‹');
    this.botonSiguiente = boton('carrusel__flecha carrusel__flecha--siguiente', 'Foto siguiente', '›');
    this.botonCompleta = boton('carrusel__accion carrusel__accion--completa', 'Ver a pantalla completa', '⤢');

    // La barra de carga tapa la foto hasta llegar al 100 %, que es cuando arranca la animación.
    this.carga = crear('div', 'carrusel__carga');
    this.barra = crear('progress', 'carrusel__barra');
    this.barra.max = 100;
    this.barra.value = 0;
    this.barra.id = `${idUnico()}-barra`;
    this.porcentaje = crear('label', 'carrusel__porcentaje');
    this.porcentaje.htmlFor = this.barra.id;
    this.porcentaje.textContent = 'Cargando fotos: 0 %';
    this.carga.append(this.porcentaje, this.barra);

    this.pantalla.append(this.pista, this.botonAnterior, this.botonSiguiente, this.botonCompleta, this.carga);

    // Las miniaturas usan las mismas direcciones: el navegador no las vuelve a descargar.
    this.miniaturas = crear('ol', 'carrusel__miniaturas');
    this.botonesMiniatura = this.imagenes.map((img, i) => {
      const li = crear('li');
      const b = boton('carrusel__miniatura', `Ver foto ${i + 1}: ${img.alt}`);
      const mini = crear('img');
      mini.src = img.currentSrc || img.src;
      mini.alt = '';
      mini.draggable = false;
      b.append(mini);
      li.append(b);
      this.miniaturas.append(li);
      return b;
    });

    this.barraInferior = crear('div', 'carrusel__controles');
    this.botonPausa = boton('carrusel__accion carrusel__accion--pausa', 'Pausar el pase automático', '❚❚');
    this.barraInferior.append(this.miniaturas, this.botonPausa);
    if (c.hasAttribute('data-elegir-transicion')) this.barraInferior.append(this.armarSelector());

    // Avisa a los lectores de pantalla la foto nueva cuando la elige el usuario, no en cada pase solo.
    this.estado = crear('p', 'carrusel__estado');
    this.estado.setAttribute('aria-live', 'polite');

    c.replaceChildren(this.pantalla, this.barraInferior, this.estado);
    this.transicion = c.dataset.transicion;
    this.marcarMiniatura();
  }

  armarSelector() {
    const id = `${idUnico()}-transicion`;
    const envoltura = crear('div', 'carrusel__efecto');
    const etiqueta = crear('label');
    etiqueta.htmlFor = id;
    etiqueta.textContent = 'Efecto';
    this.selector = crear('select');
    this.selector.id = id;
    for (const [valor, nombre] of Object.entries(TRANSICIONES)) this.selector.add(new Option(nombre, valor));
    this.selector.addEventListener('change', () => { this.transicion = this.selector.value; });
    envoltura.append(etiqueta, this.selector);
    return envoltura;
  }

  get transicion() {
    return this._transicion;
  }

  // Cada transición es una clase de CSS: el JS sólo marca qué diapositiva entra y cuál sale.
  set transicion(nombre) {
    const elegida = nombre in TRANSICIONES ? nombre : 'fundido';
    if (nombre && nombre !== elegida) console.warn(`Carrusel: no hay una transición «${nombre}»; se usa «fundido».`);
    for (const t of Object.keys(TRANSICIONES)) this.contenedor.classList.toggle(`carrusel--${t}`, t === elegida);
    this.contenedor.dataset.transicion = elegida;
    if (this.selector) this.selector.value = elegida;
    this._transicion = elegida;
  }

  // ---- Barra de progreso -------------------------------------------------------------------

  esperarCarga() {
    let listas = 0;
    const total = this.imagenes.length;
    const avanzar = () => {
      listas++;
      const pct = Math.round((listas / total) * 100);
      this.barra.value = pct;
      this.porcentaje.textContent = `Cargando fotos: ${pct} %`;
      if (listas === total) this.terminarCarga();
    };
    for (const img of this.imagenes) {
      // Las que vienen de la caché pueden estar completas antes de que corra el script, y esas
      // ya no van a disparar «load». Una que falla cuenta igual, para que la barra no se trabe.
      if (img.complete) {
        avanzar();
      } else {
        img.addEventListener('load', avanzar, { once: true });
        img.addEventListener('error', avanzar, { once: true });
      }
    }
  }

  terminarCarga() {
    this.cargado = true;
    this.contenedor.classList.add('carrusel--cargado');
    this.programar();
  }

  // ---- Navegación --------------------------------------------------------------------------

  siguiente(avisar = false) {
    this.ir(this.actual + 1, 1, avisar);
  }

  anterior(avisar = false) {
    this.ir(this.actual - 1, -1, avisar);
  }

  /**
   * Muestra la diapositiva n (después de la última vuelve a la primera). El sentido dice de qué
   * lado entra en «deslizar»: si no se pasa, sale de comparar la nueva con la actual.
   */
  ir(n, sentido = Math.sign(n - this.actual), avisar = false) {
    const total = this.diapositivas.length;
    const destino = ((n % total) + total) % total;
    if (destino === this.actual) return;

    const sale = this.diapositivas[this.actual];
    const entra = this.diapositivas[destino];

    // La que entra se ubica primero de su lado sin animar, y recién después se la anima al centro.
    entra.classList.add('sin-transicion');
    entra.classList.remove('sale-hacia-atras', 'sale-hacia-adelante');
    entra.classList.toggle('desde-atras', sentido < 0);
    void entra.offsetWidth; // fuerza al navegador a aplicar esa posición antes de seguir
    entra.classList.remove('sin-transicion', 'desde-atras');

    sale.classList.remove('es-actual');
    sale.classList.add(sentido < 0 ? 'sale-hacia-adelante' : 'sale-hacia-atras');
    entra.classList.add('es-actual');

    this.actual = destino;
    this.marcarMiniatura();
    if (avisar) this.estado.textContent = `Foto ${destino + 1} de ${total}: ${this.imagenes[destino].alt}`;
    // Después de un cambio a mano, el pase automático vuelve a esperar el intervalo completo.
    this.programar();
  }

  marcarMiniatura() {
    this.botonesMiniatura.forEach((b, i) => {
      if (i === this.actual) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }

  // ---- Pase automático ---------------------------------------------------------------------

  programar() {
    clearTimeout(this.temporizador);
    this.temporizador = null;
    if (!this.cargado || this.pausas.size > 0) return;
    this.temporizador = setTimeout(() => this.siguiente(), this.intervalo);
  }

  pausar(motivo) {
    this.pausas.add(motivo);
    this.programar();
  }

  reanudar(motivo) {
    this.pausas.delete(motivo);
    this.programar();
  }

  alternarPausa() {
    const pausado = !this.pausas.has('usuario');
    if (pausado) this.pausar('usuario');
    else this.reanudar('usuario');
    this.botonPausa.setAttribute('aria-label', pausado ? 'Reanudar el pase automático' : 'Pausar el pase automático');
    this.botonPausa.textContent = pausado ? '▶' : '❚❚';
  }

  // ---- Pantalla completa -------------------------------------------------------------------

  get enPantallaCompleta() {
    return document.fullscreenElement === this.contenedor || this.contenedor.classList.contains('carrusel--completa');
  }

  alternarPantallaCompleta() {
    if (this.enPantallaCompleta) this.salirDePantallaCompleta();
    else this.entrarEnPantallaCompleta();
  }

  entrarEnPantallaCompleta() {
    // El iPhone no deja poner un elemento a pantalla completa: ahí se ocupa el viewport con CSS.
    if (this.contenedor.requestFullscreen) {
      this.contenedor.requestFullscreen().catch(() => this.alCambiarPantallaCompleta(true));
    } else {
      this.alCambiarPantallaCompleta(true);
    }
  }

  salirDePantallaCompleta() {
    if (document.fullscreenElement === this.contenedor) document.exitFullscreen();
    else this.alCambiarPantallaCompleta(false);
  }

  alCambiarPantallaCompleta(conClase) {
    if (conClase !== undefined) {
      this.contenedor.classList.toggle('carrusel--completa', conClase);
      document.documentElement.classList.toggle('carrusel-abierto', conClase);
    }
    const dentro = this.enPantallaCompleta;
    this.botonCompleta.setAttribute('aria-label', dentro ? 'Salir de la pantalla completa' : 'Ver a pantalla completa');
    this.botonCompleta.textContent = dentro ? '✕' : '⤢';
  }

  // ---- Eventos -----------------------------------------------------------------------------

  escuchar() {
    const c = this.contenedor;
    this.botonAnterior.addEventListener('click', () => this.anterior(true));
    this.botonSiguiente.addEventListener('click', () => this.siguiente(true));
    this.botonesMiniatura.forEach((b, i) => b.addEventListener('click', () => this.ir(i, undefined, true)));
    this.botonPausa.addEventListener('click', () => this.alternarPausa());
    this.botonCompleta.addEventListener('click', () => this.alternarPantallaCompleta());
    document.addEventListener('fullscreenchange', () => this.alCambiarPantallaCompleta());

    c.addEventListener('keydown', (e) => {
      // Dentro del desplegable de efectos, las flechas cambian la opción y no la foto.
      if (e.target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowRight') this.siguiente(true);
      else if (e.key === 'ArrowLeft') this.anterior(true);
      else if (e.key === 'Escape' && c.classList.contains('carrusel--completa')) this.salirDePantallaCompleta();
      else return;
      e.preventDefault();
    });

    // Mientras alguien la está mirando o usando, la foto no cambia sola.
    c.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') this.pausar('puntero'); });
    c.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') this.reanudar('puntero'); });
    c.addEventListener('focusin', () => this.pausar('foco'));
    c.addEventListener('focusout', (e) => { if (!c.contains(e.relatedTarget)) this.reanudar('foco'); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pausar('oculta');
      else this.reanudar('oculta');
    });
    this.movimientoReducido.addEventListener('change', (e) => {
      if (e.matches) this.pausar('movimiento');
      else this.reanudar('movimiento');
    });

    this.escucharSwipe();
  }

  escucharSwipe() {
    let inicio = null;
    this.pantalla.addEventListener('pointerdown', (e) => {
      if (!e.isPrimary || e.button !== 0 || e.target.closest('button')) return;
      inicio = { x: e.clientX, y: e.clientY };
    });
    this.pantalla.addEventListener('pointerup', (e) => {
      if (!inicio) return;
      const dx = e.clientX - inicio.x;
      const dy = e.clientY - inicio.y;
      inicio = null;
      // Sólo cuenta si es más horizontal que vertical: un scroll de la página no cambia la foto.
      if (Math.abs(dx) < UMBRAL_SWIPE || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) this.siguiente(true);
      else this.anterior(true);
    });
    this.pantalla.addEventListener('pointercancel', () => { inicio = null; });
  }
}

// ---- Ayudas para armar el DOM --------------------------------------------------------------

function crear(etiqueta, clase) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  return el;
}

function boton(clase, etiqueta, texto = '') {
  const b = crear('button', clase);
  b.type = 'button';
  b.setAttribute('aria-label', etiqueta);
  b.textContent = texto;
  return b;
}

let contador = 0;
function idUnico() {
  contador++;
  return `carrusel-${contador}`;
}
