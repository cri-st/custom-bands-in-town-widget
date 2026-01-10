# Bandsintown Events Widget (Retro Edition)

Un widget minimalista y altamente configurable para listar fechas de espectáculos de Bandsintown, diseñado con una estética "retro" limpia basada en **Helvetica Neue Bold**.

Este proyecto se despliega como un **Cloudflare Worker** que sirve tanto el script del widget como un proxy seguro para la API de Bandsintown (evitando problemas de CORS).

## 🚀 Características

- **Estética Retro**: Diseño basado en texto, tipografía pesada y alineación precisa.
- **Modo Preview**: Si no hay API Key, muestra 20 fechas ficticias con mensajes creativos para previsualización.
- **Proxy Seguro**: Oculta tu API Key y gestiona los headers CORS automáticamente.
- **Responsivo**: Se adapta perfectamente a dispositivos móviles.
- **Shadow DOM**: Los estilos del widget no interfieren con el resto de tu sitio web.

---

## 🛠️ Instalación y Uso

Para insertar el widget en cualquier sitio web, añade el siguiente código en la sección `<body>` donde quieras que aparezca:

```html
<!-- Contenedor del Widget -->
<div id="bit-widget" 
     data-artist="Paula Prieto" 
     data-button-text="BUY">
</div>

<!-- Script del Widget (Reemplazar con tu URL de Cloudflare) -->
<script src="https://tu-worker.workers.dev/embed.js" defer></script>
```

### Opciones de Personalización (Data Attributes)

Puedes configurar el widget directamente desde el HTML usando estos atributos:

| Atributo              | Por Defecto    | Descripción                                       |
| --------------------- | -------------- | ------------------------------------------------- |
| `data-artist`         | `Paula Prieto` | Nombre del artista en Bandsintown.                |
| `data-button-text`    | `BUY`          | Texto del botón de acción.                        |
| `data-limit`          | `10`           | Cantidad máxima de eventos a mostrar.             |
| `data-locale`         | `es`           | Idioma para el formato de fecha (ej: 'en', 'es'). |
| `data-font-size`      | `0.8125rem`    | Tamaño de la fuente del widget.                   |
| `data-line-height`    | `1.2`          | Interlineado del texto.                           |
| `data-letter-spacing` | `0.03em`       | Espaciado entre letras.                           |

---

## 📦 Desarrollo y Despliegue

### 1. Requisitos Previos
- Cuenta en [Cloudflare](https://dash.cloudflare.com/).
- Node.js instalado.
- API Key de Bandsintown (obtener en [Bandsintown for Artists](https://artists.bandsintown.com/)).

### 2. Configuración Local
1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Crea un archivo `.dev.vars` para desarrollo local:
   ```env
   BANDSINTOWN_APP_ID=tu_api_key_aqui
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

### 3. Despliegue
Para desplegar tu worker a producción:
1. Configura tu API Key de forma segura en Cloudflare:
   ```bash
   npx wrangler secret put BANDSINTOWN_APP_ID
   ```
2. Despliega:
   ```bash
   npm run deploy
   ```

---

## 📂 Estructura del Proyecto

- `src/worker/index.ts`: Lógica del Worker (API Proxy + Generador de Script).
- `src/types/`: Definiciones de TypeScript para la API.
- `test.html`: Página de prueba autocontenida para previsualización local.
- `api_key_setup_guide.md`: Guía detallada para obtener y configurar la API Key.

---

## 🎨 Diseño Retro

El diseño está fijado en **uppercase** (mayúsculas) para todos los elementos y utiliza alineación a la izquierda estricta, evocando listados tipográficos clásicos.

*Para cualquier cambio en la estética base, consulta el archivo `src/worker/index.ts`.*
