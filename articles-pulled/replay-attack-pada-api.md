---
title: "Replay Attack pada API"
slug: "replay-attack-pada-api"
labels: ["API","Autentikasi","Finance","JWT Signing"]
date: "2026-07-17T06:32:11-07:00"
blogger_id: "8744917167136565308"
content_hash: "540d574af87b7a0cb6db557b5452627c"
---

_Studi kasus: pengujian API transaksional berbasis signed-request (mis. Fireblocks dan platform fintech/custody sejenis)_

* * *

## Kenapa Replay Attack Berbahaya di API Finansial

Replay attack adalah salah satu bug class paling "tenang" — tidak butuh exploit rumit, tidak butuh reverse engineering algoritma kriptografi, cuma butuh satu kemampuan: **menangkap request yang sah, lalu mengirimkannya lagi**. Justru kesederhanaan inilah yang membuatnya berbahaya, karena banyak tim developer fokus mengamankan _integritas_ request (signature, JWT, HMAC) tapi lupa mengamankan _keunikan_ request (apakah request ini boleh diproses lebih dari sekali).

Di sistem biasa, replay attack mungkin cuma bikin like berulang di sebuah postingan. Tapi di API transaksional — custody aset digital, payment gateway, transfer dana — replay attack yang berhasil berarti **transaksi finansial yang sama dieksekusi berkali-kali**. Ini kelas bug yang hampir selalu masuk kategori Critical/High di program bug bounty finansial.

> **Disclaimer penting:** Semua teknik di bawah ini hanya boleh dijalankan pada sistem yang secara eksplisit mengizinkan pengujian keamanan (program bug bounty resmi, environment sandbox milik sendiri, atau aplikasi yang kamu punya izin tertulis untuk mengujinya). Selalu gunakan aset test/sandbox untuk pengujian yang melibatkan transaksi finansial nyata — jangan pernah replay transaksi ke wallet pihak ketiga di luar scope.

* * *

## 1\. Konsep Dasar — Kenapa Request Bisa "Diputar Ulang"

Sebuah request API yang sudah ditandatangani (signed) — baik lewat JWT, HMAC, atau signature RSA seperti pada skema signing Fireblocks — pada dasarnya adalah **paket data statis**. Begitu attacker berhasil menangkapnya (lewat proxy, network sniffing, log yang bocor, atau browser history), paket ini valid untuk dikirim ulang **selama server tidak punya mekanisme untuk mendeteksi "saya sudah pernah memproses request persis ini sebelumnya"**.

Signature yang valid **tidak otomatis berarti request itu unik**. Signature hanya menjawab pertanyaan "apakah request ini datang dari pemilik key yang sah dan tidak diubah di tengah jalan" — bukan "apakah request ini baru pertama kali dikirim". Dua hal ini sering tertukar di kepala developer, dan itu akar dari kerentanan replay.

Server yang aman terhadap replay biasanya mengandalkan kombinasi dari:

*   **Nonce** — nilai acak unik per request, dicatat server, ditolak kalau sudah pernah dipakai.
*   **Timestamp (`iat`/`ts`) + window toleransi** — request ditolak kalau timestamp terlalu lama dari waktu server saat ini.
*   **Idempotency key** — mem-bind satu request logis ke satu efek samping (side effect) di backend, terlepas berapa kali dikirim ulang.
*   **Sequence number / counter** — request harus punya nomor urut yang naik terus, request dengan nomor lama otomatis ditolak.

Kalau salah satu (atau semua) dari ini tidak diimplementasikan dengan benar, replay attack jadi mungkin.

* * *

## 2\. Metodologi Testing — Replay dalam Berbagai Rentang Waktu

Uji secara sistematis, jangan cuma sekali coba. Response server bisa berbeda tergantung berapa lama jeda antara request asli dan replay-nya — ini membantu kamu memetakan **di mana persis** validasi anti-replay gagal.

### Langkah 1 — Capture baseline

Tangkap satu request valid yang bikin efek nyata (idealnya `createTransaction` atau endpoint state-changing lain), lewat Burp Suite atau mitmproxy. Simpan **persis** — header, body, signature, semuanya — jangan diubah sedikit pun.

    POST /v1/transactions HTTP/1.1
    Host: api.fireblocks.io
    X-API-Key: <APIKEY>
    Authorization: Bearer <JWT_SIGNED>
    Content-Type: application/json
    
    {
      "assetId": "ETH_TEST",
      "amount": "0.01",
      "source": {"type": "VAULT_ACCOUNT", "id": "0"},
      "destination": {"type": "EXTERNAL_WALLET", "id": "<WALLET>"},
      "externalTxId": "replay-test-001"
    }
    

