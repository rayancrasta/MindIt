import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Link } from 'react-router-dom';
import { isDone, ITEM_STATUSES, type Bug, type Item, type ItemStatus, type Task } from '../api';
import { ItemTypeBadge } from './ItemTypeBadge';
import { TaskCheckbox } from './TaskCheckbox';

const STATUS_LABELS: Record<ItemStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  testing: 'Testing',
  resolved: 'Resolved',
  closed: 'Closed',
};

export interface Lane {
  key: string;
  label: string;
  items: Item[];
  addable?: boolean;
  /** Whether this lane starts collapsed. Defaults to true (closed). */
  defaultCollapsed?: boolean;
}

interface Props {
  lanes: Lane[];
  onDrop: (item: Item, status: ItemStatus) => void;
  onAddToLane?: (laneKey: string) => void;
  /** Tasks/bugs to show as a checklist on a Story card, keyed by story id. */
  childrenByParent?: Record<string, (Task | Bug)[]>;
  onToggleChild?: (child: Task | Bug) => void;
  /** When a lane's own items are tasks/bugs, lets their cards show a done checkbox. */
  onToggleItem?: (item: Task | Bug) => void;
}

export function KanbanBoard({ lanes, onDrop, onAddToLane, childrenByParent, onToggleChild, onToggleItem }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [collapsedOverrides, setCollapsedOverrides] = useState<Record<string, boolean>>({});

  function isCollapsed(lane: Lane) {
    return collapsedOverrides[lane.key] ?? lane.defaultCollapsed ?? true;
  }

  function toggleLane(lane: Lane) {
    setCollapsedOverrides((prev) => ({ ...prev, [lane.key]: !isCollapsed(lane) }));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as ItemStatus;
    const item = active.data.current?.item as Item | undefined;
    if (!item || item.status === newStatus) return;
    onDrop(item, newStatus);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {lanes.map((lane) => {
          const collapsed = isCollapsed(lane);
          return (
            <div key={lane.key}>
              <div className="mb-2 flex items-center gap-2">
                <button
                  onClick={() => toggleLane(lane)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                  aria-expanded={!collapsed}
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`}
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                  <span>{lane.label}</span>
                  <span className="rounded-full bg-neutral-200/80 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                    {lane.items.filter((i) => isDone(i.status)).length}/{lane.items.length}
                  </span>
                </button>
                {onAddToLane && lane.addable !== false && (
                  <button onClick={() => onAddToLane(lane.key)} className="btn-link">
                    + add
                  </button>
                )}
              </div>
              {!collapsed && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                  {ITEM_STATUSES.map((status) => (
                    <Column
                      key={status}
                      status={status}
                      label={STATUS_LABELS[status]}
                      items={lane.items.filter((i) => i.status === status)}
                      childrenByParent={childrenByParent}
                      onToggleChild={onToggleChild}
                      onToggleItem={onToggleItem}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}

function Column({
  status,
  label,
  items,
  childrenByParent,
  onToggleChild,
  onToggleItem,
}: {
  status: ItemStatus;
  label: string;
  items: Item[];
  childrenByParent?: Record<string, (Task | Bug)[]>;
  onToggleChild?: (child: Task | Bug) => void;
  onToggleItem?: (item: Task | Bug) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[90px] rounded-xl border p-2 transition-colors ${
        isOver
          ? 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40'
          : 'border-neutral-200/80 bg-neutral-100/70 dark:border-neutral-700 dark:bg-neutral-800/40'
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">{label}</span>
        <span className="rounded-full bg-neutral-200/80 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
          {items.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <Card
            key={item.id}
            item={item}
            checklist={item.type === 'story' ? childrenByParent?.[item.id] : undefined}
            onToggleChild={onToggleChild}
            onToggleItem={onToggleItem}
          />
        ))}
      </div>
    </div>
  );
}

function Card({
  item,
  checklist,
  onToggleChild,
  onToggleItem,
}: {
  item: Item;
  checklist?: (Task | Bug)[];
  onToggleChild?: (child: Task | Bug) => void;
  onToggleItem?: (item: Task | Bug) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: isDragging ? 50 : undefined }
    : undefined;
  const isChild = item.type === 'task' || item.type === 'bug';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-lg border border-neutral-200 bg-white p-2 text-sm shadow-sm transition-shadow active:cursor-grabbing hover:shadow-md dark:border-neutral-600 dark:bg-neutral-800 ${
        isDragging ? 'opacity-60 shadow-lg' : ''
      }`}
    >
      <div className="mb-1 flex items-center gap-1.5">
        {isChild && onToggleItem && (
          <TaskCheckbox checked={isDone(item.status)} onToggle={async () => onToggleItem(item as Task | Bug)} />
        )}
        <ItemTypeBadge type={item.type} id={item.id} />
      </div>
      <Link
        to={`/item/${item.id}`}
        onClick={(e) => e.stopPropagation()}
        className={`line-clamp-2 hover:underline ${isChild && isDone(item.status) ? 'text-neutral-400 line-through' : ''}`}
      >
        {item.title}
      </Link>
      {checklist && checklist.length > 0 && onToggleChild && (
        <ul className="mt-2 space-y-1 border-t border-neutral-100 pt-2 dark:border-neutral-700">
          {checklist.map((c) => (
            <li key={c.id} className="flex items-center gap-1.5">
              <TaskCheckbox checked={isDone(c.status)} onToggle={async () => onToggleChild(c)} />
              <Link
                to={`/item/${c.id}`}
                onClick={(e) => e.stopPropagation()}
                className={`truncate text-xs hover:underline ${
                  isDone(c.status) ? 'text-neutral-400 line-through' : 'text-neutral-600 dark:text-neutral-300'
                }`}
              >
                {c.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
