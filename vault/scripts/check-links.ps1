# check-links.ps1
# Verify all [[wikilinks]] in this vault resolve to real .md files.
# Run: powershell -ExecutionPolicy Bypass -File scripts\check-links.ps1
# Ignores links inside code fences (```) and inline code (`...`) - those are examples, not real links.

$vault = Split-Path $PSScriptRoot -Parent
$files = Get-ChildItem -LiteralPath $vault -Recurse -Filter *.md | Where-Object { $_.FullName -notmatch '\\\.obsidian\\' }

$basemap = @{}; $pathmap = @{}
foreach ($f in $files) {
  $rel  = $f.FullName.Substring($vault.Length + 1).Replace('\','/')
  $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
  $pathmap[$rel] = $true
  if (-not $basemap.ContainsKey($base)) { $basemap[$base] = @() }
  $basemap[$base] += $rel
}

# a link target that is also a folder name (hub-style [[01-Architecture/01 - Architecture]] is fine,
# but [[03-Frontend]] alone resolves to a folder, not a note) is reported separately
$linkRe = [regex] '\[\[([^\]]+)\]\]'
$broken = 0; $checked = 0
foreach ($f in $files) {
  $text = Get-Content $f.FullName -Raw
  if (-not $text) { continue }
  $text = [regex]::Replace($text, '```.*?```', '', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  $text = [regex]::Replace($text, '`[^`]*`', '')
  foreach ($m in $linkRe.Matches($text)) {
    $target = (($m.Groups[1].Value -split '\|')[0] -split '#')[0].Trim()
    if ($target -eq '') { continue }
    $checked++
    $ok = $false
    if ($target.Contains('/')) { if ($pathmap.ContainsKey($target + '.md')) { $ok = $true } }
    else { if ($basemap.ContainsKey($target)) { $ok = $true } }
    if (-not $ok) { Write-Host ("BROKEN: " + $f.Name + " -> [[" + $m.Groups[1].Value + "]]") -ForegroundColor Red; $broken++ }
  }
}
$color = 'Green'; if ($broken -gt 0) { $color = 'Yellow' }
Write-Host ""
Write-Host ("Links checked: $checked | Broken: $broken") -ForegroundColor $color
if ($broken -gt 0) { exit 1 }
exit 0
