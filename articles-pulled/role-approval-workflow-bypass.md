---
title: "Role & Approval Workflow Bypass"
slug: "role-approval-workflow-bypass"
labels: ["Autentikasi"]
date: "2026-07-17T06:49:57-07:00"
blogger_id: "7438049067838200142"
content_hash: "5ddf6858e76cd7435302629d9231a06f"
---

_Studi kasus: pengujian sistem multi-approval pada API custody/fintech (mis. Fireblocks dan platform sejenis)_

* * *

## Kenapa Approval Workflow Jadi Target Bernilai Tinggi

Di sistem custody aset digital atau fintech, kontrol akses (role) saja sering tidak cukup banyak aksi sensitif (menambah API user baru, menaikkan privilege, menyetujui transaksi besar) dirancang butuh **persetujuan dari pihak kedua** (dual control / maker-checker / M-of-N approval). Konsepnya sederhana: satu orang mengajukan (maker), orang lain yang berbeda menyetujui (checker), supaya satu akun yang di-compromise saja tidak cukup untuk melakukan aksi berbahaya.

Masalahnya, workflow ini biasanya dibangun **di atas** sistem role-based access control (RBAC) yang sudah ada dan setiap lapisan tambahan adalah lapisan tambahan yang bisa salah diimplementasikan. Approval workflow yang bisa di-bypass artinya **prinsip dual-control gagal total**, dan di custody platform itu setara dengan menghilangkan lapisan pertahanan yang paling penting.

> **Disclaimer penting:** Semua teknik di bawah ini hanya boleh dijalankan pada sistem yang secara eksplisit mengizinkan pengujian keamanan (program bug bounty resmi, environment sandbox milik sendiri, atau aplikasi yang kamu punya izin tertulis untuk mengujinya).

* * *

## 1\. Memetakan Workflow Sebelum Menyerang

Sebelum mencoba bypass apapun, dokumentasikan dulu alur normalnya secara lengkap banyak bug ditemukan justru dari memahami _state machine_\-nya, bukan dari mencoba payload acak.

Pertanyaan yang perlu dijawab lewat eksplorasi manual (pakai 2 akun: admin/approver dan user biasa):

*   Ada berapa role di sistem, dan role mana yang bisa jadi approver?
*   Aksi apa saja yang butuh approval hanya create user baru? Atau juga ubah role, hapus API key, ubah whitelist address?
*   Apakah approver harus **berbeda orang** dari pengaju (maker ≠ checker), atau sistem cuma cek "ada N approval" tanpa peduli siapa?
*   Berapa state yang dilalui request approval? (`PENDING` → `APPROVED` → `ACTIVE`, atau ada state lain seperti `REJECTED`, `EXPIRED`, `CANCELLED`?)
*   Endpoint mana saja yang terlibat di tiap state transition? (biasanya beda endpoint untuk create request vs approve vs execute)

    # Contoh eksplorasi: buat API user baru role rendah, capture SEMUA request
    # yang terjadi dari awal sampai user itu aktif
    
    # Step 1: Create request (role Viewer)
    POST /v1/users
    {"name": "test-viewer", "role": "VIEWER"}
    # -> response biasanya berisi requestId/approvalId dan status PENDING
    
    # Step 2: Approval (dari akun approver terpisah)
    POST /v1/users/approvals/<approvalId>
    {"decision": "APPROVE"}
    

Petakan semua endpoint ini di Burp (gunakan **Site Map** dan tandai/comment tiap request) sebelum mulai eksploitasi.

* * *

## 2\. Serangan #1 — Manipulasi Body Saat Fase Approval

Ini yang paling sering ditemukan: request approval yang **tidak mengunci ulang** data dari request awal, sehingga approver (atau attacker yang mengintersep traffic approval) bisa mengubah isi request di detik terakhir.

### Konsep

Idealnya, approval hanya menjawab "ya/tidak" terhadap request yang **sudah dibuat sebelumnya** — semua detail (role, permission, target) seharusnya dikunci sejak fase create, dan approval endpoint hanya menerima `approvalId` + keputusan (`APPROVE`/`REJECT`), tanpa bisa menyisipkan data baru.

Kalau backend justru membaca ulang field seperti `role` dari body request approval (bukan dari data yang tersimpan di fase create), ini celah privilege escalation.

