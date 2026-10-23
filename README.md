# Waterfall Advanced — custom visual de Power BI

**de [TCViz](https://tcviz.com)** · versión **1.2.0.0**

Gráfico de cascada para puentes financieros: total inicial, drivers, subtotales de control
(Margen bruto, EBITDA) y total final. Cada fila se marca como `total`, `subtotal` o `delta`
y el visual dibuja el puente.

[Documentación y soporte](https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/support.html) ·
[Changelog](https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/changelog.html) ·
[Vídeo](https://www.youtube.com/watch?v=GOym3Akbiaw) ·
[Ficha](https://tcviz.com/product/waterfall-pro/) ·
[Tips & Hints](./TIPS-AND-HINTS.md)

## Campos

| Campo | Qué hace |
|---|---|
| **Category** | Línea, driver o paso (obligatorio; admite jerarquía) |
| **Value** | Importe (obligatorio). Negativo baja, positivo sube |
| **Target** | Objetivo; línea discontinua en las barras de total |
| **Bar type** | `total` / `subtotal` / `delta`, agregado como **First**. Sin él, primera y última fila son totales |
| **Order** | Campo numérico que fija la secuencia |
| **Tooltips**, **Colour (DAX)** | Medidas extra; color hex por fila (manda sobre colores y fx) |

## Free y Pro (plan `pro`)

- **Free**: puente completo con hasta 12 drivers (el resto, los menores, en "Others"; el
  puente sigue cuadrando y una nota dice cuántos se agruparon), subtotales, objetivo,
  tarjetas resumen, marca de anomalías, conectores, orden por impacto, paleta para
  daltónicos, rayado de bajadas, fx en el color de subida, vertical/horizontal.
  Nuevo en 1.2: 5 plantillas (Classic, Modern, Soft, One colour con color base, Dark
  background), formato del modelo (incluidas cadenas dinámicas), ejes, leyenda,
  formato sobre el objeto, barra de consejos, pantalla de inicio y 12 idiomas.
- **Pro**: todos los drivers sin agrupar, tabla de datos, modo IBCS y densidad de
  etiquetas (ángulo, truncado, ocultar las que no caben).
- **Vista previa Pro** (1.2): sin licencia y solo editando, lo Pro que se activa se dibuja
  con marca de agua "Pro preview"; en lectura se ve el gráfico gratuito, y donde no se lee
  la licencia (Publish to Web, embed, exportación) el resultado gratuito sin marca. La
  agrupación de más de 12 drivers no se previsualiza.

## Privacidad

Sin llamadas de red (`privileges` vacío), sin telemetría, sin cookies ni almacenamiento.
Los enlaces de la pantalla de inicio solo se abren con un clic, a través de Power BI.
[Política de privacidad](https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/privacy.html).

## Compilar

```bash
npm install
npm start                          # servidor de desarrollo
npm run build                      # .pbiviz de producción en dist/
node scripts/build-test.js         # build de prueba, Pro forzado (guid ..._test)
node scripts/build-test.js --free  # build de prueba, versión gratuita (guid ..._testfree)
```

`docs/changelog.html` se genera desde `CHANGELOG.md` con `scripts/gen-changelog.js`.

## Licencia y soporte

Software comercial: [Términos de uso](https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/terms.html).
No se permite redistribuir. Soporte: [support@tcviz.com](mailto:support@tcviz.com) ·
[Issues](https://github.com/tinocallarisa-web/waterfall-advanced-powerbi/issues).
