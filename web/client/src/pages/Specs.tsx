import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  SPEC_PLATFORMS,
  SPEC_STATUSES,
  SPEC_TEST_TYPES,
  type SpecPlatform,
  type SpecStatus,
  type SpecTestCase,
  type SpecTestType,
  type SpecTransition,
} from '../api';
import { useProject } from '../context/ProjectContext';
import { Tree } from '../components/Tree';
import { SpecTransitionsList } from '../components/SpecTransitionsList';
import { SpecRelationsView } from '../components/SpecRelationsView';
import { journeyKeyForPath, journeyLabel } from '../components/specJourneys';
import type { OtherScreenLookup } from '../components/specLayout';

const PLATFORM_LABELS: Record<SpecPlatform, string> = { web: 'Web Specs', mobile: 'Mobile Specs' };
const STATUS_STYLE: Record<SpecStatus, string> = {
  draft: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
  in_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
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

interface TransitionDraft {
  label: string;
  target: string;
  external: string;
}

interface TestCaseDraft {
  type: SpecTestType;
  description: string;
}

interface ScreenDraft {
  title: string;
  designUrl: string;
  status: SpecStatus;
  tagsText: string;
  entryPoints: TransitionDraft[];
  exitPoints: TransitionDraft[];
  acceptanceCriteriaText: string;
  testCases: TestCaseDraft[];
  codeRefsText: string;
  dataRefsText: string;
  description: string;
}

function toTransitionDraft(t: SpecTransition): TransitionDraft {
  return { label: t.label, target: t.target ?? '', external: t.external ?? '' };
}

function fromTransitionDraft(t: TransitionDraft): SpecTransition | null {
  if (!t.label.trim()) return null;
  if (t.target.trim()) return { label: t.label.trim(), target: t.target.trim() };
  if (t.external.trim()) return { label: t.label.trim(), external: t.external.trim() };
  return null;
}

const emptyTransition = (): TransitionDraft => ({ label: '', target: '', external: '' });
const emptyTestCase = (): TestCaseDraft => ({ type: 'unit', description: '' });

function draftFromScreen(screen: {
  title: string;
  designUrl?: string;
  status: SpecStatus;
  tags?: string[];
  entryPoints: SpecTransition[];
  exitPoints: SpecTransition[];
  acceptanceCriteria?: string[];
  testCases?: SpecTestCase[];
  codeRefs?: string[];
  dataRefs?: string[];
  description: string;
}): ScreenDraft {
  return {
    title: screen.title,
    designUrl: screen.designUrl ?? '',
    status: screen.status,
    tagsText: (screen.tags ?? []).join(', '),
    entryPoints: screen.entryPoints.map(toTransitionDraft),
    exitPoints: screen.exitPoints.map(toTransitionDraft),
    acceptanceCriteriaText: (screen.acceptanceCriteria ?? []).join('\n'),
    testCases: (screen.testCases ?? []).map((t) => ({ type: t.type, description: t.description })),
    codeRefsText: (screen.codeRefs ?? []).join('\n'),
    dataRefsText: (screen.dataRefs ?? []).join('\n'),
    description: screen.description,
  };
}

function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function draftToPayload(d: ScreenDraft, title?: string) {
  return {
    title: title ?? d.title,
    designUrl: d.designUrl.trim(),
    status: d.status,
    tags: d.tagsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    entryPoints: d.entryPoints.map(fromTransitionDraft).filter((t): t is SpecTransition => t !== null),
    exitPoints: d.exitPoints.map(fromTransitionDraft).filter((t): t is SpecTransition => t !== null),
    acceptanceCriteria: splitLines(d.acceptanceCriteriaText),
    testCases: d.testCases.filter((t) => t.description.trim()).map((t) => ({ type: t.type, description: t.description.trim() })),
    codeRefs: splitLines(d.codeRefsText),
    dataRefs: splitLines(d.dataRefsText),
    description: d.description,
  };
}

export function Specs() {
  const params = useParams<{ platform?: string; project?: string; '*': string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { project: ctxProject, setProject } = useProject();

  const platform: SpecPlatform = SPEC_PLATFORMS.includes(params.platform as SpecPlatform)
    ? (params.platform as SpecPlatform)
    : 'web';

  const routeProject = params.project;
  const path = decodeSplat(params['*']);

  useEffect(() => {
    if (!SPEC_PLATFORMS.includes(params.platform as SpecPlatform)) {
      navigate(`/specs/web${routeProject ? `/${encodeURIComponent(routeProject)}` : ''}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.platform]);

  useEffect(() => {
    if (routeProject) {
      if (routeProject !== ctxProject) setProject(routeProject);
    } else if (ctxProject) {
      navigate(`/specs/${platform}/${encodeURIComponent(ctxProject)}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeProject, ctxProject]);

  const project = routeProject ?? ctxProject;

  /** "details" shows the screen's text info; "graph" shows the connection graph for its journey (its top-level folder). */
  const [panelMode, setPanelMode] = useState<'details' | 'graph'>('details');

  const treeQ = useQuery({
    queryKey: ['spec-tree', project, platform],
    queryFn: () => api.specs.fullTree(project as string, platform),
    enabled: !!project,
  });
  const tree = treeQ.data ?? [];

  const screensQ = useQuery({
    queryKey: ['spec-screens', project, platform],
    queryFn: () => api.specs.screens(project as string, platform),
    enabled: !!project,
  });
  const screens = screensQ.data ?? [];

  const currentJourney = path ? journeyKeyForPath(path) : null;

  const journeyScreens = useMemo(
    () => (currentJourney ? screens.filter((s) => journeyKeyForPath(s.path) === currentJourney) : []),
    [screens, currentJourney]
  );

  const otherJourneyScreens = useMemo(() => {
    const map = new Map<string, OtherScreenLookup>();
    for (const s of screens) {
      const key = journeyKeyForPath(s.path);
      if (key !== currentJourney) map.set(s.path, { title: s.title, journey: key });
    }
    return map;
  }, [screens, currentJourney]);

  const screenQ = useQuery({
    queryKey: ['spec-screen', project, platform, path],
    queryFn: () => api.specs.screen.get(project as string, platform, path),
    enabled: !!project && !!path,
  });

  const referencesQ = useQuery({
    queryKey: ['spec-screen-references', project, platform, path],
    queryFn: () => api.specs.screen.references(project as string, platform, path),
    enabled: !!project && !!path,
  });

  const [draft, setDraft] = useState<ScreenDraft | null>(null);
  const [newPath, setNewPath] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  /** The trail of screens navigated away from by clicking a linked entry/exit point, most recent last. */
  const [backStack, setBackStack] = useState<{ path: string; title: string }[]>([]);
  const [linkTarget, setLinkTarget] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkBackLabel, setLinkBackLabel] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(null);
    setConfirmDelete(false);
    setCopied(false);
    setLinkTarget('');
    setLinkLabel('');
    setLinkBackLabel('');
    setLinkError(null);
  }, [project, platform, path]);

  // Only reset the back trail when switching project/platform entirely — a path change can itself be us
  // following that trail (openLinkedScreen), which must not wipe out the rest of the stack.
  useEffect(() => {
    setBackStack([]);
  }, [project, platform]);

  function invalidateLists() {
    qc.invalidateQueries({ queryKey: ['spec-tree', project, platform] });
    qc.invalidateQueries({ queryKey: ['spec-screens', project, platform] });
  }

  function invalidateScreen(p: string) {
    qc.invalidateQueries({ queryKey: ['spec-screen', project, platform, p] });
    qc.invalidateQueries({ queryKey: ['spec-screen-references', project, platform, p] });
  }

  function goTo(p: string) {
    if (!project) return;
    const encoded = encodePath(p);
    navigate(`/specs/${platform}/${encodeURIComponent(project)}${encoded ? `/${encoded}` : ''}`);
  }

  /** Plain navigation — from the tree, root, create, or delete flows. Leaves the link-following back trail behind. */
  function select(p: string) {
    setBackStack([]);
    goTo(p);
  }

  /** Follows an entry/exit point's target — records where we came from so "Back" can retrace it. */
  function openLinkedScreen(targetPath: string) {
    if (!screen) return;
    setBackStack([...backStack, { path, title: screen.title }]);
    goTo(targetPath);
  }

  function goBack() {
    if (backStack.length === 0) return;
    const last = backStack[backStack.length - 1];
    setBackStack(backStack.slice(0, -1));
    goTo(last.path);
  }

  async function createScreen(e: FormEvent) {
    e.preventDefault();
    const trimmed = newPath.trim();
    if (!trimmed || !project) return;
    setCreating(true);
    setCreateError(null);
    try {
      const screen = await api.specs.screen.create(project, platform, { path: trimmed });
      setNewPath('');
      invalidateLists();
      select(screen.path);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  async function saveDraft() {
    if (draft === null || !project) return;
    await api.specs.screen.update(project, platform, path, draftToPayload(draft));
    setDraft(null);
    qc.invalidateQueries({ queryKey: ['spec-screen', project, platform, path] });
    invalidateLists();
  }

  async function doDelete() {
    if (!project) return;
    await api.specs.screen.remove(project, platform, path);
    invalidateLists();
    setConfirmDelete(false);
    navigate(`/specs/${platform}/${encodeURIComponent(project)}`);
  }

  async function copyLink() {
    if (!project) return;
    const url = `${window.location.origin}/specs/${platform}/${encodeURIComponent(project)}/${encodePath(path)}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  async function createLink(e: FormEvent) {
    e.preventDefault();
    const to = linkTarget.trim();
    const label = linkLabel.trim();
    if (!project || !to || !label) return;
    setLinking(true);
    setLinkError(null);
    try {
      await api.specs.link.create(project, platform, { from: path, to, label, backLabel: linkBackLabel.trim() || undefined });
      setLinkTarget('');
      setLinkLabel('');
      setLinkBackLabel('');
      invalidateScreen(path);
      invalidateScreen(to);
      invalidateLists();
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : String(err));
    } finally {
      setLinking(false);
    }
  }

  /** Removes a link from both sides — works from either the exit-holding or the entry-holding screen's row. */
  async function unlinkTransition(direction: 'entry' | 'exit', t: SpecTransition) {
    if (!project || !t.target) return;
    const from = direction === 'exit' ? path : t.target;
    const to = direction === 'exit' ? t.target : path;
    await api.specs.link.remove(project, platform, { from, to, label: t.label });
    invalidateScreen(path);
    invalidateScreen(t.target);
    invalidateLists();
  }

  function updateTransition(direction: 'entryPoints' | 'exitPoints', index: number, patch: Partial<TransitionDraft>) {
    setDraft((d) => {
      if (!d) return d;
      const list = d[direction].slice();
      list[index] = { ...list[index], ...patch };
      return { ...d, [direction]: list };
    });
  }

  function removeTransition(direction: 'entryPoints' | 'exitPoints', index: number) {
    setDraft((d) => (d ? { ...d, [direction]: d[direction].filter((_, i) => i !== index) } : d));
  }

  function addTransition(direction: 'entryPoints' | 'exitPoints') {
    setDraft((d) => (d ? { ...d, [direction]: [...d[direction], emptyTransition()] } : d));
  }

  function updateTestCase(index: number, patch: Partial<TestCaseDraft>) {
    setDraft((d) => {
      if (!d) return d;
      const testCases = d.testCases.slice();
      testCases[index] = { ...testCases[index], ...patch };
      return { ...d, testCases };
    });
  }

  function removeTestCase(index: number) {
    setDraft((d) => (d ? { ...d, testCases: d.testCases.filter((_, i) => i !== index) } : d));
  }

  function addTestCase() {
    setDraft((d) => (d ? { ...d, testCases: [...d.testCases, emptyTestCase()] } : d));
  }

  if (!project) {
    return <p className="text-neutral-500">Create a project first from the sidebar.</p>;
  }

  const screen = screenQ.data;
  const references = referencesQ.data ?? [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
      <div className="card p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-500">{PLATFORM_LABELS[platform]}</h2>
          <button onClick={() => select('')} className="btn-link" title="Specs root">
            Root
          </button>
        </div>
        {treeQ.isLoading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : tree.length === 0 ? (
          <p className="mb-2 text-sm text-neutral-400">No screens yet.</p>
        ) : (
          <Tree nodes={tree} selectedPath={path} onSelect={select} />
        )}
        <form onSubmit={createScreen} className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
          <label className="mb-1 block text-xs font-medium text-neutral-500">New screen</label>
          <input
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            placeholder="Checkout/Payment"
            className="input mb-1.5 text-sm"
          />
          {createError && <p className="mb-1.5 text-xs text-red-600">{createError}</p>}
          <button type="submit" disabled={!newPath.trim() || creating} className="btn-secondary w-full text-xs">
            Create
          </button>
        </form>
      </div>

      <div className="card min-h-[16rem] p-4">
        {!path ? (
          <p className="text-sm text-neutral-400">
            Select a screen from the tree, or create one to get started. Use folders (e.g. "Checkout/Payment") to
            group screens by journey — once you've selected one, "Render Graph View" shows how it connects to the
            rest of its journey.
          </p>
        ) : screenQ.isLoading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : screenQ.error || !screen ? (
          <p className="text-sm text-red-600">
            {screenQ.error instanceof Error ? screenQ.error.message : `Screen "${path}" not found.`}
          </p>
        ) : (
          <>
            {backStack.length > 0 && (
              <button
                onClick={goBack}
                className="btn-link mb-2 flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                ← Back to {backStack[backStack.length - 1].title}
              </button>
            )}
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="truncate text-xl font-semibold tracking-tight">{screen.title}</h1>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[screen.status]}`}>
                    {screen.status.replace('_', ' ')}
                  </span>
                  {panelMode === 'graph' && (
                    <span className="shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                      {journeyLabel(currentJourney ?? '')} journey
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-neutral-400">
                  {path}.md · Updated {new Date(screen.updated).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {panelMode === 'graph' ? (
                  <button onClick={() => setPanelMode('details')} className="btn-secondary px-2.5 py-1 text-xs">
                    Show Details
                  </button>
                ) : (
                  <>
                    <button onClick={copyLink} className="btn-secondary px-2.5 py-1 text-xs">
                      {copied ? 'Copied!' : 'Copy link'}
                    </button>
                    {draft === null && (
                      <button onClick={() => setPanelMode('graph')} className="btn-secondary px-2.5 py-1 text-xs">
                        Render Graph View
                      </button>
                    )}
                    {draft === null && (
                      <button onClick={() => setDraft(draftFromScreen(screen))} className="btn-secondary px-2.5 py-1 text-xs">
                        Edit
                      </button>
                    )}
                    {!confirmDelete ? (
                      <button onClick={() => setConfirmDelete(true)} className="btn-danger-outline px-2.5 py-1 text-xs">
                        Delete
                      </button>
                    ) : (
                      <>
                        <button onClick={doDelete} className="btn-danger px-2.5 py-1 text-xs">
                          Confirm
                        </button>
                        <button onClick={() => setConfirmDelete(false)} className="btn-ghost px-2.5 py-1 text-xs">
                          Cancel
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {panelMode === 'graph' ? (
              <div className="h-[34rem]">
                <SpecRelationsView
                  screens={journeyScreens}
                  otherScreens={otherJourneyScreens}
                  onSelectScreen={openLinkedScreen}
                  selectedPath={path}
                />
              </div>
            ) : draft !== null ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Title</label>
                  <input value={draft.title} onChange={(e) => setDraft((d) => (d ? { ...d, title: e.target.value } : d))} className="input text-sm" />
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="min-w-[14rem] flex-1">
                    <label className="mb-1 block text-xs font-medium text-neutral-500">Design link (Figma, etc.)</label>
                    <input value={draft.designUrl} onChange={(e) => setDraft((d) => (d ? { ...d, designUrl: e.target.value } : d))} placeholder="https://figma.com/…" className="input text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">Status</label>
                    <select value={draft.status} onChange={(e) => setDraft((d) => (d ? { ...d, status: e.target.value as SpecStatus } : d))} className="input text-sm">
                      {SPEC_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Tags (comma-separated)</label>
                  <input value={draft.tagsText} onChange={(e) => setDraft((d) => (d ? { ...d, tagsText: e.target.value } : d))} placeholder="auth, onboarding" className="input text-sm" />
                </div>

                {(['entryPoints', 'exitPoints'] as const).map((direction) => (
                  <div key={direction}>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">
                      {direction === 'entryPoints' ? 'Entry points' : 'Exit points'}
                    </label>
                    <div className="space-y-1.5">
                      {draft[direction].map((t, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-1.5 rounded-lg border border-neutral-200 p-2 dark:border-neutral-700">
                          <input
                            value={t.label}
                            onChange={(e) => updateTransition(direction, i, { label: e.target.value })}
                            placeholder="trigger/action"
                            className="input w-40 text-xs"
                          />
                          <span className="text-xs text-neutral-400">screen →</span>
                          <input
                            value={t.target}
                            onChange={(e) => updateTransition(direction, i, { target: e.target.value })}
                            placeholder="Checkout/Payment"
                            className="input w-40 text-xs"
                          />
                          <span className="text-xs text-neutral-400">or external →</span>
                          <input
                            value={t.external}
                            onChange={(e) => updateTransition(direction, i, { external: e.target.value })}
                            placeholder="App launch"
                            className="input w-36 text-xs"
                          />
                          <button type="button" onClick={() => removeTransition(direction, i)} className="btn-ghost ml-auto px-2 py-0.5 text-xs text-red-600">
                            Remove
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => addTransition(direction)} className="btn-secondary w-full text-xs">
                        Add {direction === 'entryPoints' ? 'entry' : 'exit'} point
                      </button>
                    </div>
                  </div>
                ))}

                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Acceptance criteria (one per line)</label>
                  <textarea
                    value={draft.acceptanceCriteriaText}
                    onChange={(e) => setDraft((d) => (d ? { ...d, acceptanceCriteriaText: e.target.value } : d))}
                    rows={3}
                    className="input w-full text-sm"
                    placeholder="Shows an error toast on invalid input"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Test cases</label>
                  <div className="space-y-1.5">
                    {draft.testCases.map((t, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <select value={t.type} onChange={(e) => updateTestCase(i, { type: e.target.value as SpecTestType })} className="input w-28 shrink-0 text-xs">
                          {SPEC_TEST_TYPES.map((tt) => (
                            <option key={tt} value={tt}>
                              {tt}
                            </option>
                          ))}
                        </select>
                        <input
                          value={t.description}
                          onChange={(e) => updateTestCase(i, { description: e.target.value })}
                          placeholder="validates email format on submit"
                          className="input flex-1 text-xs"
                        />
                        <button type="button" onClick={() => removeTestCase(i)} className="btn-ghost px-2 py-0.5 text-xs text-red-600">
                          Remove
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addTestCase} className="btn-secondary w-full text-xs">
                      Add test case
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="min-w-[14rem] flex-1">
                    <label className="mb-1 block text-xs font-medium text-neutral-500">Code references (one per line)</label>
                    <textarea
                      value={draft.codeRefsText}
                      onChange={(e) => setDraft((d) => (d ? { ...d, codeRefsText: e.target.value } : d))}
                      rows={2}
                      className="input w-full text-sm"
                      placeholder="src/screens/Checkout.tsx"
                    />
                  </div>
                  <div className="min-w-[14rem] flex-1">
                    <label className="mb-1 block text-xs font-medium text-neutral-500">Data references (one per line)</label>
                    <textarea
                      value={draft.dataRefsText}
                      onChange={(e) => setDraft((d) => (d ? { ...d, dataRefsText: e.target.value } : d))}
                      rows={2}
                      className="input w-full text-sm"
                      placeholder="billing_db/invoices"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Description</label>
                  <textarea
                    value={draft.description}
                    onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))}
                    rows={4}
                    className="input w-full text-sm"
                    placeholder="Notes about this screen…"
                  />
                </div>

                <div className="flex gap-2">
                  <button onClick={saveDraft} className="btn-primary px-2.5 py-1 text-xs">
                    Save
                  </button>
                  <button onClick={() => setDraft(null)} className="btn-ghost px-2.5 py-1 text-xs">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {screen.designUrl && (
                  <a href={screen.designUrl} target="_blank" rel="noreferrer" className="inline-block text-sm text-blue-600 hover:underline dark:text-blue-400">
                    Open design file →
                  </a>
                )}
                {screen.tags?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {screen.tags.map((t) => (
                      <span key={t} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}

                <SpecTransitionsList
                  entryPoints={screen.entryPoints}
                  exitPoints={screen.exitPoints}
                  onNavigate={openLinkedScreen}
                  onUnlink={unlinkTransition}
                />

                <div>
                  <h3 className="mb-1 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Link to another screen</h3>
                  <form onSubmit={createLink} className="flex flex-wrap items-center gap-1.5">
                    <input
                      value={linkLabel}
                      onChange={(e) => setLinkLabel(e.target.value)}
                      placeholder="exit label, e.g. Proceed to checkout"
                      className="input w-52 text-xs"
                    />
                    <span className="text-xs text-neutral-400">→</span>
                    <input
                      list="spec-link-targets"
                      value={linkTarget}
                      onChange={(e) => setLinkTarget(e.target.value)}
                      placeholder="Checkout/Payment"
                      className="input w-52 text-xs"
                    />
                    <datalist id="spec-link-targets">
                      {screens
                        .filter((s) => s.path !== path)
                        .map((s) => (
                          <option key={s.path} value={s.path} />
                        ))}
                    </datalist>
                    <span className="text-xs text-neutral-400">back label (optional)</span>
                    <input
                      value={linkBackLabel}
                      onChange={(e) => setLinkBackLabel(e.target.value)}
                      placeholder={linkLabel || 'same as exit label'}
                      className="input w-40 text-xs"
                    />
                    <button type="submit" disabled={!linkTarget.trim() || !linkLabel.trim() || linking} className="btn-secondary px-2.5 py-1 text-xs">
                      Link
                    </button>
                  </form>
                  {linkError && <p className="mt-1 text-xs text-red-600">{linkError}</p>}
                  <p className="mt-1 text-xs text-neutral-400">
                    Adds an exit point here targeting the other screen, and a matching entry point back — even across journeys/folders.
                  </p>
                </div>

                {screen.acceptanceCriteria?.length ? (
                  <div>
                    <h3 className="mb-1 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Acceptance criteria</h3>
                    <ul className="list-disc space-y-0.5 pl-5 text-sm text-neutral-600 dark:text-neutral-300">
                      {screen.acceptanceCriteria.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {screen.testCases?.length ? (
                  <div>
                    <h3 className="mb-1 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Test cases</h3>
                    <ul className="space-y-0.5 text-sm text-neutral-600 dark:text-neutral-300">
                      {screen.testCases.map((t, i) => (
                        <li key={i}>
                          <span className="mr-1.5 rounded bg-neutral-100 px-1 py-0.5 text-[10px] font-semibold text-neutral-500 uppercase dark:bg-neutral-700 dark:text-neutral-400">
                            {t.type}
                          </span>
                          {t.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {(screen.codeRefs?.length || screen.dataRefs?.length) && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {screen.codeRefs?.length ? (
                      <div>
                        <h3 className="mb-1 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Code references</h3>
                        <ul className="space-y-0.5 font-mono text-xs text-neutral-500">
                          {screen.codeRefs.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {screen.dataRefs?.length ? (
                      <div>
                        <h3 className="mb-1 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Data references</h3>
                        <ul className="space-y-0.5 font-mono text-xs text-neutral-500">
                          {screen.dataRefs.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}

                {screen.description.trim() && (
                  <p className="whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-300">{screen.description}</p>
                )}

                <div>
                  <h3 className="mb-1 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Referenced by</h3>
                  {references.length === 0 ? (
                    <p className="text-sm text-neutral-400">Nothing yet.</p>
                  ) : (
                    <ul className="space-y-0.5 text-sm">
                      {references.map((item) => (
                        <li key={item.id}>
                          <Link to={`/item/${item.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                            {item.title} [{item.type} #{item.id}]
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
