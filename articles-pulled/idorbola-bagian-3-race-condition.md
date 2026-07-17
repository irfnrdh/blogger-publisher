---
title: "IDOR/BOLA Bagian 3: Race Condition & Idempotency Key Collision"
slug: "idorbola-bagian-3-race-condition"
date: "2026-07-17T08:01:56-07:00"
blogger_id: "4265791838631914078"
content_hash: "a4c3034b50a66184b90bf94846be61d0"
---

_Lanjutan dari seri sebelumnya (Bagian 1: Cross-Tenant Vault Access, Bagian 2: Transaction Lookup & ID Enumeration). Kalau di dua tulisan sebelumnya kita bermain di ranah _otorisasi_ (siapa boleh akses apa), di tulisan ini kita masuk ke ranah yang secara teknis lebih rumit: _state_ dan _timing_ — dan justru di sinilah bug dengan dampak finansial paling langsung sering ditemukan._

* * *

## Kenapa Fase C Beda Level Kesulitannya

Fase B (IDOR/BOLA) itu soal pertanyaan yang relatif statis: "apakah backend mengecek kepemilikan objek ini?" Jawabannya biner — ya atau tidak, dan hasilnya konsisten setiap kali dites.

Fase C beda karakter. Di sini kita menguji apakah sistem tetap konsisten **ketika ada lebih dari satu hal terjadi secara bersamaan atau berurutan dengan cara yang tidak biasa**. Inilah kenapa dua kategori bug di fase ini — **race condition** dan **idempotency key collision** — masuk kategori _business logic vulnerability_, bukan sekadar _access control_.

Playbook menyebut C1-C2 sebagai **"prioritas tertinggi, severity biasanya Critical/High"**. Ini bukan klaim kosong — alasannya konkret:

1.  **Dampaknya langsung uang riil.** Kalau B1 bocorkan data, C1 bisa bikin sistem _kehilangan_ dana (double-spend).
2.  **Bug ini biasanya lebih sulit ditemukan otomatis** oleh scanner atau test suite konvensional, karena butuh eksekusi paralel yang presisi — artinya kalau kamu berhasil menemukannya, kemungkinan besar belum banyak researcher lain yang sampai ke situ.
3.  **Custody platform secara desain menangani ribuan transaksi konkuren** — kompleksitas concurrency yang tinggi secara alami membuka lebih banyak celah dibanding sistem CRUD sederhana.

* * *

## C1 — Race Condition / Double-Spend

### Konsep Dasar: Time-of-Check to Time-of-Use (TOCTOU)

Bug race condition pada dasarnya adalah masalah **TOCTOU (Time-of-Check to Time-of-Use)**. Ini terjadi ketika ada jeda waktu antara:

1.  **Time of Check** — sistem mengecek kondisi tertentu (misalnya "apakah saldo cukup?")
2.  **Time of Use** — sistem benar-benar menjalankan aksi berdasarkan kondisi tadi (misalnya "kurangi saldo dan kirim dana")

Kalau ada jeda di antara keduanya, dan sistem menerima **banyak request bersamaan** di jeda itu, setiap request bisa saja "melihat" kondisi yang sama (saldo masih cukup) sebelum salah satu dari mereka sempat mengupdate saldo — sehingga semuanya lolos pengecekan padahal saldo sebenarnya cuma cukup untuk satu.

**Analogi:** Bayangkan rekening bank dengan saldo Rp100.000, dan ada dua orang yang di detik yang **sama persis** menarik tunai Rp100.000 di dua ATM berbeda. Kalau sistem bank mengecek saldo dulu (keduanya lihat "saldo cukup, Rp100.000") baru mengurangi setelahnya, ada peluang keduanya berhasil menarik — total Rp200.000 keluar dari saldo yang cuma Rp100.000. Itulah TOCTOU.

### Kenapa Custody Platform Rentan

Di sistem crypto custody, "saldo vault" harus dicek dan dikunci (locked) secara atomik sebelum transaksi diproses ke blockchain. Kalau proses cek-saldo dan proses lock-saldo tidak dibungkus dalam satu operasi atomik di level database (misalnya tidak pakai _row-level locking_, _optimistic locking dengan version number_, atau transaksi database yang benar-benar `SERIALIZABLE`), maka celah TOCTOU ini nyata.