### Langkah 2 — Replay bertahap di rentang waktu berbeda

Jeda Waktu

Tujuan Pengujian

**~5 detik** (segera setelah asli)

Baseline — kalau ini pun berhasil diputar ulang, berarti tidak ada proteksi replay sama sekali

**~30 detik**

Cek apakah ada window toleransi timestamp yang terlalu longgar

**~5 menit**

Window toleransi umum untuk sistem berbasis `iat`/`exp` — banyak implementasi pakai window 5 menit tapi lupa invalidasi nonce di dalamnya

**~1 jam**

Cek apakah token/signature yang harusnya expired masih diterima (validasi `exp` yang salah, misal dibandingkan dengan tipe data yang salah atau timezone yang salah)

**~24 jam / setelah restart service**

Cek apakah nonce store di backend persisten (disimpan di DB/Redis) atau cuma di memory yang hilang saat service restart — kalau di memory, restart = reset semua histori nonce

    # Simpan request asli sebagai file (raw.txt dari Burp: Save item)
    # Replay pakai curl dengan payload dan header PERSIS SAMA
    
    curl -X POST https://api.fireblocks.io/v1/transactions \
      -H "X-API-Key: <APIKEY>" \
      -H "Authorization: Bearer <JWT_SIGNED_ASLI>" \
      -H "Content-Type: application/json" \
      -d '{"assetId":"ETH_TEST","amount":"0.01","source":{"type":"VAULT_ACCOUNT","id":"0"},"destination":{"type":"EXTERNAL_WALLET","id":"<WALLET>"},"externalTxId":"replay-test-001"}'
    
    # Ulangi curl PERSIS yang sama setelah delay tertentu
    sleep 30 && <curl_yang_sama>
    sleep 300 && <curl_yang_sama>
    

Atau otomasi dengan Burp **Repeater** (paling praktis — tinggal klik "Send" ulang kapan pun, response langsung terlihat side-by-side) atau **Turbo Intruder** kalau butuh replay presisi di banyak titik waktu sekaligus dengan scripting.

### Langkah 3 — Baca hasilnya

Response Replay

Artinya

`401`/`403` dengan pesan seperti "nonce already used" / "timestamp expired"

Proteksi replay bekerja dengan baik

`200` dan transaksi baru benar-benar tercipta (cek via `getTransactionByExternalTxId` atau dashboard)

**Bug confirmed** — replay attack berhasil

`200` tapi mengembalikan transaksi yang sama (idempotent, tidak ada transaksi baru)

Ini justru perilaku **benar** (idempotency berjalan) — bukan bug, meskipun response code sama-sama 200, harus dicek di data on-chain/database apakah efeknya beneran dobel

`500`

Kadang menandakan race condition di layer nonce-checking (baca bagian 4)

**Penting:** jangan cuma percaya status code. Selalu verifikasi **efek samping nyata** — cek saldo vault sebelum dan sesudah, cek jumlah transaksi yang benar-benar tercatat di ledger/database, bukan cuma response body dari request replay itu sendiri.

* * *

## 3\. Varian Replay yang Sering Terlewat

### 3.1 Cross-endpoint replay

Request yang sah untuk satu endpoint kadang bisa "dipakai ulang" di endpoint lain yang mirip strukturnya, kalau signature tidak mengikat endpoint/method secara eksplisit ke dalam data yang ditandatangani.

    # Request asli valid untuk:
    POST /v1/transactions/estimate-fee
    
    # Coba kirim body & signature PERSIS SAMA ke endpoint state-changing:
    POST /v1/transactions
    

Kalau signature hanya menandatangani body tanpa mengikat path/method, ini bisa jadi jalan bypass yang tidak terduga.

### 3.2 Replay lintas akun (cross-tenant replay)

    # Capture request valid milik Akun A
    # Kirim ulang PERSIS SAMA, tapi header X-API-Key diganti API key milik Akun B
    curl -X POST https://api.fireblocks.io/v1/transactions \
      -H "X-API-Key: <APIKEY_B>" \
      -H "Authorization: Bearer <JWT_SIGNED_BY_A>" \
      -d '<body_persis_sama>'
    

