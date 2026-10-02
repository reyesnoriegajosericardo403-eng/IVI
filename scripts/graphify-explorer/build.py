#!/usr/bin/env python3
"""Genera graphify-out/explorer.html a partir de graphify-out/graph.json.

Uso (despues de `graphify update .`):
    python3 scripts/graphify-explorer/build.py

Solo usa la libreria estandar. El HTML resultante es autocontenido (sin CDN).
Los pendientes se leen de las casillas `- [ ]` / `- [x]` de
docs/memoria-proyecto/06-pendientes.md (ver el formato en ese archivo).
"""
import collections
import datetime
import json
import os
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
GRAPH = ROOT / "graphify-out" / "graph.json"
OUT = ROOT / "graphify-out" / "explorer.html"
TEMPLATE = pathlib.Path(__file__).with_name("template.html")
PENDING_MD = ROOT / "docs" / "memoria-proyecto" / "06-pendientes.md"

LAYERS = [
    ("ui", "Pantallas", "Lo que la persona ve y toca"),
    ("visual", "Piezas visuales", "Componentes, tema y hooks reutilizables"),
    ("logic", "Lógica y estado", "Estado global, servicios, proveedores e IA"),
    ("data", "Datos y utilidades", "Catálogos fijos y cálculos"),
    ("backend", "Backend (Supabase)", "Base de datos y funciones en la nube"),
    ("web", "Web, PWA y configuración", "Service worker, manifest y ajustes de la app"),
    ("docs", "Documentación", "Memoria del proyecto, planes y guías"),
]
LAYER_ORDER = {k: i for i, (k, _, _) in enumerate(LAYERS)}

PREFIX_RULES = [
    ("app/", "ui"),
    ("src/components/", "visual"),
    ("src/theme/", "visual"),
    ("src/hooks/", "visual"),
    ("src/store/", "logic"),
    ("src/services/", "logic"),
    ("src/providers/", "logic"),
    ("src/ai/", "logic"),
    ("src/data/", "data"),
    ("src/utils/", "data"),
    ("supabase/", "backend"),
    ("docs/", "docs"),
    ("public/", "web"),
    ("diagnostico-organizacional/", "web"),
]
DOC_ROOT_FILES = {"README.md", "AGENTS.md", "CLAUDE.md", "LICENSE"}

GROUP_NAMES = {
    "app": "Pantallas sueltas",
    "app/(tabs)": "Pestañas principales",
    "app/institucion/[id]": "Institución y producto",
    "app/transaction": "Detalle de movimiento",
    "app/budget-template": "Plantilla de presupuesto",
    "src/components": "Componentes",
    "src/components/investments": "Componentes de inversiones",
    "src/theme": "Tema y estilo",
    "src/hooks": "Hooks",
    "src/store": "Estado global",
    "src/services": "Servicios (raíz)",
    "src/services/auth": "Servicio: sesión",
    "src/services/investments": "Servicio: inversiones",
    "src/services/market": "Servicio: mercado",
    "src/services/notifications": "Servicio: avisos",
    "src/services/supabase": "Servicio: Supabase",
    "src/services/sync": "Servicio: sincronización",
    "src/services/themes": "Servicio: temas",
    "src/providers": "Proveedores (raíz)",
    "src/providers/llm": "Proveedores de IA",
    "src/providers/llm/clients": "Clientes de IA",
    "src/providers/local": "Proveedores locales",
    "src/providers/market": "Proveedor de mercado",
    "src/providers/notifications": "Proveedor de avisos",
    "src/ai": "Motor de IA y voz",
    "src/data": "Catálogos y datos fijos",
    "src/utils": "Utilidades y cálculos",
    "supabase": "Supabase (raíz)",
    "supabase/functions/_shared": "Funciones: código compartido",
    "supabase/functions/ai-relay": "Función: ai-relay",
    "supabase/functions/delete-account": "Función: delete-account",
    "supabase/functions/market-data": "Función: market-data",
    "supabase/functions/push-notify": "Función: push-notify",
    "supabase/migrations": "Migraciones SQL",
    "docs": "Planes y auditorías",
    "docs/memoria-proyecto": "Memoria del proyecto",
    "public": "Archivos públicos (PWA)",
    "diagnostico-organizacional": "Diagnóstico organizacional (mini-app)",
    ".": "Raíz del proyecto",
}