### Langkah Eksploitasi

    # Step 1: Create API user dengan role RENDAH (agar tidak mencurigakan)
    curl -X POST https://api.fireblocks.io/v1/users \
      -H "Authorization: Bearer <TOKEN_MAKER>" \
      -d '{"name": "test-user", "role": "VIEWER"}'
    # response: {"id": "usr_123", "approvalId": "apr_456", "status": "PENDING"}
    
    # Step 2: Intercept request approval, coba SISIPKAN field role baru di body
    curl -X POST https://api.fireblocks.io/v1/users/approvals/apr_456 \
      -H "Authorization: Bearer <TOKEN_APPROVER>" \
      -d '{"decision": "APPROVE", "role": "SIGNER"}'
    

**Bug jika:** role final user yang aktif = `SIGNER` (privilege escalation dari `VIEWER` ke `SIGNER` tanpa approval eksplisit untuk role tinggi tersebut), bukan `VIEWER` seperti yang di-request awal.

Variasi lain field yang worth dicoba disisipkan di body approval: `permissions`, `vaultAccess`, `expiresAt`, atau field apa pun yang muncul saat kamu eksplorasi endpoint create di langkah 1 — coba semua field itu di endpoint approval juga.

* * *

## 3\. Serangan #2 — Self-Approval / Maker = Checker

### Konsep

Prinsip dasar dual-control adalah pengaju dan penyetuju **harus orang berbeda**. Sistem yang tidak memvalidasi ini dengan benar bisa membiarkan satu akun melakukan create **dan** approve untuk request yang sama.

### Langkah Eksploitasi

    # Semua request pakai token dan akun yang SAMA (bukan 2 akun berbeda)
    
    # Step 1: Create dari Akun A
    curl -X POST https://api.fireblocks.io/v1/users \
      -H "Authorization: Bearer <TOKEN_A>" \
      -d '{"name": "test-self", "role": "SIGNER"}'
    # response: {"approvalId": "apr_789"}
    
    # Step 2: Approve JUGA dari Akun A (akun yang sama persis)
    curl -X POST https://api.fireblocks.io/v1/users/approvals/apr_789 \
      -H "Authorization: Bearer <TOKEN_A>" \
      -d '{"decision": "APPROVE"}'
    

**Bug jika:** approval berhasil diproses meski maker dan checker adalah identitas yang sama. Uji juga variasi: dua sesi token berbeda tapi merujuk user yang sama, atau dua API key berbeda yang terdaftar di bawah user yang sama.

* * *

## 4\. Serangan #3 — Approval dari Akun yang Bukan Approver Resmi

### Konsep

Bahkan kalau maker ≠ checker sudah dicek, pertanyaan berikutnya: **apakah checker itu benar-benar punya wewenang approve?** Kadang backend cuma mengecek "user ini valid dan terautentikasi", tanpa mengecek apakah role user tersebut memang termasuk daftar approver yang sah untuk tipe request ini.

### Langkah Eksploitasi

    # Step 1: Create request dari akun Maker
    curl -X POST https://api.fireblocks.io/v1/users \
      -H "Authorization: Bearer <TOKEN_MAKER>" \
      -d '{"name": "test-user", "role": "SIGNER"}'
    # response: {"approvalId": "apr_999"}
    
    # Step 2: Approve dari akun role RENDAH yang BUKAN approver resmi
    curl -X POST https://api.fireblocks.io/v1/users/approvals/apr_999 \
      -H "Authorization: Bearer <TOKEN_VIEWER_BUKAN_APPROVER>" \
      -d '{"decision": "APPROVE"}'
    

**Bug jika:** approval berhasil diproses meski token yang dipakai adalah milik role `VIEWER` yang seharusnya tidak punya wewenang approve sama sekali. Ini bisa berarti endpoint approval hanya mengecek "apakah request terautentikasi", bukan "apakah user ini authorized untuk approve tipe permintaan ini" — kesalahan klasik **authentication vs authorization**.

Cek juga apakah endpoint approval memvalidasi **IDOR** — coba `approvalId` milik tenant/organisasi lain untuk memastikan cross-tenant approval tidak mungkin (lihat artikel IDOR untuk metodologi lengkap).

* * *

## 5\. Serangan #4 — Race Condition pada Approval Ganda

### Konsep

