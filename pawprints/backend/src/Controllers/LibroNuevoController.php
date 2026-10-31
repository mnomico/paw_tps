<?php

declare(strict_types=1);

namespace PawPrints\Controllers;

use PawPrints\Core\Controller;
use PawPrints\Core\Request;
use PawPrints\Core\Response;
use PawPrints\Models\LibroNuevo;
use PawPrints\Models\LibroNuevoInvalido;
use PawPrints\Models\LibroRepository;

/**
 * La carga de libros nuevos (TP4, consigna 2): el formulario, con validaciones en línea en el
 * navegador (validador.js), y su envío, que el servidor vuelve a validar con las mismas reglas.
 */
class LibroNuevoController extends Controller
{
    private const CAMPOS = ['titulo', 'autor', 'genero', 'formato', 'isbn', 'precio', 'stock', 'resumen', 'descripcion'];

    private ?LibroRepository $libros = null;

    /** GET /libros/nuevo */
    public function formulario(Request $request): Response
    {
        return $this->mostrar([]);
    }

    /** POST /libros/nuevo */
    public function cargar(Request $request): Response
    {
        $campos = [];
        foreach (self::CAMPOS as $campo) {
            $campos[$campo] = $request->input($campo, '');
        }

        $tapa = $request->file('tapa');
        $tapaEnviada = is_array($tapa) && ($tapa['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE;

        try {
            $libro = LibroNuevo::desdeFormulario($campos, $this->libros());
        } catch (LibroNuevoInvalido $error) {
            return $this->mostrar($campos, $error->errores, 422, $tapaEnviada);
        }

        $this->logger->info('Libro nuevo validado: ISBN {isbn}', ['isbn' => $libro->isbn]);
        if ($tapaEnviada) {
            $this->logger->info('Tapa recibida: {name} ({size} bytes)', [
                'name' => (string) ($tapa['name'] ?? ''),
                'size' => (int) ($tapa['size'] ?? 0),
            ]);
        }

        // La respuesta es directa, sin redirigir a otra página como hace la reserva: el libro no
        // se guarda (ver LibroNuevo), así que recargar y reenviar el formulario no duplica nada, y
        // así la confirmación puede mostrar la ficha con lo que se cargó.
        return $this->render('libro-nuevo-confirmacion', [
            'title' => 'Libro cargado — PAWPrints',
            'description' => 'Los datos del libro nuevo pasaron todas las validaciones.',
            'activePage' => '',
            'pageClass' => 'page-libro-nuevo-confirmacion',
            'extraCss' => ['libro-nuevo.css'],
            'libro' => $libro,
            'tapa' => $tapaEnviada ? $tapa : null,
        ]);
    }

    /**
     * El formulario, vacío o con lo que ya escribió el usuario y sus errores.
     *
     * @param array<string, string> $valores
     * @param array<string, string> $errores
     */
    private function mostrar(array $valores, array $errores = [], int $estado = 200, bool $tapaEnviada = false): Response
    {
        return $this->render('libro-nuevo', [
            'title' => 'Cargar un libro nuevo — PAWPrints',
            'description' => 'Formulario del personal de PAWPrints para cargar un libro nuevo en el catálogo.',
            'activePage' => '',
            'pageClass' => 'page-libro-nuevo',
            'extraCss' => ['libro-nuevo.css'],
            'extraJs' => ['paginas/libro-nuevo.js'],
            'valores' => $valores + array_fill_keys(self::CAMPOS, ''),
            'errores' => $errores,
            'tapaEnviada' => $tapaEnviada,
            'generos' => array_keys($this->libros()->generos()),
            'formatos' => array_keys($this->libros()->formatos()),
            'mensajes' => LibroNuevo::MENSAJES,
            'patronIsbn' => LibroNuevo::PATRON_ISBN,
            'limites' => [
                'titulo' => LibroNuevo::MAX_TITULO,
                'autor' => LibroNuevo::MAX_AUTOR,
                'resumen' => LibroNuevo::MAX_RESUMEN,
                'descripcion' => LibroNuevo::MAX_DESCRIPCION,
                'precio' => LibroNuevo::MAX_PRECIO,
                'stock' => LibroNuevo::MAX_STOCK,
            ],
        ], $estado);
    }

    private function libros(): LibroRepository
    {
        return $this->libros ??= new LibroRepository();
    }
}
