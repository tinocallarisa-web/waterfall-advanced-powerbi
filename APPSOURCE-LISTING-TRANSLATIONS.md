# AppSource listing — the four languages

The offer is published in **English, Spanish, French and German**, so every text
field exists four times and four copies go stale independently. Paste from here,
not from memory.

The English copy is the same text as `APPSOURCE-LISTING.md`; it is repeated here so
the four languages sit side by side and a reader can check they say the same thing.

## The Description field cuts at 5.000 characters

**Measured on 2026-09-12 in this offer.** The Spanish description and the "What's new"
block were pasted into `Description` one after the other; Partner Center saved exactly
**5.000 characters** and dropped the rest mid-word, with no warning — the same failure
mode as the certification notes field, which cuts at 2.500.

That settles where "What's new" goes: **there is no separate field for it in a Power BI
visual offer, so it lives inside `Description`, and the two together have to fit in
5.000.** The blocks below are already merged that way — one paste per language.

Current sizes, all four under the limit:

| Language | Characters | Headroom |
|---|---|---|
| English | 4.273 | 727 |
| Español | 4.685 | 315 |
| Français | 4.866 | 134 |
| Deutsch | 4.813 | 187 |

Check before every paste, because the limit is silent:

    node scripts/check-listing-length.js

It measures every copy block in this file against 5.000 (and the search summaries
against 100), plus `CERTIFICATION-NOTES-SHORT.txt` against 2.500 and the YouTube tags
against 500, and exits non-zero if any of them is over.

French and German have barely 150 characters of headroom. **Adding a sentence to them
means taking one out**, and the "Certified" sentence is about that size — see the note
on certification below.

## Read this before pasting

The live 1.0.x description that is on the offer right now has three problems, and
two of them would be read as a documentation discrepancy by a reviewer:

1. **It advertises "AI Narratives (Finance tier)"** — generating executive summaries
   with Claude or GPT using your own API key. That feature and the Finance tier were
   removed in 1.1.0.0: they called external services, which a certified visual may
   not do, so the sandbox blocked them in every published report. Anything naming
   Anthropic, OpenAI, API keys or Finance has to go from all four languages.
2. **It claims the visual is "Multilingual: English, Spanish, French and German"
   without qualification.** That is broader than what is implemented. The visual
   localises the **chart surface** — the five summary cards, the landing page hint and
   the tooltip labels, fourteen strings in `stringResources/`. The **format pane and
   the field wells are English in every language**: `capabilities.json` contains no
   `displayNameKey` at all. A reviewer who opens the format pane in Spanish sees
   English, and an unqualified claim is what turns that into a finding. The wording
   below says which half is translated.
3. **It does not mention anything added in 1.1.0.0** — the data table, IBCS mode, the
   colour-blind safe palette with hatched decreases, conditional formatting on bar
   colour, drilldown, or bookmarks. Features that are implemented but not listed cost
   as much as features listed and missing: if it is not written, for a reviewer it
   does not exist.

**On "Certified":** 1.0.8.0 carries the badge. 1.1.0.0 has not been submitted yet, and
a resubmission is reviewed again. The copy below does not claim certification — add
the sentence back to all four languages once the badge is confirmed in Partner Center,
which is the only place it can be checked.

---

# ENGLISH

## Search results summary (max 100 characters)

```
Financial bridge chart with subtotals, targets, a data table and IBCS mode.
```

*(74 characters)*

## Description

