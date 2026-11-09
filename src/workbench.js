export const PROVIDERS = ["ollama", "lmstudio-native", "openai-compatible", "llamacpp"];

export function validateProviderConfig({ kind, baseUrl }) {
  if (!PROVIDERS.includes(kind)) throw new Error(`Unsupported provider: ${kind || "(empty)"}`);
  let url;
  try { url = new URL(String(baseUrl || "")); } catch { throw new Error("Enter a valid provider URL."); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Provider URL must use HTTP or HTTPS.");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Only localhost/loopback endpoints are allowed.");
  return { kind, baseUrl: url.toString().replace(/\/$/, "") };
}

export function resolveVariables(template, variables = {}) {
  return String(template ?? "").replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, key) => Object.hasOwn(variables, key) ? String(variables[key]) : match);
}

export function validateGraph(nodes = [], edges = []) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  if (byId.size !== nodes.length) return { valid: false, error: "Graph contains duplicate node IDs." };
  for (const edge of edges) {
    const from = byId.get(edge.from), to = byId.get(edge.to);
    if (!from || !to) return { valid: false, error: "An edge references a missing node." };
    if (!from.outputs?.some(port => to.inputs?.includes(port))) return { valid: false, error: `Incompatible ports: ${from.type} → ${to.type}.` };
  }
  const degree = new Map(nodes.map(node => [node.id, 0]));
  for (const edge of edges) degree.set(edge.to, (degree.get(edge.to) || 0) + 1);
  const queue = [...degree].filter(([, value]) => value === 0).map(([id]) => id);
  let visited = 0;
  while (queue.length) {
    const id = queue.shift(); visited++;
    for (const edge of edges) if (edge.from === id) {
      const next = degree.get(edge.to) - 1; degree.set(edge.to, next); if (next === 0) queue.push(edge.to);
    }
  }
  return visited === nodes.length ? { valid: true } : { valid: false, error: "Graph contains a cycle." };
}

export function sanitizeProjectSettings(settings = {}) {
  return Object.fromEntries(Object.entries(settings).filter(([key]) => !/(api.?key|secret|token|password|authorization)/i.test(key)));
}

export function serializeProject({ name, nodes, edges, settings, prompts = [], experiments = [], testCases = [], labDraft = null, promptVariables = {} }) {
  return JSON.stringify({ format: "synaps-project", version: 2, name, metadata: { modifiedAt: new Date().toISOString() }, nodes, edges, settings: sanitizeProjectSettings(settings), prompts, experiments, testCases, labDraft, promptVariables });
}

export function validateProject(project) {
  if (!project || !Array.isArray(project.nodes) || !Array.isArray(project.edges) || project.nodes.length > 500 || project.edges.length > 2000) throw new Error("Invalid project structure or size.");
  const result = validateGraph(project.nodes, project.edges);
  if (!result.valid) throw new Error(result.error);
  return project;
}

export function createExperiment({ name, systemPrompt, userPrompt, context, models, settings, variables, testCases = [], results = [], createdAt = new Date().toISOString() }) {
  if (!name?.trim()) throw new Error("Experiment name is required.");
  if (!Array.isArray(models) || models.length === 0) throw new Error("Select at least one model.");
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: name.trim(), systemPrompt: resolveVariables(systemPrompt, variables), userPrompt: resolveVariables(userPrompt, variables), rawSystemPrompt: systemPrompt, rawUserPrompt: userPrompt, context, models: [...models], settings: { ...settings }, variables: { ...variables }, testCases: testCases.map(input => resolveVariables(input, variables)), rawTestCases: [...testCases], results, createdAt };
}
