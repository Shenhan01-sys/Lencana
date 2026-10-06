
# Lencana-B56 status=SELESAI 2026-09-29 — penjaga tautan memeriksa dua lintasan (wikilink + md) atas seluruh korpus. Buktikan ulang: powershell -File vault/scripts/check-links.ps1. JANGAN dibalik/diulang tanpa membuka kembali baris B56 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
# check-links.ps1
# Verify that links resolve to real files. It now covers BOTH kinds we ship:
#   1. [[wikilinks]] inside this vault
#   2. [text](relative/path.md) markdown links - in the vault AND in the repo's own markdown
#      (README.md, FRONTEND_ITERATION.md, web/, signer/, cloudflare/)
# Run: powershell -ExecutionPolicy Bypass -File scripts\check-links.ps1
# Ignores links inside code fences (```) and inline code (`...`) - those are examples, not real links.
#
# Kenapa bagian 2 ditambahkan: 28 Sep halaman ini melaporkan "Broken: 0" sementara README kita
# punya enam tautan relatif yang menunjuk berkas yang sudah berganti nama berbulan-bulan. Guard yang
# hanya memeriksa satu sintaks bukan penjaga tautan - itu penjaga sintaks, dan hijau yang berarti
# "setengah diperiksa" adalah persis kegagalan yang kita catat untuk penelitian orang lain (B43).

$vault = Split-Path $PSScriptRoot -Parent
# One skip list for both passes. 7 Oct (B173): the video project in Video-Workspace/remotion has its own
# node_modules; third-party READMEs there (e.g. fast-glob: "[[options]]") are not vault notes.
$skip = '\\(node_modules|lib|out|cache|broadcast|dist|artifacts|vendor|\.obsidian|\.git|\.store|\.keys)\\'
$files = Get-ChildItem -LiteralPath $vault -Recurse -Filter *.md | Where-Object { $_.FullName -notmatch $skip }

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
# ---------------------------------------------------------------------------
# Bagian 2 - tautan markdown [teks](target) di SEMUA markdown repo, bukan cuma vault.
# Target diuji relatif terhadap berkas yang menuliskannya DAN terhadap akar app/, karena
# README memakai path seperti `vault/00-Overview/...` sementara catatan vault memakai path relatif.
# ---------------------------------------------------------------------------
$app = Split-Path $vault -Parent
$mdFiles = Get-ChildItem -LiteralPath $app -Recurse -Filter *.md -File |
  Where-Object { $_.FullName -notmatch $skip }

$mdRe = [regex]'\[[^\]]*\]\(([^)\s]+)\)'

# Pengecualian HARUS bernama dan beralasan, bukan diam-diam. Berkas ini adalah tempat kita menulis
# "tautan ini mati, dan siapa yang punya" - kalau daftarnya tumbuh tanpa alasan, itu tanda kita
# sedang menyembunyikan kerusakan, bukan menjaganya.
$excPath = Join-Path $PSScriptRoot 'link-exceptions.txt'
$exceptions = @{}
if (Test-Path -LiteralPath $excPath) {
  foreach ($line in (Get-Content -LiteralPath $excPath)) {
    $t = $line.Trim()
    if ($t -eq '' -or $t.StartsWith('#')) { continue }
    # Format: nama|target|alasan -> kunci adalah "nama|target"; dipisah 3 lapangan, BUKAN 2,
    # karena dengan -split '\|',2 seluruh sisa baris (target + alasan) masuk ke satu lapangan dan
    # kunci yang tersimpan cuma nama berkas - yang membuat daftar pengecualian tidak pernah cocok
    # sambil tetap terlihat benar. Itu ketangkep karena penjaganya masih merah, bukan karena dibaca.
    $parts = $t -split '\|', 3
    if ($parts.Count -lt 3) { Write-Host ("EXCEPTION LINE TIDAK VALID (butuh nama|target|alasan): " + $t) -ForegroundColor Red; $badExc++; continue }
    $key = ($parts[0] + '|' + $parts[1]).Trim().ToLowerInvariant()
    $exceptions[$key] = $parts[2].Trim()
  }
}

$mdChecked = 0; $mdBroken = 0; $mdExcept = 0
foreach ($f in $mdFiles) {
  $text = Get-Content $f.FullName -Raw
  if (-not $text) { continue }
  $text = [regex]::Replace($text, '```.*?```', '', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  $text = [regex]::Replace($text, '`[^`]*`', '')
  foreach ($m in $mdRe.Matches($text)) {
    $raw = $m.Groups[1].Value
    if ($raw -match '^(https?:|mailto:|data:|ftp:)') { continue }
    $t = ($raw -split '#')[0]
    if ($t -eq '') { continue }
    $mdChecked++
    $t = [Uri]::UnescapeDataString($t)
    $cands = @()
    if ([System.IO.Path]::IsPathRooted($t)) {
      $cands += $t
    } else {
      $rel = $t.Replace('/','\')
      $cands += (Join-Path $f.DirectoryName $rel)
      $cands += (Join-Path $app $rel)
      if ($t -notmatch '\.[A-Za-z0-9]{2,5}$') {
        $cands += (Join-Path $f.DirectoryName ($rel + '.md'))
        $cands += (Join-Path $app ($rel + '.md'))
      }
    }
    $found = $false
    foreach ($c in $cands) { if (Test-Path -LiteralPath $c) { $found = $true; break } }
    if (-not $found) {
      $key = ($f.Name + '|' + $raw).ToLowerInvariant()
      if ($exceptions.ContainsKey($key)) {
        $mdExcept++
        Write-Host ("DIKECUALIKAN: " + $f.FullName.Substring($app.Length + 1) + " -> " + $raw + "  (" + $exceptions[$key] + ")") -ForegroundColor DarkYellow
        continue
      }
      Write-Host ("BROKEN MD: " + $f.FullName.Substring($app.Length + 1) + " -> " + $raw) -ForegroundColor Red
      $mdBroken++
    }
  }
}

$color = 'Green'; if (($broken + $mdBroken) -gt 0) { $color = 'Yellow' }
Write-Host ""
Write-Host ("Wikilinks checked: $checked | Broken: $broken") -ForegroundColor $color
Write-Host ("MD links checked : $mdChecked | Broken: $mdBroken   (cakup: $(($mdFiles | Measure-Object).Count) berkas markdown)") -ForegroundColor $color
if ($mdExcept -gt 0) { Write-Host ("Dikecualikan (bernama + beralasan, vault/scripts/link-exceptions.txt): $mdExcept") -ForegroundColor DarkYellow }
if (($broken + $mdBroken) -gt 0) { exit 1 }
exit 0
