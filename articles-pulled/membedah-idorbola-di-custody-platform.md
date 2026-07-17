---
title: "Membedah IDOR/BOLA di Custody Platform: Studi Kasus Cross-Tenant Vault Access"
slug: "membedah-idorbola-di-custody-platform"
date: "2026-07-17T07:45:07-07:00"
blogger_id: "5206513324306041349"
content_hash: "6764f6cba5519147656593467e37d301"
---

_Catatan awal: tulisan ini membahas metodologi pengujian keamanan (bug bounty) yang sah, dilakukan di lingkungan Sandbox dengan izin eksplisit dari program HackerOne/Bugcrowd terkait. Jangan pernah menjalankan teknik ini terhadap sistem yang bukan milik kamu atau di luar scope resmi program._

* * *

## Kenapa IDOR/BOLA Itu "Kelas Berat" di Custody Platform?

Kalau kamu baru masuk dunia bug bounty dan bingung harus fokus ke mana dulu, jawabannya sering kali sederhana: **Broken Access Control**, khususnya IDOR (Insecure Direct Object Reference) atau nama modernnya BOLA (Broken Object Level Authorization).

Kenapa ini penting banget di platform seperti Fireblocks?

Karena Fireblocks itu **custody platform** — sistem yang menyimpan dan mengelola aset digital (crypto) milik banyak organisasi (tenant) sekaligus dalam satu infrastruktur multi-tenant. Setiap tenant (misalnya Akun A dan Akun B) seharusnya benar-benar terisolasi satu sama lain. Kalau isolasi ini bocor sedikit saja, dampaknya bukan cuma "data leak" biasa — bisa jadi:

*   Saldo & alamat wallet organisasi lain kebaca
*   Riwayat transaksi finansial pihak lain terekspos
*   Dalam kasus terburuk, transaksi bisa dipicu ke/dari vault yang bukan milik kita

Inilah kenapa dokumen playbook menyebut Fase B sebagai **"fase paling produktif"** — secara statistik, di hampir semua program bug bounty fintech/custody, IDOR adalah kategori bug yang paling sering ditemukan sekaligus paling sering dihargai tinggi, karena dampaknya langsung ke isolasi data finansial.

* * *

## Konsep Dasar: Apa Itu IDOR/BOLA?

Sebelum masuk ke teknis, penting paham konsepnya dulu.

**IDOR terjadi ketika:**

1.  Sebuah endpoint API menerima **ID objek** dari user (misalnya `vault_id`, `tx_id`, `account_id`) sebagai parameter di URL, body, atau header.
2.  Backend **mengambil data berdasarkan ID tersebut**.
3.  Tapi backend **lupa/gagal memverifikasi** apakah user yang sedang login benar-benar _punya hak akses_ ke objek dengan ID itu.

Analogi sederhana: bayangkan sistem hotel di mana nomor kamar kamu adalah "401". Kamu bisa masuk kamar 401 karena kamu tamu yang menginap di sana. Tapi kalau resepsionis lupa mengecek kartu kunci dan cuma percaya nomor kamar yang kamu sebut, kamu bisa saja bilang "saya mau masuk kamar 402" dan diizinkan masuk — padahal itu kamar tamu lain.

Di dunia API, "kartu kunci" itu adalah **authorization check di level object** (bukan cuma level "apakah kamu login", tapi "apakah kamu berhak atas objek spesifik ini").

**Kenapa OWASP mengganti istilah IDOR jadi BOLA?**

OWASP API Security Top 10 memasukkan ini sebagai **API1:2023 - Broken Object Level Authorization**. Istilah "BOLA" lebih menekankan bahwa akar masalahnya ada di _level otorisasi objek_, bukan sekadar "referensi langsung" seperti nama IDOR yang lama. Tapi keduanya merujuk ke bug yang sama.

* * *

## Studi Kasus: B1 — Cross-Tenant Vault Access

Sekarang kita bedah teknik spesifik dari playbook: **menguji apakah Akun A bisa mengakses vault milik Akun B.**

### Kenapa Vault Jadi Target Utama?

Di Fireblocks, "Vault Account" adalah unit penyimpanan aset digital — semacam "rekening" yang menampung alamat wallet, saldo, dan riwayat aktivitas. Setiap organisasi (tenant) punya vault account-nya sendiri, dan secara desain, **tidak boleh ada tenant yang bisa melihat vault tenant lain** — apalagi berinteraksi dengannya.

Kalau endpoint `GET /v1/vault/accounts/{vaultId}` tidak memverifikasi kepemilikan vault terhadap identitas pemanggil API, maka siapa pun yang tahu (atau bisa menebak) ID vault tenant lain bisa membaca datanya.

### Setup yang Dibutuhkan

Teknik ini **mustahil diuji dengan 1 akun saja** — kamu wajib punya dua identitas terpisah untuk membuktikan pelanggaran isolasi tenant:

1.  **Akun A** — akun sandbox milik kamu sendiri, lengkap dengan API key dan JWT signing key sendiri.
2.  **Akun B** — akun sandbox kedua yang benar-benar terpisah (workspace berbeda, kredensial berbeda). Kamu bisa daftar sendiri (kalau program mengizinkan multi-akun untuk testing) atau kadang program bug bounty menyediakan akun test kedua khusus untuk kolaborasi tester.

Ini penting dicatat di laporan nanti: **bukti bug IDOR harus menunjukkan dua identitas berbeda**, bukan cuma "saya coba ID acak dan dapat data" — karena tanpa dua akun, sulit membuktikan itu benar-benar lintas tenant.

### Langkah Praktis

**Langkah 1 — Kumpulkan Vault ID milik Akun B**

Cara paling umum: login sebagai Akun B, buat 1-2 vault account, catat ID-nya (biasanya muncul di response saat create, atau di dashboard Console).

    # Sebagai Akun B, buat vault account baru
    fireblocks vaults create-vault-account --name "Test Vault B" --json
    

Catat `id` dari response ini. Misalnya hasilnya `vaultId: "42"`.

**Langkah 2 — Login sebagai Akun A, coba akses vault milik Akun B**

    curl -X GET https://api.fireblocks.io/v1/vault/accounts/42 \
      -H "X-API-Key: <APIKEY_AKUN_A>" \
      -H "Authorization: Bearer <JWT_SIGNED_BY_AKUN_A>"
    

Perhatikan: yang dipakai adalah **kredensial Akun A**, tapi ID vault yang diminta adalah **milik Akun B**.

**Langkah 3 — Analisis response**

Ada tiga kemungkinan hasil:

Response

Artinya

`403 Forbidden` atau `404 Not Found`

✅ Aman. Backend benar memverifikasi ownership.

`200 OK` dengan data vault B (saldo, address, dst)

🚨 **BUG!** Cross-tenant access berhasil — IDOR confirmed.

`200 OK` tapi data kosong/masked

⚠️ Perlu digali lebih lanjut — bisa jadi partial leak (misalnya nama vault kebaca tapi saldo tidak, tetap layak dilaporkan tergantung sensitivitas).

**Langkah 4 — Perluas cakupan pengujian**

Kalau endpoint `GET` ternyata aman, jangan berhenti di situ. Broken access control sering muncul **tidak konsisten antar endpoint** — satu endpoint aman, endpoint lain yang menyentuh resource serupa bisa lupa dicek. Uji juga varian berikut dengan pola yang sama (kredensial A, ID milik B):

*   `GET /v1/vault/accounts/{vaultId}/{assetId}` — cek saldo per-asset
*   `GET /v1/vault/accounts/{vaultId}/{assetId}/addresses` — daftar address deposit
*   `GET /v1/vault/accounts/{vaultId}/{assetId}/addresses/{addressId}` — detail 1 address
*   `POST /v1/vault/accounts/{vaultId}/{assetId}/addresses` — coba **membuat** address baru di vault B menggunakan sesi A (ini levelnya lebih parah dari sekadar read — kalau berhasil, itu bukan cuma data leak tapi _unauthorized write_)
*   Endpoint listing seperti `GET /v1/vault/accounts` dengan parameter filter yang dimanipulasi (misalnya `?tenantId=`, kalau ada parameter semacam itu yang bisa dioper manual)

Prinsipnya: **setiap endpoint yang menerima ID objek sebagai parameter adalah kandidat pengujian IDOR**, bukan cuma satu endpoint utama.

* * *

## Kenapa Bug Ini Sering Lolos dari Developer?

Ini bagian yang menurut saya paling penting dipahami, bukan cuma dihafal langkahnya.

IDOR sering lolos karena developer secara tidak sadar mencampur dua konsep berbeda:

1.  **Authentication** — "Apakah request ini datang dari user yang valid dan terverifikasi?" (JWT valid, signature cocok, dst)
2.  **Authorization** — "Apakah user yang valid ini _berhak_ mengakses objek spesifik yang diminta?"

Banyak sistem sangat kuat di authentication (signing JWT dengan benar, validasi signature ketat seperti di Fase A playbook) tapi lupa bahwa **lolos authentication tidak otomatis berarti authorized**. Kesalahan tipikal di level kode biasanya terlihat seperti ini (pseudocode, bukan kode Fireblocks asli):

    // RENTAN — tidak cek ownership
    app.get('/v1/vault/accounts/:vaultId', authenticate, (req, res) => {
      const vault = db.findVaultById(req.params.vaultId); // langsung ambil dari ID
      res.json(vault);
    });
    
    // AMAN — cek ownership eksplisit
    app.get('/v1/vault/accounts/:vaultId', authenticate, (req, res) => {
      const vault = db.findVaultById(req.params.vaultId);
      if (vault.tenantId !== req.user.tenantId) {
        return res.status(404).send(); // 404, bukan 403, supaya tidak konfirmasi eksistensi ID
      }
      res.json(vault);
    });
    