REL_CODES = [
    "calls", "imports", "imports_from", "references", "indirect_call", "indexes",
    "method", "inherits", "triggers", "cites", "extends", "dynamic_import",
]
PARENT_RELS = {"contains"}


def layer_of(path):
    if "/" not in path:
        return "docs" if path in DOC_ROOT_FILES else "web"
    for prefix, layer in PREFIX_RULES:
        if path.startswith(prefix):
            return layer
    return "web"


def kind_of(n, is_file):
    if is_file:
        return "file"
    ft = n.get("file_type")
    sf = n.get("source_file") or ""
    label = n.get("label") or ""
    if ft == "document":
        return "doc"
    if ft == "concept":
        return "pkg" if sf == "package.json" else "ref"
    if sf.endswith(".sql") or (not sf and "." in label):
        if label.endswith("_idx") or "_idx" in label:
            return "idx"
        if label.startswith(("public.", "auth.")):
            return "table"
        return "sql"
    if sf.endswith(".json"):
        return "cfg"
    if n.get("_callable_class"):
        return "type"
    if n.get("_callable"):
        return "fn"
    return "el"


def parse_pending():
    """Lee casillas `- [ ] **Titulo** — detalle · requiere: X · archivos: a, b`."""
    if not PENDING_MD.exists():
        return []
    items = []
    section = ""
    rx = re.compile(r"^- \[( |x|X)\]\s+\*\*(.+?)\*\*\s*(?:[—-]\s*)?(.*)$")
    for line in PENDING_MD.read_text(encoding="utf-8").splitlines():
        if line.startswith("### "):
            section = line[4:].strip()
            continue
        m = rx.match(line.strip())
        if not m:
            continue
        done = m.group(1).lower() == "x"
        title = m.group(2).strip()
        rest = re.sub(r"^[·\s]+", "", m.group(3) or "")
        parts = [p.strip() for p in re.split(r"\s+·\s+", rest)]
        detail, req, files = [], [], []
        for p in parts:
            low = p.lower()
            if low.startswith("requiere:"):
                req = [x.strip() for x in p.split(":", 1)[1].split(",") if x.strip()]
            elif low.startswith("archivos:"):
                files = [x.strip().strip("`") for x in p.split(":", 1)[1].split(",") if x.strip()]
            elif p:
                detail.append(p)
        items.append({
            "done": done, "title": title, "detail": " · ".join(detail),
            "req": req, "files": files, "section": section,
        })
    return items


