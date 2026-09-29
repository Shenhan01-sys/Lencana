# check-paste.ps1
# The submission field has a HARD ceiling of 5,600 characters (measured by the builder filling the
# form on 27 Sep). On 28 Sep the artifact had crept to 5,604 and nothing in the ritual noticed,
# because "the link guard is green" says nothing about the size of the thing you paste.
#
# Two measurement lessons are encoded here, both learned the hard way the same day:
#   1. Count what actually gets pasted. The repo stores LF, but a working copy can hold CRLF, and
#      CRLF would report ~40 characters that the browser never sends. We normalise to LF first and
#      print both, so nobody has to wonder which number a form will see.
#   2. A guard that cannot fail is not a guard. Every pattern below prints what it matched, so a
#      false positive is visible instead of quietly accepted (an earlier draft of this file flagged
#      four "tickets" in a document that contains none, and only showed up because I tested it).
#
# Run: powershell -ExecutionPolicy Bypass -File scripts\check-paste.ps1
param([int]$Limit = 5600)
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $PSScriptRoot
$path = (Get-ChildItem -LiteralPath (Join-Path $dir '00-Overview') -Filter '10 - Project Detail (long form) - Copy.md' | Select-Object -First 1).FullName
$raw = Get-Content -LiteralPath $path -Raw
$lf = $raw -replace "`r`n", "`n"
$lines = ($lf -split "`n").Count

$tickets = @([regex]::Matches($lf, '\bOI-\d+\b|\bB\d{2}\b|\bD\d{2}\b|\bD\d\b|\bRF\d\b|\bP\d#\d*\b') | ForEach-Object { $_.Value })
$wikis = @([regex]::Matches($lf, '\[\[') | ForEach-Object { $_.Value })
$paths = @([regex]::Matches($lf, 'vault/') | ForEach-Object { $_.Value })
$mermaid = ([regex]::Matches($lf, '```mermaid')).Count
$dangling = @([regex]::Matches($lf, '[a-z]  [A-Z]') | ForEach-Object { $_.Value })

Write-Host "artifact : $(Split-Path $path -Leaf)"
Write-Host "paste    : $($lf.Length) chars (LF, yang benar-benar dikirim ke form) / $Limit  sisa $($Limit - $lf.Length)"
if ($raw.Length -ne $lf.Length) { Write-Host "working copy: $($raw.Length) chars (CRLF, $((($raw.Length - $lf.Length))) byte lebih - tidak dihitung sebagai panjang)" }
Write-Host "lines    : $lines · mermaid: $mermaid"

$bad = @()
if ($lf.Length -gt $Limit) { $bad += "LEWAT BATAS $($lf.Length - $Limit) karakter - form akan menolak tempelan ini" }
if ($tickets.Count) { $bad += "ID tiket internal: $($tickets -join ', ')" }
if ($wikis.Count) { $bad += "$($wikis.Count) wikilink - tidak bisa dibuka pembaca dari field form" }
if ($paths.Count) { $bad += "$($paths.Count) jalur vault/ - referensi internal" }
if ($dangling.Count) { $bad += "titik hilang karena pemangkasan: $($dangling -join ' | ')" }
if ($mermaid -gt 2) { $bad += "$mermaid diagram - batas yang disepakati untuk field ini 2" }

Write-Host ""
if ($bad.Count -eq 0) { Write-Host "PASTE HIJAU - $($lf.Length)/$Limit karakter, aturan artefak utuh" -ForegroundColor Green; exit 0 }
foreach ($b in $bad) { Write-Host "PASTE MERAH: $b" -ForegroundColor Yellow }
exit 1
