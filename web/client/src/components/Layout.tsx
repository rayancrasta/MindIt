import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { slugify } from '../api';

const NAV = [
  { to: '/', label: 'Dashboard' },
  { to: '/backlog', label: 'Backlog' },
  { to: '/board', label: 'Board' },
  { to: '/wiki', label: 'Wiki' },
  { to: '/deployments', label: 'Deployments' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { projects, project, setProject } = useProject();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const idMatch = search.trim().match(/^#?(\d+)$/);
    if (!idMatch) return;
    navigate(`/item/${idMatch[1]}`);
    setSearch('');
  }

  function onCreateProject(e: FormEvent) {
    e.preventDefault();
    const name = slugify(newProjectName);
    if (!name) return;
    setProject(name);
    setNewProjectName('');
    setNewProjectOpen(false);
    navigate('/backlog');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 text-white shadow-md shadow-blue-500/20">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Link to="/" className="flex items-center gap-2 pr-1">
            <img src="/favicon.svg" alt="" className="size-6 drop-shadow-sm" />
            <span className="font-semibold tracking-tight">MindIt</span>
          </Link>

          <div className="relative">
            <select
              value={project ?? ''}
              onChange={(e) => setProject(e.target.value)}
              className="appearance-none rounded-full bg-white/10 py-1 pr-7 pl-3 text-sm font-medium outline-none transition-colors hover:bg-white/15 focus:bg-white/20"
            >
              {projects.length === 0 && !project && <option value="">No projects yet</option>}
              {project && !projects.includes(project) && (
                <option value={project} className="text-black">
                  {project} (new)
                </option>
              )}
              {projects.map((p) => (
                <option key={p} value={p} className="text-black">
                  {p}
                </option>
              ))}
            </select>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-white/70"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>

          {newProjectOpen ? (
            <form onSubmit={onCreateProject} className="flex items-center gap-1">
              <input
                autoFocus
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onBlur={() => !newProjectName && setNewProjectOpen(false)}
                placeholder="Project name"
                className="w-36 rounded-full bg-white/10 px-3 py-1 text-sm placeholder-white/60 outline-none focus:bg-white/20"
              />
              <button type="submit" className="rounded-full bg-white/10 px-2.5 py-1 text-sm hover:bg-white/20">
                Add
              </button>
            </form>
          ) : (
            <button
              onClick={() => setNewProjectOpen(true)}
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-sm font-medium transition-colors hover:bg-white/20"
            >
              <span className="text-base leading-none">+</span> Project
            </button>
          )}

          <form onSubmit={onSearch} className="relative ml-auto">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-white/60"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find by # …"
              className="w-44 rounded-full bg-white/10 py-1 pr-3 pl-8 text-sm placeholder-white/60 outline-none transition-colors focus:bg-white/20 focus:w-56"
            />
          </form>

          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4.5">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4.5">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79" />
              </svg>
            )}
          </button>
        </div>
        <nav className="flex gap-1 px-3 pb-1">
          {NAV.map((n) => {
            const active = location.pathname === n.to || location.pathname.startsWith(`${n.to}/`);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}
