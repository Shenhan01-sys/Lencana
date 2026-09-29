# Memasang lapis artefak yang MENEGAKKAN D42/D43 dari source kita, lalu mengikat satu artefak ke
# kredensial yang kertasnya sungguh-sungguh dibaca pihak ketiga.
#
# Kenapa berkas ini ada di dalam repo, bukan di folder riset di luarnya: klaim Lencana harus bisa
# diulang dari `git clone app/` saja. Aturan itu berlaku untuk perkakas deploy juga - kalau
# prosedurnya hidup di luar repo, yang kita publikan adalah hasilnya saja dan tidak jalurnya.
#
# Kenapa instance yang SUDAH ada tidak dipakai: diukur dari bytecode (28 Sep), `0xA5eB80...`
# (5.102 byte) dan `0xC6FD12...` (6.729 byte) sama-sama tidak memuat `mintBatch`, `lessonOf`, atau
# `attestationOf`. Keduanya ter-deploy sebelum D42/D43 masuk, jadi menaruh artefak di sana
# menghasilkan NFT yang menunjuk dokumen bagus di atas kontrak yang tidak menegakkan apa pun.
# Build source kita 7.968 byte dan memuat ketiganya - itu yang dipasang di sini.
#
# Aturan B49 ditegakkan lewat struktur berkas ini, bukan lewat niat: tidak ada satu pun alamat yang
# diketik di dalamnya.
#   - credentialHash: diambil dari baris outcome VALID TERAKHIR di buku besar validator;
#   - docUrl: dari baris yang sama - jadi yang dibekukan ke artefak adalah persis URL yang diikuti
#     validator, dan itu diverifikasi sebelum dipakai;
#   - peserta: dibaca dari chain lewat holderOf(...)(address), fungsi yang sama yang dibandingkan
#     kontrak saat mint (`SoulboundCert.sol:164`);
#   - alamat kontrak hasil deploy: dibaca dari app/broadcast/.../run-latest.json, bukan dari salin
#     tempel output ke layar.
#
# Pemakaian:
#   powershell -ExecutionPolicy Bypass -File scripts/mint-edge-artefact.ps1 -SimulateOnly
#   powershell -ExecutionPolicy Bypass -File scripts/mint-edge-artefact.ps1
param(
  # Mode simulasi tidak mengirim transaksi apa pun. Penolakan kontrak (level-lesson, tercabut,
  # peserta bukan holder) harus kelihatan di sini dulu: yang tertangkap simulasi itu gratis, yang
  # tertangkap setelah broadcast meninggalkan jejak publik.
  [switch]$SimulateOnly
)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$app = Split-Path -Parent $here
$rpc = 'https://bsc-testnet.publicnode.com'

function Read-DotEnv {
  $out = @{}
  foreach ($line in Get-Content (Join-Path $app '.env')) {
    $t = $line.Trim()
    if ($t -match '^([A-Z][A-Z0-9_]*)=(.*)$') { $out[$Matches[1]] = $Matches[2].Trim() }
  }
  return $out
}

$dotenv = Read-DotEnv
$env:DEPLOYER_PRIVATE_KEY = $dotenv['DEPLOYER_PRIVATE_KEY']
$env:RESOLVER_ADDRESS = $dotenv['RESOLVER_ADDRESS']
if (-not $env:RESOLVER_ADDRESS) { throw 'RESOLVER_ADDRESS kosong di .env' }
if (-not $env:DEPLOYER_PRIVATE_KEY) { throw 'DEPLOYER_PRIVATE_KEY kosong di .env' }

# --- bahan: kredensial yang divalidasi pihak ketiga, bukan yang paling baru kita ingat ---
$ledger = Join-Path $app 'vault\09-Testing\validator-runs.jsonl'
$rows = @((Get-Content $ledger | Where-Object { $_.Trim() -ne '' }) | ForEach-Object { $_ | ConvertFrom-Json })
$run = @($rows | Where-Object { $_.outcome -eq 'VALID' } | Select-Object -Last 1)
if (-not $run) { throw "$ledger belum memuat baris outcome VALID - jalankan npm run validator lebih dulu" }
$hash = $run.credentialHash

$uri = ($run.docUrl -replace '/\?format=record$', '')
if (-not $uri) { throw 'baris buku besar tidak punya docUrl' }
if ($uri -notmatch '^https://') { throw "docUrl bukan https: $uri" }
if ($uri -notmatch ('/credentials/' + [regex]::Escape($hash) + '$')) { throw "docUrl tidak menunjuk rute kredensial hash ini: $uri" }
if ($uri -match '127\.0\.0\.1|localhost|trycloudflare') { throw "docUrl menunjuk host sementara/loopback: $uri" }

