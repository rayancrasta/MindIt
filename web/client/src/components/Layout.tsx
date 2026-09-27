import { useEffect, useRef, useState, type FormEvent, type ReactNode, type SVGProps } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { slugify } from '../api';

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
const DiagramsIcon = () => (
  <Icon>
    <circle cx="6" cy="6" r="2" />
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="12" r="2" />
    <path d="M8 7.2 16 11" />
    <path d="M8 16.8 16 13" />
  </Icon>
);
const SchemasIcon = () => (
  <Icon>
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
    <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
  </Icon>
);

const NAV = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon },
  { to: '/backlog', label: 'Backlog', icon: BacklogIcon },
  { to: '/board', label: 'Board', icon: BoardIcon },
  { to: '/wiki', label: 'Wiki', icon: WikiIcon },
  { to: '/deployments', label: 'Deployments', icon: DeploymentsIcon },
  { to: '/diagrams', label: 'Diagrams', icon: DiagramsIcon },
  { to: '/schemas', label: 'Schemas', icon: SchemasIcon },
];

export function Layout({ children }: { children: ReactNode }) {
  const { projects, project, setProject } = useProject();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const switcherRef = useRef<HTMLDivElement>(null);

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
    setProjectMenuOpen(false);
  }

  function onCreateProject(e: FormEvent) {
    e.preventDefault();
    const name = slugify(newProjectName);
    if (!name) return;
    setProject(name);
    setNewProjectName('');
    setNewProjectOpen(false);
    setProjectMenuOpen(false);
    navigate('/backlog');
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
            <span className="truncate">{project ?? 'Select project'}</span>
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
              {project && !projects.includes(project) && (
                <button
                  onClick={() => onSelectProject(project)}
                  className="flex w-full items-center justify-between rounded-md bg-violet-500/15 px-2 py-1.5 text-left text-sm text-violet-700 dark:text-violet-300"
                >
                  <span className="truncate">{project} (new)</span>
                </button>
              )}
              <div className="custom-scrollbar max-h-56 overflow-y-auto">
                {projects.map((p) => (
                  <button
                    key={p}
                    onClick={() => onSelectProject(p)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                      p === project
                        ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
                        : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <span className="truncate">{p}</span>
                  </button>
                ))}
              </div>

              <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />

              {newProjectOpen ? (
                <form onSubmit={onCreateProject} className="flex items-center gap-1 p-1">
                  <input
                    autoFocus
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Project name"
                    className="w-full min-w-0 rounded-md bg-neutral-100 px-2 py-1 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:bg-neutral-600"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-md bg-violet-600 px-2 py-1 text-sm text-white hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400"
                  >
                    Add
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setNewProjectOpen(true)}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                  <span className="text-base leading-none">+</span> New project
                </button>
              )}
            </div>
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
        <div className={`mx-auto p-4 pt-8 ${location.pathname.startsWith('/schemas') ? 'max-w-none' : 'max-w-6xl'}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
