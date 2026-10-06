import { useEffect, useRef, useState, type FormEvent, type ReactNode, type SVGProps } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useProject } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api';
import { FolderBrowserModal } from './FolderBrowserModal';

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      {...props}
    />
  );
}

const DashboardIcon = () => (
  <Icon>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
  </Icon>
);
const BacklogIcon = () => (
  <Icon>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <path d="M3 6h.01M3 12h.01M3 18h.01" />
  </Icon>
);
const BoardIcon = () => (
  <Icon>
    <rect x="3" y="4" width="7" height="16" rx="1.5" />
    <rect x="14" y="4" width="7" height="10" rx="1.5" />
  </Icon>
);
const WikiIcon = () => (
  <Icon>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
  </Icon>
);
const DeploymentsIcon = () => (
  <Icon>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </Icon>
);
const HandoffsIcon = () => (
  <Icon>
    <path d="M16 3v4M8 3v4" />
    <rect x="3" y="6" width="18" height="15" rx="2" />
    <path d="m8 14 3 3 5-6" />
  </Icon>
);
const ThoughtsIcon = () => (
  <Icon>
    <path d="M9 18h6" />
    <path d="M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />
  </Icon>
);
const MermaidDiagramsIcon = () => (
  <Icon>
    <circle cx="6" cy="6" r="2" />
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="12" r="2" />
    <path d="M8 7.2 16 11" />
    <path d="M8 16.8 16 13" />
  </Icon>
);
const SequenceDiagramsIcon = () => (
  <Icon>
    <path d="M5 3v18" />
    <path d="M19 3v18" />
    <path d="M5 8h11l-3-3" />
    <path d="M19 15H8l3 3" />
  </Icon>
);
const SchemasIcon = () => (
  <Icon>
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
    <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
  </Icon>
);
const WebSpecsIcon = () => (
  <Icon>
    <rect x="3" y="4" width="18" height="14" rx="2" />
    <path d="M3 9h18" />
    <path d="M8 14h8" />
  </Icon>
);
const MobileSpecsIcon = () => (
  <Icon>
    <rect x="7" y="2" width="10" height="20" rx="2" />
    <path d="M11 18h2" />
  </Icon>
);

const NAV = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon },
  { to: '/backlog', label: 'Backlog', icon: BacklogIcon },
  { to: '/board', label: 'Board', icon: BoardIcon },
  { to: '/wiki', label: 'Wiki', icon: WikiIcon },
  { to: '/deployments', label: 'Deployments', icon: DeploymentsIcon },
  { to: '/handoffs', label: 'Handoffs', icon: HandoffsIcon },
  { to: '/thoughts', label: 'Thoughts', icon: ThoughtsIcon },
  { to: '/diagrams/sequence', label: 'Sequence Diagrams', icon: SequenceDiagramsIcon },
  { to: '/diagrams/mermaid', label: 'Mermaid Diagrams', icon: MermaidDiagramsIcon },
  { to: '/schemas', label: 'Schemas', icon: SchemasIcon },
  { to: '/specs/web', label: 'Web Specs', icon: WebSpecsIcon },
  { to: '/specs/mobile', label: 'Mobile Specs', icon: MobileSpecsIcon },
];

const PAGE_TITLES = [
  { prefix: '/backlog', label: 'Backlog' },
  { prefix: '/board', label: 'Board' },
  { prefix: '/wiki', label: 'Wiki' },
  { prefix: '/deployments', label: 'Deployments' },
  { prefix: '/handoffs', label: 'Handoffs' },
  { prefix: '/thoughts', label: 'Thoughts' },
  { prefix: '/diagrams/sequence', label: 'Sequence Diagrams' },
  { prefix: '/diagrams/mermaid', label: 'Mermaid Diagrams' },
  { prefix: '/schemas', label: 'Schemas' },
  { prefix: '/specs/web', label: 'Web Specs' },
  { prefix: '/specs/mobile', label: 'Mobile Specs' },
  { prefix: '/projects', label: 'Projects' },
];

/** The item detail route renders its own item-specific heading, so it's deliberately not covered here. */
function pageTitle(pathname: string): string | null {
  if (pathname === '/') return 'Dashboard';
  return PAGE_TITLES.find((p) => pathname.startsWith(p.prefix))?.label ?? null;
}

/**
 * Wiki/Diagrams/Schemas/Specs bake the project into the URL and treat that as the source of
 * truth (they sync context to the route, not the other way round). So switching projects from
 * the sidebar has to navigate to that project's URL on these routes, or the page's own effect
 * immediately snaps context back to whatever project is already in the URL.
 */
function projectScopedPath(pathname: string, project: string): string | null {
  if (pathname.startsWith('/wiki')) return `/wiki/${encodeURIComponent(project)}`;
  const diagramsMatch = pathname.match(/^\/diagrams\/(sequence|mermaid)/);
  if (diagramsMatch) return `/diagrams/${diagramsMatch[1]}/${encodeURIComponent(project)}`;
  if (pathname.startsWith('/schemas')) return `/schemas/${encodeURIComponent(project)}`;
  const specsMatch = pathname.match(/^\/specs\/(web|mobile)/);
  if (specsMatch) return `/specs/${specsMatch[1]}/${encodeURIComponent(project)}`;
  return null;
}