# --- dokumen itu harus benar-benar menjawab dari URL yang akan dibekukan permanen ---
# Bukan formalitas: URL ditulis ke dalam NFT saat mint dan tidak pernah berubah. Kalau host-nya salah
# atau rute-nya bocor, yang kita cetak adalah artefak yang menunjuk ke kegagalan.
$doc = $null
try {
  $doc = Invoke-RestMethod -Uri $uri -TimeoutSec 40
} catch {
  throw "kertas di $uri tidak bisa dibuka: $($_.Exception.Message) - jangan membekukan URL yang mati"
}
if (-not $doc.proof -or -not $doc.credentialStatus) { throw "dokumen di $uri tidak berbentuk kredensial (tanpa proof/credentialStatus)" }

# --- peserta dibaca dari chain, lewat fungsi yang dipakai kontrak ---
$learner = (& cast call $env:RESOLVER_ADDRESS 'holderOf(bytes32)(address)' $hash --rpc-url $rpc).Trim()
if ($learner -notmatch '^0x[0-9a-fA-F]{40}$') { throw "holder tidak terbaca dari chain: $learner" }
if ($learner -match '^0x0+$') { throw "holder terbaca nol - berhenti: $learner" }

$env:CREDENTIAL_HASH = $hash
$env:LEARNER_ADDRESS = $learner
$env:CREDENTIAL_URI = $uri

Write-Output ('resolver : ' + $env:RESOLVER_ADDRESS)
Write-Output ('hash     : ' + $hash + '  (sumber: baris VALID terakhir ' + (Split-Path -Leaf $ledger) + ')')
Write-Output ('peserta  : ' + $learner + '  (sumber: holderOf di chain)')
Write-Output ('uri      : ' + $uri + '  (dibaca ulang dari URL itu sendiri: OK)')
Write-Output ''

Push-Location $app
try {
  $forgeArgs = @('script', 'script/DeployCertOnly.s.sol:DeployCertOnly', '--rpc-url', 'bscTestnet', '--evm-version', 'cancun')
  if ($SimulateOnly) {
    Write-Output '=== SIMULASI: tidak ada transaksi yang dikirim ==='
  } else {
    $forgeArgs += '--broadcast'
    Write-Output '=== BROADCAST: kontrak baru + mint akan dikirim ke chain 97 ==='
  }
  & forge @forgeArgs 2>&1 |
    Select-String -Pattern 'SoulboundCert|tokenURI|tokenId|statusOf|Deployed|Error|error|revert' |
    ForEach-Object { Write-Output $_.Line }
  $forgeExit = $LASTEXITCODE
} finally { Pop-Location }

if ($forgeExit -ne 0) { throw 'forge script gagal - LIVE_CERT_ADDRESS tidak ditulis' }
if ($SimulateOnly) {
  Write-Output ''
  Write-Output 'Simulasi selesai tanpa mengirim apa pun. Jalankan tanpa -SimulateOnly untuk memasang.'
  exit 0
}

# --- catat alamatnya dari jejak transaksi, bukan dari yang tercetak di layar ---
$runfile = Join-Path $app 'broadcast\DeployCertOnly.s.sol\97\run-latest.json'
if (-not (Test-Path $runfile)) { throw "$runfile belum ada - tidak ada yang bisa dicatat" }
$creates = @((Get-Content $runfile -Raw | ConvertFrom-Json).transactions | Where-Object {
  ($_.transactionType -as [string]).ToUpper() -eq 'CREATE'
})
if ($creates.Count -eq 0) { throw 'run-latest.json tidak memuat CREATE' }
$cert = $creates[-1].contractAddress
if ($cert -notmatch '^0x[0-9a-fA-F]{40}$') { throw "contractAddress tidak berbentuk alamat: $cert" }

$envPath = Join-Path $app '.env'
$text = Get-Content $envPath -Raw
$line = 'LIVE_CERT_ADDRESS=' + $cert
if ($text -match '(?m)^LIVE_CERT_ADDRESS=.*$') {
  $text = [regex]::Replace($text, '(?m)^LIVE_CERT_ADDRESS=.*$', $line)
  $state = 'diperbarui'
} else {
  $text = $text.TrimEnd() + "`n`n# Lapis artefak yang menegakkan D42/D43 - dibaca dari file broadcast,`n" +
    '# bukan diketik tangan (B49). BEDA dari CERT_ADDRESS: artefak korpus demo yang kini`n' +
    '# REVOKED/ISSUER_DELISTED tidak bisa dibuat ulang di kontrak lain (mint() menolak state`n' +
    '# itu, dan penolakan itulah yang kita peragakan), jadi memindah CERT_ADDRESS akan membuat`n' +
    '# `npm run probe` merah atas alasan yang salah. Buktikan: npm run verify:live-cert' + "`n" + $line + "`n"
  $state = 'ditambah'
}
Set-Content -Path $envPath -Value $text -Encoding ascii -NoNewline
Write-Output ''
Write-Output ('.env ' + $state + ' -> ' + $line)
Write-Output 'Bukti yang bisa dijalankan orang lain: cd signer && npm run verify:live-cert'
