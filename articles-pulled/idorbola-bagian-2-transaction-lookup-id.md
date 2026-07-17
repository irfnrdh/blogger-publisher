---
title: "   IDOR/BOLA Bagian 2: Transaction Lookup, ID Enumeration, dan Strategi Berburu Bug"
slug: "idorbola-bagian-2-transaction-lookup-id"
date: "2026-07-17T07:47:56-07:00"
blogger_id: "3411698513443714716"
content_hash: "73552ce3e96d04a140c3e2d3a4a3c5fc"
---

_Lanjutan dari tulisan sebelumnya soal Cross-Tenant Vault Access (B1). Kalau belum baca, saya sarankan baca dulu — di sana dijelaskan konsep dasar IDOR/BOLA yang jadi fondasi tulisan ini._

* * *

## Kenapa B2 dan B3 Sering Jalan Berdampingan

Di tulisan pertama saya sempat singgung: B1 jarang berdiri sendiri. Kalau kamu berhasil menemukan satu celah cross-tenant access, dua pertanyaan berikutnya yang otomatis muncul di kepala seorang bug hunter berpengalaman adalah:

1.  "Selain by direct vault ID, ada cara lain nggak untuk 'menabrak' resource tenant lain?" → ini yang dijawab **B2**
2.  "Kalau ID-nya bisa ditebak, seberapa gampang ditebak secara sistematis?" → ini yang dijawab **B3**

Ketiganya (B1+B2+B3) kalau digabung jadi satu narasi laporan biasanya menghasilkan **chain of impact** yang jauh lebih meyakinkan di mata triager dibanding laporan tunggal — karena kamu tidak cuma bilang "ada bug", tapi menunjukkan "ini pola sistemik di banyak endpoint."

* * *

## B2 — Transaction Lookup by External ID

### Konsep

Fireblocks punya fitur `externalTxId` — sebuah ID yang **dibuat oleh user sendiri** (bukan UUID acak dari sistem Fireblocks) saat membuat transaksi. Tujuannya untuk memudahkan integrasi: alih-alih harus menyimpan `transactionId` internal Fireblocks, sistem kamu bisa pakai ID internal sendiri, misalnya `invoice-2024-001`.

Masalahnya: **ID yang dibuat manusia cenderung punya pola yang bisa ditebak.** Ini beda karakter dengan UUID v4 acak yang secara matematis nyaris mustahil ditebak.

### Kenapa Ini Berbahaya

Bayangkan sebuah startup fintech memakai Fireblocks dan menamai `externalTxId` mereka dengan pola:

    invoice-2024-001
    invoice-2024-002
    invoice-2024-003
    ...
    

Kalau endpoint `getTransactionByExternalTxId` tidak memvalidasi bahwa ID tersebut milik tenant yang sedang login, maka tenant lain yang **menebak** pola penamaan ini bisa mengambil data transaksi finansial pihak lain — termasuk jumlah, alamat wallet, status, dan metadata lainnya.

### Langkah Pengujian

**Langkah 1 — Buat baseline dengan pola predictable di Akun A**

    fireblocks transactions create-transaction \
      --data '{"assetId":"ETH_TEST","amount":"0.01","externalTxId":"invoice-2024-001","source":{"type":"VAULT_ACCOUNT","id":"0"},"destination":{"type":"EXTERNAL_WALLET","id":"<WALLET>"}}' \
      --no-confirm
    

**Langkah 2 — Coba akses dengan kredensial Akun B**

    curl -X GET "https://api.fireblocks.io/v1/transactions/external-tx-id/invoice-2024-001" \
      -H "X-API-Key: <APIKEY_AKUN_B>" \
      -H "Authorization: Bearer <JWT_SIGNED_BY_AKUN_B>"
    

**Langkah 3 — Perluas pola tebakan**

Jangan berhenti di satu ID. Uji variasi pola yang umum dipakai developer dunia nyata:

    order-1, order-2, order-3
    txn_001, txn_002
    2024-01-01-payment
    withdraw-{timestamp_bulat}
    {email_pattern}-tx-1
    

Ini penting dicatat: **bug-nya bukan di "Fireblocks salah bikin ID acak"** — ID-nya memang sengaja user-defined by design. Bug sebenarnya adalah **backend tidak memverifikasi ownership** terhadap `externalTxId` yang diminta, sama seperti akar masalah di B1. Bedanya cuma vektor akses.

### Insight Strategis

