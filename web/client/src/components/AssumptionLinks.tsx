import { Link } from 'react-router-dom';
import type { Assumption } from '../api';

const chip =
  'rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600';

const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/');

/** "spec:web:path", "diagram:<kind>:path", "schema:path" → in-app route + label, or null if malformed. */
function refTarget(project: string, ref: string): { to: string; label: string } | null {
  const [kind, ...rest] = ref.split(':');
  const p = project.split('/').map(encodeURIComponent).join('/');
  if (kind === 'spec' && rest.length >= 2) return { to: `/specs/${rest[0]}/${p}/${enc(rest.slice(1).join(':'))}`, label: `spec · ${rest.slice(1).join(':')}` };
  if (kind === 'diagram' && rest.length >= 2) return { to: `/diagrams/${rest[0]}/${p}/${enc(rest.slice(1).join(':'))}`, label: `diagram · ${rest.slice(1).join(':')}` };
  if (kind === 'schema' && rest.length >= 1) return { to: `/schemas/${p}/${enc(rest.join(':'))}`, label: `schema · ${rest.join(':')}` };
  return null;
}

export function AssumptionLinks({ a }: { a: Assumption }) {
  return (
    <>
      {a.wiki?.map((w) => (
        <Link key={`w-${w}`} to={`/wiki/${encodeURIComponent(a.project)}/${enc(w)}`} className={chip}>
          📖 {w}
        </Link>
      ))}
      {a.refs?.map((r) => {
        const t = refTarget(a.project, r);
        return t ? (
          <Link key={`r-${r}`} to={t.to} className={chip}>
            {t.label}
          </Link>
        ) : (
          <span key={`r-${r}`} className={chip}>
            {r}
          </span>
        );
      })}
      {a.code?.map((c) => (
        <span key={`c-${c}`} className={`${chip} font-mono`}>
          {c}
        </span>
      ))}
    </>
  );
}