Kalau sistem butuh N approval (misal 2-of-3) sebelum request dieksekusi, cek apakah pengecekan jumlah approval **atomik**. Kalau tidak, mengirim beberapa approval secara paralel bisa membuat request tereksekusi meski approval yang sah belum cukup — atau sebaliknya, satu approval bisa "dihitung dua kali" kalau endpoint yang sama dipanggil berulang secara paralel.

    # Kirim SATU approval yang sama secara paralel berkali-kali,
    # untuk cek apakah backend menghitungnya sebagai N approval berbeda
    
    for i in {1..5}; do
      curl -X POST https://api.fireblocks.io/v1/users/approvals/apr_999 \
        -H "Authorization: Bearer <TOKEN_APPROVER>" \
        -d '{"decision": "APPROVE"}' &
    done
    wait
    

**Bug jika:** sistem butuh 2-of-3 approval, tapi dengan mengirim approval yang sama secara paralel dari satu approver, request langsung tereksekusi seolah sudah dapat 2 approval berbeda (padahal cuma 1 approver, dikirim berkali-kali dalam waktu bersamaan).

Ini varian dari race condition (TOCTOU) yang sama seperti dibahas di artikel replay attack — pengecekan "sudah berapa approval masuk" dan pencatatan approval baru harus atomik, atau celah waktu di antara keduanya bisa dieksploitasi.

* * *

## 6\. Serangan #5 — State Transition yang Tidak Sah

### Konsep

Cek apakah request approval bisa dipaksa berpindah state di luar alur normal — misalnya dari `REJECTED` langsung ke `APPROVED`, atau dari `EXPIRED` tetap bisa di-approve.

    # Step 1: Reject request
    curl -X POST https://api.fireblocks.io/v1/users/approvals/apr_111 \
      -H "Authorization: Bearer <TOKEN_APPROVER_1>" \
      -d '{"decision": "REJECT"}'
    
    # Step 2: Coba approve request yang SUDAH di-reject
    curl -X POST https://api.fireblocks.io/v1/users/approvals/apr_111 \
      -H "Authorization: Bearer <TOKEN_APPROVER_2>" \
      -d '{"decision": "APPROVE"}'
    

**Bug jika:** request yang sudah `REJECTED` masih bisa diubah jadi `APPROVED` di kemudian hari. Uji juga:

*   Approve request yang sudah lama expired (kalau ada mekanisme expiry).
*   Approve request yang **targetnya sudah tidak ada** (user yang mau di-approve sudah dihapus duluan lewat endpoint lain) — cek apakah ini menyebabkan state tidak konsisten (approval "berhasil" tapi tidak ada efek, atau malah error yang membocorkan informasi internal).
*   Kirim `decision` dengan nilai di luar enum yang diharapkan (`"decision": "MAYBE"`, `"decision": "approved"` lowercase, `"decision": true`) — cek apakah validasi enum ketat atau ada default behavior yang tidak terduga.

* * *

## 7\. Serangan #6 — Bypass Total via Endpoint Alternatif

Cek apakah ada endpoint lain (versi API lama, endpoint internal yang bocor dari dokumentasi/CLI, atau endpoint admin) yang bisa melakukan aksi yang sama **tanpa melalui approval workflow sama sekali**.

    # Kalau endpoint resmi untuk create user butuh approval:
    POST /v1/users
    
    # Cek apakah ada endpoint versi lama atau internal yang skip approval:
    POST /v2/users
    POST /internal/users
    PATCH /v1/users/<id>          # update langsung tanpa lewat approval flow?
    PUT /v1/users/<id>/role       # endpoint terpisah untuk ubah role saja?
    

Teknik pencarian endpoint tersembunyi ini bisa dibantu dengan:

*   Baca dokumentasi API versi lama (kadang masih ter-index atau ter-cache).
*   Decompile/baca source CLI atau SDK resmi — endpoint yang dipanggil CLI kadang beda dari yang didokumentasikan publik untuk web dashboard.
*   Directory/endpoint fuzzing terbatas pada scope yang diizinkan (mis. `ffuf` dengan wordlist API umum), **hanya kalau program bug bounty mengizinkan fuzzing**.

* * *

## 8\. Metodologi Testing Ringkas

#

Test

Yang Dicari

1

Sisipkan field baru (`role`, `permissions`, dll) di body approval

Approval endpoint membaca data baru, bukan data yang dikunci sejak create

2

Maker = Checker (approve pakai akun/token yang sama)

Dual-control tidak benar-benar dicek

3

Approve pakai akun role rendah / bukan approver resmi

Authorization check hilang di endpoint approval

4

Approval paralel dari 1 approver yang sama

