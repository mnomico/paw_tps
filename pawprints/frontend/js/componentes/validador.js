/**
 * Validación en línea de un formulario (TP4, consigna 2), con mensajes propios que se ven igual en
 * todos los navegadores en lugar de los globos nativos, que cambian de uno a otro.
 *
 * Uso: new Validador(formulario)
 *
 * Las reglas salen de los atributos de HTML de cada control (required, maxlength, min, max, step,
 * pattern, type), que el navegador evalúa con la Constraint Validation API. Los mensajes, de sus
 * atributos data-error-*:
 *   data-error-requerido   el campo está vacío
 *   data-error-formato     no respeta pattern, type o step, o no es un número
 *   data-error-rango       está fuera de min o max
 *   data-error-largo       supera maxlength
 * Lo que HTML no sabe validar va en una regla propia: data-regla="isbn" en el control, la función
 * registrada con validador.regla('isbn', fn) y el mensaje en data-error-isbn.
 *
 * Cada campo se valida al salir de él, y después en cada cambio, para que el mensaje desaparezca
 * en cuanto se corrige. Al enviar se validan todos: si hay errores, el envío se cancela, arriba se
 * listan los errores y el foco va al primer campo que falla.
 */

const MENSAJES = {
  requerido: 'Completá este campo.',
  formato: 'Revisá el formato de este dato.',
  rango: 'Este valor está fuera del rango permitido.',
  largo: 'Este texto es demasiado largo.',
  regla: 'Revisá este dato.',
};

export class Validador {
  constructor(formulario) {
    // Antes de revisar el formulario, para que regla() no falle aunque no haya nada que validar.
    this.reglas = new Map();
    if (!(formulario instanceof HTMLFormElement)) {
      console.warn('Validador: no se encontró el formulario; queda la validación del navegador.');
      return;
    }

    this.formulario = formulario;
    // Los campos por los que el usuario ya pasó: antes de eso no se los marca, para no llenar de
    // errores un formulario que recién empieza a completar.
    this.tocados = new Set();
    this.campos = [...formulario.elements].filter((c) => c.matches('input:not([type=hidden]), select, textarea') && c.name);
    this.resumen = formulario.parentElement.querySelector('[data-resumen-errores]');

    // Desde acá valida este componente: el navegador deja de mostrar sus globos.
    formulario.noValidate = true;

    // Los que el servidor devolvió con error ya cuentan como tocados: se revalidan al corregirlos.
    for (const campo of this.campos) {
      if (campo.getAttribute('aria-invalid') === 'true') this.tocados.add(campo);
    }

    this.escuchar();
  }

  /** Registra una regla propia: fn(valor, campo) devuelve true si el valor es válido. */
  regla(nombre, fn) {
    this.reglas.set(nombre, fn);
    return this;
  }

  /** El mensaje del primer error del campo, o '' si está bien. */
  error(campo) {
    const v = campo.validity;
    const d = campo.dataset;
    const valor = campo.value.trim();

    // Sólo espacios no cuenta como completo: el servidor recorta y lo daría por vacío.
    if (v.valueMissing || (campo.required && valor === '')) return d.errorRequerido ?? MENSAJES.requerido;
    if (v.badInput || v.typeMismatch || v.patternMismatch || v.stepMismatch) return d.errorFormato ?? MENSAJES.formato;
    if (v.rangeUnderflow || v.rangeOverflow) return d.errorRango ?? MENSAJES.rango;
    if (v.tooLong || v.tooShort) return d.errorLargo ?? MENSAJES.largo;

    const regla = d.regla;
    if (regla && valor !== '' && this.reglas.has(regla) && !this.reglas.get(regla)(valor, campo)) {
      return d[`error${regla[0].toUpperCase()}${regla.slice(1)}`] ?? MENSAJES.regla;
    }

    return '';
  }

  /** Valida un campo y muestra o borra su mensaje. Devuelve si es válido. */
  validar(campo) {
    const mensaje = this.error(campo);
    if (mensaje) this.mostrar(campo, mensaje);
    else this.limpiar(campo);
    return mensaje === '';
  }

  validarTodo() {
    // Todos, y no hasta el primero que falla: así se ven todos los errores juntos.
    return this.campos.filter((campo) => !this.validar(campo));
  }

  // ---- Mensajes al lado de cada campo ------------------------------------------------------

