# new-note.ps1
# Create a note from the matching template in Templates/.
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\new-note.ps1 -Title "Credential Hash" -Kind concept
#   powershell -ExecutionPolicy Bypass -File scripts\new-note.ps1 -Title "A9 - Money Path" -Kind part -Folder 01-Architecture -Hub "01 - Architecture"
#   powershell -ExecutionPolicy Bypass -File scripts\new-note.ps1 -Title "AC-P7 - Public URL" -Kind ac -Folder 07-Backlog/Acceptance-Criteria -Hub "00 - Hub Acceptance Criteria"
# Kinds: concept | part | ac | testing | summary | openitem   (default: concept)
# Existing files are never overwritten.

param(
  [Parameter(Mandatory = $true)][string]$Title,
  [ValidateSet('concept','part','ac','testing','summary','openitem')][string]$Kind = 'concept',
  [string]$Folder = 'Concepts',
  [string]$Hub,
  [string]$Id
)

$vault = Split-Path $PSScriptRoot -Parent
$nl = "`n"

$safe = ($Title -replace '[<>:"/\\|?*]', '').Trim()
if ($safe -eq '') { Write-Host "ERROR: Title is empty after sanitising." -ForegroundColor Red; exit 1 }

$dir = Join-Path $vault $Folder
if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$path = Join-Path $dir ($safe + ".md")
if (Test-Path -LiteralPath $path) { Write-Host "SKIP: already exists -> $Folder/$safe.md" -ForegroundColor Yellow; exit 0 }

$tagFor = @{ concept='concept'; part='part'; ac='acceptance'; testing='testing'; summary='exec-summary'; openitem='open-item' }
$identity = if ($Id) { $Id } elseif ($safe -match '^([A-Z]+[0-9]+(\.[0-9]+)?|AC-[A-Z0-9-]+|OI-[0-9]+|T[0-9]+|P[0-9]+)') { $Matches[1] } else { $null }

$tags = if ($identity) { "@{0}@, `"{1}@`"" -f $tagFor[$Kind], $identity } else { $tagFor[$Kind] }

$c = New-Object System.Collections.Generic.List[string]
$c.Add("---")
$c.Add("tags: [$tags]")
$c.Add("---")
$c.Add("")
$c.Add("# $safe")
$c.Add("")
if ($Hub) { $c.Add("**Part of:** [[$Hub]]") ; $c.Add("") }

switch ($Kind) {
  'concept' {
    $c.Add("**Definition:** _TODO 1-2 sentences._")
    $c.Add("")
    $c.Add("**Why it exists here:** _TODO what breaks if a reader mistakes this for something else._")
    $c.Add("")
    $c.Add("**Facts:**")
    $c.Add("- _TODO_")
    $c.Add("")
    $c.Add("**Sources:** _TODO - code path + line, or the raw spec file._")
  }
  'part' {
    $c.Add("**Source:** _TODO - ``path/file.ts:line`` (inline code, never a wikilink to a non-md file)_")
    $c.Add("")
    $c.Add("**Summary:** _TODO 3-6 sentences._")
    $c.Add("")
    $c.Add("**Key points:**")
    $c.Add("- _TODO 4-8 concrete points_")
    $c.Add("")
    $c.Add("**Detail:**")
    $c.Add("- _TODO names, values, signatures, measured numbers with the command that produced them_")
  }
  'ac' {
    $c.Add("**Backlog:** _TODO_ · **Plan:** _TODO_ · **Testing:** _TODO_ · **Summary:** _TODO_")
    $c.Add("")
    $c.Add("## a - _group name_")
    $c.Add("")
    $c.Add("| # | Criterion (Given/When/Then) | PASS bar | Status | Date | Evidence |")
    $c.Add("|---|---|---|---|---|---|")
    $c.Add("| 1 | _TODO_ | _TODO_ | _TODO_ | _TODO_ | ``command`` -> _output_ |")
    $c.Add("")
    $c.Add("> Status must name the layer it was proven at: `offline` / `fork` / `public chain` / `HTTP` / `browser` / `code only`.")
  }
  'testing' {
    $c.Add("**AC:** _TODO_ · **Summary:** _TODO_ · **Hub:** [[09-Testing/00 - Hub Testing]]")
    $c.Add("")
    $c.Add("## Command")
    $c.Add("")
    $c.Add("```powershell")
    $c.Add("# run from app/")
    $c.Add("```")
    $c.Add("")
    $c.Add("## Result (_YYYY-MM-DD_)")
    $c.Add("")
    $c.Add("```")
    $c.Add("_paste the real output_")
    $c.Add("```")
    $c.Add("")
    $c.Add("## What this does NOT prove")
    $c.Add("- _TODO_")
  }
  'summary' {
    $c.Add("**Backlog:** _TODO_ · **Plan:** _TODO_ · **AC:** _TODO_ · **Testing:** _TODO_")
    $c.Add("")
    $c.Add("## 1. What changed")
    $c.Add("")
    $c.Add("_TODO_")
    $c.Add("")
    $c.Add("## 2. Result vs bar (real numbers)")
    $c.Add("")
    $c.Add("| Item | Actual | Verdict |")
    $c.Add("|---|---|---|")
    $c.Add("")
    $c.Add("## 3. Status")
    $c.Add("")
    $c.Add("## 4. Remaining risk")
    $c.Add("")
    $c.Add("## 5. Evidence")
  }
  'openitem' {
    $c.Add("**Owner:** _TODO_ · **Raised:** _YYYY-MM-DD_ · **Status:** OPEN")
    $c.Add("")
    $c.Add("## What the product currently says")
    $c.Add("")
    $c.Add("_quote + ``file:line``_")
    $c.Add("")
    $c.Add("## What is actually true")
    $c.Add("")
    $c.Add("## Minimal fix")
    $c.Add("")
    $c.Add("## How to verify the fix")
    $c.Add("")
    $c.Add("```powershell")
    $c.Add("```")
  }
}

$c.Add("")
$c.Add("**Related:** _TODO_")

Set-Content -LiteralPath $path -Value ($c -join $nl) -Encoding UTF8
Write-Host "OK  created: $Folder/$safe.md" -ForegroundColor Green

& (Join-Path $PSScriptRoot 'check-links.ps1') | Out-Null
if ($LASTEXITCODE -eq 0) { Write-Host "OK  all links resolve." -ForegroundColor Green }
else { Write-Host "WARN link check: some links do not resolve yet (fill the TODOs)." -ForegroundColor Yellow }
