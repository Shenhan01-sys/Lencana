"""Cari RPC BSC testnet (chainId 97) yang benar-benar menjawab dari mesin ini.

Dipakai karena `data-seed-prebsc-1-s1` / `-2-s1.binance.org` terbukti rewel: keduanya pernah bekerja
di jam yang sama lalu menolak koneksi beberapa menit kemudian. Fork test tidak bisa dijalankan di
atas keraguan, jadi endpoint diuji satu-satu dulu -- dan yang tidak menjawab dilaporkan, bukan
dihitung sebagai "kemungkinan masih hidup".

Pindah ke dalam repo 28 Sep karena `package.json` memanggilnya lewat npm: perkakas yang dirujuk
skrip npm tapi tinggal di luar repo berarti perintah di README tidak bisa dijalankan pembaca.
Dua endpoint dengan TOKEN milik layanan pihak ketiga sengaja dibuang saat pindah -- repo ini publik,
dan kredibel itu bukan kita yang memiliki.

Pakai:  python scripts/find-bsc-testnet-rpc.py     (dari app/)
"""
import json
import urllib.request

ENDPOINTS = [
    'https://data-seed-prebsc-1-s1.binance.org:8545/',
    'https://data-seed-prebsc-2-s1.binance.org:8545/',
    'https://data-seed-prebsc-1-s2.binance.org:8545/',
    'https://data-seed-prebsc-2-s2.binance.org:8545/',
    'https://data-seed-prebsc-1-s3.binance.org:8545/',
    'https://bsc-testnet.publicnode.com',
    'https://bsc-testnet-rpc.publicnode.com',
    'https://rpc.ankr.com/bsc_testnet_chapel',
    'https://bsc-testnet.blockpi.network/v1/rpc/public',
    'https://bsc-testnet.drpc.org',
]

BODY = json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': 'eth_chainId', 'params': []}).encode()


def probe(url):
    req = urllib.request.Request(
        url, data=BODY, headers={'Content-Type': 'application/json', 'User-Agent': 'lencana-endpoint-check'}
    )
    with urllib.request.urlopen(req, timeout=12) as r:
        return json.loads(r.read().decode()).get('result')


good = []
for u in ENDPOINTS:
    try:
        got = probe(u)
    except Exception as e:  # noqa: BLE001
        print(f'  FAIL  {u:70} {type(e).__name__} {getattr(e, "code", "")}')
        continue
    if got and int(got, 16) == 97:
        print(f'  OK    {u}  -> chainId 97')
        good.append(u)
    else:
        print(f'  SALAH {u}  -> chainId {got} (bukan 97)')

print()
if good:
    print('Pakai salah satu ini untuk --fork-url:')
    for u in good:
        print(f'  {u}')
else:
    print('!! tidak ada satu pun RPC BSC testnet yang menjawab dari mesin ini saat ini.')
    print('   Fork test ditunda; jangan simpulkan apa pun soal kontraknya.')
