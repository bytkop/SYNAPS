import { normalizeLocale, resolveLocale, translateMessage } from "../src/i18n.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createExperiment, EFFORT_PROFILES, generationOptions, resolveEffort, resolveVariables, sanitizeProjectSettings, serializeProject, validateGraph, validateProject, validateProviderConfig } from "../src/workbench.js";

test("provider validation accepts local endpoints and explains unavailable configuration", () => {
  assert.equal(validateProviderConfig({ kind: "ollama", baseUrl: "http://localhost:11434" }).kind, "ollama");
  assert.throws(() => validateProviderConfig({ kind: "ollama", baseUrl: "http://example.com" }), /loopback/);
  assert.throws(() => validateProviderConfig({ kind: "ollama", baseUrl: "" }), /valid provider URL/);
});

test("prompt variables resolve known names and preserve missing placeholders", () => {
  assert.equal(resolveVariables("Explain {{task}} for {{audience}} in {{language}}", { task: "graphs", audience: "engineers", language: "English" }), "Explain graphs for engineers in English");
  assert.equal(resolveVariables("{{missing}}", {}), "{{missing}}");
});

test("effort profiles produce provider-shaped generation budgets", () => {
  const base = { effort: "STANDARD", maxTokens: 1000, contextTokens: 4096, temperature: 0.4, topP: 0.9 };
  assert.equal(generationOptions(base, "ollama", "hello").num_predict, 1000);
  assert.equal(generationOptions({ ...base, effort: "INSTANT" }, "ollama").num_predict, 550);
  assert.equal(generationOptions({ ...base, effort: "EXPERT" }, "lmstudio-native").max_output_tokens, 1800);
  assert.equal(generationOptions({ ...base, effort: "DEEP" }, "openai-compatible").reasoning_effort, undefined);
  assert.equal(generationOptions({ ...base, effort: "DEEP", sendReasoningEffort: true }, "openai-compatible").reasoning_effort, "high");
  assert.equal(generationOptions({ ...base, effort: "EXPERT", maxTokens: 32768 }, "ollama").num_predict, 32768);
  assert.equal(generationOptions({ ...base, effort: "LIGHT" }, "ollama").num_ctx, 4096);
});

test("adaptive effort resolves from request complexity without inventing capability support", () => {
  assert.equal(resolveEffort({ effort: "ADAPTIVE" }, "quick answer").key, "STANDARD");
  assert.equal(resolveEffort({ effort: "ADAPTIVE" }, "Please analyze this design").key, "FOCUSED");
  assert.equal(resolveEffort({ effort: "ADAPTIVE" }, `Compare these systems and analyze the trade-off: ${"details ".repeat(160)}`).key, "EXPERT");
  assert.equal(EFFORT_PROFILES.EXPERT.reasoning, "high");
});

test("experiment requires models and preserves raw and resolved prompt details", () => {
  assert.throws(() => createExperiment({ name: "A", models: [] }), /Select at least one model/);
  const exp = createExperiment({ name: " Compare ", systemPrompt: "Answer in {{language}}", userPrompt: "{{task}}", variables: { language: "English", task: "Explain" }, testCases: ["Also {{task}}"], models: ["a", "b"], settings: { temperature: 0.2 } });
  assert.equal(exp.name, "Compare"); assert.equal(exp.systemPrompt, "Answer in English"); assert.equal(exp.rawUserPrompt, "{{task}}"); assert.deepEqual(exp.models, ["a", "b"]); assert.deepEqual(exp.testCases, ["Also Explain"]);
});

test("graph validation rejects incompatible edges and cycles", () => {
  const nodes = [{ id: "a", type: "Input", inputs: [], outputs: ["text"] }, { id: "b", type: "Model", inputs: ["messages"], outputs: ["text"] }];
  assert.match(validateGraph(nodes, [{ from: "a", to: "b" }]).error, /Incompatible/);
  const compatible = [{ ...nodes[0], outputs: ["text"] }, { ...nodes[1], inputs: ["text"] }];
  assert.equal(validateGraph(compatible, [{ from: "a", to: "b" }, { from: "b", to: "a" }]).valid, false);
});

test("project save and reload validates graph and strips secret-shaped settings", () => {
  const graph = { nodes: [{ id: "input", type: "Input", inputs: [], outputs: ["text"] }], edges: [] };
  const json = serializeProject({ name: "Lab", ...graph, settings: { provider: "ollama", apiKey: "never-export", access_token: "nope" }, experiments: [{ name: "persisted run", results: [{ response: "real result" }] }], labDraft: { userPrompt: "{{task}}" }, promptVariables: { task: "check" } });
  const loaded = validateProject(JSON.parse(json));
  assert.equal(loaded.name, "Lab"); assert.deepEqual(loaded.settings, { provider: "ollama" }); assert.equal(loaded.experiments[0].results[0].response, "real result"); assert.equal(loaded.labDraft.userPrompt, "{{task}}"); assert.deepEqual(loaded.promptVariables, { task: "check" });
  assert.deepEqual(sanitizeProjectSettings({ token: "x", font: "Inter", provider: { apiKey: "nested", endpoint: "localhost" } }), { font: "Inter", provider: { endpoint: "localhost" } });
});


test("system language chooses the first supported locale and falls back safely", () => {
  assert.equal(resolveLocale("auto", ["zh-CN", "en-US"]), "zh-CN");
  assert.equal(resolveLocale("auto", ["zh-TW"]), "zh-CN");
  assert.equal(resolveLocale("auto", ["fr-FR", "ru-RU"]), "ru");
  assert.equal(resolveLocale("auto", ["fr-FR"]), "en");
  assert.equal(resolveLocale("ru", ["zh-CN"]), "ru");
  assert.equal(normalizeLocale("zh-Hans-CN"), "zh-CN");
});

test("bundled UI catalogs translate shared interface strings without a network", () => {
  assert.equal(translateMessage("Workspace", "zh-CN"), "工作区");
  assert.equal(translateMessage("Models", "ru"), "Модели");
  assert.equal(translateMessage("Эксперименты", "en"), "Experiments");
  assert.equal(translateMessage("Prompt variable language", "ru"), "Переменная language");
  assert.equal(translateMessage("LLM Inference", "zh-CN"), "LLM 推理");
  assert.equal(translateMessage("Chat Center", "ru"), "Центр чатов");
  assert.equal(translateMessage("LLM Lab", "zh-CN"), "LLM 实验室");
  assert.equal(translateMessage("Discovered 2 model(s) from ollama at http://localhost", "ru"), "Найдено моделей: 2 · ollama · http://localhost");
  assert.equal(translateMessage("Unlisted provider data", "zh-CN"), "Unlisted provider data");
});
