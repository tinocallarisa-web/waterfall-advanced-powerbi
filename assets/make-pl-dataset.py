#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make-pl-dataset.py — P&L por canal para Waterfall Advanced

Genera dos ficheros en assets/:

  sample-pl-by-channel.csv           18 lineas, 12 drivers por canal
  sample-pl-by-channel-detailed.csv  24 lineas, 18 drivers por canal

Por que este dataset y no uno cualquiera:

- **Cierra.** El beneficio neto es exactamente el arranque mas todos los deltas.
  Un dataset de ejemplo que no cuadra es inutil para probar un waterfall, porque
  no permite distinguir un fallo del visual de un fallo de los datos.
- **Lleva subtotales reales** -Net Revenue, Gross Profit, EBITDA, EBIT-, que es
  para lo que existe la columna BarType y lo que separa un bridge de un grafico
  de barras flotantes.
- **Las dos versiones existen a proposito.** Un P&L estandar tiene 12 drivers y
  cabe entero en el tier gratuito: es el caso que hay que ver funcionando. La
  version detallada abre marketing, personal y logistica en sus componentes,
  llega a 18 y se pasa del limite, que es lo que hace visible la agrupacion en
  "Others" y permite comprobar lo unico que importa de ella: que el puente sigue
  cerrando despues de agrupar.
- **Los canales tienen estructuras distintas.** Online vive de margen bruto alto
  y marketing caro; Wholesale al reves, mucho volumen y poco margen. Asi el
  visual se ve haciendo algo al cambiar de canal, y no cinco copias de la misma
  forma.

