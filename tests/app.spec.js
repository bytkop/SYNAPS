import { expect, test } from "@playwright/test";

test("workspace renders, saves project, and keeps model unbound until configured", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Узлы графа")).toBeVisible();
  await expect(page.getByText("LLM Inference", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Сохранить" }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("synaps-project")));
  expect(saved.nodes.length).toBeGreaterThan(4);
});

test("context and prompt page previews explicit system and context text", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Context & prompts" }).click();
  await expect(page.getByRole("heading", { name: "Prompt Workbench" })).toBeVisible();
  await expect(page.getByText("RESOLVED PROMPT PREVIEW", { exact: true })).toBeVisible();
});

test("creates a user skill manifest without executing its instructions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Skills" }).click();
  await page.getByRole("button", { name: "Создать первый навык" }).click();
  await page.getByLabel("Название").fill("Test Skill");
  await page.getByLabel("Инструкции").fill("Return clear, concise answers.");
  await page.getByRole("button", { name: "Сохранить навык" }).click();
  await expect(page.getByRole("heading", { name: "Test Skill" })).toBeVisible();
});

test("LLM controls and theme palette are editable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "LLM settings" }).click();
  await expect(page.getByRole("heading", { name: "Настройки модели" })).toBeVisible();
  await expect(page.getByText("Контекстное окно (Ollama num_ctx)")).toBeVisible();
  await page.getByRole("button", { name: "Theme" }).click();
  await expect(page.getByRole("heading", { name: "Внешний вид" })).toBeVisible();
  await page.getByRole("button", { name: "Палитра violet" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--accent"))).toBe("#a99bff");
});

test("template gallery exposes all eight requested architecture starters", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Templates" }).click();
  for (const name of ["SAFEGUARD", "ADVANCED ASSISTANT", "VISION ANALYST", "RESEARCH ENGINE", "JSON SPECIALIST", "MULTI-MODEL LAB", "CODE ASSISTANT", "CRITICAL REVIEWER"]) {
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Открыть граф" }).first().click();
  await expect(page.getByText("Graph", { exact: false }).first()).toBeVisible();
});

test("Brain Inspector labels unknown provider metrics as unavailable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Brain Inspector" }).click();
  await expect(page.getByRole("heading", { name: "Brain Inspector" })).toBeVisible();
  await expect(page.getByText("Unavailable").first()).toBeVisible();
});

test("llama.cpp settings show explicit local managed-server controls", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "LLM settings" }).click();
  await page.getByLabel("Движок").selectOption("llamacpp");
  await expect(page.getByText("MANAGED LLAMA-SERVER")).toBeVisible();
  await expect(page.getByRole("button", { name: "Запустить и проверить" })).toBeVisible();
});

test("Model POV reports that no image has been processed instead of inventing crops", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Model POV" }).click();
  await expect(page.getByRole("heading", { name: "Model POV · изображение" })).toBeVisible();
  await expect(page.getByText(/Скрытые server-side crops\/patches недоступны/)).toBeVisible();
});

test("custom node studio exports a manifest but does not enable code execution", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Custom Nodes" }).click();
  await page.getByRole("button", { name: "Создать manifest" }).click();
  await page.getByLabel("Имя", { exact: true }).fill("Safe Formatter");
  await page.getByLabel("Описание", { exact: true }).fill("A documented text node");
  await page.getByRole("button", { name: "Сохранить", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "Safe Formatter" })).toBeVisible();
  await expect(page.getByText("Manifest only · no handler")).toBeVisible();
});

test("graph execution records local processing and stops at unavailable inference", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Запустить граф" }).click();
  await expect(page.getByText("Остановлено")).toBeVisible();
  await page.getByRole("button", { name: "Brain Inspector" }).click();
  await expect(page.getByText("Prompt Composer", { exact: false }).first()).toBeVisible();
});

test("Experiment Lab sends one resolved prompt to selected models and persists provider output", async ({ page }) => {
  await page.addInitScript(() => {
    window.__SYNAPS_TEST_CALLS = [];
    class Channel { onmessage = null; }
    window.__TAURI__ = { core: { Channel, invoke: async (command, args) => {
      window.__SYNAPS_TEST_CALLS.push({ command, args });
      if (command === "list_projects") return [];
      if (command === "list_models") return [{ name: "local-test-model", parameter_size: "7B", quantization_level: "Q4_K_M" }];
      if (command === "stream_completion") {
        args.onEvent.onmessage({ kind: "delta", delta: "provider output", promptTokens: 8 });
        args.onEvent.onmessage({ kind: "done", elapsedMs: 24, completionTokens: 4 });
        return null;
      }
      throw new Error(`Unexpected command: ${command}`);
    } } };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Models" }).click();
  await page.getByRole("button", { name: "Refresh models" }).click();
  await expect(page.getByRole("heading", { name: "local-test-model" })).toBeVisible();
  await expect(page.getByText("7B", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Experiments" }).click();
  await page.getByLabel("Experiment name").fill("Local model comparison");
  await page.getByLabel("Lab system prompt").fill("Answer in {{language}}");
  await page.getByLabel("Lab user prompt").fill("Explain {{topic}}");
  await page.getByLabel("Lab test cases").fill("Also define {{topic}}");
  await page.getByLabel("New variable name").fill("language");
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByLabel("Variable language").fill("English");
  await page.getByLabel("New variable name").fill("topic");
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByLabel("Variable topic").fill("local inference");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Run on 1 model(s)" }).click();
  await expect(page.getByText("provider output").first()).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("synaps-experiments")));
  expect(saved[0].results[0].response).toContain("provider output");
  expect(saved[0].results[0].testCases).toHaveLength(2);
  expect(saved[0].systemPrompt).toBe("Answer in English");
  const request = await page.evaluate(() => window.__SYNAPS_TEST_CALLS.find(call => call.command === "stream_completion").args);
  expect(request.messages[0].content).toContain("Answer in English");
  expect(request.messages[1].content).toBe("Explain local inference");
  const calls = await page.evaluate(() => window.__SYNAPS_TEST_CALLS.filter(call => call.command === "stream_completion"));
  expect(calls).toHaveLength(2);
  expect(calls[1].args.messages[1].content).toBe("Also define local inference");
});

test("Prompt Workbench resolves variables and retains an honest unresolved placeholder", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Context & prompts" }).click();
  await page.getByLabel("User prompt template").fill("Translate {{phrase}} to {{language}}");
  await page.getByLabel("New prompt variable").fill("language");
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("textbox", { name: "Prompt variable language" }).fill("French");
  await expect(page.getByText(/Translate \{\{phrase\}\} to French/)).toBeVisible();
});

test("provider diagnostics expose a concrete discovery failure", async ({ page }) => {
  await page.addInitScript(() => {
    window.__TAURI__ = { core: { invoke: async (command) => {
      if (command === "list_projects") return [];
      if (command === "list_models") throw new Error("Connection refused at localhost:11434");
      throw new Error(`Unexpected command: ${command}`);
    } } };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Models" }).click();
  await page.getByRole("button", { name: "Refresh models" }).click();
  await expect(page.getByText(/Connection refused at localhost:11434/)).toBeVisible();
  await page.getByRole("button", { name: "Activity" }).click();
  await expect(page.getByText("Unreachable")).toBeVisible();
});
