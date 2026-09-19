/**
 * URI konteks JSON-LD yang kita pakai, di satu tempat.
 *
 * Kenapa tidak menyalin URL-nya di tiap modul: urutan `@context` adalah bagian dari tanda tangan
 * (RDFC-2022 memkanonisasi dokumennya), dan salah satu item membuat kredensial kita tidak
 * terbaca verifier. Kalau URI-nya hidup di tiga berkas, perubahan yang benar pun sudah menjadi
 * tiga tempat untuk diingat.
 *
 * ⚠️ Catatan yang sudah dibayar: `https://w3id.org/vc/status-list/2021/v1` TIDAK ada di daftar ini
 * dengan sengaja. Konteks itu mendefinisikan keluarga **StatusList2021**, bukan
 * `BitstringStatusList*`. Istilah Bitstring sudah disediakan oleh konteks W3C `credentials/v2`
 * (dibaca langsung dari berkas aslinya: `BitstringStatusList` membawa `encodedList` +
 * `statusPurpose` + `ttl`; `BitstringStatusListEntry` membawa `statusListCredential` +
 * `statusListIndex` + `statusSize` + `statusMessage` + `statusReference`).
 */

/** VC Data Model 2.0. WAJIB item pertama, menurut §B.1.2. */
export const VC_V2_CONTEXT = 'https://www.w3.org/ns/credentials/v2'

/** Open Badges 3.0. WAJIB item kedua untuk `OpenBadgeCredential`. */
export const OB_V3_CONTEXT = 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'

/** Mendefinisikan `DataIntegrityProof` + istilah `proof`. */
export const DATA_INTEGRITY_V2_CONTEXT = 'https://w3id.org/security/data-integrity/v2'

/** Mendefinisikan `Multikey` / `publicKeyMultibase`. */
export const MULTIKEY_V1_CONTEXT = 'https://w3id.org/security/multikey/v1'

/** @context kredensial OpenBadgeCredential — urutan dua item pertama mengikat. */
export const CREDENTIAL_CONTEXT = [VC_V2_CONTEXT, OB_V3_CONTEXT]
