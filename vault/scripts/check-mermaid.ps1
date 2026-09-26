# check-mermaid.ps1
# Find Mermaid blocks that will not render, before they reach the submission form.
# Run: powershell -ExecutionPolicy Bypass -File scripts\check-mermaid.ps1
#
# Why this exists: a literal ';' inside a sequenceDiagram message or Note ENDS the statement
# (the docs tell you to write #59; instead), so the rest of the line parses as a new arrow and the
# whole block fails to render. Found in 00-Overview/10 on 2026-09-26 by running mermaid.parse()
# against every block in this vault - not by reading the text, which looks perfectly fine.
#
# This guard is deliberately syntax-only and ASCII-only: it checks the one documented trap that
# prose review cannot see. Full grammar lives in mermaid itself.

$vault = Split-Path $PSScriptRoot -Parent
$files = Get-ChildItem -LiteralPath $vault -Recurse -Filter *.md | Where-Object { $_.FullName -notmatch '\\\.obsidian\\' }

$fence = '```'
$hazards = 0
$blocks = 0

foreach ($f in $files) {
  $lines = Get-Content -LiteralPath $f.FullName
  if (-not $lines) { continue }

  $inBlock = $false
  $isSequence = $false
  $blockStart = 0

  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]

    if ($line.StartsWith($fence)) {
      if (-not $inBlock) {
        $inBlock = $true
        $isSequence = $false
        $blockStart = $i + 1
        if ($line.Trim() -eq ($fence + 'mermaid')) { $blocks++ }
      } else {
        $inBlock = $false
      }
      continue
    }

    if (-not $inBlock) { continue }

    if ($line -match '^\s*sequenceDiagram') { $isSequence = $true; continue }

    if ($isSequence -and $line.Contains(';')) {
      Write-Host ("HAZARD: " + $f.Name + ":" + ($i + 1) + "  ';' ends a statement in sequenceDiagram") -ForegroundColor Red
      Write-Host ("        " + $line.Trim()) -ForegroundColor DarkGray
      Write-Host ("        block opened at line " + $blockStart) -ForegroundColor DarkGray
      $hazards++
    }
  }

  if ($inBlock) {
    Write-Host ("HAZARD: " + $f.Name + "  unclosed code fence starting at line " + $blockStart) -ForegroundColor Red
    $hazards++
  }
}

$color = 'Green'
if ($hazards -gt 0) { $color = 'Yellow' }
Write-Host ""
Write-Host ("Mermaid blocks: $blocks | Hazards: $hazards") -ForegroundColor $color
if ($hazards -gt 0) { exit 1 }
exit 0
