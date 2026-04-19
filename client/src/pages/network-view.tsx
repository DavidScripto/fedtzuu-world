import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RefreshCw, Wand2, Loader2, X, MessageCircle, Info, ZoomIn, ZoomOut } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NetworkNode {
  id: string;
  agentName: string;
  avatarColor: string;
  avatarUrl: string | null;
  postCount: number;
  role: string;
}

interface NetworkEdge {
  from: string;
  to: string;
  weight: number;
}

interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

interface PhysicsNode extends NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number;
  fy?: number;
}

const NODE_RADIUS = 26;
const REPULSION = 4500;
const SPRING_K = 0.04;
const REST_LEN = 160;
const GRAVITY = 0.018;
const DAMPING = 0.86;

function initPhysics(nodes: NetworkNode[], w: number, h: number): PhysicsNode[] {
  return nodes.map((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    const r = Math.min(w, h) * 0.3;
    return {
      ...n,
      x: w / 2 + Math.cos(angle) * r + (Math.random() - 0.5) * 40,
      y: h / 2 + Math.sin(angle) * r + (Math.random() - 0.5) * 40,
      vx: 0,
      vy: 0,
    };
  });
}

function tickPhysics(nodes: PhysicsNode[], edges: NetworkEdge[], w: number, h: number) {
  const cx = w / 2, cy = h / 2;
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    if (a.fx !== undefined) continue;
    a.vx += (cx - a.x) * GRAVITY;
    a.vy += (cy - a.y) * GRAVITY;
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const dx = a.x - b.x || 0.1;
      const dy = a.y - b.y || 0.1;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = REPULSION / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx; a.vy += fy;
      if (b.fx === undefined) { b.vx -= fx; b.vy -= fy; }
    }
  }
  for (const e of edges) {
    const a = nodes.find(n => n.id === e.from);
    const b = nodes.find(n => n.id === e.to);
    if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = (dist - REST_LEN) * SPRING_K;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    if (a.fx === undefined) { a.vx += fx; a.vy += fy; }
    if (b.fx === undefined) { b.vx -= fx; b.vy -= fy; }
  }
  for (const n of nodes) {
    if (n.fx !== undefined) { n.x = n.fx; n.y = n.fy!; continue; }
    n.vx *= DAMPING;
    n.vy *= DAMPING;
    n.x = Math.max(NODE_RADIUS + 4, Math.min(w - NODE_RADIUS - 4, n.x + n.vx));
    n.y = Math.max(NODE_RADIUS + 4, Math.min(h - NODE_RADIUS - 4, n.y + n.vy));
  }
}

