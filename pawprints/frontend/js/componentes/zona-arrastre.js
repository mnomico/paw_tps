/**
 * Componente de zona de arrastre para carga de archivos (TP4, consigna 3).
 *
 * Convierte un campo de archivo estándar (<input type="file">) en una zona interactiva
 * accesible que permite arrastrar y soltar o seleccionar mediante clic y teclado.
 *
 * Uso: new ZonaArrastre(contenedor)
 *
 * El componente oculta visualmente el input nativo pero lo conserva en el DOM, sincronizando
 * el archivo seleccionado mediante DataTransfer para que viaje normalmente en el envío
 * del formulario (incluso sin JavaScript, ya que el HTML inicial cuenta con el input tradicional).
 */

export class ZonaArrastre {
  /**
   * @param {HTMLElement} contenedor El elemento que envuelve el <input type="file">.
   */
  constructor(contenedor) {
    if (!(contenedor instanceof HTMLElement)) {
      console.warn('ZonaArrastre: no se encontró el contenedor; no se arma nada.');
      return;
    }

    this.input = contenedor.querySelector('input[type="file"]');
    if (!(this.input instanceof HTMLInputElement)) {
      console.warn('ZonaArrastre: el contenedor no tiene un <input type="file">; no se arma nada.', contenedor);
      return;
    }

    this.contenedor = contenedor;
    this.texto = contenedor.dataset.texto ?? 'Arrastrá la tapa acá o hacé clic para elegirla';

    this.armar();
    this.escuchar();
  }

  // ---- Estructura --------------------------------------------------------------------------

  armar() {
    // Se oculta el input visualmente pero se mantiene accesible para el formulario y lectores.
    this.input.classList.add('zona-arrastre-input-oculto');

    // Se crea la zona de arrastre accesible con tabindex y rol de botón.
    this.zona = document.createElement('div');
    this.zona.className = 'zona-arrastre';
    this.zona.tabIndex = 0;
    this.zona.setAttribute('role', 'button');
    this.zona.setAttribute('aria-label', this.texto);

    this.zona.innerHTML = `
      <div class="zona-arrastre-icono" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </div>
      <p class="zona-arrastre-instruccion">${this.texto}</p>
      <p class="zona-arrastre-estado" aria-live="polite"></p>
      <p class="zona-arrastre-aviso" role="status" aria-live="assertive" hidden></p>
    `;

    this.elEstado = this.zona.querySelector('.zona-arrastre-estado');
    this.elAviso = this.zona.querySelector('.zona-arrastre-aviso');

    // Se inserta después del input o al final del contenedor.
    this.input.after(this.zona);
  }

  // ---- Eventos y Comportamiento ------------------------------------------------------------

  escuchar() {
    // 1. Apertura del selector al hacer clic sobre la zona.
    this.zona.addEventListener('click', () => {
      this.input.click();
    });

    // 2. Accesibilidad por teclado: Enter o Barra Espaciadora abren el selector.
    this.zona.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.input.click();
      }
    });

    // 3. Arrastre y soltado (Drag and Drop).
    let contadorArrastre = 0;

    this.zona.addEventListener('dragenter', (e) => {
      e.preventDefault();
      contadorArrastre++;
      this.zona.classList.add('arrastrando');
    });

    this.zona.addEventListener('dragover', (e) => {
      // preventDefault es indispensable para que el navegador no abra la imagen directamente.
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (!this.zona.classList.contains('arrastrando')) {
        this.zona.classList.add('arrastrando');
      }
    });

    this.zona.addEventListener('dragleave', (e) => {
      e.preventDefault();
      contadorArrastre--;
      if (contadorArrastre <= 0) {
        contadorArrastre = 0;
        this.zona.classList.remove('arrastrando');
      }
    });

    this.zona.addEventListener('drop', (e) => {
      e.preventDefault();
      contadorArrastre = 0;
      this.zona.classList.remove('arrastrando');

      const archivos = e.dataTransfer?.files;
      if (!archivos || archivos.length === 0) return;

      this.procesarArchivos(archivos);
    });

    // 4. Cambio manual desde el selector del sistema operativo.
    this.input.addEventListener('change', () => {
      const archivos = this.input.files;
      if (!archivos || archivos.length === 0) {
        this.limpiarEstado();
        return;
      }
      this.mostrarArchivo(archivos[0]);
      this.limpiarAviso();
    });
  }

  // ---- Procesamiento y Mensajes ------------------------------------------------------------

  /**
   * Procesa los archivos soltados. Si se recibe más de uno, toma el primero y avisa.
   * @param {FileList} archivos
   */
  procesarArchivos(archivos) {
    const primerArchivo = archivos[0];

    // Un solo archivo: si sueltan varios, toma el primero y avisa.
    if (archivos.length > 1) {
      this.avisar(`Se seleccionó sólo el primer archivo («${primerArchivo.name}»). Podés cargar una única tapa.`);
    } else {
      this.limpiarAviso();
    }

    // Se asigna el archivo al input nativo usando DataTransfer.
    try {
      const dt = new DataTransfer();
      dt.items.add(primerArchivo);
      this.input.files = dt.files;
    } catch (error) {
      console.warn('ZonaArrastre: no se pudo asignar DataTransfer al input.', error);
    }

    this.mostrarArchivo(primerArchivo);

    // Dispara el evento change para notificar a validadores y otros escuchadores.
    this.input.dispatchEvent(new Event('change', { bubbles: true }));
    this.input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /**
   * Muestra la información del archivo elegido en la zona.
   * @param {File} archivo
   */
  mostrarArchivo(archivo) {
    const tamanoKb = (archivo.size / 1024).toFixed(0);
    this.elEstado.textContent = `Archivo seleccionado: ${archivo.name} (${tamanoKb} KB)`;
    this.zona.classList.add('con-archivo');
  }

  /**
   * Muestra un aviso relevante (por ejemplo, al soltar múltiples archivos).
   * @param {string} mensaje
   */
  avisar(mensaje) {
    this.elAviso.textContent = mensaje;
    this.elAviso.hidden = false;
  }

  limpiarAviso() {
    this.elAviso.textContent = '';
    this.elAviso.hidden = true;
  }

  limpiarEstado() {
    this.elEstado.textContent = '';
    this.zona.classList.remove('con-archivo');
    this.limpiarAviso();
  }
}