### Langkah Pengujian Detail

**Langkah 1 — Siapkan vault dengan saldo pas**

Kunci dari test ini adalah saldo yang **presisi**, supaya hasil percobaan gampang diverifikasi. Isi vault sandbox dengan tepat `0.01 ETH_TEST` — bukan lebih, bukan kurang.

**Langkah 2 — Tembak beberapa request identik secara benar-benar paralel**

Kesalahan pemula paling umum di sini adalah mengirim request "cepat berturut-turut" tapi tetap sekuensial (misalnya loop for biasa tanpa background process). Itu **bukan** race condition test yang valid, karena request pertama sudah selesai diproses sebelum request kedua dikirim.

    #!/bin/bash
    # WAJIB pakai & (background) + wait, supaya benar-benar simultan
    for i in {1..10}; do
      fireblocks transactions create-transaction \
        --data '{"assetId":"ETH_TEST","amount":"0.01","source":{"type":"VAULT_ACCOUNT","id":"0"},"destination":{"type":"EXTERNAL_WALLET","id":"<WALLET>"}}' \
        --idempotency-key "$(uuidgen)" --no-confirm &
    done
    wait
    

Catatan penting: setiap request pakai **idempotency-key yang berbeda** (via `uuidgen` baru tiap iterasi) — karena kalau key-nya sama, itu jadi pengujian yang berbeda (lihat C2 di bawah). Untuk C1 murni, kita justru ingin membuktikan bahwa **10 transaksi yang benar-benar independen** ditembak bersamaan terhadap **saldo yang sama**.

**Langkah 3 — Untuk presisi lebih tinggi, gunakan tool khusus race condition**

Bash `&` + `wait` cukup untuk pengujian awal, tapi punya keterbatasan: request tetap dikirim satu-satu dari shell, ada jeda mikro antar proses spawn. Untuk hasil yang lebih meyakinkan (dan lebih mudah direplikasi triager), gunakan tool yang didesain khusus untuk _single-packet race condition attack_, seperti **Burp Suite Turbo Intruder** dengan mode `race_condition` — tool ini mengirim semua request dalam satu TCP connection burst yang nyaris simultan di level jaringan, jauh lebih presisi dibanding scripting biasa.

    # Contoh skeleton skrip Turbo Intruder untuk race condition
    def queueRequests(target, wordlists):
        engine = RequestEngine(endpoint=target.endpoint,
                                concurrentConnections=10,
                                engine=Engine.BURP2)
        for i in range(10):
            engine.queue(target.req, gate='race1')
        engine.openGate('race1')  # semua request dilepas bersamaan di gate ini
    
    def handleResponse(req, interesting):
        table.add(req)
    

**Langkah 4 — Verifikasi hasil**

    # Cek total transaksi yang berhasil (status != REJECTED/FAILED)
    fireblocks vaults get-vault-account --vault-id 0 --json | jq '.assets[] | select(.assetId=="ETH_TEST")'
    

**Bug confirmed jika:** lebih dari 1 transaksi berstatus sukses (`SUBMITTED`, `PENDING_SIGNATURE`, `COMPLETED`, dst — tergantung workflow) padahal saldo vault cuma cukup untuk 1 transaksi. Idealnya, 9 dari 10 request harus ditolak dengan alasan _insufficient balance_, dan cuma 1 yang lolos.

### Variasi Lanjutan yang Sering Terlewat

*   **Race condition di approval workflow**, bukan cuma di create transaction. Kalau ada 2-of-3 approver, coba trigger approval dari 2 approver berbeda **bersamaan** — cek apakah sistem bisa "double count" approval yang sama jadi dianggap 2 approval berbeda karena race di validasi counter.
*   **Race condition antar asset berbeda tapi saldo saling terkait** (misalnya kalau ada fitur auto-conversion atau gas fee sharing dari satu pool) — race di satu asset bisa mempengaruhi asset lain yang menumpang pool yang sama.
*   **Race condition pada withdrawal limit / daily limit** — kalau ada limit harian (misalnya max 1 BTC per hari), coba tembak beberapa transaksi mendekati limit secara paralel, cek apakah limit tersebut benar-benar atomik atau bisa dilewati.

