$ErrorActionPreference = "Stop"

Write-Host "SYNAPS Windows build" -ForegroundColor Cyan
Write-Host "Prerequisites: Node.js 22+, Rust stable (MSVC target), Visual Studio C++ Build Tools, WebView2 Runtime, and NSIS."

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "Node.js/npm not found. Install Node.js 22+ first." }
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { throw "Rust/Cargo not found. Install Rust stable first." }

npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
npm run test:unit
if ($LASTEXITCODE -ne 0) { throw "Unit tests failed" }
npm test
if ($LASTEXITCODE -ne 0) { throw "UI tests failed" }
cargo test --manifest-path src-tauri/Cargo.toml
if ($LASTEXITCODE -ne 0) { throw "Rust tests failed" }
npm run tauri -- build
if ($LASTEXITCODE -ne 0) { throw "Tauri build failed" }

$installer = Get-ChildItem "src-tauri/target/release/bundle/nsis/*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $installer) { throw "Build finished but NSIS installer was not found." }
Write-Host "Installer ready: $($installer.FullName)" -ForegroundColor Green