Race condition pada penghitungan jumlah approval

5

Approve request yang sudah `REJECTED`/`EXPIRED`

State machine tidak divalidasi ketat

6

Approve `approvalId` milik tenant lain (IDOR)

Cross-tenant approval bypass

7

Cari endpoint alternatif yang skip approval sama sekali

Inconsistent enforcement antar endpoint/versi API

Selalu verifikasi dampak akhir secara nyata — cek role/privilege final user, bukan cuma percaya response `200 OK` dari request approval itu sendiri.

* * *

## 9\. Sisi Defensif — Cara Backend Mengimplementasikan Approval Workflow yang Aman

1.  **Kunci semua detail request sejak fase create.** Endpoint approval hanya menerima `approvalId` + `decision`, tidak pernah membaca ulang field bisnis dari body approval.
2.  **Validasi maker ≠ checker secara eksplisit di level identitas user**, bukan cuma level token/sesi (dua sesi berbeda dari user yang sama tetap harus dianggap "orang yang sama").
3.  **Validasi role/permission approver di setiap approval endpoint**, jangan cuma mengandalkan otentikasi umum.
4.  **State machine yang ketat**: definisikan transisi state yang valid secara eksplisit (`PENDING → APPROVED`, `PENDING → REJECTED`), tolak semua transisi lain termasuk dari state final (`REJECTED`, `EXPIRED`) kembali ke `APPROVED`.
5.  **Atomic counting untuk M-of-N approval** — gunakan constraint unik di database (`UNIQUE(approvalId, approverId)`) supaya satu approver tidak bisa dihitung berkali-kali meski request approval-nya dikirim paralel.
6.  **Audit log lengkap** untuk setiap create/approve/reject, termasuk siapa, kapan, dan dari IP mana — ini juga membantu deteksi kalau ada percobaan bypass.
7.  **Konsistensi enforcement di semua versi/endpoint** — kalau ada endpoint alternatif untuk aksi yang sama, pastikan approval requirement diterapkan di semua jalur, bukan hanya jalur "utama" yang didokumentasikan.

* * *

## 10\. Menulis Laporan yang Baik

    Judul: Privilege escalation via role injection pada endpoint approval user
    
    Ringkasan: Endpoint POST /v1/users/approvals/{id} menerima field "role" di body 
    request, yang di-overwrite ke role user yang di-approve — memungkinkan approver 
    (atau siapa pun yang bisa memanipulasi request approval) menaikkan privilege 
    user melebihi apa yang diajukan di fase create.
    
    Langkah Reproduksi:
    1. Buat API user baru dengan role VIEWER via POST /v1/users
    2. Capture approvalId dari response
    3. Kirim approval dengan body tambahan {"decision":"APPROVE","role":"SIGNER"}
    4. Verifikasi role final user via GET /v1/users/{id} -> role = SIGNER, 
       bukan VIEWER seperti yang diajukan awal
    
    Dampak: Privilege escalation di luar workflow persetujuan yang dimaksudkan, 
    berpotensi membuat approver (atau attacker yang mengintersep traffic approval) 
    memberikan wewenang tinggi (signer/admin) tanpa persetujuan eksplisit untuk itu.
    
    Severity: High/Critical (CVSS 8.8) — AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N
    
    Saran Perbaikan: Endpoint approval hanya boleh menerima approvalId + decision; 
    semua detail request (role, permission) harus dikunci dan dibaca dari data 
    tersimpan sejak fase create, bukan dari body approval.
    

* * *

## Penutup

Approval workflow adalah lapisan pertahanan yang _seharusnya_ jadi jaring pengaman terakhir — tapi justru karena itu, developer sering terlalu percaya diri bahwa "sudah ada approval, jadi aman", tanpa memvalidasi setiap detail implementasinya: siapa yang boleh approve, data apa yang dikunci, dan bagaimana state berpindah. Bug di lapisan ini biasanya bernilai tinggi karena dampaknya langsung ke jantung model keamanan sistem (dual-control), bukan sekadar satu endpoint yang bocor data.

Uji selalu dengan minimal 2 akun/role berbeda di sandbox, dokumentasikan state machine secara lengkap sebelum eksploitasi, dan laporkan lewat platform resmi program.

* * *

_Referensi lanjutan: OWASP API Security Top 10 (API1:2023 Broken Object Level Authorization, API5:2023 Broken Function Level Authorization), NIST SP 800-53 (separation of duties / dual control controls)._