* * *

## C2 — Idempotency Key Collision dengan Body Berbeda

### Konsep Dasar

Idempotency key adalah mekanisme standar di API finansial untuk mencegah duplikasi transaksi akibat retry jaringan. Idenya: kalau klien mengirim request yang gagal di tengah jalan (misalnya koneksi putus sebelum dapat response), klien bisa **retry dengan idempotency key yang sama**, dan server seharusnya cukup pintar untuk bilang "oh, ini request yang sama seperti tadi, saya kembalikan hasil yang sama, tidak saya proses ulang."

Masalahnya muncul kalau server **hanya mengecek keberadaan key**, tapi **tidak mem-bind key tersebut ke isi (body) request yang spesifik**. Kalau begitu, seorang penyerang (atau bahkan bug tidak sengaja di sisi integrator) bisa mengirim key yang sama dengan body yang **benar-benar berbeda** — dan kalau server salah asumsi "key sama = request sama, langsung proses lagi", itu jadi bug serius.

### Kenapa Ini Berbahaya Secara Spesifik

Bayangkan skenario nyata: sebuah exchange mengintegrasikan Fireblocks untuk proses withdrawal user. Sistem mereka generate idempotency key berdasarkan `userId + timestamp_menit` (pola yang umum dipakai, sayangnya kadang kurang presisi). Kalau dalam 1 menit yang sama user melakukan dua withdrawal ke tujuan **berbeda** dengan jumlah **berbeda**, tapi key yang dihasilkan sistem kebetulan sama karena presisi timestamp terlalu kasar — apa yang terjadi?

*   **Kalau backend Fireblocks benar**: request kedua ditolak atau dikembalikan hasil pertama (aman, meski user kedua transaksi tidak masuk — bug ada di sisi integrator, bukan Fireblocks, tapi tetap informasi berharga).
*   **Kalau backend Fireblocks salah** (idempotency key tidak benar-benar di-bind ke body): request kedua **diproses sebagai transaksi baru** dengan detail berbeda — artinya idempotency key gagal total menjalankan fungsinya, dan yang lebih parah, bisa jadi indikasi bahwa sistem **tidak menyimpan/verifikasi hash body** sama sekali terhadap key yang sudah dipakai.

### Langkah Pengujian

    KEY=$(uuidgen)
    
    # Request 1: baseline
    fireblocks transactions create-transaction \
      --idempotency-key "$KEY" \
      --data '{"assetId":"ETH_TEST","amount":"0.01","destination":{"type":"EXTERNAL_WALLET","id":"WALLET_A"},"source":{"type":"VAULT_ACCOUNT","id":"0"}}' \
      --no-confirm
    
    sleep 2
    
    # Request 2: key SAMA PERSIS, tapi amount & destination beda total
    fireblocks transactions create-transaction \
      --idempotency-key "$KEY" \
      --data '{"assetId":"ETH_TEST","amount":"5.00","destination":{"type":"EXTERNAL_WALLET","id":"WALLET_B"},"source":{"type":"VAULT_ACCOUNT","id":"0"}}' \
      --no-confirm
    

**Analisis hasil — ada 3 skenario:**

Hasil Request 2

Interpretasi

Ditolak (error eksplisit "idempotency key already used with different payload")

✅ Ideal — server benar-benar mem-bind key ke hash body

Mengembalikan hasil transaksi **Request 1** (amount 0.01 ke WALLET\_A) tanpa error

⚠️ Cukup aman secara fungsional, tapi idealnya tetap kasih warning eksplisit ke klien bahwa body-nya beda — worth dilaporkan sebagai _low-severity UX/logic issue_, bukan security bug murni

**Diproses sebagai transaksi baru** — amount 5.00 ke WALLET\_B benar-benar dieksekusi

