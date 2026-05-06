# Waterfall Advanced — Power BI Custom Visual

Visual de waterfall profesional para Power BI AppSource con subtotales configurables,
drill-through, líneas de target, detección de anomalías y base para narrativas IA.

## Estructura del proyecto

```
waterfall-visual/
├── capabilities.json       # Data roles, objetos de formato, privilegios
├── pbiviz.json             # Metadatos del visual (nombre, versión, autor)
├── package.json            # Dependencias npm
├── tsconfig.json           # Configuración TypeScript
└── src/
    ├── visual.ts           # Clase principal IVisual — punto de entrada
    ├── settings.ts         # Modelo del panel de propiedades (colores, etiquetas, etc.)
    ├── dataMapper.ts       # Mapeo dataView → WaterfallBar[]
    ├── waterfallEngine.ts  # Lógica de cálculo (base, top, running, anomalías)
    └── renderer.ts         # Renderizado SVG + tarjetas de varianza
```

## Instalación y arranque

```bash
# 1. Instala Power BI visuals tools globalmente (solo primera vez)
npm install -g powerbi-visuals-tools

# 2. Instala dependencias del proyecto
npm install

# 3. Arranca el servidor de desarrollo (hot reload en Power BI Desktop)
pbiviz start

# 4. En Power BI Desktop: activar "Visual de desarrollador" en Opciones
#    y añadir el visual "Developer Visual" al canvas.

# 5. Para generar el .pbiviz para publicar:
pbiviz package
```

## Cómo conectar datos en Power BI

| Campo en el panel | Qué conectar | Obligatorio |
|---|---|---|
| Categoría | Columna de texto (ej: "Concepto", "Línea P&L") | Sí |
| Valor | Medida numérica (ej: [Importe]) | Sí |
| Target (opcional) | Medida con valor objetivo | No |
| Tipo de barra | Columna con valores: "total" / "subtotal" / "delta" | No — se auto-detecta |

### Auto-detección de tipo de barra
Si no conectas la columna "Tipo de barra", el visual asume:
- Primera fila → `total` (punto de partida)
- Última fila → `total` (resultado final)
- Todas las demás → `delta`

Para añadir subtotales sin columna explícita, conecta la columna de tipo con estos valores exactos:
```
total     → barra desde cero (azul)
subtotal  → snapshot del acumulado (azul oscuro)
delta     → incremento o decremento (verde/rojo)
```

## Funcionalidades del panel de propiedades

### Colores
- Color incremento (default: #1D9E75)
- Color decremento (default: #E24B4A)
- Color total / subtotal (default: #378ADD)
- Color línea target (default: #888780)

### Etiquetas
- Mostrar / ocultar etiquetas
- Modo: Absoluto | Relativo % | Ambos
- Tamaño de fuente (8–20px)

### Gráfico
- Líneas conectoras entre barras
- Mostrar / ocultar subtotales
- Mostrar / ocultar línea de target
- Tarjetas de resumen (varianza, mayor ganancia/pérdida)
- Ordenar deltas por impacto (mayor a menor)

## Detección de anomalías
El visual marca automáticamente con un punto rojo las barras cuyo valor
se desvía más de 2 desviaciones estándar de la media de todos los deltas.

## Ampliar con narrativas IA
Para añadir narrativas automáticas al waterfall, integra el módulo `aiEngine.ts`
del proyecto `NarrativeAI`. El `computeSummary()` ya produce el `WaterfallSummary`
que necesitas para construir el prompt:

```typescript
import { AIEngine } from "../narrativeAI/aiEngine";

const summary = computeSummary(computed);
const prompt  = `Analiza este waterfall: 
  Inicio: ${summary.initialValue}, 
  Final: ${summary.finalValue}, 
  Mayor ganancia: ${summary.biggestGain?.label} (${summary.biggestGain?.value}),
  Mayor pérdida: ${summary.biggestLoss?.label} (${summary.biggestLoss?.value}).
  Genera una narrativa ejecutiva de 2 frases.`;

const narrative = await AIEngine.callAI(prompt, settings.aiSettings);
```

## Publicación en AppSource

1. `pbiviz package` → genera `dist/WaterfallAdvanced.pbiviz`
2. Accede a Partner Center → Marketplace offers → Power BI visual
3. Sube el `.pbiviz` y completa los metadatos (descripción, capturas, precios)
4. Microsoft revisa en 2–4 semanas

## GUID del visual
Antes de publicar, reemplaza el GUID en `pbiviz.json`:
```bash
# Genera un nuevo GUID único
node -e "const c=()=>Math.random().toString(36).slice(2);console.log((c()+c()+c()).toUpperCase().slice(0,32))"
```
