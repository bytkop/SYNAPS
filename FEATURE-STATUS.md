# Полный аудит исходного SYNAPS ТЗ

Источник: приложенный `df991746-e30d-4da3-9520-bae645307d6f.txt`, разделы 0–20. Статус относится к исходникам в этом ZIP. Он не означает, что Windows-сборка или Rust-команды уже скомпилированы и проверены.

## Реализовано в исходниках этой версии

- **Desktop foundation:** Tauri 2 + Rust + React/Vite оболочка, Windows NSIS target, иконки, локальный build script и GitHub Actions workflow.
- **Graph editor foundation:** граф узлов с перетаскиванием, typed ports, добавлением/удалением узлов, масштабированием и топологическим упорядочиванием. Импорт проверяет известные типы, позиции, порты, ссылки и размер списка.
- **Executable subset:** Chat Input, System Prompt, Context, Prompt Composer/Template, text/context merge, formatter, splitter, JSON parser/validator/builder, length limiter, heuristic safety review, delay, cache/retry pass-through, memory read/write в явном localStorage, output, comparison merge. Неизвестные узлы завершаются ошибкой, а не имитируют исполнение.
- **8 starter template graphs:** Safeguard, Advanced Assistant, Vision Analyst, Research Engine, JSON Specialist, Multi-Model Lab, Code Assistant, Critical Reviewer. Шаблоны содержат соединённые узлы. Vision/retrieval/multi-model/reviewer требуют функций, которые остаются помечены как частичные.
- **Local provider start:** Ollama, LM Studio Native API для списка моделей и начального stream-chat, OpenAI-compatible endpoint (включая режим сервера llama.cpp). URL backend ограничен loopback.
- **Streaming/cancel foundation:** запросы через Tauri Channel, построчный разбор Ollama NDJSON и SSE-style событий OpenAI/LM Studio, UI cancellation token, backend cancellation flag.
- **Managed llama.cpp foundation:** ручное указание llama-server.exe и GGUF, host закреплён на 127.0.0.1, фиксированные аргументы процесса без shell, ограниченные значения порта/context/GPU layers, ожидание `/health`, остановка, PID/status и локальный tail логов.
- **Brain Inspector foundation:** последовательность фактических узлов с состоянием/временем и раскрываемыми входами/выходами, общий wall time, first chunk time, ответные символы. Prompt/completion tokens и tokens/sec отображаются лишь если usage сообщил backend; иначе unavailable.
- **Image POV foundation:** original image upload до 2 MB, тип/размер/dimensions, клиентский data URL для Ollama и OpenAI-compatible vision message, честная пометка о неизвестных backend crops. LM Studio Native image payload пока отклоняется.
- **Project persistence:** SQLite таблицы проектов и immutable JSON versions, локальный app-data файл; localStorage fallback, import/export project JSON, UI списка и восстановления SQLite version.
- **Inference settings:** endpoint/provider/model, temperature, top-p, output token limit, Ollama context (`num_ctx`).
- **UI customization:** пять palette presets, собственный цвет акцента, выбор системного шрифта.
- **Skills:** создание, локальное хранение, версия/описание, просмотр, удаление, экспорт JSON. Исполнение не подключено, манифесты не исполняются автоматически.
- **Experiment log foundation:** сохранение локальных результатов, пользовательская оценка и заметки, JSON export. Нет автоматизированных параллельных сравнительных запусков.
- **Tests:** 8 React UI/browser checks пройдены в artifact runner: workspace, prompt/context, skills, theme, template gallery, unavailable metrics, llama UI, Model POV disclaimer.

## Неполное соответствие / ограничения

### Раздел 1: архитектура и зависимости
React/Vite/Tauri/Rust есть. Интерфейс пока JavaScript/JSX, не TypeScript; не внедрены React Flow, Zustand, TanStack Query, SQLite migrations framework, Vitest/RTL или полноценный компонентный разрез. Код не имеет lockfile; свежий `npm install` и dependency compatibility не подтверждены.

### Раздел 2: inference providers
- Ollama: список `/api/tags`, обычная потоковая генерация, некоторые generation options, cancellation. Не реализованы running-model list, model info/quantization, load/unload, robust diagnostics, capability negotiation и chat-history store.
- LM Studio: native `/api/v1/models` и начальный `/api/v1/chat`, плюс OpenAI-compatible mode. Native API streaming event/request shape требует запуска и проверки на актуальной LM Studio от Bionic; load/unload/runtime telemetry и vision native API не подтверждены.
- llama.cpp: existing server через OpenAI-compatible API; managed launch с loopback, health-check, stop/status/log tail. Нет restart button semantics beyond stop/start, server configuration profiles, CPU thread tuning, GPU capability detection, reliable log rotation, executable auto-locate, or runtime metadata validation.
- Generic OpenAI-compatible: только localhost/loopback в этой сборке. Нет editable API key/header store, cloud endpoint, secrets vault, per-provider timeouts/headers or provider capability declaration.
- Не выполнены end-to-end tests against mock or real inference endpoints; Rust code is uncompiled here.

