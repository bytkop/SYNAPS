import test from "node:test";
import assert from "node:assert/strict";
import { createExperiment, resolveVariables, sanitizeProjectSettings, serializeProject, validateGraph, validateProject, validateProviderConfig } from "../src/workbench.js";

test("provider validation accepts local endpoints and explains unavailable configuration", () => {
  assert.equal(validateProviderConfig({ kind: "ollama", baseUrl: "http://localhost:11434" }).kind, "ollama");
  assert.throws(() => validateProviderConfig({ kind: "ollama", baseUrl: "http://example.com" }), /loopback/);
  assert.throws(() => validateProviderConfig({ kind: "ollama", baseUrl: "" }), /valid provider URL/);
});

test("prompt variables resolve known names and preserve missing placeholders", () => {
  assert.equal(resolveVariables("Explain {{task}} for {{audience}} in {{language}}", { task: "graphs", audience: "engineers", language: "English" }), "Explain graphs for engineers in English");
  assert.equal(resolveVariables("{{missing}}", {}), "{{missing}}");
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
  assert.deepEqual(sanitizeProjectSettings({ token: "x", font: "Inter" }), { font: "Inter" });
});
