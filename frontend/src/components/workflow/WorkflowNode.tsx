import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';

export const CATEGORY_COLORS: Record<string, string> = {
  INPUT: '#10b981',
  AI: '#8b5cf6',
  VOICE: '#06b6d4',
  AVATAR: '#f59e0b',
  EDIT: '#3b82f6',
  ASSEMBLE: '#ec4899',
  OUTPUT: '#f43f5e',
};

function WorkflowNodeInner({ data, selected }: NodeProps) {
  const d = data as any;
  const color = CATEGORY_COLORS[d.category] || '#8b5cf6';
  return (
    <div
      className={cn(
        'min-w-[180px] rounded-xl border bg-[var(--card)] px-4 py-3 shadow-lg transition-all',
        selected ? 'ring-2' : '',
      )}
      style={{ borderColor: color, boxShadow: selected ? `0 0 0 2px ${color}55` : undefined }}
    >
      {d.category !== 'INPUT' && <Handle type="target" position={Position.Left} style={{ background: color }} />}
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
          {d.category}
        </span>
      </div>
      <div className="mt-1 text-sm font-medium text-[var(--foreground)]">{d.label}</div>
      {d.category !== 'OUTPUT' && <Handle type="source" position={Position.Right} style={{ background: color }} />}
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeInner);