export function Layout({ children }: { children: ReactNode }) {
  const { projects, project, setProject } = useProject();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [folderBrowserOpen, setFolderBrowserOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const currentProjectMeta = projects.find((p) => p.slug === project);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setProjectMenuOpen(false);
        setNewProjectOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setProjectMenuOpen(false);
        setNewProjectOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const idMatch = search.trim().match(/^#?(\d+)$/);
    if (!idMatch) return;
    navigate(`/item/${idMatch[1]}`);
    setSearch('');
  }

  function onSelectProject(p: string) {
    setProject(p);
    const scoped = projectScopedPath(location.pathname, p);
    if (scoped) navigate(scoped);
    setProjectMenuOpen(false);
  }

  function resetNewProjectForm() {
    setNewProjectName('');
    setCustomPath('');
    setCreateError(null);
    setNewProjectOpen(false);
  }

  async function onCreateProject(e: FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const meta = await api.projects.create({
        name: newProjectName.trim(),
        path: customPath.trim() || undefined,
      });
      qc.invalidateQueries({ queryKey: ['projects'] });
      setProject(meta.slug);
      resetNewProjectForm();
      setProjectMenuOpen(false);
      navigate('/backlog');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <aside className="flex h-full w-64 shrink-0 flex-col overflow-y-auto border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <Link to="/" className="flex items-center gap-2 px-4 pt-4 pb-3">
          <img src="/favicon.svg" alt="" className="size-6" />
          <span className="font-semibold tracking-tight">MindIt</span>
        </Link>

        <div ref={switcherRef} className="relative px-3 pb-2">
          <button
            onClick={() => setProjectMenuOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <span className="truncate">{currentProjectMeta?.name ?? project ?? 'Select project'}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3.5 shrink-0 text-neutral-400 dark:text-neutral-500"
            >
              <path d="m8 9 4-4 4 4" />
              <path d="m8 15 4 4 4-4" />
            </svg>
          </button>

          {projectMenuOpen && (
            <div className="absolute top-full left-3 z-20 mt-1 w-56 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
              {projects.length === 0 && !project && (
                <div className="px-2 py-1.5 text-sm text-neutral-400 dark:text-neutral-500">No projects yet</div>
              )}
              <div className="custom-scrollbar max-h-56 overflow-y-auto">
                {projects.map((p) => (
                  <button
                    key={p.slug}
                    onClick={() => onSelectProject(p.slug)}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                      p.slug === project
                        ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
                        : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {p.path && (
                      <span className="shrink-0 rounded bg-neutral-100 px-1 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                        external
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />

              {newProjectOpen ? (
                <form onSubmit={onCreateProject} className="flex flex-col gap-1.5 p-1">
                  <input
                    autoFocus
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Project name"
                    className="w-full min-w-0 rounded-md bg-neutral-100 px-2 py-1 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:bg-neutral-600"
                  />
                  {customPath ? (
                    <div className="flex items-center gap-1">
                      <span
                        title={customPath}
                        className="min-w-0 flex-1 truncate rounded-md bg-neutral-100 px-2 py-1 font-mono text-xs text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400"
                      >
                        {customPath}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCustomPath('')}
                        className="shrink-0 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFolderBrowserOpen(true)}
                      className="flex items-center gap-1 self-start text-xs font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300"
                    >
                      Use a custom folder…
                    </button>
                  )}
                  {createError && <p className="text-xs text-red-500">{createError}</p>}
                  <div className="flex items-center gap-1">
                    <button
                      type="submit"
                      disabled={creating}
                      className="shrink-0 rounded-md bg-violet-600 px-2 py-1 text-sm text-white hover:bg-violet-500 disabled:opacity-50 dark:bg-violet-500 dark:hover:bg-violet-400"
                    >
                      {creating ? 'Creating…' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={resetNewProjectForm}
                      className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setNewProjectOpen(true)}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                  <span className="text-base leading-none">+</span> New project
                </button>
              )}

              <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />

              <Link
                to="/projects"
                onClick={() => setProjectMenuOpen(false)}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                Manage projects
              </Link>
            </div>
          )}

          {folderBrowserOpen && (
            <FolderBrowserModal
              onClose={() => setFolderBrowserOpen(false)}
              onSelect={(p) => {
                setCustomPath(p);
                setFolderBrowserOpen(false);
              }}
            />
          )}
        </div>

        <form onSubmit={onSearch} className="relative px-3 pb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute top-1/2 left-5.5 size-3.5 -translate-y-1/2 text-neutral-400 dark:text-neutral-500"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find by # …"
            className="w-full rounded-lg bg-neutral-100 py-1.5 pr-3 pl-8 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-colors focus:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:bg-neutral-700"
          />
        </form>

        <nav className="flex flex-col gap-0.5 px-3 py-1">
          {NAV.map((n) => {
            const active = location.pathname === n.to || location.pathname.startsWith(`${n.to}/`);
            const NavIcon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                }`}
              >
                <NavIcon />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-3 pb-4">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79" />
              </svg>
            )}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div
          className={`mx-auto p-4 pt-8 ${
            location.pathname.startsWith('/schemas') || location.pathname.startsWith('/specs') ? 'max-w-none' : 'max-w-6xl'
          }`}
        >
          {pageTitle(location.pathname) && (
            <h1 className="mb-4 text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              {pageTitle(location.pathname)}
            </h1>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