Sin dependencias. Uso:  python assets/make-pl-dataset.py
"""

import csv
import os

HERE = os.path.dirname(__file__)

# Estructura de la cuenta. (orden, linea, tipo)
#   total    -> ancla: la primera abre el puente, la ultima lo cierra
#   subtotal -> punto de control: se dibuja desde cero, no flota
#   delta    -> driver: suma o resta sobre el acumulado
LINES = [
    (1,  "Gross Revenue",     "total"),
    (2,  "Discounts",         "delta"),
    (3,  "Returns",           "delta"),
    (4,  "Net Revenue",       "subtotal"),
    (5,  "Cost of Goods",     "delta"),
    (6,  "Gross Profit",      "subtotal"),
    (7,  "Marketing",         "delta"),
    (8,  "Payroll",           "delta"),
    (9,  "Logistics",         "delta"),
    (10, "Rent & Facilities", "delta"),
    (11, "IT & Software",     "delta"),
    (12, "Other Opex",        "delta"),
    (13, "EBITDA",            "subtotal"),
    (14, "Depreciation",      "delta"),
    (15, "EBIT",              "subtotal"),
    (16, "Financial Result",  "delta"),
    (17, "Taxes",             "delta"),
    (18, "Net Profit",        "total"),
]

# Para la version detallada: las tres partidas gordas abiertas en componentes.
SPLITS = {
    "Marketing": [("Digital Marketing", .55), ("Trade Marketing", .30), ("Brand", .15)],
    "Payroll":   [("Sales Payroll", .48), ("Warehouse Payroll", .32), ("Admin Payroll", .20)],
    "Logistics": [("Inbound Freight", .40), ("Last Mile", .45), ("Warehousing", .15)],
}

# Por canal: ingreso bruto y los ratios que definen su estructura economica.
# Salen de proporciones plausibles de retail y ecommerce, no de un generador
# aleatorio: un P&L con ruido no se parece a nada y no ensena nada.
CHANNELS = {
    #                 revenue   disc  retn   cogs   mkt   payr   logi   rent    it   other   d&a    fin    tax
    "Retail Stores": (4_800_000, .04, .015,  .520, .035,  .150,  .022,  .062, .012,  .028,  .030, -.004, .250),
    "Online":        (3_250_000, .09, .075,  .430, .140,  .062,  .085,  .006, .038,  .022,  .018, -.003, .250),
    "Wholesale":     (5_600_000, .12, .010,  .700, .012,  .038,  .030,  .008, .006,  .014,  .010, -.006, .250),
    "Partners":      (1_450_000, .06, .012,  .560, .048,  .055,  .018,  .004, .015,  .020,  .008, -.002, .250),
    "Direct Sales":  (  920_000, .02, .005,  .480, .022,  .195,  .012,  .010, .020,  .026,  .012, -.001, .250),
}


def amounts(spec):
    """Los importes de una cuenta. Los deltas de coste van en negativo."""
    rev, disc, retn, cogs, mkt, payr, logi, rent, it, other, dna, fin, tax = spec

    discounts   = -rev * disc
    returns     = -rev * retn
    net_revenue = rev + discounts + returns

    cost_of_goods = -net_revenue * cogs
    gross_profit  = net_revenue + cost_of_goods

    opex = {
        "Marketing":         -net_revenue * mkt,
        "Payroll":           -net_revenue * payr,
        "Logistics":         -net_revenue * logi,
        "Rent & Facilities": -net_revenue * rent,
        "IT & Software":     -net_revenue * it,
        "Other Opex":        -net_revenue * other,
    }
    ebitda = gross_profit + sum(opex.values())

    depreciation = -net_revenue * dna
    ebit         = ebitda + depreciation
    financial    = net_revenue * fin          # negativo: coste financiero
    pre_tax      = ebit + financial
    taxes        = -pre_tax * tax if pre_tax > 0 else 0.0
    net_profit   = pre_tax + taxes

    values = {
        "Gross Revenue": rev, "Discounts": discounts, "Returns": returns,
        "Net Revenue": net_revenue, "Cost of Goods": cost_of_goods,
        "Gross Profit": gross_profit, "EBITDA": ebitda,
        "Depreciation": depreciation, "EBIT": ebit,
        "Financial Result": financial, "Taxes": taxes, "Net Profit": net_profit,
    }
    values.update(opex)
    return values, net_profit


def expand(detailed):
    """La estructura de lineas, con las partidas abiertas o sin abrir."""
    if not detailed:
        return [(o, name, t) for o, name, t in LINES]
    out, order = [], 0
    for _, name, t in LINES:
        if name in SPLITS:
            for sub, _share in SPLITS[name]:
                order += 1
                out.append((order, sub, "delta"))
        else:
            order += 1
            out.append((order, name, t))
    return out


def build(channel, spec, detailed):
    values, net = amounts(spec)
    rows = []
    for order, line, bar_type in expand(detailed):
        if line in [s for parts in SPLITS.values() for s, _ in parts]:
            parent = next(p for p, parts in SPLITS.items() if line in [s for s, _ in parts])
            share  = next(sh for s, sh in SPLITS[parent] if s == line)
            amount = values[parent] * share
        else:
            amount = values[line]
        # Objetivo: 3% mejor en ingresos y margenes, 2% mas contenido en costes.
        target = amount * (1.03 if amount >= 0 else 0.98)
        rows.append({
            "Channel": channel, "Order": order, "P&L Line": line,
            "BarType": bar_type, "Amount": round(amount, 2), "Target": round(target, 2),
        })
    return rows, net


def emit(detailed):
    name = "sample-pl-by-channel-detailed.csv" if detailed else "sample-pl-by-channel.csv"
    path = os.path.join(HERE, name)
    rows, all_ok = [], True

    for channel, spec in CHANNELS.items():
        channel_rows, _net = build(channel, spec, detailed)
        rows.extend(channel_rows)
        # El puente tiene que cerrar: arranque + todos los deltas = cierre.
        start  = channel_rows[0]["Amount"]
        deltas = sum(r["Amount"] for r in channel_rows if r["BarType"] == "delta")
        end    = channel_rows[-1]["Amount"]
        if abs(start + deltas - end) > 0.01:
            all_ok = False
            print("   NO CUADRA: %s  (desvio %.2f)" % (channel, start + deltas - end))

    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=["Channel", "Order", "P&L Line", "BarType", "Amount", "Target"])
        w.writeheader()
        w.writerows(rows)

    drivers = sum(1 for _, _, t in expand(detailed) if t == "delta")
    print("  %-34s %3d filas   %2d drivers/canal   %s"
          % (name, len(rows), drivers, "cuadra" if all_ok else "REVISAR"))
    return drivers


def main():
    print("Canal              Ingreso bruto   Beneficio neto   Margen")
    print("-" * 60)
    for channel, spec in CHANNELS.items():
        _values, net = amounts(spec)
        print("%-18s %13s   %14s   %5.1f%%"
              % (channel, "{:,.0f}".format(spec[0]), "{:,.0f}".format(net), net / spec[0] * 100))

    print()
    d1 = emit(False)
    d2 = emit(True)

    print()
    print("En Power BI:")
    print("  Categoria      -> P&L Line")
    print("  Valor          -> Amount     (Suma)")
    print("  Tipo de barra  -> BarType    (Primero / No resumir)")
    print("  Orden          -> Order")
    print("  Target         -> Target     (Suma)")
    print("  Y un segmentador con Channel.")
    print()
    print("  El limite del tier gratuito son 12 drivers individuales:")
    print("    - la version estandar (%d) cabe entera, no se agrupa nada" % d1)
    print("    - la detallada (%d) se pasa: se agrupan los mas pequenos en \"Others\"" % d2)
    print("      y el puente tiene que seguir cerrando en el mismo beneficio neto.")


if __name__ == "__main__":
    main()
