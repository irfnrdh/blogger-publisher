---
title: "JWT Signature Tampering "
slug: "jwt-signature-tampering"
labels: ["Autentikasi","JWT Signing"]
date: "2026-07-17T06:18:55-07:00"
blogger_id: "1239939421440890398"
content_hash: "c72b7171b11b855a1f470527fc4ba1fe"
---

_Studi kasus: pengujian autentikasi API berbasis JWT (mis. Fireblocks dan platform fintech/custody sejenis)_

* * *

## Kenapa Signature Tampering Masih Jadi "Low Hanging Fruit" di 2026

JSON Web Token (JWT) dipakai hampir di mana-mana: API custody aset digital, dashboard fintech, sistem approval multi-role, sampai webhook internal. Ironisnya, meskipun standar JWT (RFC 7519) sudah berumur lebih dari satu dekade, kesalahan implementasi validasi signature **masih** jadi salah satu bug class paling sering ditemukan di program bug bounty — terutama di API yang dibangun cepat dengan banyak library berbeda di tiap layer (API gateway, backend service, webhook consumer).

Artikel ini membahas _signature tampering_ secara teknis: apa yang sebenarnya divalidasi, kenapa validasinya bisa gagal, dan bagaimana menguji secara sistematis — lengkap dengan contoh request, payload, dan cara membaca hasilnya.

> **Disclaimer penting:** Semua teknik di bawah ini hanya boleh dijalankan pada sistem yang secara eksplisit mengizinkan pengujian keamanan (program bug bounty resmi, environment sandbox milik sendiri, atau aplikasi yang kamu punya izin tertulis untuk mengujinya). Menjalankan ini terhadap sistem produksi orang lain tanpa izin adalah tindakan ilegal di hampir semua yurisdiksi.

* * *

## 1\. Anatomi JWT — Apa Sebenarnya yang "Ditandatangani"

JWT terdiri dari tiga bagian yang dipisahkan titik:

    eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsInJvbGUiOiJ2aWV3ZXIifQ.SGVsbG8...
    └────────── HEADER ──────────┘└──────────── PAYLOAD ────────────┘└── SIGNATURE ──┘
    

*   **Header** — berisi `alg` (algoritma signing, mis. `RS256`, `HS256`) dan `typ`.
*   **Payload** — klaim (claims): `sub`, `role`, `exp`, `iat`, kadang data bisnis seperti `vaultId` atau `permissions`.
*   **Signature** — hasil signing dari `base64url(header) + "." + base64url(payload)` menggunakan algoritma yang disebut di header.

Poin krusial yang sering dilewatkan tim developer: **`alg` di header adalah input yang dikontrol penuh oleh client**, karena header ikut dikirim sebagai bagian dari token. Server _seharusnya_ menolak algoritma yang tidak diharapkan, tapi banyak library JWT lama (terutama versi awal di Node.js dan Python) justru mempercayai nilai `alg` dari token itu sendiri untuk menentukan cara verifikasi. Di sinilah pintu masuk serangan.

* * *

## 2\. Serangan #1 — `alg: none`

### Konsep

Spesifikasi JWT/JWA (RFC 7518) mendefinisikan algoritma `none`, yang artinya _token tidak ditandatangani sama sekali_. Ini awalnya dirancang untuk kasus token yang integritasnya dijamin lewat kanal lain (mis. dikirim lewat TLS mutual-auth). Masalahnya: kalau backend tidak secara eksplisit **memblokir** `alg: none` di whitelist algoritma yang diizinkan, attacker bisa membuat token "valid" tanpa signature apapun.

### Langkah Eksploitasi

1.  Ambil JWT valid dari request yang sudah ter-intercept (misal lewat Burp Suite).
2.  Decode header dan payload (base64url, bukan base64 biasa — perhatikan padding).
3.  Ubah `alg` di header jadi `none`.
4.  Ubah payload sesuka hati (misal `"role": "viewer"` → `"role": "admin"`, atau `"sub": "user-A"` → `"sub": "user-B"`).
5.  Re-encode header dan payload, lalu **kosongkan bagian signature** (atau isi dengan string kosong, tergantung implementasi yang ditarget).
6.  Kirim ulang token ke endpoint yang sama.