### Раздел 3: graph and node library
Топологический порядок есть, но порядок не определяет полную типизированную семантику всех портов и не все node types имеют handler. Нет React Flow, infinite canvas, pan, resize, multi-select, clipboard, undo/redo, shortcuts, groups/comments/collapse, snap, auto-layout, interactive minimap, full graph schema validation, cancellation at each node, error recovery/retry scheduler, or race/state isolation for simultaneous runs. Некоторые catalogue nodes deliberately error as unsupported.

### Раздел 4: skills/custom nodes
Есть inert skill instructions manifest editor/export only. Нет visual custom-node schema editor, port/parameter validation UI, package dependencies/trust/signature, import/install, sandboxed runtime, explicit permission system, GitHub share, examples or developer SDK. Никакой user script не исполняется.

### Раздел 5: templates
Все 8 схем доступны и сохранены как графы. Только подмножество путей запускает реализованные детерминированные handlers и local provider. Vision требует vision-enabled model; Research требует document retrieval; Multi-Model requires per-node model choice and parallel scheduler; Critical Reviewer requires proper reviewer prompt/model configuration. Поэтому все восемь не следует считать production-ready execution templates.

### Раздел 6: Brain Inspector
Трассируются клиентские node calls и некоторые реальные elapsed values. Нет time-to-first-token в строгом определении token (показывается first stream chunk), token counts только endpoint usage, нет token-by-token input/output, context utilization, GPU/memory, routing explanations, tool invocation trace, filters/condition audit, provider request/response redaction view, historical charts or actual stack-wide telemetry. Не выводит скрытые chain-of-thought.

### Раздел 7: multimodal / POV
Изображения частично. Нет документов/PDF/презентаций, OCR/page previews/chunk trace, изображений диаграмм, аудио/waveform/transcription/segments; нет LM Studio native image payload. Клиент не может увидеть server-side resize/crops, поэтому не симулирует их.

### Раздел 8: condition/tone analysis
Не реализован.

### Раздел 9: inference controls
Temperature, top-p, output limit, Ollama context available. Нет top-k/min-p/repetition/frequency/presence penalties/seed/stop sequences/JSON schema, presets/custom presets, parameter support matrix/capability probing или отдельной настройки каждого выбранного model ID.

### Раздел 10: experiments
Есть локальный saved-run log, subjective rating/notes/export. Нет автоматического batch same prompt over multiple models, graph/config comparison, diff UI, controlled experiment versions, response-length/throughput benchmarks or historical charts.

### Раздел 11: adapters/training/weights
Не реализовано. Нет LoRA management, adapter selection, conversion, dataset prep, fine-tuning, hardware checks or weight workflow. Приложение не выдаёт prompt changes за weight updates.

### Раздел 12: screens/settings
Graph workspace, settings and some inspector/template screens exist. Нет полноценного Home dashboard, Model Manager, project explorer/multi-tab, logging/privacy/performance/keyboard/language/model-directory settings, dockable panels, responsive review across devices or accessibility audit.

### Раздел 13: project system
SQLite save/version/list/restore commands exist in source, but no compile/run verification and UI history needs the Tauri runtime. No autosave timer, multiple project create/duplicate/open flows, version diff/retention, DB migration tests, strong schema validation at Rust boundary, or secure secrets separation.

### Раздел 14: safety/privacy
No telemetry, skill code execution or external HTTP tool. Provider endpoints enforce localhost. This is not a complete security system: no sandbox, custom tool/file permission gate, OS keychain, secret redaction framework, explicit remote-data disclosure UI, allowlisted tool security model or independent security review. Heuristic safety node is not a guarantee.

### Раздел 15: performance
No measurements on the specified Windows Ryzen/RTX/RAM machine, no stress tests, virtualization, backpressure benchmarks, GPU memory metrics or profiling.

### Раздел 16: release/GitHub
Documentation, license, workflow, installer configuration included. No repository, dependency lock, successful CI run, compiled/signed `.exe`, SBOM, release notes from verified builds, or installer smoke test.

## Проверка среды / что реально тестировалось
- UI: eight browser tests passed in artifact runtime; these do not compile/run Rust or exercise desktop IPC.
- Rust/Tauri/SQLite/provider/managed-process tests: included or described, not run. This sandbox has no `cargo`, `rustc`, or Windows toolchain.
- No live LM Studio, Ollama, llama.cpp or HTTP endpoint was available for validation. LM Studio endpoint/event shapes were checked against Bionic documentation, but not integration-tested.
- No `.exe` or installer was produced.

## Stages from original implementation plan
1. Foundation: partial.
2. Real model connectivity: partial, unverified native build and live endpoints.
3. Executable graph engine: partial, supported handler subset only.
4. Node library + all template paths: partial.
5. Brain Inspector: partial, client-observed metrics only.
6. Multimodal Inspector: image-only partial.
7. Experiment Lab: partial local saved-run foundation.
8. Finalization/Windows installer: not complete.
