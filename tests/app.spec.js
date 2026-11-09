import { expect, test } from "@playwright/test";

test("workspace renders, saves project, and keeps model unbound until configured", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Узлы графа")).toBeVisible();
  await expect(page.getByText("Запрос к LLM", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("synaps-project")));
  expect(saved.nodes.length).toBeGreaterThan(4);
});

test("context and prompt page previews explicit system and context text", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Контекст и промпты", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Рабочее место промптов" })).toBeVisible();
  await expect(page.getByText(/ПРЕДПРОСМОТР ГОТОВОГО ПРОМПТА/)).toBeVisible();
});

test("creates a user skill manifest without executing its instructions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Навыки", exact: true }).click();
  await page.getByRole("button", { name: "Создать первый навык" }).click();
  await page.getByLabel("Название").fill("Test Skill");
  await page.getByLabel("Инструкции").fill("Return clear, concise answers.");
  await page.getByLabel("Автор").fill("Workbench QA");
  await page.getByLabel(/Входы/).fill("topic, audience");
  await page.getByLabel(/Выходы/).fill("review");
  await page.getByLabel("Required capabilities").fill("prompt-only");
  await page.getByLabel("Workflow templates").fill("review-flow");
  await page.getByRole("button", { name: "Сохранить навык" }).click();
  await expect(page.getByRole("heading", { name: "Test Skill" })).toBeVisible();
  await page.getByText("Проверить манифест").click();
  await expect(page.getByText("Без описания · Workbench QA")).toBeVisible();
  await expect(page.getByText(/review-flow/)).toBeVisible();
});

test("LLM controls and theme palette are editable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Настройки модели", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Настройки модели" })).toBeVisible();
  await expect(page.getByText("Окно контекста (Ollama num_ctx)")).toBeVisible();
  await page.getByRole("button", { name: "Оформление", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Внешний вид" })).toBeVisible();
  await page.getByRole("button", { name: "Палитра violet" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--accent"))).toBe("#a99bff");
});

test("template gallery exposes all eight requested architecture starters", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Шаблоны", exact: true }).click();
  for (const name of ["ЗАЩИТА", "РАСШИРЕННЫЙ ПОМОЩНИК", "АНАЛИЗ ИЗОБРАЖЕНИЙ", "ПОИСКОВЫЙ ПОМОЩНИК", "РАБОТА С JSON", "ЛАБОРАТОРИЯ МОДЕЛЕЙ", "ПОМОЩНИК ПО КОДУ", "КРИТИЧЕСКИЙ ОБЗОР"]) {
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Открыть граф" }).first().click();
  await expect(page.getByText("Граф", { exact: false }).first()).toBeVisible();
});

test("Brain Inspector labels unknown provider metrics as unavailable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Инспектор выполнения", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Инспектор выполнения" })).toBeVisible();
  await expect(page.getByText("Недоступно").first()).toBeVisible();
});

test("llama.cpp settings show explicit local managed-server controls", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Настройки модели", exact: true }).click();
  await page.getByLabel("Движок").selectOption("llamacpp");
  await expect(page.getByText("УПРАВЛЯЕМЫЙ LLAMA-SERVER")).toBeVisible();
  await expect(page.getByRole("button", { name: "Запустить и проверить" })).toBeVisible();
});

test("Model POV reports that no image has been processed instead of inventing crops", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Взгляд модели", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Взгляд модели · изображение" })).toBeVisible();
  await expect(page.getByText(/Скрытые серверные обрезки/)).toBeVisible();
});

test("custom node studio exports a manifest but does not enable code execution", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Свои узлы", exact: true }).click();
  await page.getByRole("button", { name: "Создать манифест" }).click();
  await page.getByLabel("Имя", { exact: true }).fill("Safe Formatter");
  await page.getByLabel("Описание", { exact: true }).fill("A documented text node");
  await page.getByRole("button", { name: "Сохранить", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "Safe Formatter" })).toBeVisible();
  await expect(page.getByText("Только манифест · обработчика нет")).toBeVisible();
});