Contoh manual pakai Python:

    import base64, json
    
    def b64url_encode(data: dict) -> str:
        raw = json.dumps(data, separators=(",", ":")).encode()
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()
    
    header = {"alg": "none", "typ": "JWT"}
    payload = {"sub": "user-123", "role": "admin", "exp": 9999999999}
    
    token = f"{b64url_encode(header)}.{b64url_encode(payload)}."
    print(token)
    

Perhatikan token di atas **diakhiri titik tanpa signature**. Beberapa implementasi lemah menerima ini apa adanya; beberapa lainnya butuh varian penulisan `alg` seperti `None`, `NONE`, atau `nOnE` karena parsing case-sensitive yang tidak konsisten — ini worth dicoba semua variannya saat testing.

### Cara Cepat Pakai Tool

`jwt_tool` (Python) mengotomasi ini:

    pip install jwt_tool
    python3 jwt_tool.py <TOKEN_ASLI> -X a   # mode 'alg:none' attack otomatis
    

Burp Suite juga punya extension **JSON Web Tokens** (BApp Store) yang menambahkan tab khusus untuk decode/edit/re-sign JWT langsung dari Repeater.

### Cara Membaca Hasil

Response

Artinya

`401` / `403` dengan pesan "invalid algorithm"

Server memvalidasi whitelist alg dengan benar → aman

`200` dengan data sesuai payload yang dimodifikasi

**Bug confirmed** — bypass autentikasi/otorisasi penuh

`500` internal error

Kadang menandakan library crash saat parsing `alg: none`, worth digali lebih lanjut (bisa jadi indikasi behavior berbeda di code path lain)

* * *

## 3\. Serangan #2 — Algorithm Confusion: RS256 → HS256

Ini varian yang secara teknis lebih menarik dan sering ditemukan di API yang menggunakan **asymmetric signing** (RS256, ES256) untuk JWT-nya.

### Konsep

Pada RS256, server:

*   Sign token pakai **private key**.
*   Verifikasi token pakai **public key**.

Public key ini, sesuai namanya, memang publik — sering ter-expose di endpoint `/.well-known/jwks.json`, di dokumentasi API, atau bahkan hardcoded di SDK/CLI client (seperti pada kasus Fireblocks yang pakai keypair RSA untuk request signing).

Masalahnya muncul kalau library verifikasi JWT di backend menggunakan fungsi verify **generik** yang menerima `alg` dari header token untuk menentukan cara verifikasi, seperti ini (pseudocode yang merepresentasikan bug nyata di banyak library lama):

    function verify(token, key) {
      const alg = decodeHeader(token).alg;
      if (alg === "HS256") return hmacVerify(token, key);
      if (alg === "RS256") return rsaVerify(token, key);
    }
    

Kalau `key` yang di-pass sama untuk kedua alur (yaitu **public key RSA** dikirim sebagai `key`), dan attacker mengubah `alg` di header token jadi `HS256`, maka:

*   Server akan menjalankan `hmacVerify(token, publicKeyRSA)`.
*   HMAC secret yang dipakai server = **public key RSA** (yang attacker juga punya).
*   Attacker bisa **membuat signature HMAC yang sah** karena dia tahu "secret"-nya (public key itu sendiri).

### Langkah Eksploitasi

1.  Dapatkan public key RSA server (JWKS endpoint, sertifikat TLS jika reuse, dokumentasi, atau file konfigurasi SDK/CLI).
2.  Normalisasi format public key — biasanya perlu format PEM persis seperti yang dipakai server (termasuk line ending, BEGIN/END header, ada/tidaknya newline di akhir).
3.  Susun ulang JWT dengan header `alg: HS256`, payload sesuai keinginan (privilege escalation, ganti `sub`, dsb).
4.  Sign token menggunakan algoritma HMAC-SHA256 dengan **public key sebagai secret HMAC**.

Contoh Python (pakai library `PyJWT`):

    import jwt
    
    public_key_pem = open("fireblocks_public.pem", "rb").read()
    
    payload = {
        "sub": "attacker-controlled",
        "role": "admin",
        "exp": 9999999999
    }
    
    # Sign pakai algoritma HS256, tapi "secret"-nya adalah public key RSA
    forged_token = jwt.encode(payload, public_key_pem, algorithm="HS256")
    print(forged_token)
    