Kalau kamu benar-benar serius mendalami B2, teknik lanjutannya adalah **riset OSINT ringan**: cek dokumentasi integrasi publik, forum developer, atau repo GitHub publik yang menyebut integrasi Fireblocks — kadang developer tanpa sadar membocorkan pola penamaan `externalTxId` mereka di contoh kode publik. Ini bukan sekadar tebak-tebakan buta, tapi **enumerasi terarah berdasarkan pola nyata**.

* * *

## B3 — Sequential ID Enumeration

### Konsep

Ini teknik paling "klasik" di dunia IDOR, tapi jangan diremehkan — masih sangat sering ditemukan bahkan di sistem besar.

Kalau ID transaksi atau vault account **sekuensial** (0, 1, 2, 3, ...) atau **predictable secara matematis** (misalnya berbasis timestamp atau counter yang bisa dihitung mundur), maka penyerang tidak perlu tahu ID spesifik milik siapa pun — cukup **iterasi** dari 0 ke atas.

### Langkah Pengujian

    for i in $(seq 0 50); do
      echo "=== ID: $i ==="
      fireblocks transactions get-transaction --tx-id $i --json | jq '.status, .amount, .destination'
      sleep 0.5   # hindari rate limit trigger yang terlalu agresif
    done
    

Poin penting yang sering dilewatkan pemula: **jangan cuma cek "apakah bisa diakses" (200 vs 403), tapi juga perhatikan pola ID-nya sendiri.**

Buat 3-5 transaksi berturut-turut di **waktu berbeda** (misalnya selisih beberapa jam), lalu bandingkan ID yang dihasilkan:

Waktu

ID yang didapat

Observasi

10:00

10042

—

14:00

10043

Selisih 1 — kemungkinan global counter, bukan per-tenant

18:00

10051

Selisih 8 — ada 7 transaksi tenant lain di antaranya, bisa jadi indikasi volume aktivitas platform (info leak tambahan!)

Kalau ID ternyata **global counter lintas semua tenant** (bukan per-tenant), ini sendiri sudah jadi temuan menarik: artinya kamu bisa **memperkirakan volume transaksi harian seluruh platform** hanya dari selisih ID — meskipun isi transaksinya sendiri terproteksi. Ini contoh _information disclosure_ tingkat rendah yang tetap layak dicatat sebagai temuan tambahan (biasanya severity Low-Medium, tapi menunjukkan kedalaman analisis kamu ke triager).

### Kombinasi B1 + B3 = Impact Maksimal

Kalau B1 (cross-tenant access) _dan_ B3 (ID predictable) sama-sama terbukti, gabungkan jadi satu narasi:

> "ID vault account bersifat sekuensial dan dapat diprediksi (dibuktikan dengan membuat vault baru dan mengamati kenaikan ID +1). Dikombinasikan dengan tidak adanya validasi ownership pada endpoint GET /v1/vault/accounts/{id}, seorang attacker dengan akun Fireblocks aktif dapat secara sistematis membaca data vault seluruh tenant di platform hanya dengan iterasi ID dari 0 hingga N."

Ini jenis kalimat yang mengubah severity dari "IDOR biasa" jadi **"platform-wide data exposure"** — kategori yang jauh lebih serius di mata triager.

* * *

## Strategi & Best Practice: Cara Berpikir, Bukan Cuma Cara Eksekusi

Bagian ini yang menurut saya sering hilang dari tutorial-tutorial IDOR kebanyakan. Eksekusi teknis gampang ditiru, tapi **cara berpikir sistematis** yang membedakan hunter pemula dengan yang konsisten dapat bounty.

### 1\. Petakan Semua Endpoint yang Menerima ID, Bukan Cuma yang "Kelihatan Penting"

Bikin spreadsheet sederhana saat kamu eksplorasi API (baik dari dokumentasi resmi maupun hasil intercept traffic sungguhan via Burp/mitmproxy):

Endpoint

Method

Parameter ID

Sudah dites B1?

Hasil

`/v1/vault/accounts/{id}`

GET

vaultId

✅

Aman

`/v1/vault/accounts/{id}/{assetId}/addresses`

GET

vaultId

✅

Aman

`/v1/vault/accounts/{id}/{assetId}/addresses`

POST

vaultId

❌

Belum dites

`/v1/transactions/{txId}`

GET

txId

✅

Aman

`/v1/transactions/external-tx-id/{id}`

GET

externalTxId

❌

Belum dites

Endpoint yang jarang disorot (biasanya endpoint sekunder seperti audit log, comment/note pada transaksi, atau webhook config) justru sering jadi tempat bug bersembunyi — karena developer cenderung lebih hati-hati di endpoint "utama" yang sering direview, tapi lengah di endpoint "pendukung".

### 2\. Uji Setiap HTTP Method, Bukan Cuma GET

