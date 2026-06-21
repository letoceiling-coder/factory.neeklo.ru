export interface GraphNode {
  id: string;
  type: string;
  category: string;
  config?: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export function validateGraph(nodes: GraphNode[], edges: GraphEdge[]): { ok: boolean; error?: string } {
  if (nodes.length === 0) return { ok: false, error: 'Graph is empty' };
  const hasInput = nodes.some((n) => n.category === 'INPUT');
  const hasOutput = nodes.some((n) => n.category === 'OUTPUT');
  if (!hasInput) return { ok: false, error: 'Graph requires an INPUT node' };
  if (!hasOutput) return { ok: false, error: 'Graph requires an OUTPUT node' };
  if (hasCycle(nodes, edges)) return { ok: false, error: 'Graph contains a cycle' };
  return { ok: true };
}

function hasCycle(nodes: GraphNode[], edges: GraphEdge[]): boolean {
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => adj.set(n.id, []));
  edges.forEach((e) => adj.get(e.source)?.push(e.target));
  const state = new Map<string, number>(); // 0=unvisited,1=visiting,2=done
  const dfs = (id: string): boolean => {
    state.set(id, 1);
    for (const next of adj.get(id) || []) {
      const s = state.get(next) || 0;
      if (s === 1) return true;
      if (s === 0 && dfs(next)) return true;
    }
    state.set(id, 2);
    return false;
  };
  for (const n of nodes) {
    if ((state.get(n.id) || 0) === 0 && dfs(n.id)) return true;
  }
  return false;
}

export function topologicalSort(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => {
    indeg.set(n.id, 0);
    adj.set(n.id, []);
  });
  edges.forEach((e) => {
    adj.get(e.source)?.push(e.target);
    indeg.set(e.target, (indeg.get(e.target) || 0) + 1);
  });
  const queue = nodes.filter((n) => (indeg.get(n.id) || 0) === 0).map((n) => n.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.get(id) || []) {
      indeg.set(next, (indeg.get(next) || 0) - 1);
      if ((indeg.get(next) || 0) === 0) queue.push(next);
    }
  }
  return order;
}

export function collectUpstreamOutput(
  nodeId: string,
  edges: GraphEdge[],
  outputs: Map<string, unknown>,
): unknown[] {
  return edges.filter((e) => e.target === nodeId).map((e) => outputs.get(e.source)).filter((v) => v !== undefined);
}