```
Power BI's built-in waterfall handles category movement. It does not handle a bridge:
an opening anchor, the drivers that explain the movement, the intermediate checkpoints
a finance reader expects, and a closing total. Without those, a P&L walk is a row of
floating bars and the reader has to reconstruct the story themselves.

Waterfall Advanced adds the one thing that changes that: semantic control over what
each bar means. Mark a row as a total, a subtotal or a driver, and the chart draws the
bridge your finance team already has in their heads.

BUILT FOR P&L WALKS

• Totals, subtotals and drivers as distinct bar types, from a column in your model —
  or auto-detected if you do not connect one
• Intermediate checkpoints — Net Revenue, Gross Profit, EBITDA — drawn from zero, so a
  reader sees where the margin stood before the next block of costs
• Horizontal or vertical, because line-item names read better down the side
• Hierarchical drilldown: start at region, open into country or product without
  leaving the bridge
• A target line on the anchor bars, with its own label and figure
• Drivers beyond two standard deviations from the mean are flagged automatically, with
  no configuration
• Summary cards: opening total, closing total, variance %, biggest gain, biggest loss
• Sort the drivers by impact with one click

READABLE ON PURPOSE

• A colour-blind safe palette and hatched decreases. Around 8% of men cannot reliably
  separate red from green, and a bridge is where mistaking a rise for a fall costs
  most. With the hatch on, the chart still reads printed in black and white — which is
  how half of these end up, in a committee pack.
• Conditional formatting on bar colour through the native fx dialog, or a hex colour
  per row calculated in your model
• Currency symbol, scale, decimals and separators, and the format strings from your
  model are respected
• Label angle, truncation and automatic handling of labels that do not fit
• IBCS monochrome notation for standards-based reporting

THE NUMBERS BESIDE THE CHART

A bridge answers why. A table answers how much. The built-in data table puts both in
one visual — every step with its amount, the running total and each step as a share of
the opening figure — instead of a matrix beside the chart that has to be filtered and
formatted separately.

IN THE REPORT

Cross-filtering with multi-select, cross-highlighting, bookmarks, report page tooltips,
right-click context menu, keyboard navigation and high contrast. The chart labels and
summary cards follow the Power BI language setting in English, Spanish, French and
German; the format pane is in English.

PRIVACY

No network calls of any kind: no telemetry, no analytics, no CDN, no endpoints. All
calculation and rendering happens inside Power BI, on your machine or your tenant.

FREE AND PRO

Free is the whole bridge: totals, subtotals, drivers, connectors, both orientations,
drilldown, the target line, conditional formatting, the accessible palette, summary
cards, cross-filtering, bookmarks, keyboard and high contrast — with twelve individual
drivers, the size of a standard P&L walk. No watermark.

Above twelve, the smallest drivers are grouped into an "Others" bar. The bridge still
closes on the same figure: the detail is coarser, nothing is lost.

Pro adds every driver individually, the data table, IBCS mode and the label density
controls. $15 per user per month, with a 30-day free trial on AppSource.

WHAT'S NEW IN 1.1.0.0

• Fixed: the Pro licence could never be granted. The visual called a licensing method
  that does not exist and the fallback read the browser hostname, so every published
  user was served the free tier whatever they had bought.
• New: the data table, IBCS monochrome mode, and controls for label angle, truncation
  and overlap.
• New and free: a colour-blind safe palette with hatched decreases, and conditional
  formatting on bar colour.
• Bookmarks now restore the selection.
• The free limit groups the smallest drivers into "Others" instead of hiding bars, so
  the bridge always closes on the right figure.
• Removed: AI narratives and the Finance tier. They called external services, which a
  certified visual may not do, so the sandbox blocked them in every published report.
```


---

# ESPAÑOL

## Resumen para resultados de búsqueda (máx. 100 caracteres)

```
Gráfico de puente financiero con subtotales, targets, tabla de datos y modo IBCS.
```

*(80 caracteres)*

## Descripción

