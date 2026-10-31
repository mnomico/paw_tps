/**
 * Carga de libros nuevos: validación en línea del formulario, con la regla del ISBN que HTML no
 * sabe controlar.
 */
import { Validador } from '../componentes/validador.js';
import { ZonaArrastre } from '../componentes/zona-arrastre.js';

/**
 * El dígito verificador del ISBN-13, la misma cuenta que LibroNuevo::isbnValido() en el servidor:
 * los doce primeros números se multiplican, alternando, por 1 y por 3, y el decimotercero es lo
 * que le falta a esa suma para llegar a un múltiplo de 10. El formato (13 números, 978 o 979) ya
 * lo controla el pattern del campo.
 */
function isbnValido(valor) {
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length !== 13) return true; // de eso avisa el pattern, con su propio mensaje
  const suma = [...digitos.slice(0, 12)].reduce((total, d, i) => total + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (suma % 10)) % 10 === Number(digitos[12]);
}

new Validador(document.querySelector('form[data-validar]')).regla('isbn', isbnValido);

const contenedorTapa = document.querySelector('[data-zona-arrastre]');
if (contenedorTapa) {
  new ZonaArrastre(contenedorTapa);
}

