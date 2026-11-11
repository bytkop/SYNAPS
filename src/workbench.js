export const PROVIDERS = ["ollama", "lmstudio-native", "openai-compatible", "llamacpp"];

export function validateProviderConfig({ kind, baseUrl }) {
  if (!PROVIDERS.includes(kind)) throw new Error(`Unsupported provider: ${kind || "(empty)"}`);
  let url;
  try { url = new URL(String(baseUrl || "")); } catch { throw new Error("Enter a valid provider URL."); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Provider URL must use HTTP or HTTPS.");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Only localhost/loopback endpoints are allowed.");
  return { kind, baseUrl: url.toString().replace(/\/$/, "") };
}

export function validateOllamaModelTag(model) {
  const value = String(model ?? "").trim();
  if (!value || value.length > 200 || value.startsWith("-") || value.includes("..")) throw new Error("Enter a valid Ollama model tag (max 200 characters).");
  if (!/^[A-Za-z0-9/:._-]+$/.test(value) || value.startsWith("/") || value.endsWith("/") || value.includes("//")) {
    throw new Error("Model tag may contain only letters, numbers, slash, colon, dot, underscore and hyphen.");
  }
  return value;
}

export function createOllamaVariantRequest({ baseModel, newModel, systemPrompt = "", temperature, topP, topK = 40, contextTokens, maxTokens, stopSequences = [] }) {
  const base = validateOllamaModelTag(baseModel);
  const output = validateOllamaModelTag(newModel);
  if (base === output) throw new Error("Choose a new model tag. The base model will not be overwritten.");
  const numeric = {
    temperature: Number(temperature), topP: Number(topP), topK: Number(topK),
    numCtx: Number(contextTokens), numPredict: Number(maxTokens),
  };
  if (!Number.isFinite(numeric.temperature) || numeric.temperature < 0 || numeric.temperature > 2) throw new Error("Temperature must be between 0 and 2.");
  if (!Number.isFinite(numeric.topP) || numeric.topP < 0.01 || numeric.topP > 1) throw new Error("Top P must be between 0.01 and 1.");
  if (!Number.isInteger(numeric.topK) || numeric.topK < 1 || numeric.topK > 1000) throw new Error("Top K must be between 1 and 1000.");
  if (!Number.isInteger(numeric.numCtx) || numeric.numCtx < 256 || numeric.numCtx > 131072) throw new Error("Context must be between 256 and 131072.");
  if (!Number.isInteger(numeric.numPredict) || numeric.numPredict < 1 || numeric.numPredict > 32768) throw new Error("Maximum output must be between 1 and 32768.");
  if (typeof systemPrompt !== "string" || new TextEncoder().encode(systemPrompt).length > 20000) throw new Error("System instructions are limited to 20,000 UTF-8 bytes.");
  if (!Array.isArray(stopSequences) || stopSequences.length > 8 || stopSequences.some(value => typeof value !== "string" || new TextEncoder().encode(value).length > 120)) {
    throw new Error("Use at most 8 stop sequences, each no longer than 120 bytes.");
  }
  return { baseModel: base, newModel: output, systemPrompt, ...numeric, stopSequences: stopSequences.map(value => value.trim()).filter(Boolean) };
}

