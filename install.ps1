<#
.SYNOPSIS
  Install (or remove) the terse token-saving skills for Claude Code.

.DESCRIPTION
  -Mode plugin  (default) Registers this folder as the "social-skills" marketplace
                and installs terse@social-skills for your user. Needs the `claude`
                CLI on PATH. Includes the hooks that keep terse mode on automatically.
  -Mode skills  Copies the skills into your Claude skills folder (-Scope user) or
                into <ProjectDir>\.claude\skills (-Scope project) so a repo can
                commit them. No hooks: start a session with /terse.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\install.ps1
  powershell -ExecutionPolicy Bypass -File .\install.ps1 -Mode skills -Scope project -ProjectDir C:\code\my-app
  powershell -ExecutionPolicy Bypass -File .\install.ps1 -Uninstall
#>
param(
  [ValidateSet('plugin', 'skills')] [string]$Mode = 'plugin',
  [ValidateSet('user', 'project')] [string]$Scope = 'user',
  [string]$ProjectDir = (Get-Location).Path,
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$skillsSrc = Join-Path $root 'plugins\terse\skills'
$pluginId = 'terse@social-skills'

if ($Mode -eq 'plugin') {
  if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Host 'The claude CLI is not on PATH. Inside Claude Code, run instead:'
    Write-Host "  /plugin marketplace add $root"
    Write-Host "  /plugin install $pluginId"
    Write-Host 'Or rerun this script with -Mode skills.'
    exit 1
  }
  if ($Uninstall) {
    & claude plugin uninstall $pluginId
    exit $LASTEXITCODE
  }
  & claude plugin marketplace add $root
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & claude plugin install $pluginId
  if ($LASTEXITCODE -eq 0) { Write-Host 'Done. Start a new Claude Code session: terse mode is on by default.' }
  exit $LASTEXITCODE
}

# -Mode skills
if ($Scope -eq 'user') {
  $configDir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME '.claude' }
  $dest = Join-Path $configDir 'skills'
} else {
  $dest = Join-Path $ProjectDir '.claude\skills'
}

foreach ($skill in Get-ChildItem $skillsSrc -Directory) {
  $target = Join-Path $dest $skill.Name
  if ($Uninstall) {
    if (Test-Path $target) {
      Remove-Item $target -Recurse -Force
      Write-Host "removed   $target"
    }
    continue
  }
  New-Item -ItemType Directory -Force $dest | Out-Null
  $verb = if (Test-Path $target) { 'updated  ' } else { 'installed' }
  if (Test-Path $target) { Remove-Item $target -Recurse -Force }
  Copy-Item $skill.FullName $target -Recurse
  Write-Host "$verb $target"
}

if (-not $Uninstall) {
  Write-Host 'Done. Start a new Claude Code session and type /terse (auto-on needs -Mode plugin).'
}