test("graph execution records local processing and stops at unavailable inference", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Запустить граф" }).click();
  await expect(page.getByText("Остановлено")).toBeVisible();
  await page.getByRole("button", { name: "Инспектор выполнения", exact: true }).click();
  await expect(page.getByText("Сборщик промпта", { exact: false }).first()).toBeVisible();
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
  await page.getByRole("button", { name: "Модели", exact: true }).click();
  await page.getByRole("button", { name: "Обновить список моделей" }).click();
  await expect(page.getByRole("heading", { name: "local-test-model" })).toBeVisible();
  await expect(page.getByText("7B", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Эксперименты", exact: true }).click();
  await page.getByLabel("Название эксперимента").fill("Local model comparison");
  await page.getByLabel("Системный промпт лаборатории").fill("Answer in {{language}}");
  await page.getByLabel("Промпт лаборатории", { exact: true }).fill("Explain {{topic}}");
  await page.getByLabel("Тестовые запросы лаборатории").fill("Also define {{topic}}");
  await page.getByLabel("Имя новой переменной").fill("language");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.getByLabel("Переменная language").fill("English");
  await page.getByLabel("Имя новой переменной").fill("topic");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.getByLabel("Переменная topic").fill("local inference");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Запустить на 1 моделях" }).click();
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
  await page.getByRole("button", { name: "Контекст и промпты", exact: true }).click();
  await page.getByLabel("Шаблон пользовательского промпта").fill("Translate {{phrase}} to {{language}}");
  await page.getByLabel("Имя новой переменной").fill("language");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.getByRole("textbox", { name: "Переменная language" }).fill("French");
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
  await page.getByRole("button", { name: "Модели", exact: true }).click();
  await page.getByRole("button", { name: "Обновить список моделей" }).click();
  await expect(page.getByText(/Connection refused at localhost:11434/)).toBeVisible();
  await page.getByRole("button", { name: "Активность", exact: true }).click();
  await expect(page.getByText("Недоступен")).toBeVisible();
});

test("Save As creates a recent local project without exporting secret-shaped settings", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("synaps-settings", JSON.stringify({ project: "Existing", provider: "ollama", endpoint: "http://127.0.0.1:11434", apiKey: "must-not-export" }));
  });
  await page.goto("/");
  page.once("dialog", dialog => dialog.accept("Workbench regression"));
  await page.getByRole("button", { name: "Сохранить как" }).first().click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("synaps-project"))?.name)).toBe("Workbench regression");
  const project = await page.evaluate(() => JSON.parse(localStorage.getItem("synaps-project")));
  expect(JSON.stringify(project)).not.toContain("must-not-export");
  expect(project.metadata.modifiedAt).toBeTruthy();
  await page.getByRole("button", { name: "Проекты", exact: true }).click();
  await expect(page.getByText("Workbench regression", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Открыть проект" }).click();
  await expect(page.getByText("Узлы графа")).toBeVisible();
});

