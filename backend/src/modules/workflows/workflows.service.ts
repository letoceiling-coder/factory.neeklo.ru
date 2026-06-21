import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowExecutorService } from './workflow-executor.service';
import {
  GraphNode,
  GraphEdge,
  validateGraph,
  topologicalSort,
  collectUpstreamOutput,
} from './graph-engine';
import { NODE_TEMPLATES } from './node-templates';
import { buildGraphFromTemplate, listPipelineTemplates } from './pipeline-templates';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly executor: WorkflowExecutorService,
  ) {}

  palette() {
    return NODE_TEMPLATES;
  }

  templates() {
    return listPipelineTemplates();
  }

  async loadTemplate(id: string, templateId: string) {
    const graph = buildGraphFromTemplate(templateId);
    if (!graph) throw new BadRequestException(`Unknown template: ${templateId}`);
    return this.saveGraph(id, graph);
  }

  async createFromTemplate(data: { name: string; templateId: string; description?: string }) {
    const wf = await this.create({ name: data.name, description: data.description });
    await this.loadTemplate(wf.id, data.templateId);
    return this.findOne(wf.id);
  }

  list() {
    return this.prisma.nodeWorkflow.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  async findOne(id: string) {
    const wf = await this.prisma.nodeWorkflow.findUnique({
      where: { id },
      include: { nodes: true, edges: true },
    });
    if (!wf) throw new NotFoundException('Workflow not found');
    return wf;
  }

  create(data: { name: string; description?: string }) {
    return this.prisma.nodeWorkflow.create({ data });
  }

  async remove(id: string) {
    await this.prisma.nodeWorkflow.delete({ where: { id } });
    return { ok: true };
  }

  async saveGraph(
    id: string,
    payload: { nodes: any[]; edges: any[]; viewport?: any },
  ) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.node.deleteMany({ where: { workflowId: id } }),
      this.prisma.nodeEdge.deleteMany({ where: { workflowId: id } }),
    ]);
    await this.prisma.node.createMany({
      data: payload.nodes.map((n) => ({
        id: n.id,
        workflowId: id,
        type: n.type,
        category: n.category,
        label: n.label,
        positionX: n.positionX ?? n.position?.x ?? 0,
        positionY: n.positionY ?? n.position?.y ?? 0,
        config: n.config ?? n.data?.config ?? {},
      })),
    });
    await this.prisma.nodeEdge.createMany({
      data: payload.edges.map((e) => ({
        id: e.id,
        workflowId: id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
    });
    await this.prisma.nodeWorkflow.update({ where: { id }, data: { viewport: payload.viewport || {} } });
    return this.findOne(id);
  }

  private toGraph(wf: { nodes: any[]; edges: any[] }): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return {
      nodes: wf.nodes.map((n) => ({ id: n.id, type: n.type, category: n.category, config: n.config })),
      edges: wf.edges.map((e) => ({ source: e.source, target: e.target })),
    };
  }

  /** Dry run: executes lightweight nodes (scripting), returns trace without rendering. */
  async preview(id: string) {
    const wf = await this.findOne(id);
    const { nodes, edges } = this.toGraph(wf);
    const validation = validateGraph(nodes, edges);
    if (!validation.ok) throw new BadRequestException(validation.error);

    const order = topologicalSort(nodes, edges);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const outputs = new Map<string, unknown>();
    const trace: any[] = [];

    for (const nodeId of order) {
      const node = byId.get(nodeId)!;
      const upstream = collectUpstreamOutput(nodeId, edges, outputs) as any[];
      try {
        const result = await this.executor.runNode(node, upstream);
        outputs.set(nodeId, result.output);
        trace.push({ nodeId, type: node.type, status: 'ok', note: result.note });
      } catch (e: any) {
        trace.push({ nodeId, type: node.type, status: 'error', note: e.message });
        break;
      }
    }
    return { validation, order, trace, output: outputs.get(order[order.length - 1]) };
  }
}
