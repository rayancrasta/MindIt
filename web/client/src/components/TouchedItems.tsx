import { Link } from 'react-router-dom';
import type { ItemRef } from '../api';
import { ItemTypeBadge } from './ItemTypeBadge';

export function TouchedItems({ items }: { items: ItemRef[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((i) => (
        <Link key={i.id} to={`/item/${i.id}`} title={i.title}>
          <ItemTypeBadge type={i.type} id={i.id} />
        </Link>
      ))}
    </div>
  );
}
