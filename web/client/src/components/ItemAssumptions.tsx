import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { CONFIDENCE_STYLE } from './confidenceStyle';

/** Assumptions agents recorded against a work item; renders nothing when there are none. */
export function ItemAssumptions({ project, itemId }: { project: string; itemId: string }) {
  const { data } = useQuery({
    queryKey: ['assumptions', project, { item: itemId }],
    queryFn: () => api.assumptions.list(project, { item: itemId }),
  });
  if (!data || data.length === 0) return null;
  return (
    <section className="mt-6">
      <h3 className="mb-2 text-sm font-semibold">
        Assumptions{' '}
        <span className="font-normal text-neutral-400">
          {data.filter((a) => a.status === 'open').length} unreviewed / {data.length}
        </span>
      </h3>
      <ul className="space-y-1.5">
        {data.map((a) => (
          <li key={a.id} className="flex items-start gap-2 text-sm">
            <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CONFIDENCE_STYLE[a.confidence].badge}`}>
              {CONFIDENCE_STYLE[a.confidence].icon} {a.confidence}
            </span>
            <Link to="/assumptions" className={`hover:underline ${a.status === 'reviewed' ? 'text-neutral-400 line-through' : ''}`}>
              {a.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
