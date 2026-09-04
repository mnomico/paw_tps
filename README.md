# PAWPrints — Trabajos Prácticos de PAW

Programación en Ambiente Web (11086) — Universidad Nacional de Luján.

Los TPs de la cursada construyen de forma incremental un mismo proyecto: el sitio web de la
librería **PAWPrints**. Cada uno parte de lo entregado en el anterior y le aplica el nuevo
enunciado.

| Entrega | Tema | Estado |
| --- | --- | --- |
| [TP1](TP1/README.md) | Maquetado web con HTML5 | Entregado |
| TP2 | Identidad visual y CSS | Pendiente |
| TP3 | Backend PHP (MVC) y despliegue | Pendiente |
| TP4 | Componentes en JavaScript | Pendiente |
| TP5 | Twig y base de datos relacional | Pendiente |

**Cada TP tiene su propio `README.md` dentro de su carpeta**, con los enunciados, las respuestas,
las decisiones tomadas y la guía de instalación de esa entrega.

## Integrantes

En [`autores.txt`](autores.txt).

## Versión

En [`VERSION`](VERSION), con versionado semántico. Se incrementa el número mayor con cada TP
entregado.

## Cómo levantar el sitio

Cada TP es autocontenido: todo lo que necesita vive dentro de su carpeta.

```bash
git clone https://github.com/mnomico/paw_tps.git
cd paw_tps/TP1
python3 -m http.server 8080
```

Abrir <http://localhost:8080/index.html>.

La guía completa, con el detalle del entorno y la verificación, está en el README de cada TP.