Perhatikan detail kecil tapi penting: sistem yang matang sering mengembalikan **404** (bukan 403) untuk resource yang bukan milik user — supaya penyerang bahkan tidak bisa mengonfirmasi apakah ID tersebut eksis di sistem sama sekali (mencegah _enumeration_ tidak langsung).

* * *

## Menyusun Laporan yang Kuat (Supaya Reward Maksimal)

Kualitas laporan sangat memengaruhi severity yang diberikan triager. Untuk bug B1, laporan yang baik idealnya memuat:

**1\. Bukti dua identitas jelas** Screenshot atau log dua API key/JWT berbeda, tunjukkan keduanya benar-benar dua tenant terpisah (bukan dua vault dalam satu akun).

**2\. Request/response lengkap (redacted)**

    Request:
    GET /v1/vault/accounts/42 HTTP/1.1
    Host: api.fireblocks.io
    X-API-Key: [REDACTED - Akun A]
    Authorization: Bearer [REDACTED - JWT Akun A]
    
    Response: 200 OK
    {
      "id": "42",
      "name": "Test Vault B",
      "assets": [...]
    }
    

**3\. Dampak yang jelas dan spesifik** Jangan cuma tulis "data leak". Jelaskan konkret: _"Attacker dengan akun Fireblocks sendiri dapat membaca saldo, alamat deposit, dan metadata vault milik tenant lain tanpa relasi apapun, hanya dengan menebak/mengetahui ID vault numerik yang sequential."_

**4\. Sertakan analisis root cause (kalau bisa)** Kalau kamu menemukan pola ID sequential (lihat teknik B3 di playbook), sebutkan — ini menaikkan severity karena ID jadi mudah ditebak, bukan cuma vulnerable _kalau_ ID bocor.

**5\. Severity (CVSS)** Untuk cross-tenant data exposure di custody platform finansial, biasanya masuk kategori **High**, kadang **Critical** kalau sampai ke write access (misalnya bisa membuat address atau memicu transaksi di vault orang lain). Gunakan CVSS 3.1 vector, misalnya:

    CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:N/A:N
    

(Network attack vector, low complexity, perlu privilege rendah/akun biasa, tanpa interaksi user, scope changed karena lintas tenant, confidentiality impact tinggi)

* * *

## Kesalahan Umum yang Perlu Dihindari

*   **Testing di production/mainnet.** Selalu gunakan Sandbox dan aset test. Ini bukan cuma soal etika, tapi juga soal validitas laporan — banyak program otomatis menolak laporan yang dites di luar environment yang diizinkan.
*   **Menebak ID secara membabi buta tanpa scope jelas.** Kalau kamu mulai brute-force ID tanpa strategi (lihat teknik B3), kamu berisiko kena rate limit atau dianggap melanggar policy "no automated scanning without permission" di beberapa program — selalu cek policy dulu.
*   **Melaporkan tanpa bukti dua tenant.** Laporan "saya coba ID lain dan dapat error berbeda" tanpa bukti itu benar-benar milik entitas lain biasanya akan diminta klarifikasi ulang atau ditolak sebagai _informative_.
*   **Dual submission.** Playbook sudah menekankan ini — jangan laporkan bug yang sama ke HackerOne dan Bugcrowd sekaligus untuk program yang sama.

* * *

## Penutup

IDOR/BOLA kelihatan sederhana di atas kertas — cuma "ganti ID di request" — tapi justru kesederhanaan inilah yang membuatnya begitu sering ditemukan sekaligus begitu berdampak, terutama di custody platform di mana isolasi antar tenant adalah _jantung_ dari kepercayaan pengguna terhadap keamanan dana mereka.

Kalau kamu baru mulai di bug bounty custody/fintech, menguasai pola pikir B1 ini — **selalu tanya "siapa yang seharusnya boleh akses objek ini, dan apakah backend benar-benar mengeceknya?"** — akan jadi modal yang kepakai di hampir semua endpoint yang kamu temui, bukan cuma di Fireblocks.

Di tulisan selanjutnya saya akan bahas B2 (transaction lookup by external ID) dan B3 (sequential ID enumeration) — dua teknik yang sering jalan berdampingan dengan cross-tenant vault access untuk membangun _chain of impact_ yang lebih besar di laporan.

* * *

_Selalu baca policy resmi program bug bounty sebelum mulai testing. Playbook dan tulisan ini adalah metodologi umum, bukan jaminan scope — tanggung jawab ada di masing-masing tester untuk memastikan aktivitasnya sesuai aturan program yang berlaku._