def main():
    g = json.loads(GRAPH.read_text(encoding="utf-8"))
    nodes = g["nodes"]
    links = g.get("links") or g.get("edges") or []
    byid = {n["id"]: n for n in nodes}

    # nodos sin archivo (tablas externas, etc.): heredan el archivo de un vecino
    neigh = collections.defaultdict(list)
    for l in links:
        neigh[l["source"]].append(l["target"])
        neigh[l["target"]].append(l["source"])
    file_of = {}
    for n in nodes:
        sf = n.get("source_file") or ""
        if not sf:
            for o in neigh[n["id"]]:
                sf = byid[o].get("source_file") or ""
                if sf:
                    break
        file_of[n["id"]] = sf

    paths = sorted({p for p in file_of.values() if p})
    path_idx = {p: i for i, p in enumerate(paths)}

    groups, group_idx, files = [], {}, []
    for p in paths:
        d = os.path.dirname(p) or "."
        layer = layer_of(p)
        if d not in group_idx:
            group_idx[d] = len(groups)
            groups.append({"path": d, "label": GROUP_NAMES.get(d, d), "layer": LAYER_ORDER[layer]})
        files.append({"path": p, "name": os.path.basename(p), "g": group_idx[d], "n": 0})
    order = sorted(range(len(groups)), key=lambda i: (groups[i]["layer"], groups[i]["path"]))
    remap = {old: new for new, old in enumerate(order)}
    groups = [groups[i] for i in order]
    for f in files:
        f["g"] = remap[f["g"]]

    out_nodes, node_idx, packages, refs = [], {}, collections.defaultdict(set), collections.defaultdict(set)
    for n in nodes:
        sf = file_of[n["id"]]
        is_file = bool(sf) and n.get("label") == os.path.basename(sf) and n.get("file_type") != "document"
        k = kind_of(n, is_file)
        fi = path_idx.get(sf, -1)
        if k in ("pkg", "ref"):
            continue
        node_idx[n["id"]] = len(out_nodes)
        loc = n.get("source_location") or ""
        ln = int(loc[1:]) if re.fullmatch(r"L\d+", str(loc)) else 0
        out_nodes.append({"l": n["label"], "f": fi, "ln": ln, "k": k})
        if fi >= 0 and k != "file":
            files[fi]["n"] += 1

    edges, seen, parent = [], set(), {}
    for l in links:
        rel = l["relation"]
        s, t = byid[l["source"]], byid[l["target"]]
        if rel in PARENT_RELS:
            if l["source"] in node_idx and l["target"] in node_idx:
                parent.setdefault(node_idx[l["target"]], node_idx[l["source"]])
            continue
        if t["id"] not in node_idx:
            fi = path_idx.get(file_of[s["id"]], -1)
            if fi >= 0:
                (packages if kind_of(t, False) == "pkg" else refs)[fi].add(t["label"])
            continue
        if s["id"] not in node_idx or rel not in REL_CODES:
            continue
        key = (node_idx[s["id"]], node_idx[t["id"]], rel)
        if key in seen:
            continue
        seen.add(key)
        edges.append([key[0], key[1], REL_CODES.index(rel)])

    deg = collections.Counter()
    for a, b, _ in edges:
        deg[a] += 1
        deg[b] += 1
    for i, nd in enumerate(out_nodes):
        nd["p"] = parent.get(i, -1)
        nd["d"] = deg[i]

    pending = parse_pending()
    for p in pending:
        resolved = []
        for ref in p["files"]:
            if ref.endswith("/"):
                resolved += [i for i, f in enumerate(files) if f["path"].startswith(ref)]
            elif ref in path_idx:
                resolved.append(path_idx[ref])
            else:
                print(f"  aviso: el pendiente «{p['title'][:40]}» apunta a un archivo que no está en el grafo: {ref}")
        p["fi"] = sorted(set(resolved))

    data = {
        "meta": {
            "commit": (g.get("built_at_commit") or "")[:7],
            "generated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d"),
            "nodes": len(out_nodes), "files": len(files), "edges": len(edges),
        },
        "layers": [{"id": k, "title": t, "sub": s} for k, t, s in LAYERS],
        "rels": REL_CODES,
        "groups": groups,
        "files": files,
        "nodes": out_nodes,
        "edges": edges,
        "pk": {str(k): sorted(v) for k, v in packages.items()},
        "rf": {str(k): sorted(v) for k, v in refs.items()},
        "pend": pending,
    }
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = TEMPLATE.read_text(encoding="utf-8").replace("/*__DATA__*/null", payload)
    OUT.write_text(html, encoding="utf-8")
    print(f"explorer.html: {len(files)} archivos, {len(out_nodes)} elementos, "
          f"{len(edges)} conexiones, {len(pending)} pendientes -> {OUT.relative_to(ROOT)} "
          f"({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
