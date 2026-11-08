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
  await expect(page.getByRole("heading", { name: "Контекст и системный промпт" })).toBeVisible();
  await expect(page.getByText(/EFFECTIVE REQUEST PREVIEW/)).toBeVisible();
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
