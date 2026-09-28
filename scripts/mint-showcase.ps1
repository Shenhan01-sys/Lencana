# Mengikat artefak showcase ke lapis yang menegakkan D42/D43, dalam SATU panggilan mintBatch.
#
# Rantainya sengaja pendek dan setiap bagiannya membaca datanya dari tempat yang bisa diperiksa:
#   1. signer/scripts/showcase-list.js  -> kertas yang outcome-nya VALID di bawah host tepi, diambil
#      dari URL-nya sendiri, peserta dibaca dari credentialSubject.id di dalam kertas itu;
#   2. script/MintShowcase.s.sol        -> menyaring yang sudah terikat lalu mintBatch, dan membaca
#      kembali ownerOf/tokenOfCredential/tokenURI dari state on-chain.
# Tidak ada alamat yang diketik di berkas ini atau di dua berkas yang ia panggil (B49).
param([switch]$SimulateOnly)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$app = Split-Path -Parent $here

function Read-DotEnv {
  $out = @{}
  foreach ($line in Get-Content (Join-Path $app '.env')) {
    $t = $line.Trim()
    if ($t -match '^([A-Z][A-Z0-9_]*)=(.*)$') { $out[$Matches[1]] = $Matches[2].Trim() }
  }
  return $out
}

function Get-EnvValue ($name) {
  $p = "Env:$name"
  if (Test-Path $p) { (Get-Item $p).Value } else { $null }
}
function Set-EnvValue ($name, $value) { Set-Item -Path "Env:$name" -Value $value }

$dotenv = Read-DotEnv
# forge membaca lingkungan PROSES, bukan berkas: tanpa ini skripnya berjalan dengan LIVE_CERT_ADDRESS
# kosong dan itu bukan kegagalan yang mau kita lihat setelah gas bergerak.
foreach ($k in @('DEPLOYER_PRIVATE_KEY', 'RESOLVER_ADDRESS', 'LIVE_CERT_ADDRESS', 'EDGE_BASE_URL')) {
  if (-not (Get-EnvValue $k)) {
    $v = $dotenv[$k]
    if ($v) { Set-EnvValue $k $v }
  }
}
foreach ($k in @('DEPLOYER_PRIVATE_KEY', 'LIVE_CERT_ADDRESS', 'EDGE_BASE_URL')) {
  if (-not (Get-EnvValue $k)) { throw "$k kosong - isi .env atau lingkungan proses dulu" }
}

Push-Location (Join-Path $app 'signer')
$lines = @()
try {
  # Node menulis penolakan ke stderr, dan PS5 menaikkan stderr sebagai error record ketika
  # ErrorActionPreference=Stop — yang membuat "skrip menolak" kelihatan seperti "skrip crash".
  # Yang kita mau adalah KELUARANNYA lalu membaca kode exitnya, jadi preferensinya dilonggarkan
  # hanya untuk panggilan ini.
  $ErrorActionPreference = 'Continue'
  $lines = @(& node scripts/showcase-list.js 2>&1 | ForEach-Object { "$_" })
  $code = $LASTEXITCODE
  $ErrorActionPreference = 'Stop'
} finally { Pop-Location }
if ($code -ne 0) {
  Write-Output ($lines -join "`n")
  throw "showcase-list menolak (exit $code) - tidak ada yang boleh diikat"
}

$derived = @{}
foreach ($line in $lines) {
  if ($line -match '^(MINT_[A-Z]+)=(.*)$') { $derived[$Matches[1]] = $Matches[2] }
  elseif ($line -notmatch '^#') { Write-Output "  $line" }
}
foreach ($k in @('MINT_HASHES', 'MINT_LEARNERS', 'MINT_URIS')) {
  if (-not $derived[$k]) { throw "$k tidak dihasilkan - tidak ada yang boleh diikat" }
  Set-EnvValue $k $derived[$k]
}
$n = ($derived['MINT_HASHES'] -split ',').Count
Write-Output "  terikat   : $n kertas terbukti disajikan + divalidasi di tepi"
Write-Output "  lapis     : $(Get-EnvValue 'LIVE_CERT_ADDRESS')"
Write-Output ''

Push-Location $app
try {
  $forgeArgs = @('script', 'script/MintShowcase.s.sol:MintShowcase', '--rpc-url', 'bscTestnet', '--evm-version', 'cancun')
  if ($SimulateOnly) { Write-Output '=== SIMULASI: tidak ada transaksi yang dikirim ===' }
  else { $forgeArgs += '--broadcast'; Write-Output '=== BROADCAST: mintBatch akan dikirim ke chain 97 ===' }
  & forge @forgeArgs 2>&1 |
    Select-String -Pattern 'tokenURI|artefak|sudah terikat|Error|error|revert|Revert|Transaction|eligible|Owner|not' |
    ForEach-Object { Write-Output $_.Line }
  $code = $LASTEXITCODE
} finally { Pop-Location }

if ($code -ne 0) { throw 'forge script gagal - periksa sebelum mencoba lagi (mintBatch semua-atau-batal)' }
if (-not $SimulateOnly) {
  Write-Output ''
  Write-Output 'Bukti yang bisa dibaca orang lain: cd signer && npm run verify:live-cert'
}