```
El waterfall nativo de Power BI representa el movimiento entre categorías. No
representa un puente: un total de apertura, los drivers que explican el movimiento, los
hitos intermedios que un lector financiero espera y un total de cierre. Sin eso, un
recorrido de P&L es una fila de barras flotantes y el lector tiene que reconstruir la
historia por su cuenta.

Waterfall Advanced añade lo único que cambia eso: control semántico sobre lo que
significa cada barra. Marca una fila como total, subtotal o driver, y el gráfico dibuja
el puente que tu equipo financiero ya tiene en la cabeza.

PENSADO PARA RECORRIDOS DE P&L

• Totales, subtotales y drivers como tipos de barra distintos, a partir de una columna
  de tu modelo — o detectados automáticamente si no conectas ninguna
• Hitos intermedios — Ingresos netos, Margen bruto, EBITDA — dibujados desde cero, para
  que el lector vea dónde estaba el margen antes del siguiente bloque de costes
• Horizontal o vertical, porque los nombres de partida se leen mejor en el lateral
• Drill-down jerárquico: empieza por región y abre país o producto sin salir del puente
• Línea de target sobre las barras de anclaje, con su etiqueta y su cifra
• Los drivers que se desvían más de dos desviaciones típicas de la media se marcan
  automáticamente, sin configurar nada
• Tarjetas resumen: total inicial, total final, variación %, mayor ganancia y mayor
  pérdida
• Ordena los drivers por impacto con un clic

LEGIBLE A PROPÓSITO

• Paleta segura para daltonismo y tramado en los descensos. Cerca del 8% de los hombres
  no distingue con fiabilidad el rojo del verde, y un puente es justo donde confundir
  una subida con una bajada cuesta más. Con el tramado activado, el gráfico sigue
  leyéndose impreso en blanco y negro, que es como acaba la mitad de estos informes en
  un dossier de comité.
• Formato condicional en el color de barra desde el diálogo fx nativo, o un color hex
  por fila calculado en tu modelo
• Símbolo de moneda, escala, decimales y separadores, y se respetan los format strings
  de tu modelo
• Ángulo de etiqueta, truncado y gestión automática de las etiquetas que no caben
• Notación monocroma IBCS para informes basados en estándares

LAS CIFRAS AL LADO DEL GRÁFICO

Un puente responde al por qué. Una tabla responde al cuánto. La tabla de datos
integrada pone las dos cosas en un solo visual —cada paso con su importe, el acumulado
y el peso de cada paso sobre la cifra de apertura— en lugar de una matriz al lado que
hay que filtrar y formatear por separado.

EN EL INFORME

Filtrado cruzado con multiselección, resaltado cruzado, marcadores, páginas de
información sobre herramientas, menú contextual con el botón derecho, navegación por
teclado y alto contraste. Las etiquetas del gráfico y las tarjetas resumen siguen el
idioma de Power BI en inglés, español, francés y alemán; el panel de formato está en
inglés.

PRIVACIDAD

Ninguna llamada de red de ningún tipo: sin telemetría, sin analítica, sin CDN, sin
endpoints. Todo el cálculo y el renderizado ocurren dentro de Power BI, en tu máquina o
en tu tenant.

GRATIS Y PRO

La versión gratuita es el puente completo: totales, subtotales, drivers, conectores,
las dos orientaciones, drill-down, línea de target, formato condicional, paleta
accesible, tarjetas resumen, filtrado cruzado, marcadores, teclado y alto contraste —
con doce drivers individuales, el tamaño de un recorrido de P&L estándar. Sin marca de
agua.

Por encima de doce, los drivers más pequeños se agrupan en una barra «Otros». El puente
sigue cerrando en la misma cifra: el detalle es más grueso, no se pierde nada.

Pro añade todos los drivers por separado, la tabla de datos, el modo IBCS y los
controles de densidad de etiquetas. 15 $ por usuario y mes, con 30 días de prueba
gratuita en AppSource.

NOVEDADES DE LA 1.1.0.0

• Corregido: la licencia Pro no podía concederse nunca. El visual llamaba a un método de
  licencias que no existe y el respaldo leía el nombre de host del navegador, así que
  todo usuario publicado recibía el tier gratuito por mucho que hubiera pagado.
• Nuevo: la tabla de datos, el modo monocromo IBCS y los controles de ángulo, truncado y
  solape de etiquetas.
• Nuevo y gratis: paleta segura para daltonismo con tramado en los descensos, y formato
  condicional en el color de barra.
• Los marcadores ya restauran la selección.
• El límite gratuito agrupa los drivers más pequeños en «Otros» en lugar de ocultar
  barras, así que el puente siempre cierra en la cifra correcta.
• Eliminado: las narrativas con IA y el tier Finance. Llamaban a servicios externos, lo
  que un visual certificado no puede hacer, así que el sandbox las bloqueaba siempre.
```


---

# FRANÇAIS

## Résumé pour les résultats de recherche (100 caractères max.)

