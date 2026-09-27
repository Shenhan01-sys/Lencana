# check-lang.ps1
# Docs in this repo are English (plus deliberate Indonesian). This is not a style check: it catches
# stray CJK characters that slip into sentences when writing fast. It happened three times in this
# vault on 28 Sep - twice in prose, once inside the script that was meant to catch it - and each time
# only a systematic scan found it, never the author's own eyes.
#
# ASCII-only on purpose: PowerShell 5.1 misreads non-ASCII in BOM-less .ps1 files (see Conventions.md).
#
# Run: powershell -ExecutionPolicy Bypass -File scripts\check-lang.ps1

$vault = Split-Path $PSScriptRoot -Parent
$files = Get-ChildItem -LiteralPath $vault -Recurse -Filter *.md | Where-Object { $_.FullName -notmatch '\\\.obsidian\\' }
$hits = 0

# Hiragana/Katakana 3040-30FF, CJK 4E00-9FFF, Hangul AC00-D7AF
$range = '[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]'

foreach ($f in $files) {
  $lines = Get-Content -LiteralPath $f.FullName -Encoding UTF8
  if (-not $lines) { continue }
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match $range) {
      Write-Host ("CJK: " + $f.Name + ":" + ($i + 1)) -ForegroundColor Red
      Write-Host ("     " + $lines[$i].Trim().Substring(0, [Math]::Min(110, $lines[$i].Trim().Length))) -ForegroundColor DarkGray
      $hits++
    }
  }
}

$color = 'Green'
if ($hits -gt 0) { $color = 'Yellow' }
Write-Host ""
Write-Host ("Files scanned: $($files.Count) | CJK tokens: $hits") -ForegroundColor $color
if ($hits -gt 0) { exit 1 }
exit 0
