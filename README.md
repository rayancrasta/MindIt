<p align="center">
  <img src="docs/logo.png" width="120" height="120" alt="MindIt logo">
</p>

<h1 align="center">MindIt</h1>

<p align="center">
  A lightweight ADO-style work tracker (Feature → Story → Task/Bug) usable two ways —<br>
  entirely through natural language via a Claude Code MCP server, and through a real<br>
  drag-and-drop web UI. Plain markdown files with YAML frontmatter are the single source<br>
  of truth for both — no database, no cache, every file safe to hand-edit directly.
</p>

<p align="center">
  <a href="#getting-started"><b>Getting started</b></a> ·
  <a href="#data-model"><b>Data model</b></a> ·
  <a href="#wiki"><b>Wiki</b></a> ·
  <a href="#deployment-notes"><b>Deployment notes</b></a> ·
  <a href="#diagrams"><b>Diagrams</b></a> ·
  <a href="#tools-41"><b>Tools</b></a> ·
  <a href="#skills"><b>Skills</b></a>
</p>

## Screenshots

<table>
<tr>
<td><img src="docs/screenshots/dashboard.png" alt="Dashboard" width="420"><br><sub>Dashboard — status counts + pending work</sub></td>
<td><img src="docs/screenshots/backlog.png" alt="Backlog" width="420"><br><sub>Backlog — expandable Feature → Story → Task/Bug tree</sub></td>
</tr>
<tr>
<td><img src="docs/screenshots/board.png" alt="Board" width="420"><br><sub>Board — drag-and-drop Kanban, swimlaned by Feature</sub></td>
<td><img src="docs/screenshots/wiki.png" alt="Wiki" width="420"><br><sub>Wiki — folder/page tree</sub></td>
</tr>
<tr>
<td><img src="docs/screenshots/wiki-page.png" alt="Wiki page" width="420"><br><sub>Wiki page — markdown body with in-app links</sub></td>
</tr>
</table>

## Getting started

### Web UI

```
cd web && npm install --prefix server && npm install --prefix client && npm install
npm run dev
```

Opens the API on `http://localhost:4001` and the app on `http://localhost:5173` (Vite
proxies `/api` to the Express server). Local-only, no auth — same trust model as the MCP
server.

- `web/server` — a small Express API (TypeScript, run via `tsx`) that imports the store
  functions in `src/store/*.ts` directly, rather than going through the MCP protocol.
  Every item's globally unique numeric id makes `GET/PATCH/DELETE /api/items/:id` work
  regardless of type or project, mirroring `get_item`.