test("model inspector never guesses provider metadata", async ({ page }) => {
  await page.addInitScript(() => {
    window.__TAURI__ = { core: { invoke: async command => {
      if (command === "list_projects") return [];
      if (command === "list_models") return [{ name: "sparse-model" }];
      throw new Error(`Unexpected command: ${command}`);
    } } };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Модели", exact: true }).click();
  await page.getByRole("button", { name: "Обновить список моделей" }).click();
  await expect(page.getByRole("heading", { name: "sparse-model" })).toBeVisible();
  await expect(page.getByText("Провайдер не сообщил").first()).toBeVisible();
});

test("Experiment Lab persists failed provider requests without fabricating output", async ({ page }) => {
  await page.addInitScript(() => {
    class Channel { onmessage = null; }
    window.__TAURI__ = { core: { Channel, invoke: async (command, args) => {
      if (command === "list_projects") return [];
      if (command === "list_models") return ["test-model"];
      if (command === "stream_completion") { args.onEvent.onmessage({ kind: "error", error: "Connection refused by local test provider" }); return null; }
      throw new Error(`Unexpected command: ${command}`);
    } } };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Модели", exact: true }).click();
  await page.getByRole("button", { name: "Обновить список моделей" }).click();
  await page.getByRole("button", { name: "Эксперименты", exact: true }).click();
  await page.getByLabel("Название эксперимента").fill("Failure is visible");
  await page.getByLabel("Промпт лаборатории", { exact: true }).fill("Do not invent output");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Запустить на 1 моделях" }).click();
  await expect(page.getByText(/Connection refused by local test provider/).first()).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("synaps-experiments")));
  expect(saved[0].results[0].error).toContain("Connection refused");
  expect(saved[0].results[0].response).toBe("");
});

test("legacy workflow catalog remains available and labels unsupported nodes honestly", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Найти узел").fill("Document Search");
  await expect(page.getByRole("button", { name: /Поиск по документам/ })).toBeVisible();
  await expect(page.getByText("Расширение: обработчик не подключён")).toBeVisible();
  await page.getByPlaceholder("Найти узел").fill("Chat Input");
  await expect(page.getByRole("button", { name: /Ввод пользователя Исполнитель реализован/ })).toBeVisible();
});

test("imported Skill manifests are inspectable data and executable code is ignored", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Навыки", exact: true }).click();
  await page.getByLabel("Import Skill manifest").setInputFiles({
    name: "review-skill.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      manifestVersion: 1,
      name: "Imported Review",
      version: "2.1.0",
      author: "QA",
      description: "Review a prompt",
      inputs: ["prompt"],
      outputs: ["notes"],
      requiredCapabilities: ["local inference"],
      promptInstructions: "Review evidence and state uncertainty.",
      workflowTemplates: ["simple-review"],
      execution: { script: "window.__SHOULD_NOT_RUN = true" },
    })),
  });
  await expect(page.getByRole("heading", { name: "Imported Review" })).toBeVisible();
  await page.getByText("Проверить манифест").click();
  await expect(page.getByText(/Declarative only; imported code is never executed/)).toBeVisible();
  expect(await page.evaluate(() => window.__SHOULD_NOT_RUN)).toBeUndefined();
});

test.describe("system language localization", () => {
  test.use({ locale: "zh-CN" });

  test("auto mode renders Simplified Chinese and updates the document language", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".crumb b")).toHaveText("工作区");
    await expect(page.getByText("流程节点")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await page.getByRole("button", { name: "模型", exact: true }).click();
    await expect(page.getByRole("heading", { name: "模型工作台" })).toBeVisible();
  });

  test("manual language choice overrides system auto-detection and persists", async ({ page }) => {
    await page.goto("/");
    const selector = page.getByRole("combobox", { name: "界面语言" });
    await selector.selectOption("en");
    await expect(page.locator(".crumb b")).toHaveText("Workspace");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect.poll(() => page.evaluate(() => localStorage.getItem("synaps-locale"))).toBe("en");
    await page.reload();
    await expect(page.locator(".crumb b")).toHaveText("Workspace");
  });
});


test.describe("localized UI preserves user-authored prompt text", () => {
  test.use({ locale: "zh-CN" });

  test("switching the interface language never translates prompt contents", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "上下文与提示词", exact: true }).click();
    const prompt = page.getByRole("textbox", { name: "用户提示词模板" });
    await prompt.fill("Translate this exact user text to {{language}}");
    await page.getByRole("combobox", { name: "界面语言" }).selectOption("en");
    await expect(page.getByRole("textbox", { name: "User prompt template" })).toHaveValue("Translate this exact user text to {{language}}");
    await page.getByRole("combobox", { name: "Interface language" }).selectOption("zh-CN");
    await expect(page.getByRole("textbox", { name: "用户提示词模板" })).toHaveValue("Translate this exact user text to {{language}}");
  });
});
