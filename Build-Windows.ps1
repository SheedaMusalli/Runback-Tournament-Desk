param(
  [string]$BuildDirectory = (Join-Path $PSScriptRoot ('windows-build-' + (Get-Date -Format 'yyyyMMdd-HHmmss')))
)
$ErrorActionPreference = 'Stop'
function Run-Checked([scriptblock]$Command) {
  & $Command
  if ($LASTEXITCODE -ne 0) { throw "Command failed (exit $LASTEXITCODE). See the output above." }
}
Get-Command git, node, npm.cmd -ErrorAction Stop | Out-Null
$source = $PSScriptRoot
$target = [IO.Path]::GetFullPath($BuildDirectory)
if (Test-Path -LiteralPath $target) { throw "Choose a new, empty BuildDirectory. Existing files will not be overwritten: $target" }
$previousNodeOptions = $env:NODE_OPTIONS
$previousSigning = $env:CSC_IDENTITY_AUTO_DISCOVERY
try {
  New-Item -ItemType Directory -Path $target | Out-Null
  $shell = Join-Path $target 'runback-electron'
  Run-Checked { git clone https://github.com/opeik/runback-electron.git $shell }
  Push-Location $shell
  try { Run-Checked { git checkout 3f112798a705feeefdf4c6a1cc0782e648e865db } } finally { Pop-Location }
  $runtime = Join-Path $shell 'lib/nodecg'
  Run-Checked { git clone --branch legacy-1.x https://github.com/nodecg/nodecg.git $runtime }
  Push-Location $runtime
  try {
    Run-Checked { git checkout 0c6ae8209e2558758de10f21a88b6f6208382108 }
    Run-Checked { npm.cmd install --omit=dev --legacy-peer-deps --no-audit --no-fund }
  } finally { Pop-Location }
  $bundle = Join-Path $runtime 'bundles/runback'
  New-Item -ItemType Directory -Force -Path $bundle | Out-Null
  foreach ($name in @('src','types','script','package.json','package-lock.json','webpack.config.js','tsconfig.browser.json','tsconfig.extension.json','jsconfig.json','configschema.json','LICENSE.md','NOTICES.md')) {
    Copy-Item -LiteralPath (Join-Path $source $name) -Destination $bundle -Recurse -Force
  }
  # Webpack 4 uses MD4; modern Node needs the compatibility provider for builds.
  # Keep the Node expression free of nested quotes: Windows PowerShell may strip
  # them while invoking node.exe and turn split(".") into invalid split(.).
  $nodeVersion = (node -p 'process.versions.node').Trim()
  if ($LASTEXITCODE -ne 0 -or !$nodeVersion) { throw 'Could not read the installed Node.js version.' }
  $nodeMajor = [int]($nodeVersion.Split('.')[0])
  if ($nodeMajor -ge 17) {
    $env:NODE_OPTIONS = if ($previousNodeOptions) { "$previousNodeOptions --openssl-legacy-provider" } else { '--openssl-legacy-provider' }
    Write-Host "Enabled the OpenSSL legacy provider for Webpack 4 under Node.js $nodeVersion."
  }
  Push-Location $bundle
  try {
    Run-Checked { npm.cmd ci --legacy-peer-deps --no-audit --no-fund }
    Run-Checked { npm.cmd run build }
    Run-Checked { npm.cmd prune --omit=dev --legacy-peer-deps --no-audit --no-fund }
  } finally { Pop-Location }
  Push-Location $shell
  try {
    Run-Checked { npm.cmd install --legacy-peer-deps --no-audit --no-fund }
    # npm versions that block dependency install scripts may skip Electron's download.
    if (!(Test-Path 'node_modules/electron/dist/electron.exe')) {
      Run-Checked { node node_modules/electron/install.js }
    }
    Run-Checked { npm.cmd run build }
    $env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
    # Never use upstream `npm run dist`: it includes --publish always.
    Run-Checked { & .\node_modules\.bin\electron-builder.cmd --win nsis --x64 --publish never }
  } finally { Pop-Location }
  Write-Host "Windows installer output: $(Join-Path $shell 'dist')"
} finally {
  $env:NODE_OPTIONS = $previousNodeOptions
  $env:CSC_IDENTITY_AUTO_DISCOVERY = $previousSigning
}
