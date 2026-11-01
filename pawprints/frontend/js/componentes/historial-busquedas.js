/**
 * Historial de las últimas 5 búsquedas en Local Storage (TP4, consigna 5).
 *
 * Guarda las consultas realizadas en los buscadores del encabezado (#busqueda) y del catálogo
 * (#buscar-catalogo) bajo la clave «pawprints.busquedas» como un arreglo JSON:
 * - Recorta espacios en blanco con trim() e ignora las búsquedas vacías.
 * - Si una búsqueda se repite (sin distinguir mayúsculas de minúsculas), no se duplica: pasa al
 *   primer lugar como la más reciente.
 * - Conserva como máximo 5 elementos con slice(0, 5), descartando el más antiguo al ingresar un sexto.
 * - Envuelve todo acceso a localStorage y JSON.parse en bloques try/catch para que, si el navegador
 *   bloquea el almacenamiento o el JSON está roto, el buscador siga funcionando con normalidad.
 * - Al enfocar el buscador muestra debajo una lista «Búsquedas recientes» con enlaces a
 *   /catalogo?q=…, navegable con teclado (Tab, flechas ↑/↓ y Esc para cerrar) y con opción para
 *   borrar el historial.
 */

export const CLAVE_HISTORIAL = 'pawprints.busquedas';
export const MAX_BUSQUEDAS = 5;

const formulariosEnganchados = new WeakSet();
let contadorPaneles = 0;

/**
 * Lee el historial de búsquedas desde Local Storage.
 * Devuelve un arreglo vacío si no hay datos, si el JSON es inválido o si el almacenamiento falla.
 *
 * @returns {string[]}
 */
export function leerHistorial() {
  try {
    const crudo = localStorage.getItem(CLAVE_HISTORIAL);
    if (!crudo) return [];

    const lista = JSON.parse(crudo);
    if (!Array.isArray(lista)) return [];

    return lista
      .filter((item) => typeof item === 'string' && item.trim() !== '')
      .map((item) => item.trim())
      .slice(0, MAX_BUSQUEDAS);
  } catch {
    return [];
  }
}

/**
 * Agrega una búsqueda al principio del historial y lo persiste en Local Storage.
 *
 * @param {string} termino Texto buscado.
 * @returns {string[]} El historial actualizado (máximo 5 elementos).
 */
export function agregarBusqueda(termino) {
  if (typeof termino !== 'string') return leerHistorial();

  const limpio = termino.trim();
  if (limpio === '') return leerHistorial();

  const buscadoMinusculas = limpio.toLowerCase();
  const sinRepetida = leerHistorial().filter(
    (guardada) => guardada.toLowerCase() !== buscadoMinusculas
  );

  const actualizado = [limpio, ...sinRepetida].slice(0, MAX_BUSQUEDAS);

  try {
    localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(actualizado));
  } catch {
    // Si Local Storage no está disponible o superó la cuota, el buscador sigue andando igual.
  }

  return actualizado;
}

/**
 * Borra todo el historial de búsquedas almacenado en Local Storage.
 */
export function borrarHistorial() {
  try {
    localStorage.removeItem(CLAVE_HISTORIAL);
  } catch {
    // Se ignora si el navegador bloquea el acceso a Local Storage.
  }
}

export class HistorialBusquedas {
  /**
   * @param {HTMLElement | null} elemento El campo <input type="search"> o el <form> del buscador.
   */
  constructor(elemento) {
    if (!(elemento instanceof HTMLElement)) return;

    if (elemento instanceof HTMLFormElement) {
      this.formulario = elemento;
      this.input = elemento.querySelector('input[name="q"], input[type="search"]');
    } else if (elemento instanceof HTMLInputElement) {
      this.input = elemento;
      this.formulario = elemento.form ?? elemento.closest('form');
    } else {
      this.formulario = elemento.querySelector('form') ?? elemento.closest('form');
      this.input = elemento.querySelector('input[name="q"], input[type="search"]');
    }

    if (!(this.formulario instanceof HTMLFormElement) || !(this.input instanceof HTMLInputElement)) {
      return;
    }

    if (formulariosEnganchados.has(this.formulario)) return;
    formulariosEnganchados.add(this.formulario);

    this.contenedor = this.formulario.closest('search') ?? this.formulario.parentElement ?? this.formulario;
    this.ignorarProximoFoco = false;

    this.armar();
    this.escuchar();
  }

  // ---- Estructura del desplegable ----------------------------------------------------------

  armar() {
    this.contenedor.classList.add('buscador-con-historial');

    // Evita que la lista nativa del navegador tape el desplegable propio.
    this.input.setAttribute('autocomplete', 'off');

    contadorPaneles += 1;
    const idPanel = this.input.id
      ? `historial-${this.input.id}`
      : `historial-busquedas-${contadorPaneles}`;

    this.panel = document.createElement('div');
    this.panel.className = 'historial-busquedas';
    this.panel.id = idPanel;
    this.panel.setAttribute('role', 'region');
    this.panel.setAttribute('aria-label', 'Búsquedas recientes');
    this.panel.hidden = true;

    const cabecera = document.createElement('div');
    cabecera.className = 'historial-busquedas-cabecera';

    const titulo = document.createElement('p');
    titulo.className = 'historial-busquedas-titulo';
    titulo.textContent = 'Búsquedas recientes';

    this.btnBorrar = document.createElement('button');
    this.btnBorrar.type = 'button';
    this.btnBorrar.className = 'historial-busquedas-borrar';
    this.btnBorrar.textContent = 'Borrar historial';

    cabecera.append(titulo, this.btnBorrar);

    this.lista = document.createElement('ul');
    this.lista.className = 'historial-busquedas-lista';

    this.panel.append(cabecera, this.lista);
    this.formulario.after(this.panel);

    this.input.setAttribute('aria-controls', idPanel);
    this.input.setAttribute('aria-expanded', 'false');
  }

