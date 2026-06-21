import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  useReactFlow,
} from '@xyflow/react';
import { Save, Play, GripVertical } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/misc';
import { WorkflowNode, CATEGORY_COLORS } from './WorkflowNode';
import { useTranslation } from '@/i18n/useTranslation';

interface PaletteItem { type: string; category: string; label: string; description: string; defaultConfig?: any; }
interface WorkflowData { id: string; name: string; viewport?: any; nodes: any[]; edges: any[]; }

const nodeTypes = { workflowNode: WorkflowNode };
let idCounter = 1;
const genId = () => `node_${Date.now()}_${idCounter++}`;

function Inner({ workflowId }: { workflowId: string }) {
  const { t } = useTranslation();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [palette, setPalette] = useState<PaletteItem[]>([]);
  const [selected, setSelected] = useState<Node | null>(null);
  const [trace, setTrace] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<PaletteItem[]>('/workflows/palette').then(setPalette);
    api.get<WorkflowData>(`/workflows/${workflowId}`).then((wf) => {
      setNodes(
        wf.nodes.map((n) => ({
          id: n.id,
          type: 'workflowNode',
          position: { x: n.positionX, y: n.positionY },
          data: { label: n.label, category: n.category, nodeType: n.type, config: n.config || {} },
        })),
      );
      setEdges(wf.edges.map((e) => ({ id: e.id, source: e.source, target: e.target })));
    });
  }, [workflowId, setNodes, setEdges]);

  const onConnect = useCallback((c: Connection) => setEdges((eds) => addEdge({ ...c, animated: true }, eds)), [setEdges]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/node');
      if (!raw) return;
      const item: PaletteItem = JSON.parse(raw);
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setNodes((nds) =>
        nds.concat({
          id: genId(),
          type: 'workflowNode',
          position,
          data: { label: item.label, category: item.category, nodeType: item.type, config: { ...(item.defaultConfig || {}) } },
        }),
      );
    },
    [screenToFlowPosition, setNodes],
  );

  const updateSelectedConfig = (key: string, value: any) => {
    if (!selected) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selected.id ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, [key]: value } } } : n,
      ),
    );
    setSelected((s) => (s ? { ...s, data: { ...s.data, config: { ...(s.data as any).config, [key]: value } } } : s));
  };

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/workflows/${workflowId}/graph`, {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: (n.data as any).nodeType,
          category: (n.data as any).category,
          label: (n.data as any).label,
          positionX: n.position.x,
          positionY: n.position.y,
          config: (n.data as any).config,
        })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
        viewport: {},
      });
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    setBusy(true);
    setTrace(null);
    try {
      await save();
      const res = await api.post<{ trace: any[] }>(`/workflows/${workflowId}/preview`);
      setTrace(res.trace);
    } catch (e: any) {
      setTrace([{ status: 'error', note: e.message }]);
    } finally {
      setBusy(false);
    }
  };

  const grouped = useMemo(() => {
    const g: Record<string, PaletteItem[]> = {};
    palette.forEach((p) => { (g[p.category] ||= []).push(p); });
    return g;
  }, [palette]);

  const selConfig = (selected?.data as any)?.config || {};

  return (
    <div className="flex h-[calc(100vh-9rem)] gap-3">
      {/* Palette */}
      <div className="w-56 shrink-0 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-3">
        <div className="mb-2 text-xs font-semibold uppercase text-[var(--muted-foreground)]">{t('nodeBuilder.palette')}</div>
        <div className="space-y-3">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="mb-1 text-[10px] font-semibold uppercase" style={{ color: CATEGORY_COLORS[cat] }}>
                {t(`nodeBuilder.categories.${cat}`)}
              </div>
              {items.map((item) => (
                <div
                  key={item.type}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('application/node', JSON.stringify(item))}
                  className="mb-1 flex cursor-grab items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs hover:border-[var(--primary)]"
                >
                  <GripVertical className="h-3 w-3 text-[var(--muted-foreground)]" />
                  {item.label}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]" ref={wrapperRef}>
        <div className="absolute right-3 top-3 z-10 flex gap-2">
          <Button size="sm" variant="outline" onClick={save} disabled={busy}><Save className="h-4 w-4" /> {t('nodeBuilder.save')}</Button>
          <Button size="sm" variant="gradient" onClick={run} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <Play className="h-4 w-4" />} {t('nodeBuilder.run')}</Button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, n) => setSelected(n)}
          onPaneClick={() => setSelected(null)}
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
          nodeTypes={nodeTypes}
          fitView
          colorMode="system"
        >
          <Background gap={16} />
          <Controls />
          <MiniMap pannable zoomable nodeColor={(n) => CATEGORY_COLORS[(n.data as any)?.category] || '#8b5cf6'} />
        </ReactFlow>

        {trace && (
          <div className="absolute bottom-3 left-3 right-3 z-10 max-h-40 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)]/95 p-3 text-xs backdrop-blur">
            <div className="mb-1 font-semibold">{t('nodeBuilder.trace')}</div>
            {trace.map((tr, i) => (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <span className={tr.status === 'ok' ? 'text-emerald-500' : 'text-red-500'}>●</span>
                <span className="font-mono">{tr.type}</span>
                <span className="text-[var(--muted-foreground)]">{tr.note}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Config */}
      <div className="w-64 shrink-0 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="mb-3 text-xs font-semibold uppercase text-[var(--muted-foreground)]">{t('nodeBuilder.config')}</div>
        {!selected ? (
          <p className="text-sm text-[var(--muted-foreground)]">{t('nodeBuilder.selectNode')}</p>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-medium">{(selected.data as any).label}</div>
            {Object.entries(selConfig).map(([key, value]) => (
              <label key={key} className="block space-y-1">
                <span className="text-xs text-[var(--muted-foreground)]">{key}</span>
                {typeof value === 'string' && value.length > 40 ? (
                  <Textarea value={value as string} onChange={(e) => updateSelectedConfig(key, e.target.value)} rows={3} />
                ) : (
                  <Input
                    value={value as any}
                    onChange={(e) => updateSelectedConfig(key, typeof value === 'number' ? Number(e.target.value) : e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function NodeBuilderCanvas({ workflowId }: { workflowId: string }) {
  return (
    <ReactFlowProvider>
      <Inner workflowId={workflowId} />
    </ReactFlowProvider>
  );
}