export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  const source = String(text ?? "").replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { field += '"'; index++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index++;
      row.push(field); field = "";
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
    } else field += char;
  }
  if (quoted) throw new Error("CSV ends inside a quoted field.");
  row.push(field);
  if (row.some(value => value !== "")) rows.push(row);
  if (rows.length < 2) return [];
  const [headers, ...records] = rows;
  if (headers.some(header => !header.trim()) || new Set(headers).size !== headers.length) throw new Error("CSV headers must be non-empty and unique.");
  return records.map(values => {
    if (values.length !== headers.length) throw new Error("CSV row has a different number of columns than the header.");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

export function executeDataNode(type, inputs = [], config = {}, text = "") {
  const first = inputs[0];
  if (type === "JSON Input") {
    const source = text || first || "";
    try { return typeof source === "string" ? JSON.parse(source) : source; }
    catch { throw new Error("JSON Input contains invalid JSON."); }
  }
  if (type === "CSV Input") return parseCsv(text || first || "");
  if (type === "CSV Parser") return parseCsv(typeof first === "string" ? first : text);
  if (type === "Split" || type === "Text Splitter") return String(first ?? text ?? "").split(String(config.separator ?? "\n"));
  if (type === "Merge" || type === "Data Merge" || type === "Text Merger") {
    const values = inputs.filter(value => value !== undefined && value !== null && value !== "");
    if (values.every(Array.isArray)) return values.flat();
    if (values.every(value => value && typeof value === "object" && !Array.isArray(value))) return Object.assign({}, ...values);
    return values.map(value => typeof value === "string" ? value : JSON.stringify(value)).join(String(config.separator ?? "\n"));
  }
  if (type === "Data Filter") {
    const source = Array.isArray(first) ? first : first && typeof first === "object" ? Object.entries(first).map(([key, value]) => ({ key, value })) : [];
    const path = String(config.path ?? "");
    const expected = String(config.equals ?? "");
    const operator = config.operator ?? "equals";
    const read = item => path.split(".").filter(Boolean).reduce((value, key) => value?.[key], item);
    return source.filter(item => {
      const value = read(item);
      if (operator === "not-equals") return String(value) !== expected;
      if (operator === "contains") return String(value ?? "").includes(expected);
      if (operator === "truthy") return Boolean(value);
      return String(value) === expected;
    });
  }
  if (type === "If" || type === "Conditional Branch") {
    const actual = first;
    const expected = config.equals ?? true;
    return { matched: String(actual) === String(expected), value: actual, note: "Boolean result only; graph routing is not implemented." };
  }
  if (type === "Switch") {
    const actual = first;
    const expected = config.case ?? "";
    return { branch: String(actual) === String(expected) ? "case" : "default", value: actual, note: "Branch label only; graph routing is not implemented." };
  }
  if (type === "Token Counter") {
    const source = typeof first === "string" ? first : JSON.stringify(first ?? text ?? "");
    return { estimatedTokens: Math.ceil(source.length / 4), exact: false, method: "rough character-count heuristic; provider tokenizer unavailable" };
  }
  return undefined;
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
  const sanitize = value => {
    if (Array.isArray(value)) return value.map(sanitize);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !/(api.?key|secret|token|password|authorization)/i.test(key))
      .map(([key, item]) => [key, sanitize(item)]));
  };
  return sanitize(settings);
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

export const EFFORT_PROFILES = {
  INSTANT: { label: "Instant", scale: 0.55, reasoning: "low", speed: "Fastest", load: "Low", description: "Small output budget for quick commands." },
  LIGHT: { label: "Light", scale: 0.75, reasoning: "low", speed: "Fast", load: "Low", description: "Lean generation for everyday tasks." },
  STANDARD: { label: "Standard", scale: 1, reasoning: "medium", speed: "Balanced", load: "Moderate", description: "The configured token budget, unchanged." },
  FOCUSED: { label: "Focused", scale: 1.2, reasoning: "medium", speed: "Slower", load: "Moderate", description: "More output room for code and multi-step work." },
  DEEP: { label: "Deep", scale: 1.45, reasoning: "high", speed: "Slow", load: "High", description: "Larger output budget for complex analysis." },
  EXPERT: { label: "Expert", scale: 1.8, reasoning: "high", speed: "Slowest", load: "Highest", description: "Largest output budget allowed by your settings." },
  ADAPTIVE: { label: "Adaptive", scale: 1, reasoning: "medium", speed: "Variable", load: "Variable", description: "Selects a budget from request length and complexity cues." },
};

export function resolveEffort(settings = {}, text = "") {
  let key = Object.hasOwn(EFFORT_PROFILES, settings.effort) ? settings.effort : "STANDARD";
  if (key === "ADAPTIVE") {
    const value = String(text);
    const score = (value.length > 1200 ? 2 : value.length > 400 ? 1 : 0)
      + (/\b(architect|compare|analy[sz]e|debug|design|prove|trade.?off|step.?by.?step|сложн|сравн|проанализ|архитектур|отлад)/i.test(value) ? 1 : 0);
    key = score >= 3 ? "EXPERT" : score >= 2 ? "DEEP" : score >= 1 ? "FOCUSED" : "STANDARD";
  }
  return { key, ...EFFORT_PROFILES[key] };
}

export function generationOptions(settings = {}, provider, text = "") {
  const effort = resolveEffort(settings, text);
  const max = Math.min(32768, Math.max(128, Math.round((Number(settings.maxTokens) || 1024) * effort.scale)));
  const common = { temperature: Number(settings.temperature), top_p: Number(settings.topP) };
  if (provider === "ollama") return { ...common, num_predict: max, num_ctx: Number(settings.contextTokens) || 4096 };
  if (provider === "lmstudio-native") return { ...common, max_output_tokens: max, context_length: Number(settings.contextTokens) || 4096 };
  return { ...common, max_tokens: max, ...(settings.sendReasoningEffort ? { reasoning_effort: effort.reasoning } : {}) };
}