  /**
   * Reconstruye los enlaces del desplegable a partir de lo que haya en Local Storage.
   *
   * @returns {boolean} true si hay búsquedas para mostrar; false si está vacío.
   */
  renderizar() {
    const busquedas = leerHistorial();
    this.lista.replaceChildren();

    if (busquedas.length === 0) return false;

    for (const termino of busquedas) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'historial-busquedas-enlace';
      a.href = `/catalogo?${new URLSearchParams({ q: termino }).toString()}`;
      a.textContent = termino;
      a.dataset.termino = termino;
      li.append(a);
      this.lista.append(li);
    }

    return true;
  }

  abrir() {
    if (!this.panel) return;
    if (!this.renderizar()) {
      this.cerrar();
      return;
    }
    this.panel.hidden = false;
    this.input.setAttribute('aria-expanded', 'true');
  }

  cerrar() {
    if (!this.panel) return;
    this.panel.hidden = true;
    this.input.setAttribute('aria-expanded', 'false');
  }

  enfocarInputSinAbrir() {
    this.ignorarProximoFoco = true;
    this.input.focus();
    this.ignorarProximoFoco = false;
  }

  // ---- Eventos y teclado -------------------------------------------------------------------

  escuchar() {
    // 1. Al enviar el formulario se guarda la búsqueda antes de cambiar de página.
    this.formulario.addEventListener('submit', () => {
      agregarBusqueda(this.input.value);
      this.cerrar();
    });

    // 2. Al enfocar o tocar el campo se despliegan las búsquedas recientes.
    this.input.addEventListener('focus', () => {
      if (this.ignorarProximoFoco) return;
      this.abrir();
    });

    this.input.addEventListener('click', () => {
      if (this.panel.hidden) this.abrir();
    });

    // 3. Al elegir una búsqueda reciente se actualiza su orden en Local Storage y el enlace navega.
    this.lista.addEventListener('click', (e) => {
      const enlace = e.target.closest('a.historial-busquedas-enlace');
      if (!enlace) return;
      agregarBusqueda(enlace.dataset.termino ?? enlace.textContent ?? '');
    });

    // 4. Botón para vaciar el historial.
    this.btnBorrar.addEventListener('click', () => {
      borrarHistorial();
      this.cerrar();
      this.enfocarInputSinAbrir();
    });

    // 5. Recorrido con teclado (flechas ↑/↓ y cierre con Esc).
    this.contenedor.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!this.panel.hidden) {
          e.preventDefault();
          this.cerrar();
          this.enfocarInputSinAbrir();
        }
        return;
      }

      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

      if (this.panel.hidden) {
        if (e.key === 'ArrowDown') {
          this.abrir();
          const primero = this.lista.querySelector('a.historial-busquedas-enlace');
          if (primero) {
            e.preventDefault();
            primero.focus();
          }
        }
        return;
      }

      const enlaces = [...this.lista.querySelectorAll('a.historial-busquedas-enlace')];
      if (enlaces.length === 0) return;

      e.preventDefault();
      const actual = enlaces.indexOf(document.activeElement);

      if (e.key === 'ArrowDown') {
        const siguiente = actual < 0 ? 0 : (actual + 1) % enlaces.length;
        enlaces[siguiente].focus();
      } else if (e.key === 'ArrowUp') {
        if (actual <= 0) {
          this.input.focus();
        } else {
          enlaces[actual - 1].focus();
        }
      }
    });

    // 6. Cerrar al salir del buscador o al hacer clic fuera de él.
    let presionandoDentro = false;
    this.contenedor.addEventListener('pointerdown', () => {
      presionandoDentro = true;
    });
    const soltar = () => setTimeout(() => { presionandoDentro = false; });
    document.addEventListener('pointerup', soltar);
    document.addEventListener('pointercancel', soltar);

    this.contenedor.addEventListener('focusout', (e) => {
      if (presionandoDentro) return;
      if (e.relatedTarget && !this.contenedor.contains(e.relatedTarget)) {
        this.cerrar();
        return;
      }
      setTimeout(() => {
        if (!this.contenedor.contains(document.activeElement)) {
          this.cerrar();
        }
      });
    });

    document.addEventListener('pointerdown', (e) => {
      if (!this.contenedor.contains(e.target)) {
        this.cerrar();
      }
    });
  }

  leer() {
    return leerHistorial();
  }

  agregar(termino) {
    return agregarBusqueda(termino);
  }

  borrar() {
    borrarHistorial();
  }
}

// Se engancha a los dos buscadores del sitio (#busqueda en el header y #buscar-catalogo en catálogo).
for (const campo of document.querySelectorAll('#busqueda, #buscar-catalogo')) {
  new HistorialBusquedas(campo);
}