Cek apakah backend memverifikasi bahwa JWT/signature memang terikat ke API key yang mengirim request, atau kedua header ini divalidasi secara terpisah tanpa saling silang cek (cross-validation).

### 3.3 Replay setelah revoke/logout

    1. Login, capture token/signed-request yang valid
    2. Logout / revoke API key dari akun tersebut
    3. Replay request yang sudah dicapture SEBELUM revoke
    

**Bug jika:** request masih diterima setelah token/key seharusnya sudah tidak valid — menandakan tidak ada revocation list aktif, hanya mengandalkan `exp` alami dari token (yang bisa jadi window waktunya masih panjang).

### 3.4 Replay dengan modifikasi nonce/timestamp minimal

Kalau replay persis ditolak, coba modifikasi **hanya** field nonce/timestamp (tanpa menyentuh signature) — untuk memastikan apakah penolakan terjadi karena signature mismatch (baik, artinya nonce ikut ditandatangani) atau karena nonce checking terpisah (perlu tahu format nonce yang diterima untuk uji lanjut, misal apakah nonce harus strictly increasing atau boleh nonce lama yang belum pernah dipakai).

    # Kalau format asli: {"nonce": "abc123", "ts": 1752000000, ...}
    # Coba ganti nonce ke nilai baru yang belum pernah dipakai, TAPI signature tetap pakai yang lama
    

Kalau ini berhasil (signature lama tetap dianggap valid meski body berubah), ini sebenarnya bug **signature tampering** (lihat artikel sebelumnya) yang bersinggungan dengan replay — bukti bahwa signature tidak benar-benar mengikat isi nonce/timestamp.

* * *

## 4\. Replay yang Bertemu Race Condition (Kombinasi Bug Berbahaya)

Ini kombinasi yang sering menghasilkan temuan severity tertinggi: **replay + parallel request**. Bahkan kalau server punya proteksi replay yang benar secara logika (cek dulu apakah nonce sudah dipakai, baru proses), proteksi itu bisa gagal kalau **pengecekan dan pencatatan nonce tidak atomik**.

    # Capture SATU request valid dengan SATU nonce/idempotency-key
    # Kirim request yang PERSIS SAMA secara PARALEL (bukan berurutan), bukan sekali replay biasa
    
    KEY_PAYLOAD='{"assetId":"ETH_TEST","amount":"0.01","source":{"type":"VAULT_ACCOUNT","id":"0"},"destination":{"type":"EXTERNAL_WALLET","id":"<WALLET>"},"externalTxId":"race-replay-001"}'
    
    for i in {1..10}; do
      curl -s -X POST https://api.fireblocks.io/v1/transactions \
        -H "X-API-Key: <APIKEY>" \
        -H "Authorization: Bearer <JWT_SIGNED>" \
        -d "$KEY_PAYLOAD" &
    done
    wait
    

**Logika di balik ini:** kalau backend melakukan `SELECT ... WHERE nonce = X` lalu (di request terpisah) `INSERT nonce X`, ada celah waktu (TOCTOU — time-of-check to time-of-use) di antara keduanya. Kalau 10 request dikirim nyaris bersamaan, beberapa di antaranya bisa lolos pengecekan "nonce belum dipakai" sebelum ada yang sempat menulis nonce itu ke database — hasilnya lebih dari satu transaksi tercipta dari satu request yang sama persis.

Ini beririsan langsung dengan bug class _race condition / double-spend_ yang biasanya jadi prioritas tertinggi di playbook bug bounty custody platform — kombinasi replay dan race condition sering menghasilkan **double-spend nyata** yang sangat mudah dibuktikan dampaknya ke triager.

* * *

## 5\. Tools yang Membantu

*   **Burp Suite Repeater** — replay manual, paling cocok untuk eksplorasi awal (ubah timing, lihat response satu-satu).
*   **Burp Turbo Intruder** — replay presisi dalam jumlah banyak dengan kontrol timing sub-detik, ideal untuk pengujian race condition (lihat bagian 4).
*   **mitmproxy + script Python** — kalau butuh replay otomatis dengan logika kondisional (misal: replay hanya kalau response pertama tertentu).
*   **`curl` + `for` loop / `xargs -P`** — cukup untuk pengujian awal tanpa proxy, seperti contoh di atas.

    # Alternatif dengan xargs untuk paralel request yang lebih terkontrol jumlah worker-nya
    seq 1 10 | xargs -P 10 -I{} curl -s -X POST https://api.fireblocks.io/v1/transactions \
      -H "X-API-Key: <APIKEY>" -H "Authorization: Bearer <JWT_SIGNED>" -d "$KEY_PAYLOAD"
    