```
Graphique en pont financier : sous-totaux, cibles, tableau de données et mode IBCS.
```

*(82 caractères)*

## Description

```
Le graphique en cascade intégré à Power BI représente le mouvement entre catégories. Il
ne représente pas un pont : un total d'ouverture, les leviers qui expliquent le
mouvement, les jalons intermédiaires qu'un lecteur financier attend et un total de
clôture. Sans cela, un parcours de compte de résultat n'est qu'une rangée de barres
flottantes, et c'est au lecteur de reconstituer l'histoire.

Waterfall Advanced ajoute la seule chose qui change cela : le contrôle sémantique de ce
que signifie chaque barre. Marquez une ligne comme total, sous-total ou levier, et le
graphique dessine le pont que votre équipe financière a déjà en tête.

CONÇU POUR LES PARCOURS DE COMPTE DE RÉSULTAT

• Totaux, sous-totaux et leviers comme types de barres distincts, à partir d'une colonne
  de votre modèle — ou détectés automatiquement si vous n'en connectez aucune
• Jalons intermédiaires — chiffre d'affaires net, marge brute, EBITDA — tracés depuis
  zéro, pour que le lecteur voie où se situait la marge avant le bloc de coûts suivant
• Horizontal ou vertical, parce que les intitulés de postes se lisent mieux sur le côté
• Exploration hiérarchique : commencez par la région, ouvrez le pays ou le produit sans
  quitter le pont
• Une ligne de cible sur les barres d'ancrage, avec son libellé et son chiffre
• Les leviers qui s'écartent de plus de deux écarts-types de la moyenne sont signalés
  automatiquement, sans aucun réglage
• Cartes de synthèse : total initial, total final, variation %, plus grande hausse, plus
  grande baisse
• Triez les leviers par impact en un clic

LISIBLE À DESSEIN

• Une palette adaptée au daltonisme et des hachures sur les baisses : près de 8 % des
  hommes ne distinguent pas le rouge du vert de façon fiable, et avec les hachures le
  graphique reste lisible imprimé en noir et blanc.
• Mise en forme conditionnelle de la couleur des barres via la boîte de dialogue fx
  native, ou une couleur hexadécimale par ligne calculée dans votre modèle
• Symbole monétaire, échelle, décimales et séparateurs, et les formats définis dans
  votre modèle sont respectés
• Angle des étiquettes, troncature et gestion automatique des étiquettes qui ne tiennent
  pas
• Notation monochrome IBCS pour un reporting normalisé

LES CHIFFRES À CÔTÉ DU GRAPHIQUE

Un pont répond au pourquoi. Un tableau répond au combien. Le tableau de données intégré
met les deux dans un seul visuel — chaque étape avec son montant, le cumul et le poids
de chaque étape sur le chiffre d'ouverture — au lieu d'une matrice à côté qu'il faut
filtrer et mettre en forme séparément.

DANS LE RAPPORT

Filtrage croisé avec sélection multiple, mise en évidence croisée, signets, pages
d'info-bulles, menu contextuel au clic droit, navigation au clavier et contraste élevé.
Les étiquettes du graphique et les cartes de synthèse suivent la langue de Power BI en
anglais, espagnol, français et allemand ; le volet de mise en forme est en anglais.

CONFIDENTIALITÉ

Aucun appel réseau d'aucune sorte : pas de télémétrie, pas d'analytique, pas de CDN,
aucun point de terminaison. Tout le calcul et tout le rendu se font dans Power BI, sur
votre machine ou dans votre tenant.

GRATUIT ET PRO

La version gratuite, c'est le pont complet : totaux, sous-totaux, leviers, connecteurs,
les deux orientations, l'exploration, la ligne de cible, la mise en forme
conditionnelle, la palette accessible, les cartes de synthèse, le filtrage croisé, les
signets, le clavier et le contraste élevé — avec douze leviers individuels, la taille
d'un parcours de compte de résultat standard. Sans filigrane.

Au-delà de douze, les plus petits leviers sont regroupés dans une barre « Autres ». Le
pont se referme sur le même chiffre : le détail est plus grossier, rien n'est perdu.

Pro ajoute tous les leviers individuellement, le tableau de données, le mode IBCS et les
contrôles de densité des étiquettes. 15 $ par utilisateur et par mois, avec 30 jours
d'essai gratuit sur AppSource.

NOUVEAUTÉS DE LA 1.1.0.0

• Corrigé : la licence Pro ne pouvait jamais être accordée. Le visuel appelait une
  méthode de licence inexistante et la solution de repli lisait le nom d'hôte du
  navigateur : tout utilisateur publié recevait la version gratuite, quel que soit son
  achat.
• Nouveau : le tableau de données, le mode monochrome IBCS et les contrôles d'angle, de
  troncature et de chevauchement des étiquettes.
• Nouveau et gratuit : une palette adaptée au daltonisme avec hachures sur les baisses,
  et la mise en forme conditionnelle de la couleur des barres.
• Les signets restaurent désormais la sélection.
• La limite gratuite regroupe les plus petits leviers dans « Autres » au lieu de masquer
  des barres : le pont se referme toujours sur le bon chiffre.
• Supprimé : les synthèses par IA et l'offre Finance. Elles appelaient des services
  externes, ce qu'un visuel certifié ne peut pas faire.
```


