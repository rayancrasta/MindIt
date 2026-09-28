import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, DIAGRAM_KINDS, type DiagramKind } from '../api';
import { useProject } from '../context/ProjectContext';
import { MermaidDiagram } from '../components/Mermaid';
import { Tree } from '../components/Tree';

const KIND_LABELS: Record<DiagramKind, string> = {
  sequence: 'Sequence Diagrams',
  mermaid: 'Mermaid Diagrams',
};

function decodeSplat(splat: string | undefined): string {
  if (!splat) return '';
  return splat
    .split('/')
    .filter(Boolean)
    .map((s) => decodeURIComponent(s))
    .join('/');
}

function encodePath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join('/');
}

export function Diagrams() {
  const params = useParams<{ kind?: string; project?: string; '*': string }>();
  const navigate = useNavigate();
  const { project: ctxProject, setProject } = useProject();

  const kind: DiagramKind = DIAGRAM_KINDS.includes(params.kind as DiagramKind)
    ? (params.kind as DiagramKind)
    : 'mermaid';

  const routeProject = params.project;
  const path = decodeSplat(params['*']);

  useEffect(() => {
    if (!DIAGRAM_KINDS.includes(params.kind as DiagramKind)) {
      navigate(`/diagrams/mermaid${routeProject ? `/${encodeURIComponent(routeProject)}` : ''}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.kind]);

  useEffect(() => {
    if (routeProject) {
      if (routeProject !== ctxProject) setProject(routeProject);
    } else if (ctxProject) {
      navigate(`/diagrams/${kind}/${encodeURIComponent(ctxProject)}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeProject, ctxProject]);

  const project = routeProject ?? ctxProject;

  const treeQ = useQuery({
    queryKey: ['diagram-tree', project, kind],
    queryFn: () => api.diagrams.fullTree(project as string, undefined, kind),
    enabled: !!project,
  });

  const pageQ = useQuery({
    queryKey: ['diagram-page', project, path],
    queryFn: () => api.diagrams.page.get(project as string, path),
    enabled: !!project && !!path,
  });

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [project, path]);

  function select(p: string) {
    if (!project) return;
    const encoded = encodePath(p);
    navigate(`/diagrams/${kind}/${encodeURIComponent(project)}${encoded ? `/${encoded}` : ''}`);
  }

  async function copyLink() {
    if (!project) return;
    const url = `${window.location.origin}/diagrams/${kind}/${encodeURIComponent(project)}/${encodePath(path)}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  if (!project) {
    return <p className="text-slate-500">Create a project first from the sidebar.</p>;
  }

  const tree = treeQ.data ?? [];
  const diagram = pageQ.data;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
      <div className="card p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-500">{KIND_LABELS[kind]}</h2>
          <button onClick={() => select('')} className="btn-link" title="Diagrams root">
            Root
          </button>
        </div>
        {treeQ.isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : tree.length === 0 ? (
          <p className="mb-2 text-sm text-slate-400">No {kind} diagrams yet.</p>
        ) : (
          <Tree nodes={tree} selectedPath={path} onSelect={select} />
        )}
      </div>

      <div className="card min-h-[16rem] p-4">
        {!path ? (
          <p className="text-sm text-slate-400">Select a diagram from the tree to view it.</p>
        ) : pageQ.isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : pageQ.error || !diagram ? (
          <p className="text-sm text-red-600">
            {pageQ.error instanceof Error ? pageQ.error.message : `Diagram "${path}" not found.`}
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight">{diagram.title}</h1>
                <p className="truncate text-xs text-slate-400">
                  {path}.mmd · {diagram.kind} · Updated {new Date(diagram.updated).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={copyLink} className="btn-secondary px-2.5 py-1 text-xs">
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
              </div>
            </div>

            {diagram.content.trim() ? (
              <MermaidDiagram code={diagram.content} />
            ) : (
              <p className="text-sm text-slate-400">This diagram is empty.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