* * *

## 6\. Sisi Defensif — Cara Backend Mencegah Replay

Untuk laporan yang lebih bernilai (dan supaya paham apa yang seharusnya divalidasi), berikut checklist yang biasanya jadi standar mitigasi:

1.  **Nonce unik per request, dicatat di storage persisten** (bukan in-memory) dengan TTL yang jelas, dan **pengecekan + pencatatan nonce harus atomik** — pakai `INSERT ... ON CONFLICT DO NOTHING` atau `SETNX` di Redis, bukan `SELECT` lalu `INSERT` terpisah.
2.  **Timestamp request divalidasi dengan window ketat** (biasanya ±30 detik sampai beberapa menit tergantung kebutuhan), dan **nonce tetap dicatat meski request ditolak karena alasan lain**, supaya tidak bisa dipakai ulang di percobaan berikutnya.
3.  **Signature harus mengikat nonce dan timestamp**, bukan cuma body bisnis — kalau nonce/timestamp bisa diganti tanpa membatalkan signature, proteksi replay jadi tidak berarti (lihat bagian 3.4).
4.  **Idempotency key di-bind ke seluruh isi request** (hash dari body, bukan cuma key itu sendiri) — supaya idempotency key yang sama dengan body berbeda otomatis ditolak, bukan diam-diam mengeksekusi ulang dengan data baru.
5.  **Revocation list aktif** untuk token/key yang di-logout atau dicabut, jangan cuma mengandalkan `exp` alami.
6.  **Signature/token yang mengikat path dan method HTTP**, bukan cuma body, untuk mencegah cross-endpoint replay.

* * *

## 7\. Menulis Laporan yang Baik

Sama seperti signature tampering, severity replay attack ditentukan dari **dampak yang bisa dibuktikan** — idealnya dengan bukti efek samping ganda yang nyata (dua transaksi tercatat, saldo berkurang dua kali, dll), bukan sekadar "server merespons 200 dua kali".

    Judul: Replay attack pada endpoint createTransaction memungkinkan eksekusi transaksi ganda
    
    Ringkasan: Request createTransaction yang sudah pernah dieksekusi dapat dikirim ulang 
    persis sama dalam rentang 5 menit dan diproses kembali sebagai transaksi baru, 
    karena nonce tidak dicatat/divalidasi di sisi server.
    
    Langkah Reproduksi:
    1. Buat transaksi via createTransaction, catat request lengkap (header+body+signature)
    2. Kirim ulang request PERSIS SAMA setelah 30 detik menggunakan curl/Burp Repeater
    3. Verifikasi: transaksi kedua tercatat di ledger dengan txId berbeda, saldo vault 
       berkurang dua kali dari amount yang sama
    
    Dampak: Double-spend / eksekusi transaksi finansial ganda tanpa otorisasi ulang dari user.
    
    Severity: Critical (CVSS 9.1) — AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H
    
    Saran Perbaikan: Implementasi nonce store persisten dengan pengecekan atomik, 
    bind nonce ke dalam data yang ditandatangani signature.
    

* * *

## Penutup

Replay attack sering diremehkan karena terlihat "primitif" dibanding teknik bypass kriptografi yang lebih rumit — padahal justru itu yang membuatnya konsisten ditemukan di sistem production nyata: developer cenderung berpikir "signature sudah valid, berarti aman", padahal validitas signature dan keunikan request adalah dua hal yang harus dijamin terpisah. Kombinasikan dengan pengujian race condition (bagian 4) untuk temuan dengan dampak paling meyakinkan.

Selalu uji di sandbox dengan aset test, jangan pernah replay transaksi nyata ke wallet pihak ketiga di luar scope, dan laporkan secara bertanggung jawab lewat platform resmi program.

* * *

_Referensi lanjutan: OWASP API Security Top 10 (API2:2023 Broken Authentication), RFC 6749 §10.12 (Cross-Site Request Forgery — konsep replay terkait), dokumentasi Burp Suite Turbo Intruder untuk pengujian race condition._