  mostrar(campo, mensaje) {
    const p = this.elementoDeError(campo);
    p.textContent = mensaje;
    p.hidden = false;
    campo.setAttribute('aria-invalid', 'true');
    this.describir(campo, p.id, true);
  }

  limpiar(campo) {
    const p = document.getElementById(this.idDeError(campo));
    if (p) {
      p.textContent = '';
      p.hidden = true;
    }
    campo.removeAttribute('aria-invalid');
    this.describir(campo, this.idDeError(campo), false);
  }

  idDeError(campo) {
    return `error-${campo.name}`;
  }

  /** El <p> del mensaje: el que trajo el servidor, o uno nuevo al final del bloque del campo. */
  elementoDeError(campo) {
    let p = document.getElementById(this.idDeError(campo));
    if (!p) {
      p = document.createElement('p');
      p.id = this.idDeError(campo);
      p.className = 'error-campo';
      (campo.closest('.campo') ?? campo.parentElement).append(p);
    }
    return p;
  }

  /** Suma o saca el mensaje de aria-describedby sin tocar la ayuda que ya tuviera el campo. */
  describir(campo, id, incluir) {
    const ids = new Set((campo.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean));
    if (incluir) ids.add(id);
    else ids.delete(id);
    if (ids.size) campo.setAttribute('aria-describedby', [...ids].join(' '));
    else campo.removeAttribute('aria-describedby');
  }

  // ---- Resumen de errores arriba del formulario --------------------------------------------

  mostrarResumen(invalidos) {
    if (!this.resumen) return;
    if (invalidos.length === 0) {
      this.resumen.hidden = true;
      this.resumen.replaceChildren();
      return;
    }
    const intro = document.createElement('p');
    intro.textContent = 'Revisá estos datos antes de enviar:';
    const lista = document.createElement('ul');
    for (const campo of invalidos) {
      const a = document.createElement('a');
      a.href = `#${campo.id}`;
      a.textContent = this.error(campo);
      const li = document.createElement('li');
      li.append(a);
      lista.append(li);
    }
    this.resumen.replaceChildren(intro, lista);
    this.resumen.hidden = false;
  }

  // ---- Eventos -----------------------------------------------------------------------------

  escuchar() {
    const f = this.formulario;
    const esCampo = (el) => this.campos.includes(el);

    // Al apretar «Enviar» el campo pierde el foco antes de que llegue el clic. Si en ese momento
    // apareciera su mensaje, el botón se correría hacia abajo y el clic caería en otro lado: el
    // formulario no se enviaría ni mostraría sus errores. Mientras se aprieta el botón, el campo
    // no se valida al salir; lo valida el envío, junto con todos los demás. pointerdown llega
    // antes que el cambio de foco, y sirve también en Safari, donde el botón no recibe el foco.
    let apretandoEnviar = false;
    f.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button[type=submit], input[type=submit]')) apretandoEnviar = true;
    });
    const soltar = () => setTimeout(() => { apretandoEnviar = false; });
    document.addEventListener('pointerup', soltar);
    document.addEventListener('pointercancel', soltar);

    // focusout y no blur, porque blur no sube hasta el formulario.
    f.addEventListener('focusout', (e) => {
      if (!esCampo(e.target)) return;
      this.tocados.add(e.target);
      if (apretandoEnviar || e.relatedTarget?.matches?.('button[type=submit], input[type=submit]')) return;
      this.validar(e.target);
    });

    // Un desplegable se da por tocado al elegir; el resto, recién al salir del campo.
    const alCambiar = (e) => {
      if (!esCampo(e.target)) return;
      if (e.type === 'change' && e.target instanceof HTMLSelectElement) this.tocados.add(e.target);
      if (this.tocados.has(e.target)) this.validar(e.target);
    };
    f.addEventListener('input', alCambiar);
    f.addEventListener('change', alCambiar);

    f.addEventListener('submit', (e) => {
      this.campos.forEach((c) => this.tocados.add(c));
      const invalidos = this.validarTodo();
      this.mostrarResumen(invalidos);
      if (invalidos.length) {
        e.preventDefault();
        invalidos[0].focus();
      }
    });

    // Un enlace del resumen lleva al campo con el foco puesto, no sólo con el scroll.
    this.resumen?.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      const campo = a && document.getElementById(a.hash.slice(1));
      if (!campo) return;
      e.preventDefault();
      campo.focus();
    });
  }
}
