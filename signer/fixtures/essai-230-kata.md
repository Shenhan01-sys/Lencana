# Jawaban peserta (contoh: melewati gerbang mekanis, belum dinilai)

Kandidat A hanya menyerahkan tampilan. Yang bisa saya periksa darinya nol: tidak ada alamat
kontrak, tidak ada hash, tidak ada dokumen. Kata "valid" di layarnya adalah klaim milik mereka
sendiri, dan saya tidak punya cara untuk menguji klaim itu tanpa menghubungi penerbitnya.

Kandidat B memberi saya hash dan satu address. Dari situ saya bisa memanggil `statusOf(bytes32)`
pada resolver lewat RPC publik (https://bsc-testnet.publicnode.com) dan membaca sendiri bahwa
rekamannya ada, siapa penerbitnya, apakah ia dicabut, dan sampai kapan berlaku. Pada deployment
yang kami pakai di kelas, address resolver-nya `0x7CA624caFDe5cA3A27b33d26be56F73a90792065`.
Perbedaan pentingnya bukan "B lebih keren karena on-chain", tapi bahwa pertanyaan saya terhadap B
bisa dijawab oleh alat, sementara pertanyaan terhadap A hanya bisa dijawab oleh A.

Tetap ada yang tidak dapat saya simpulkan dari B. Nilai, rubrik, dan apa sebenarnya yang diuji
tidak ikut terlihat dari status on-chain — itu semuanya ada di dokumen yang harus dia lampirkan,
dan dokumen itu sendiri harus saya verifikasi tanda tangannya, bukan saya percaya karena
hash-nya ada di chain. Jadi bukti B lebih kuat untuk "rekaman ini dibuat pihak ini pada waktu ini",
bukan untuk "kemampuannya memang selevel itu".

Pertanyaan saya ke A: apakah lembaga penerbit punya daftar penerbit yang bisa saya periksa sendiri?
Ke B: mana dokumen kredensialnya, dan apakah penerbitnya masih tercantum sebagai penerbit yang
diizinkan hari ini, bukan hanya saat ia diterbitkan.