🚨 **Critical.** Idempotency key gagal total, membuka potensi manipulasi transaksi ganda di sisi integrator yang salah generate key

### Deep Dive: Menguji Variasi Perubahan Body yang Lebih Halus

Jangan cuma uji perubahan drastis (amount beda jauh, destination beda total). Uji juga **perubahan minor** yang mungkin luput dari hash-checking sederhana:

    # Variasi 1: hanya field tambahan opsional (note/memo) yang beda
    --data '{"assetId":"ETH_TEST","amount":"0.01","destination":{...},"note":"payment for invoice X"}'
    --data '{"assetId":"ETH_TEST","amount":"0.01","destination":{...},"note":"payment for invoice Y"}'
    
    # Variasi 2: urutan key JSON dibalik (kalau hashing naive berbasis string mentah, bukan canonical JSON)
    --data '{"amount":"0.01","assetId":"ETH_TEST","destination":{...}}'
    
    # Variasi 3: whitespace/formatting berbeda tapi secara semantik sama
    --data '{"assetId": "ETH_TEST", "amount": "0.01", "destination": {...}}'
    

Variasi 2 dan 3 ini penting karena mengungkap **cara implementasi** di balik layar: kalau server melakukan hashing terhadap **string JSON mentah** (bukan parsed & canonicalized), maka dua body yang secara semantik identik tapi berbeda formatting/urutan key bisa dianggap "berbeda" oleh sistem — menyebabkan idempotency gagal bekerja bahkan untuk kasus retry yang sah sekalipun (bug fungsional, bukan security, tapi tetap layak dilaporkan kalau ditemukan).

* * *

## Strategi Khusus untuk Fase C

### 1\. Precision Timing Itu Segalanya

Beda dengan Fase B yang hasilnya konsisten setiap dicoba ulang, race condition **bersifat probabilistik**. Kadang percobaan pertama gagal menembus race window, tapi percobaan ke-5 atau ke-10 berhasil karena kondisi jaringan/server load kebetulan pas. Jangan menyerah setelah 1-2 kali percobaan gagal.

**Best practice:** jalankan minimal 10-20 kali percobaan burst (bukan cuma 1 kali burst dengan 10 request — tapi ulangi seluruh proses burst-nya 10-20 kali di waktu berbeda) sebelum menyimpulkan sistem aman.

### 2\. Perbesar "Race Window" untuk Memudahkan Eksploitasi

Kalau race window aslinya sangat sempit (misalnya cuma beberapa milidetik), gunakan teknik **"last-byte sync"**: kirim semua request tapi sengaja tahan byte terakhir dari body request di level TCP, lalu lepas byte terakhir itu untuk semua request secara bersamaan. Ini teknik yang dipopulerkan oleh riset James Kettle (PortSwigger) dan diimplementasikan otomatis oleh Turbo Intruder — jauh lebih presisi dibanding sekadar `&` di bash.

### 3\. Uji dari Region/Latency Berbeda

Kalau kamu testing dari satu lokasi geografis saja, request-request paralel kamu mungkin "terlalu rapi" karena melewati path jaringan yang sama. Beberapa hunter berpengalaman sengaja menguji race condition dari **dua lokasi berbeda** (misalnya VPS di region berbeda) untuk menyimulasikan kondisi jaringan yang lebih realistis — kadang celah race condition justru lebih gampang muncul saat ada sedikit variasi latency, bukan saat semuanya presisi sempurna.

### 4\. Dokumentasikan dengan Video, Bukan Cuma Screenshot

Race condition **sulit direproduksi ulang secara konsisten oleh triager** kalau kamu cuma kasih screenshot statis. Selalu sertakan:

*   Script lengkap yang dipakai (termasuk versi Turbo Intruder script kalau pakai itu)
*   Screen recording saat menjalankan test dan melihat hasilnya
*   Log lengkap semua response (bukan cuma yang berhasil, tapi juga yang gagal — supaya triager bisa lihat rasio keberhasilan)

* * *

## Berapa Lama untuk Menemukan Bug di Fase C?