- `web/client` — React + Vite + TypeScript + Tailwind, with six views: **Dashboard**
  (status counts + pending work, like `get_status`/`get_resume`), **Backlog** (an
  expandable Feature → Story → Task/Bug tree, the primary place to create items — each
  Feature row shows its `completed/total` Story count), **Board** (a real drag-and-drop
  Kanban — Stories swimlaned by Feature, or a Tasks/Bugs board scoped to one Story —
  dragging a card between columns updates its status; each Feature's lane shows the same
  `completed/total` count even while collapsed), **Item detail** (full read/edit/delete
  view, reachable by clicking a card or typing a bare number into the search box),
  **Wiki** (`/wiki/<project>/<path>` — a folder/page tree with the same write/preview
  markdown editor used for Notes and Comments, plus a "Copy link" button for pasting a
  page into a comment elsewhere), and **Diagrams** (`/diagrams/<project>/<path>` — the
  same folder/page tree pattern as the Wiki, but each page is Mermaid source rendered
  live as an SVG, with a write/preview editor and its own "Copy link" button). On both
  Backlog and Board, a Feature whose Stories are all done drops into a collapsed "Show
  Completed" section so the active work stays in view. A sun/moon toggle in the header
  switches between light and dark — both built on a single restrained neutral-gray
  palette (Tailwind's `neutral` scale, not the bluish `slate`) with color reserved for
  status/type badges and primary actions, closer to Notion/Claude/OpenAI than a typical
  "bright gradient + saturated dark mode" admin UI.

`web/` reads and writes the exact same `data/` files as the MCP server — a work item
created via `/add-to-work` shows up on the board on refresh, and a card dragged on the
board shows up in `/resume` next session. No second source of truth.

### MCP server (Claude Code)

Registered as a user-scope Claude Code MCP server, so it's available from any project
directory:

```
claude mcp add --scope user work-tracker -- npx tsx /home/rayan/projects/MindIt/src/server.ts
```

Run standalone for debugging: `npm start` (hangs waiting on stdio — that's expected; a real
MCP client keeps stdin open).

## Data model

```
Feature
  └─ Story (required parent: a Feature)
       ├─ Task (required parent: a Story)
       └─ Bug  (optional parent: a Story — can stand alone)

Story ←→ Story   (symmetric "related to" link, no direction)
```

Statuses (same five across all four item types): `new`, `in_progress`, `testing`,
`resolved`, `closed`.

A Feature's completion is always *derived*, never stored on the Feature itself: a Story
counts as done once it's `resolved` or `closed`, and a Feature is complete once it has at
least one Story and every Story is done (a Feature with zero Stories is never complete).
`list_features` reports each Feature's `completed/total` Story count and a `[COMPLETE]`
marker; the web UI shows the same count and groups complete Features under "Show
Completed" (see Web UI, above).

The Wiki and Diagrams sections sit outside this hierarchy entirely — both are
path-addressed content, not work items, so neither has a status or a parent/child link
into Feature/Story/Task/Bug.

## IDs

Every feature/story/task/bug gets a plain sequential number (`1`, `2`, `3`, …) from a single
counter shared across **all** projects and item types (`data/.counter`) — the same way ADO
work item IDs work. A number always identifies exactly one thing, so you can find, update, or
link anything by number alone without saying what type it is or which project it's in
(`get_item`, below). Lookups accept a bare number, a `#`-prefixed number, or a zero-padded
number interchangeably (`3`, `#3`, `00003` all match id `3`); a title substring still works
too as a fallback.

## File layout

```
data/<project-slug>/
  features/<zero-padded-id>.md
  stories/<zero-padded-id>.md
  tasks/<zero-padded-id>.md
  bugs/<zero-padded-id>.md
  wiki/<...folders>/<page>.md   # nested knowledge base, Obsidian-style
  deployments/<zero-padded-id>.md   # deployment history
  diagrams/<...folders>/<page>.mmd   # nested Mermaid diagrams, same layout as wiki/
  LOG.md          # append-only session log, newest entry first
data/.counter     # shared id counter, global across all projects/types
```

Each item file is YAML frontmatter (`id`, `type`, `project`, `title`, `status`, `created`,
`updated`, plus `feature`/`story`/`links` where applicable) followed by free-text notes.

## Wiki

A per-project knowledge base, laid out as nested folders and markdown pages
(`data/<project-slug>/wiki/…`), the same way an Obsidian vault works — unlike
features/stories/tasks/bugs, a page is addressed by its **path** (e.g.
`Architecture/Database Design`), not a number, since it's knowledge content rather than a
work item. Each page is YAML frontmatter (`title`, `created`, `updated`) plus a markdown
body. Folders are plain directories that exist only while they contain something.

| Tool | What it does |
|---|---|
| `create_wiki_page` | Create a page at a path (creates parent folders); fails if it already exists |
| `update_wiki_page` | Overwrite a page's full body |
| `append_wiki_page` | Append markdown to a page, creating it if it doesn't exist yet — the everyday "write this down" tool |
| `read_wiki_page` | Read a page's title + body |
| `delete_wiki_page` | Delete a page |
| `list_wiki` | List a folder's contents (one level, or `recursive: true` for the full tree) |

There's no dedicated "linked wiki pages" field on features/stories/tasks/bugs — link to a
page the same way you'd link to anything else: paste a markdown link into a Notes field or
`add_comment`, e.g. `[Database design](/wiki/daybreak-oxford/Architecture/Database%20Design)`.
Every wiki tool's response includes this pasteable link. The web UI's `/wiki` page renders
the same tree with a "Copy link" button, and same-origin links in Notes/Comments (`/wiki/…`,
`/item/…`) navigate in-app instead of opening a new tab.

## Deployment Notes

A per-project deploy history — record what commit went out, when, to which environment, and
how it went. Numbered the same way as features/stories/tasks/bugs (shares the global id
counter), stored at `data/<project-slug>/deployments/<zero-padded-id>.md`.

| Tool | What it does |
|---|---|
| `add_deployment_note` | Record a deployment: `project` + `commitHash` are required; `environment` (default `production`), `status` (`success`/`failed`/`rolled_back`, default `success`), `deployedBy` (default: local OS username), and `timestamp` (default: now) can all be overridden |
| `list_deployment_notes` | List deployment notes, optionally filtered by project/environment/status |
| `get_deployment_note` | Look up one deployment note by number |
| `update_deployment_note` | Correct any field after the fact (e.g. mark a deploy `rolled_back` later) |
| `delete_deployment_note` | Delete a deployment note |

`get_resume` includes the most recent deployment note per project (`lastDeployment`)
alongside the last session entry, so `/resume` surfaces what was last shipped.

## Diagrams

A per-project collection of Mermaid diagrams, laid out with the exact same nested
folder/page structure as the Wiki (`data/<project-slug>/diagrams/…`), addressed by path
rather than a number for the same reason. The difference is what each page holds: instead
of a markdown body, a diagram's frontmatter (`title`, `created`, `updated`) is followed by
raw Mermaid source (e.g. `graph TD\n  A --> B`) — the file *is* the diagram definition, not
prose wrapped around one.

| Tool | What it does |
|---|---|
| `create_diagram` | Create a diagram at a path (creates parent folders); fails if it already exists |
| `update_diagram` | Overwrite a diagram's full Mermaid source |
| `read_diagram` | Read a diagram's title + Mermaid source |
| `delete_diagram` | Delete a diagram |
| `list_diagrams` | List a folder's contents (one level, or `recursive: true` for the full tree) |

There's no `append_diagram` — unlike wiki prose, Mermaid source has a strict grammar
(it starts with a single diagram-type declaration like `graph TD` or `sequenceDiagram`),
so blindly appending text is much more likely to break it than help; `update_diagram`
(full overwrite) is the only edit operation.

Diagrams are referenced from wiki pages, item notes, or comments the same way wiki pages
reference each other — paste the link, e.g.
`[Deploy flow](/diagrams/daybreak-oxford/Infra/Deploy%20Flow)`. It's a plain clickable
link, not an auto-embed — visiting it opens the diagram's own page, rendered live as an
SVG. Every diagram tool's response includes this pasteable link. The web UI's `/diagrams`
page mirrors `/wiki` exactly (tree sidebar, write/preview editor, "Copy link" button),
except Preview renders the actual Mermaid diagram instead of markdown, and an invalid
diagram shows an inline error instead of crashing the page.

## Tools (41)

| Verb | Feature | Story | Task | Bug |
|---|---|---|---|---|
| add | `add_feature` | `add_story` | `add_task` | `add_bug` |
| update | `update_feature` | `update_story` | `update_task` | `update_bug` |
| delete | `delete_feature` | `delete_story` | `delete_task` | `delete_bug` |
| list | `list_features` | `list_stories` | `list_tasks` | `list_bugs` |

Plus: `link_stories`, `unlink_stories`, `get_status` (counts by type/status), `log_session`,
`get_resume` (pending items + last session + last deployment, per-project or cross-project),
`get_item` (look up any item by number alone, regardless of type or project),
`add_comment`/`update_comment`/`delete_comment` (ADO-style comment threads on any item), and
the wiki, deployment note, and diagram tools — see above.

Deleting a Feature/Story with children attached is blocked with a warning unless `force:
true` is passed; force-delete leaves children pointing at a now-missing parent id (a stale
reference is cosmetic for a personal, hand-editable tool — not auto-resolved).

The id counter is a plain read-increment-write on `data/.counter`, not lock-protected —
fine for single-user use, but two truly simultaneous creates could in theory race. Not a
concern this tool is designed to guard against.

## Skills

- `/add-to-work` — infers project + item type from what you say, calls the matching `add_*` tool.
- `/resume` — calls `get_resume` and narrates pending work + last session.

## Confidentiality

`data/` will contain real notes about client work, so it's gitignored — it never
leaves this machine via git. The filesystem is still the only source of truth (nothing
about the tool's design depends on `data/` being tracked); it just isn't pushed anywhere.
Back it up separately if you want that.