Pola pikir umum: orang cenderung fokus ke `GET` karena paling gampang dicoba. Tapi `PUT`, `PATCH`, `DELETE` terhadap objek milik tenant lain jauh lebih berbahaya dan justru lebih sering luput dari testing karena butuh effort lebih.

    # Setelah GET terbukti protected, tetap coba varian ini:
    curl -X DELETE https://api.fireblocks.io/v1/vault/accounts/42/... -H "..." # kredensial A, ID milik B
    curl -X PATCH  https://api.fireblocks.io/v1/vault/accounts/42/... -H "..." # kredensial A, ID milik B
    

Kalau `GET` aman tapi `DELETE`/`PATCH` tidak — itu bug yang **jauh lebih parah** (unauthorized modification/destruction) dibanding sekadar data leak.

### 3\. Bedakan "Vertical" vs "Horizontal" Broken Access Control

*   **Horizontal**: user biasa mengakses data user biasa lain yang setara (ini yang kita bahas sepanjang tulisan — Akun A vs Akun B, sama-sama tenant biasa).
*   **Vertical**: user biasa mengakses fungsi yang seharusnya cuma untuk role lebih tinggi (misalnya Viewer bisa memicu aksi Signer — ini sebenarnya sudah disinggung di teknik A3 pada playbook awal).

Kombinasikan keduanya kalau memungkinkan: coba apakah Akun A dengan role rendah bisa melakukan aksi _approval_ terhadap transaksi milik Akun B. Kalau bisa, itu **horizontal + vertical BOLA sekaligus** — kombinasi yang biasanya otomatis masuk kategori Critical.

### 4\. Gunakan Burp Suite Secara Sistematis, Bukan Cuma Manual

Untuk pengujian skala (seperti B3 enumeration), manual curl satu-satu itu lambat dan gampang salah catat. Alur kerja yang lebih efisien:

1.  Intercept 1 request valid via Burp Proxy
2.  Kirim ke **Intruder**
3.  Set posisi payload di parameter ID
4.  Gunakan payload type "Numbers" dengan range sesuai kebutuhan (misal 0–500, step 1)
5.  Filter hasil berdasarkan **response length** atau **status code** — response yang polanya beda dari mayoritas ("outlier") biasanya jadi kandidat kuat untuk diperiksa manual

Ini menghemat waktu drastis dibanding loop bash manual, terutama saat kamu harus menguji puluhan endpoint berbeda.

### 5\. Selalu Bandingkan 403 vs 404 vs 200 dengan Body Kosong

Pemula sering cuma cek status code, padahal detail respons itu sendiri bisa bocor informasi:

*   `404` konsisten → baik, tidak ada info leak
*   `403` dengan pesan error yang **berbeda** tergantung apakah ID valid atau tidak (misalnya "Access Denied" vs "Not Found") → ini sendiri bug kecil (bisa dipakai untuk **existence enumeration** — attacker bisa tahu ID mana yang valid meskipun tidak bisa membaca isinya)
*   `200` dengan body `{}` atau `null` → cek response time-nya; kadang ada perbedaan waktu respons yang mengindikasikan backend sempat query database sebelum menolak (timing side-channel, biasanya severity rendah tapi tetap dicatat)

* * *

## Berapa Lama Sampai Bug Ditemukan? (Estimasi Realistis)

Ini pertanyaan yang paling sering ditanyakan pemula, dan jawabannya selalu "tergantung", tapi biar nggak abstrak, berikut estimasi berdasarkan pola umum di komunitas bug bounty untuk kategori IDOR pada platform fintech/custody yang **sudah matang** (bukan startup baru dengan security posture lemah):

### Skenario Realistis per Fase

Fase

Waktu Tipikal

Catatan

Setup environment (akun sandbox, CLI, proxy)

1–3 jam

Sekali setup, bisa dipakai berulang untuk program lain juga

Mapping endpoint (baca docs + intercept traffic)

4–8 jam

Semakin lengkap peta endpoint, semakin tinggi peluang temuan

Testing B1 dasar (cross-tenant vault, pola paling umum)

2–4 jam

Biasanya hasil **negatif** di endpoint utama — perusahaan besar biasanya sudah handle ini

Testing endpoint sekunder & method selain GET

4–10 jam

Peluang temuan lebih tinggi di sini justru

Testing B2 (predictable external ID)

3–6 jam

Sangat tergantung apakah kamu bisa riset pola penamaan realistis

Testing B3 (enumeration + pattern analysis)

2–5 jam

Cepat kalau ID memang sekuensial, tapi kebanyakan platform modern sudah pakai UUID