Dibanding Fase B, Fase C secara umum **butuh waktu lebih lama untuk setup yang benar**, tapi begitu setup-nya matang, iterasi pengujiannya justru bisa jauh lebih cepat dibanding IDOR manual satu-satu.

Aktivitas

Waktu Tipikal

Setup vault dengan saldo presisi + pemahaman flow transaksi

1–2 jam

Scripting race condition dasar (bash `&`/`wait`)

1–2 jam

Setup Turbo Intruder / tooling presisi tinggi

3–6 jam (kalau belum pernah pakai sebelumnya, ada learning curve)

Iterasi testing C1 (butuh banyak percobaan karena probabilistik)

5–15 jam, tersebar dalam beberapa sesi

Testing C2 idempotency (lebih deterministik, tidak butuh presisi timing ekstrem)

2–4 jam

Variasi lanjutan (body formatting, approval workflow race, dst)

3–8 jam

**Total realistis: 15–35 jam**, mirip dengan Fase B, tapi dengan distribusi waktu yang berbeda — lebih berat di setup tooling dan iterasi berulang, lebih ringan di eksplorasi endpoint (karena target C1/C2 relatif sedikit endpoint, tapi masing-masing butuh presisi tinggi).

**Fakta penting:** karena race condition butuh presisi teknis lebih tinggi dan tooling yang tidak semua orang familiar (Turbo Intruder, misalnya), **kompetisi researcher di kategori ini jauh lebih sedikit** dibanding IDOR biasa. Ini salah satu alasan kenapa bug C1/C2 yang berhasil ditemukan sering kali belum pernah dilaporkan orang lain — worth investasi waktu belajar tooling-nya secara serius kalau kamu niat fokus di custody/fintech bug bounty jangka panjang.

* * *

## Checklist Fase C

*   \[ \] Siapkan vault dengan saldo presisi untuk baseline yang mudah diverifikasi
*   \[ \] Uji race condition dengan minimal 10 request paralel benar-benar simultan (bukan sekadar loop cepat)
*   \[ \] Ulangi burst test 10-20 kali di sesi berbeda sebelum menyimpulkan aman
*   \[ \] Pelajari dan gunakan Turbo Intruder (atau tool setara) untuk presisi timing tinggi
*   \[ \] Uji race condition di approval workflow, bukan cuma create transaction
*   \[ \] Uji idempotency key collision dengan perubahan body drastis maupun halus (formatting, urutan key)
*   \[ \] Dokumentasikan dengan script lengkap + recording, bukan cuma screenshot
*   \[ \] Kombinasikan temuan C1/C2 dengan temuan Fase B kalau relevan untuk narasi impact yang lebih besar

* * *

## Penutup

Kalau Fase B mengajarkan cara berpikir "siapa yang berhak akses objek ini", Fase C mengajarkan cara berpikir yang lebih halus: **"apakah sistem ini tetap konsisten ketika dunia nyata tidak serapi asumsi developernya?"** — jaringan yang lambat, dua request yang datang bersamaan, retry yang terjadi di waktu yang salah. Inilah kenapa race condition dan idempotency bug sering disebut sebagai kategori yang membutuhkan _mindset_ engineer sungguhan, bukan cuma penghafal payload.

Butuh waktu belajar lebih panjang dibanding IDOR, tapi begitu kamu menguasainya, kategori ini menjadi salah satu skill paling langka dan paling dihargai di dunia bug bounty fintech — baik dari sisi reward maupun dari sisi kepuasan teknis menemukan sesuatu yang benar-benar sedikit orang bisa temukan.

Di tulisan selanjutnya, saya akan bahas Fase D (CLI-specific bugs) dan Fase E (webhook security) — dua area yang sering diabaikan karena kelihatan "kurang seksi" dibanding API utama, padahal justru di situ sering ada low-hanging fruit yang belum banyak dijamah researcher lain.

* * *

_Semua teknik race condition dan idempotency testing di atas WAJIB dilakukan di Sandbox environment dengan aset test, tidak pernah di production/mainnet. Selalu verifikasi scope resmi program sebelum eksekusi._