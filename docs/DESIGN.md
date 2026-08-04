# Sistema de Diseño: Nodexa Core UI SYSTEM
<ui-tokens>
  - theme-mode: dark-only
  - min-touch-target: 44px
  - font-size-base: 16px (mínimo absoluto: 14px)
  - border-radius-sm: 4px
  - border-radius-md: 8px
  - transition-duration: 150ms-200ms
</ui-tokens>
---
## 1. Arquetipo de Diseño & Metáfora Visual
- **Arquetipo:** Minimalismo Industrial Oscuro ("Dark Utility Premium").
- **Vibra y Personalidad:** Herramienta técnica, sólida, limpia y de alta precisión. Evita marketing genérico; debe asemejarse a un software de ingeniería.
- **Enfoque UX:** Alta legibilidad, baja fatiga visual y UX Educativa (placeholders ejemplares, ayuda en estados vacíos).
---
## 2. Paleta de Colores & Mapeo Estricto a Tailwind CSS
Fondo oscuro profundo (sin usar negro puro `#000000` para evitar fatiga por contraste extremo) y un único color de acento minimalista.
| Rol | Hexadecimal | Variable / Clase Tailwind | Uso Permitido |
| :--- | :--- | :--- | :--- |
| **Fondo Base** | `#0B0F19` | `bg-slate-950` | General de la página / Layout base |
| **Superficie 1** | `#1E293B` | `bg-slate-800` | Tarjetas, contenedores de tablas, modales |
| **Superficie 2** | `#334155` | `bg-slate-700` | Hover en filas, fondos de inputs |
| **Texto Principal**| `#F8FAFC` | `text-slate-50` | Títulos, párrafos, labels de formularios |
| **Texto Muted** | `#94A3B8` | `text-slate-400` | Placeholders, leyendas, metadatos |
| **Acento Core** | `#3B82F6` | `bg-blue-500` / `text-blue-500` | Botón primario, links activos, selección |
| **Éxito (Semántico)**| `#10B981` | `text-emerald-500` | Stock positivo, guardado exitoso |
| **Error (Semántico)**| `#EF4444` | `text-red-500` / `border-red-500` | Errores de formulario, alertas destructivas |
---
## 3. Pareja Tipográfica & Jerarquía
- **Títulos y Display (`font-display`):** Satoshi o Plus Jakarta Sans (Weight: 600 SemiBold / 700 Bold).
- **UI & Lectura (`font-sans`):** Inter (Weight: 400 Regular para cuerpo, 500 Medium para botones y labels).
- **Datos y Números (`font-mono`):** JetBrains Mono. Obligatorio para precios, SKUs, fechas y columnas de tablas (garantiza alineación perfecta en columnas).
---
## 4. Patrones de Interacción & UX Educativa
- **Placeholders Educativos:** No usar placeholders genéricos. Ejemplo: `ej. juan.perez@comercio.com`.
- **Formularios Fail-Fast:** Validación visual con bordes rojos (`border-red-500`), ícono de alerta (`lucide-react: AlertCircle`, nunca emoji) y mensaje explicativo claro y accionable, mapeado a `ERRORS.md`.
- **Empty States (Estados Vacíos):** Mostrar contenedor con borde discontinuo (`border-dashed`), texto explicativo amigable en tono Aliado Sincero y un botón de Call To Action (CTA) azul principal.
- **Alertas de Límite (SKU / IA):** Al 90% del tope, banda informativa discreta con `bg-slate-800` y texto `text-slate-400`; al 100%, modal de bloqueo empático con acento `text-blue-500` para la acción de ampliación, nunca en tono punitivo o rojo.
---
## 5. Directrices de Negación ("El Freno de IA")
Queda ESTRICTAMENTE PROHIBIDO en todo código frontend de este proyecto:
- NO usar el color púrpura, violeta o índigo de Tailwind.
- NO generar fuentes de tamaño menor a 14px.
- NO usar negro puro (`#000000`) ni blanco puro (`#FFFFFF`).
- NO comunicar errores únicamente por color (añadir textos e iconos descriptivos).
- NO crear botones o enlaces interactivos de menos de 44x44px (áreas táctiles accesibles).
- NO usar emojis coloridos en ningún texto de interfaz, botón, tooltip o mensaje de error; únicamente íconos de librería (`lucide-react`) o símbolos sobrios (`✦`, `→`, `•`, `│`).
- NO exponer tecnicismos crudos en mensajes de UI (nada de "query", "endpoint", "RLS"); todo error visible al cliente debe usar el lenguaje claro de `ERRORS.md`.