---

# DEUTSCH

## Zusammenfassung für Suchergebnisse (max. 100 Zeichen)

```
Finanzielles Brückendiagramm mit Zwischensummen, Zielen, Datentabelle und IBCS-Modus.
```

*(84 Zeichen)*

## Beschreibung

```
Das in Power BI enthaltene Wasserfalldiagramm zeigt die Bewegung zwischen Kategorien.
Es zeigt keine Brücke: einen Anfangswert, die Treiber, die die Bewegung erklären, die
Zwischenstationen, die ein Finanzleser erwartet, und einen Endwert. Ohne diese ist ein
GuV-Pfad eine Reihe schwebender Balken, und der Leser muss sich die Geschichte selbst
zusammensetzen.

Waterfall Advanced ergänzt genau das, was den Unterschied macht: die semantische
Kontrolle darüber, was jeder Balken bedeutet. Markieren Sie eine Zeile als Summe,
Zwischensumme oder Treiber, und das Diagramm zeichnet die Brücke, die Ihr Finanzteam
längst im Kopf hat.

FÜR GuV-PFADE GEBAUT

• Summen, Zwischensummen und Treiber als eigene Balkentypen, aus einer Spalte Ihres
  Modells — oder automatisch erkannt, wenn Sie keine verbinden
• Zwischenstationen — Nettoumsatz, Rohertrag, EBITDA — von null gezeichnet, damit der
  Leser sieht, wo die Marge vor dem nächsten Kostenblock stand
• Horizontal oder vertikal, weil sich Positionsbezeichnungen seitlich besser lesen
• Hierarchisches Drilldown: beginnen Sie bei der Region und öffnen Sie Land oder
  Produkt, ohne die Brücke zu verlassen
• Eine Ziellinie auf den Ankerbalken, mit eigener Bezeichnung und eigenem Wert
• Treiber, die mehr als zwei Standardabweichungen vom Mittelwert abweichen, werden
  automatisch markiert, ohne Konfiguration
• Übersichtskarten: Anfangswert, Endwert, Abweichung %, größter Gewinn, größter Verlust
• Sortieren Sie die Treiber mit einem Klick nach Wirkung

BEWUSST LESBAR

• Eine farbfehlsichtigkeitssichere Palette und Schraffur bei Rückgängen. Rund 8 % der
  Männer können Rot und Grün nicht zuverlässig unterscheiden, und eine Brücke ist genau
  dort, wo es am meisten kostet, einen Anstieg für einen Rückgang zu halten. Mit
  Schraffur bleibt das Diagramm auch in Schwarzweiß lesbar — so endet die Hälfte dieser
  Diagramme, in einer Ausschussmappe.
• Bedingte Formatierung der Balkenfarbe über den nativen fx-Dialog oder eine
  Hex-Farbe pro Zeile, berechnet in Ihrem Modell
• Währungssymbol, Skalierung, Dezimalstellen und Trennzeichen, und die Formatangaben
  aus Ihrem Modell werden respektiert
• Beschriftungswinkel, Abschneiden und automatischer Umgang mit Beschriftungen, die
  nicht passen
• IBCS-Monochromnotation für standardbasiertes Reporting

DIE ZAHLEN NEBEN DEM DIAGRAMM

Eine Brücke beantwortet das Warum. Eine Tabelle beantwortet das Wie viel. Die
integrierte Datentabelle bringt beides in ein Visual — jeden Schritt mit Betrag,
laufender Summe und Anteil am Anfangswert — anstelle einer Matrix daneben, die getrennt
gefiltert und formatiert werden muss.

IM BERICHT

Kreuzfilterung mit Mehrfachauswahl, Kreuzhervorhebung, Lesezeichen, Berichtsseiten als
Tooltips, Kontextmenü per Rechtsklick, Tastaturnavigation und hoher Kontrast. Die
Diagrammbeschriftungen und die Übersichtskarten folgen der Power-BI-Sprache in Englisch,
Spanisch, Französisch und Deutsch; der Formatierungsbereich ist auf Englisch.

DATENSCHUTZ

Keine Netzwerkaufrufe irgendeiner Art: keine Telemetrie, keine Analytik, kein CDN,
keine Endpunkte. Alle Berechnung und Darstellung findet innerhalb von Power BI statt,
auf Ihrem Rechner oder in Ihrem Tenant.

KOSTENLOS UND PRO

Kostenlos ist die ganze Brücke: Summen, Zwischensummen, Treiber, Verbindungslinien,
beide Ausrichtungen, Drilldown, die Ziellinie, bedingte Formatierung, die barrierefreie
Palette, Übersichtskarten, Kreuzfilterung, Lesezeichen, Tastatur und hoher Kontrast —
mit zwölf einzelnen Treibern, der Größe eines üblichen GuV-Pfads. Ohne Wasserzeichen.

Oberhalb von zwölf werden die kleinsten Treiber zu einem Balken „Sonstige"
zusammengefasst. Die Brücke schließt weiterhin mit demselben Wert: das Detail ist
grober, es geht nichts verloren.

Pro ergänzt jeden Treiber einzeln, die Datentabelle, den IBCS-Modus und die
Steuerelemente für die Beschriftungsdichte. 15 $ pro Benutzer und Monat, mit 30 Tagen
kostenloser Testphase auf AppSource.

NEU IN 1.1.0.0

• Behoben: die Pro-Lizenz konnte nie erteilt werden. Das Visual rief eine nicht
  existierende Lizenzmethode auf, und der Fallback las den Browser-Hostnamen — jeder
  veröffentlichte Benutzer erhielt die kostenlose Stufe, unabhängig vom Kauf.
• Neu: die Datentabelle, der IBCS-Monochrommodus und Steuerelemente für
  Beschriftungswinkel, Abschneiden und Überlappung.
• Neu und kostenlos: eine farbfehlsichtigkeitssichere Palette mit Schraffur bei
  Rückgängen, und bedingte Formatierung der Balkenfarbe.
• Lesezeichen stellen die Auswahl nun wieder her.
• Das kostenlose Limit fasst die kleinsten Treiber zu „Sonstige" zusammen, statt Balken
  zu verbergen, sodass die Brücke immer mit dem richtigen Wert schließt.
• Entfernt: KI-Zusammenfassungen und die Finance-Stufe. Sie riefen externe Dienste auf,
  was ein zertifiziertes Visual nicht darf.
```


---

## Checklist for the four languages

- [ ] English description replaced
- [ ] Spanish description replaced
- [ ] French description replaced
- [ ] German description replaced
- [ ] "What's new" pasted in all four
- [ ] **Nothing left naming Anthropic, OpenAI, API keys, AI narratives or Finance in
      any of the four** — search each field before saving, not only the English one
- [ ] No unqualified "multilingual" claim left: the format pane is English
- [ ] Price shown as $15/user/month in all four, matching the plan in Partner Center
- [ ] "Certified" added back only if the badge is confirmed for 1.1.0.0
