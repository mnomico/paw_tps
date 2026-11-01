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
 */

export const CLAVE_HISTORIAL = 'pawprints.busquedas';
export const MAX_BUSQUEDAS = 5;

const formulariosEnganchados = new WeakSet();

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

    this.escuchar();
  }

  escuchar() {
    if (formulariosEnganchados.has(this.formulario)) return;
    formulariosEnganchados.add(this.formulario);

    this.formulario.addEventListener('submit', () => {
      agregarBusqueda(this.input.value);
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

