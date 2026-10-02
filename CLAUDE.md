@AGENTS.md

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- Right after, regenerate the organized explorer (search in Spanish + text summaries + layered map): `python3 scripts/graphify-explorer/build.py` → `graphify-out/explorer.html`.

## Pendientes (lista viva)

- The living to-do list is the checklist at the top of `docs/memoria-proyecto/06-pendientes.md` (`- [ ]` / `- [x]`, each tagged `requiere: Mac | iPhone | Android | Supabase web | Tu decisión | Claude` and `archivos:`). The explorer's «Pendientes» tab reads it.
- When the user says they now have a Mac (or asks "qué falta"), read that checklist and walk them step by step through the open `requiere: Mac` items. When something gets done, flip it to `[x]` and rebuild the explorer.
- The user works mostly from an iPad (no terminal): prefer steps doable from the Supabase web UI and give any SQL/text inline in chat.