export function NetworkView({ token }: { token: string }) {
  const headers = { "x-admin-token": token };
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef<PhysicsNode[]>([]);
  const rafRef = useRef<number>(0);
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const [dims, setDims] = useState({ w: 900, h: 620 });
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, refetch } = useQuery<NetworkData>({
    queryKey: ["/api/admin/network"],
    queryFn: () => fetch("/api/admin/network", { headers }).then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: threadData } = useQuery({
    queryKey: ["/api/posts", selected, "replies"],
    queryFn: () => selected ? fetch(`/api/posts/${selected}/replies`, { headers }).then(r => r.json()) : null,
    enabled: !!selected,
  });

  const bulkMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/agents/bulk-avatar-generate", {}, { headers }),
    onSuccess: () => { setTimeout(() => refetch(), 2000); },
  });

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setDims({ w: el.offsetWidth, h: el.offsetHeight });
    });
    ro.observe(el);
    setDims({ w: el.offsetWidth, h: el.offsetHeight });
    return () => ro.disconnect();
  }, []);

  // Init physics when data arrives
  useEffect(() => {
    if (!data?.nodes?.length) return;
    nodesRef.current = initPhysics(data.nodes, dims.w, dims.h);
    setTick(t => t + 1);
  }, [data, dims.w, dims.h]);

  // Animation loop
  useEffect(() => {
    if (!data?.nodes?.length) return;
    let running = true;
    function loop() {
      if (!running) return;
      tickPhysics(nodesRef.current, data.edges || [], dims.w, dims.h);
      setTick(t => t + 1);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [data, dims]);

  const getSvgPoint = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDragging(nodeId);
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (node) { node.fx = node.x; node.fy = node.y; }
  }, []);

  const handleSvgMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as Element).tagName === "rect") {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: panStart.current.px + e.clientX - panStart.current.x,
        y: panStart.current.py + e.clientY - panStart.current.y,
      });
      return;
    }
    if (!dragging) return;
    const pt = getSvgPoint(e);
    const node = nodesRef.current.find(n => n.id === dragging);
    if (node) { node.fx = pt.x; node.fy = pt.y; node.x = pt.x; node.y = pt.y; }
  }, [dragging, isPanning, getSvgPoint]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) { setIsPanning(false); return; }
    if (!dragging) return;
    const node = nodesRef.current.find(n => n.id === dragging);
    if (node) { delete node.fx; delete node.fy; }
    setDragging(null);
  }, [dragging, isPanning]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(3, z * (e.deltaY < 0 ? 1.1 : 0.9))));
  }, []);

  const nodeMap = new Map(nodesRef.current.map(n => [n.id, n]));

  const selectedNode = selected ? nodeMap.get(selected) : null;

  const connectedEdges = selected
    ? (data?.edges || []).filter(e => e.from === selected || e.to === selected)
    : [];
  const connectedIds = new Set(connectedEdges.flatMap(e => [e.from, e.to]));

  const maxWeight = Math.max(1, ...(data?.edges || []).map(e => e.weight));

  function getEdgeKey(e: NetworkEdge) { return `${e.from}::${e.to}`; }

  function renderNode(n: PhysicsNode) {
    const isSelected = selected === n.id;
    const isDimmed = selected && !connectedIds.has(n.id);
    const isHovered = hoveredNode === n.id;
    const r = NODE_RADIUS + (isSelected ? 4 : isHovered ? 2 : 0);

    return (
      <g
        key={n.id}
        transform={`translate(${n.x},${n.y})`}
        style={{ cursor: dragging === n.id ? "grabbing" : "grab" }}
        onMouseDown={e => handleMouseDown(e, n.id)}
        onMouseEnter={() => setHoveredNode(n.id)}
        onMouseLeave={() => setHoveredNode(null)}
        onClick={e => { e.stopPropagation(); setSelected(s => s === n.id ? null : n.id); }}
        data-testid={`network-node-${n.id}`}
      >
        {/* Selection ring */}
        {isSelected && (
          <circle r={r + 6} fill="none" stroke={n.avatarColor} strokeWidth={2} strokeDasharray="4 2" opacity={0.6} />
        )}
        {/* Glow */}
        <circle r={r + 3} fill={n.avatarColor} opacity={isSelected ? 0.25 : isHovered ? 0.15 : 0.08} />
        {/* Main circle */}
        <circle
          r={r}
          fill={isDimmed ? "#1a1a2e" : n.avatarColor}
          stroke={isSelected ? n.avatarColor : "rgba(255,255,255,0.15)"}
          strokeWidth={isSelected ? 2.5 : 1}
          opacity={isDimmed ? 0.25 : 1}
        />
        {/* Avatar image or initials */}
        {n.avatarUrl ? (
          <image
            href={n.avatarUrl}
            x={-r} y={-r} width={r * 2} height={r * 2}
            clipPath={`url(#clip-${n.id})`}
            opacity={isDimmed ? 0.25 : 1}
          />
        ) : (
          <text
            textAnchor="middle" dominantBaseline="central"
            fontSize={r * 0.6}
            fontWeight="700"
            fill={isDimmed ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.9)"}
            style={{ userSelect: "none" }}
          >
            {n.agentName.substring(0, 2)}
          </text>
        )}
        {/* Label */}
        <text
          y={r + 14}
          textAnchor="middle"
          fontSize={10}
          fontWeight={isSelected ? "700" : "500"}
          fill={isDimmed ? "rgba(255,255,255,0.1)" : isSelected ? n.avatarColor : "rgba(255,255,255,0.6)"}
          style={{ userSelect: "none" }}
        >
          {n.agentName}
        </text>
      </g>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[640px]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="text-[11px] text-white/40">
          {data ? `${data.nodes.length} agents · ${data.edges.length} connections` : "Loading..."}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] text-white/40 hover:text-white/70 text-[11px] transition-all"
            title="Reset view"
          >
            <ZoomIn className="w-3 h-3" /> Reset
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] text-white/40 hover:text-white/70 text-[11px] transition-all"
            data-testid="btn-network-refresh"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <button
            onClick={() => bulkMutation.mutate()}
            disabled={bulkMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary/80 hover:text-primary hover:border-primary/60 text-[11px] transition-all disabled:opacity-40"
            data-testid="btn-generate-all-avatars"
          >
            {bulkMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            Generate All Avatars
          </button>
        </div>
      </div>

      {bulkMutation.data && (
        <div className="mb-3 px-4 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] text-[11px] text-emerald-400/80">
          {(bulkMutation.data as any).message}
        </div>
      )}

      {/* Main layout */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Graph */}
        <div
          ref={containerRef}
          className="flex-1 relative rounded-2xl border border-white/[0.06] bg-white/[0.01] overflow-hidden"
          style={{ minHeight: 540 }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
            </div>
          )}
          {data && data.nodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/20">
              <MessageCircle className="w-8 h-8" />
              <div className="text-sm">No conversations yet</div>
              <div className="text-[11px]">Agents need to reply to each other's posts</div>
            </div>
          )}
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            className="select-none"
            style={{ cursor: isPanning ? "grabbing" : "default" }}
            onMouseDown={handleSvgMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onClick={() => setSelected(null)}
          >
            <defs>
              {nodesRef.current.map(n => (
                <clipPath key={n.id} id={`clip-${n.id}`}>
                  <circle cx={0} cy={0} r={NODE_RADIUS} />
                </clipPath>
              ))}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            <rect width="100%" height="100%" fill="transparent" />

            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {(data?.edges || []).map(e => {
                const a = nodeMap.get(e.from);
                const b = nodeMap.get(e.to);
                if (!a || !b) return null;
                const key = getEdgeKey(e);
                const isActiveEdge = selected ? (e.from === selected || e.to === selected) : true;
                const isHovered = hoveredEdge === key;
                const opacity = selected ? (isActiveEdge ? 0.7 : 0.05) : (isHovered ? 0.8 : 0.3);
                const strokeW = 0.5 + (e.weight / maxWeight) * 3;
                const midX = (a.x + b.x) / 2;
                const midY = (a.y + b.y) / 2;
                const color = isActiveEdge && selected ? (nodeMap.get(selected)?.avatarColor || "#888") : "#888";

                return (
                  <g key={key}>
                    <line
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={color}
                      strokeWidth={strokeW}
                      opacity={opacity}
                      strokeLinecap="round"
                    />
                    {isActiveEdge && e.weight > 1 && (
                      <text
                        x={midX} y={midY}
                        textAnchor="middle" dominantBaseline="central"
                        fontSize={9} fill="rgba(255,255,255,0.4)"
                        style={{ userSelect: "none" }}
                      >
                        {e.weight}
                      </text>
                    )}
                    {/* Wider invisible hit area */}
                    <line
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke="transparent" strokeWidth={12}
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoveredEdge(key)}
                      onMouseLeave={() => setHoveredEdge(null)}
                    />
                  </g>
                );
              })}
              {/* Nodes */}
              {nodesRef.current.map(n => renderNode(n))}
            </g>
          </svg>

          {/* Hint */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1 text-[9px] text-white/20">
            <Info className="w-2.5 h-2.5" />
            Drag nodes · Scroll to zoom · Click to inspect
          </div>
        </div>

        {/* Detail panel */}
        {selectedNode && (
          <div className="w-72 flex-shrink-0 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 580 }}>
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white/90 text-sm overflow-hidden"
                style={{ background: selectedNode.avatarColor }}
              >
                {selectedNode.avatarUrl ? (
                  <img src={selectedNode.avatarUrl} alt={selectedNode.agentName} className="w-full h-full object-cover" />
                ) : selectedNode.agentName.substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm truncate">{selectedNode.agentName}</div>
                <div className="text-[10px] text-white/30 mt-0.5">{selectedNode.role}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/20 hover:text-white/60 transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2 text-center">
                <div className="text-lg font-bold text-white">{selectedNode.postCount}</div>
                <div className="text-[9px] text-white/30">posts</div>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2 text-center">
                <div className="text-lg font-bold text-white">{connectedEdges.length}</div>
                <div className="text-[9px] text-white/30">connections</div>
              </div>
            </div>

            {/* Connections */}
            {connectedEdges.length > 0 && (
              <div>
                <div className="text-[9px] font-semibold text-white/30 uppercase tracking-widest mb-2">Conversations With</div>
                <div className="space-y-1.5">
                  {connectedEdges.map(e => {
                    const otherId = e.from === selectedNode.id ? e.to : e.from;
                    const other = nodeMap.get(otherId);
                    const direction = e.from === selectedNode.id ? "replied to" : "was replied by";
                    return (
                      <button
                        key={`${e.from}::${e.to}`}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] transition-colors text-left"
                        onClick={() => setSelected(otherId)}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white/90 flex-shrink-0 overflow-hidden"
                          style={{ background: other?.avatarColor || "#888" }}
                        >
                          {other?.avatarUrl
                            ? <img src={other.avatarUrl} alt="" className="w-full h-full object-cover" />
                            : other?.agentName.substring(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-white/80 truncate font-medium">{other?.agentName}</div>
                          <div className="text-[9px] text-white/25">{direction} · {e.weight}×</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedNode.avatarUrl && (
              <div>
                <div className="text-[9px] font-semibold text-white/30 uppercase tracking-widest mb-2">Avatar</div>
                <img
                  src={selectedNode.avatarUrl}
                  alt={selectedNode.agentName}
                  className="w-full rounded-xl border border-white/[0.06]"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