**Total realistis untuk 1 siklus penuh Fase B: sekitar 15–35 jam kerja aktif**, tersebar dalam beberapa hari hingga 1-2 minggu (karena bug bounty biasanya dikerjakan paruh waktu, bukan maraton non-stop).

### Fakta yang Perlu Diterima dari Awal

*   **Kebanyakan sesi testing akan berakhir "aman", bukan "ketemu bug".** Ini normal. Platform seperti Fireblocks sudah diaudit berkali-kali dan diuji ribuan researcher lain sebelum kamu. Endpoint utama biasanya sudah sangat solid.
*   **Bug bernilai tinggi biasanya muncul di area yang jarang disentuh orang** — endpoint baru, fitur yang baru dirilis (cek changelog!), atau kombinasi fitur yang jarang dipikirkan bareng (misalnya fitur webhook + fitur MCP server yang disebut di Fase F playbook — permukaan baru cenderung under-tested).
*   **Realistically, untuk program besar dan matang seperti Fireblocks, menemukan bug Critical/High bisa memakan waktu dari beberapa hari sampai berbulan-bulan riset konsisten**, bukan sekali coba langsung dapat. Banyak hunter berpengalaman punya rasio "puluhan jam riset per satu laporan valid".
*   **Fitur yang baru dirilis (dalam 1-3 bulan terakhir) adalah tempat paling produktif untuk mencari bug baru** — karena belum "dibersihkan" oleh gelombang researcher pertama. Selalu pantau changelog/release notes resmi Fireblocks sebagai prioritas riset.

### Cara Mempercepat Time-to-Bug Secara Realistis

1.  **Jangan mulai dari nol setiap kali** — simpan mapping endpoint dan hasil testing sebelumnya, update inkremental tiap ada fitur baru.
2.  **Fokus di fitur baru/perubahan API** dulu, baru masuk ke endpoint lama yang sudah teruji ribuan kali.
3.  **Baca changelog & GitHub changelog SDK** (kalau publik) — perubahan kecil di SDK sering mengindikasikan endpoint baru di backend yang belum banyak dites.
4.  **Kolaborasi dengan sesama peneliti (kalau program mengizinkan)** — dua kepala menutupi blind spot masing-masing lebih cepat dibanding riset solo.
5.  **Dokumentasikan bahkan hasil negatif** — biar nggak mengulang testing yang sama dua kali di sesi berikutnya.

* * *

## Checklist Gabungan B1–B3

*   \[ \] Petakan seluruh endpoint yang menerima parameter ID (bukan cuma yang "kelihatan penting")
*   \[ \] Uji cross-tenant access di setiap endpoint tersebut (B1), untuk semua HTTP method
*   \[ \] Cek apakah ada `externalTxId` atau ID user-defined lain yang predictable (B2)
*   \[ \] Amati apakah ID sistem bersifat sekuensial/predictable dengan cara buat objek berulang di waktu berbeda (B3)
*   \[ \] Bandingkan detail response (403 vs 404 vs 200 kosong, timing) untuk info leak sekunder
*   \[ \] Uji kombinasi horizontal + vertical access control
*   \[ \] Cek changelog/rilis fitur terbaru sebagai prioritas riset
*   \[ \] Susun narasi laporan yang menggabungkan temuan jadi satu chain of impact kalau memungkinkan

* * *

## Penutup

Kalau tulisan pertama fokus ke "bagaimana cara mengeksekusi satu teknik", tulisan ini lebih ke "bagaimana cara berpikir seperti hunter yang konsisten menemukan bug" — memetakan permukaan serangan secara sistematis, memahami bahwa mayoritas waktu akan dihabiskan untuk hasil negatif, dan tahu di mana harus memprioritaskan energi (fitur baru, endpoint sekunder, kombinasi teknik).

IDOR/BOLA tetap jadi salah satu kategori bug paling "worth it" untuk dikuasai dalam-dalam, karena polanya bisa dipakai ulang di hampir semua platform berbasis API — bukan cuma Fireblocks. Kalau kamu sudah nyaman dengan B1-B3, langkah selanjutnya yang natural adalah masuk ke Fase C playbook (business logic pada transaction creation) — di situ kompleksitasnya naik satu tingkat karena kamu mulai bermain dengan _state_ dan _timing_, bukan cuma otorisasi statis.

* * *

_Semua teknik di atas hanya untuk pengujian di Sandbox environment sesuai scope resmi program bug bounty terkait. Selalu verifikasi scope terbaru sebelum eksekusi, dan laporkan temuan hanya ke satu platform sesuai policy masing-masing program._