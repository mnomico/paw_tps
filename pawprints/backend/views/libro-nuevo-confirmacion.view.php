<?php
/**
 * Vista de libro nuevo validado — PAWPrints
 * TP4, consigna 2: la respuesta a un envío del formulario de carga que pasó todas las validaciones
 *
 * @var \PawPrints\Models\LibroNuevo $libro
 */
require __DIR__ . '/layouts/header.php';
?>

  <main>

    <section aria-labelledby="titulo-confirmacion">
      <h1 id="titulo-confirmacion">Los datos del libro están bien</h1>
      <p>
        El libro pasó todas las validaciones. Todavía no se agrega al catálogo:
        eso llega cuando el sitio tenga base de datos.
      </p>

      <dl>
        <dt>Título</dt>
        <dd><?= htmlspecialchars($libro->titulo) ?></dd>
        <dt>Autor</dt>
        <dd><?= htmlspecialchars($libro->autor) ?></dd>
        <dt>Género</dt>
        <dd><?= htmlspecialchars($libro->genero) ?></dd>
        <dt>Formato</dt>
        <dd><?= htmlspecialchars($libro->formato) ?></dd>
        <dt>ISBN</dt>
        <dd><?= htmlspecialchars($libro->isbn) ?></dd>
        <dt>Precio</dt>
        <dd><data value="<?= $libro->precio ?>">$<?= number_format($libro->precio, 0, ',', '.') ?></data></dd>
        <dt>Stock</dt>
        <dd><?= $libro->stock ?> <?= $libro->stock === 1 ? 'ejemplar' : 'ejemplares' ?></dd>
        <dt>Resumen</dt>
        <dd><?= nl2br(htmlspecialchars($libro->resumen)) ?></dd>
        <?php if ($libro->descripcion !== ''): ?>
        <dt>Descripción</dt>
        <dd><?= nl2br(htmlspecialchars($libro->descripcion)) ?></dd>
        <?php endif; ?>
      </dl>

      <ul>
        <li><a href="/libros/nuevo">Cargar otro libro</a></li>
        <li><a href="/catalogo">Ver el catálogo</a></li>
      </ul>
    </section>

  </main>

<?php
require __DIR__ . '/layouts/footer.php';