Lalu kirim `forged_token` sebagai `Authorization: Bearer <forged_token>` ke endpoint target.

### Kenapa Ini Severity Tinggi

Kalau berhasil, ini bukan sekadar bypass satu endpoint — ini artinya attacker bisa **memalsukan token untuk identitas siapa saja**, termasuk role admin/approver, tanpa pernah punya private key asli. Di konteks platform custody aset digital (contoh: API Fireblocks di playbook bug bounty), dampaknya bisa sampai ke pemalsuan approval transaksi finansial — kategori Critical secara CVSS.

### Cara Membaca Hasil

Kalau server menolak dengan pesan generik ("invalid signature") atau error parsing key, itu indikasi bagus (algoritma di-whitelist secara ketat). Kalau server justru memproses token dan mengembalikan data/aksi sesuai payload palsu, itu **confirmed algorithm confusion vulnerability**.

* * *

## 4\. Serangan #3 — Signature Stripping / Header Kosong

Varian paling sederhana, sering diabaikan karena terlihat "terlalu gampang untuk jadi bug":

    # Request normal
    Authorization: Bearer eyJhbGc...HEADER.eyJzdWI...PAYLOAD.SIGNATURE_ASLI
    
    # Test 1: hapus signature, sisakan titik terakhir
    Authorization: Bearer eyJhbGc...HEADER.eyJzdWI...PAYLOAD.
    
    # Test 2: hapus header signature sepenuhnya (header custom, bukan Bearer JWT standar)
    # hapus header X-Signature atau sejenis kalau ada skema custom
    

Beberapa framework/middleware custom (yang tidak pakai library JWT standar, melainkan implementasi manual untuk kebutuhan spesifik seperti signing request API dengan RSA — mirip skema Fireblocks) kadang punya bug di mana:

*   Fungsi split token pakai `split(".")` dan mengasumsikan selalu ada 3 bagian, tapi kalau signature kosong, code jalan terus ke pengecekan payload tanpa pernah memanggil fungsi verifikasi signature-nya (logic error, bukan crypto error).

* * *

## 5\. Metodologi Testing Sistematis

Supaya tidak asal coba-coba, gunakan urutan sistematis ini saat menguji endpoint yang pakai JWT/signature-based auth:

**Langkah 1 — Baseline.** Capture request valid, pastikan paham struktur penuh: header, payload, signature, dan endpoint mana yang butuh token ini.

**Langkah 2 — Matriks manipulasi.** Uji satu per satu, jangan digabung (supaya jelas variabel mana yang jadi penyebab):

#

Modifikasi

Hipotesis Bug

1

`alg: none` (berbagai casing)

Alg whitelist tidak ketat

2

`alg: RS256` → `HS256` + public key sebagai HMAC secret

Algorithm confusion

3

Signature dikosongkan

Signature check ter-skip di code path tertentu

4

1 karakter signature diubah

Baseline sanity check — harus selalu gagal

5

Header signature dihapus total (bukan hanya isinya)

Middleware tidak mewajibkan header

6

Payload diubah tanpa update signature

Baseline sanity check

7

`kid` (key ID) di header diubah ke path lain (mis. `../../../dev/null` atau referensi ke key attacker)

**JWK/`kid` injection** — vektor lanjutan, lihat bagian 6

**Langkah 3 — Dokumentasi respons.** Catat status code, response body, dan response time untuk tiap kasus. Response time yang beda signifikan kadang mengindikasikan code path yang berbeda meski status code sama (worth digali untuk timing-based inference).

**Langkah 4 — Konfirmasi dampak nyata.** Signature bypass baru bernilai laporan kalau kamu bisa tunjukkan **dampak konkret**: baca data user lain, eksekusi aksi privileged, atau bypass approval workflow. Laporan "saya bisa mengubah `alg` jadi `none`" tanpa bukti dampak biasanya di-downgrade severity-nya oleh triager.

* * *

## 6\. Vektor Lanjutan yang Sering Terlewat: `kid` Injection

Selain `alg`, header JWT juga sering punya field `kid` (Key ID) yang memberi tahu server "pakai key mana untuk verifikasi ini". Kalau server mengambil key berdasarkan nilai `kid` dari token tanpa validasi ketat, ini bisa dieksploitasi:

*   **Path traversal via `kid`**: `"kid": "../../../../dev/null"` — kalau server membaca file sebagai key dari path ini, `/dev/null` dibaca sebagai string kosong, yang bisa membuat HMAC dengan secret kosong jadi valid.
*   **SQL Injection via `kid`**: kalau `kid` dipakai untuk query database (`SELECT key FROM keys WHERE id = '<kid>'`), ini vektor SQLi.
*   **SSRF via `kid`**: kalau `kid` berupa URL (skema `jku`/`x5u` di JWT header juga rawan ini) yang di-fetch server untuk ambil public key, attacker bisa arahkan ke server sendiri dan sign token dengan key buatan sendiri.

Field `jku` dan `x5u` (URL ke JWKS atau sertifikat X.509) adalah target favorit untuk SSRF dan key confusion gabungan — kalau target pakai field ini, prioritaskan untuk diuji.

* * *

## 7\. Sisi Defensif — Cara Backend Menghindari Semua Ini

Kalau kamu di sisi developer/reviewer (atau ingin menulis rekomendasi remediation di laporan bug bounty untuk menaikkan reward):

1.  **Whitelist algoritma secara eksplisit**, jangan percaya `alg` dari token. Contoh benar di PyJWT:
    
        jwt.decode(token, key, algorithms=["RS256"])  # bukan algorithms=None atau baca dari token
        
    
2.  **Pisahkan key untuk signing asymmetric dan symmetric** — jangan pernah pakai satu variabel key yang bisa dipakai untuk RSA maupun HMAC.
3.  **Validasi `kid` terhadap whitelist key yang dikenal**, jangan resolve path/URL/query secara dinamis dari input token.
4.  **Selalu cek `exp`, `nbf`, `iat`**, dan idealnya `jti` + server-side revocation list untuk mencegah replay.
5.  **Gunakan library JWT yang aktif di-maintain** dan update rutin — banyak CVE algorithm confusion sudah dipatch di versi library terbaru (`jsonwebtoken` Node.js sempat kena CVE terkait ini di versi lama, begitu juga beberapa library Java/PHP).

* * *

## 8\. Menulis Laporan yang Baik

Triager bug bounty menilai severity dari **dampak yang bisa dibuktikan**, bukan dari kerennya teknik. Struktur laporan yang efektif:

    Judul: Algorithm Confusion (RS256->HS256) memungkinkan pemalsuan JWT arbitrary user
    
    Ringkasan: Endpoint /v1/vault/accounts menerima JWT dengan alg diubah jadi HS256, 
    di mana public key RSA yang ter-expose di endpoint JWKS dipakai sebagai HMAC secret,
    memungkinkan pemalsuan token untuk identitas user manapun.
    
    Langkah Reproduksi:
    1. Ambil public key dari https://.../.well-known/jwks.json
    2. Buat token HS256 dengan payload {"sub": "victim-user-id", ...} 
       menggunakan public key sebagai secret
    3. Kirim sebagai Authorization: Bearer <token>
    4. Response 200 mengembalikan data milik victim-user-id
    
    Dampak: Full account takeover, akses lintas tenant ke data finansial.
    
    Severity: Critical (CVSS 9.8) — AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H
    

Sertakan request/response asli (redact key/secret sensitif), dan kalau memungkinkan sertakan proof-of-concept script yang reproducible.

* * *

## Penutup

Signature tampering bertahan sebagai bug class populer bukan karena tekniknya rumit, tapi karena **implementasi yang mempercayai input yang seharusnya tidak dipercaya** — dan itu pola yang berulang di banyak sistem berbeda. Untuk pentester/bug hunter, kuncinya adalah disiplin menguji setiap variasi secara sistematis dan selalu membuktikan dampak nyata, bukan sekadar anomali response code.

Selalu ingat: uji hanya di scope yang diizinkan, sandbox bukan production, dan laporkan secara bertanggung jawab lewat platform resmi program (HackerOne/Bugcrowd/dsb).

* * *

_Referensi lanjutan: RFC 7519 (JWT), RFC 7518 (JWA), OWASP JSON Web Token Cheat Sheet, dokumentasi `jwt_tool` dan Burp Suite JWT extension._