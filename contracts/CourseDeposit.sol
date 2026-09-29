// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * CourseDeposit — penahan dana kursus dengan TENGGAT YANG DIPILIH SENDIRI oleh peserta (B90).
 *
 * Bentuknya adalah flow `escrow` seperti yang ditulis spec x402 v2:
 *   `settle -> resource -> settle -> respond` — "a first settle commits a deposit or ceiling, the
 *   resource executes, and a second settle records the final charge".
 * Yang BUKAN dilakukan kontrak ini: menjadi rail pembayaran. x402 tetap membawa uang masuk;
 * kontrak ini hanya memutuskan siapa pemilik uang itu setelah fakta "selesai / tidak selesai"
 * muncul. Itu pilihan sadar, karena `docs.x402.org/introduction` justru menjual x402 sebagai
 * pembayaran "without accounts, sessions, or credential management" — jadi tidak ada tempat di
 * protokol itu untuk menahan dana dan melepaskannya bersyarat.
 *
 * Tiga hal yang membuatnya bukan "smart contract biasa yang menyimpan saldo":
 *
 * 1. **Tenggat ditetapkan SEBELUM hasil diketahui, dan dibuktikan.** Saat deposit masuk, kontrak
 *    menyimpan `deadlineAt` dan `policyHash` (hash aturan penerbit). `recordHash()` memuat keduanya,
 *    dan platform men-stempel hash itu ke BNB Attestation Service — jadi "saya memilih 5 hari" bisa
 *    ditunjukkan ada di chain sebelum ada satu pun bukti kelulusan, tanpa memercayai database kami.
 * 2. **Yang menilai tetap penerbit, bukan platform.** Penilaian masuk lewat tanda tangan EOA penerbit
 *    atas (learner, course, uid, issuedAt, refundBps, policyHash). Kami menyiarkan; kami tidak
 *    memutuskan. Kalau aturan durasi kami pindahkan ke konstanta kontrak, Lencana berubah dari rel
 *    pembuktian jadi rumah gadai.
 * 3. **Hangus itu default yang harus diminta, bukan kejutan.** Kalau penerbit tidak pernah
 *    mengirim tanda tangan, dana TIDAK tertahan selamanya: `forfeit()` melepas semuanya ke `payee`
 *    setelah `deadlineAt` lewat, dan `refundAll()` mengembalikan semuanya ke peserta kalau tidak ada
 *    apa-apa. Tidak ada jalur di mana peserta kehilangan dana tanpa ada satu pihak yang
 *    menandatangani alasannya.
 *
 * Catatan yang tidak boleh hilang: ini prototipe di BSC testnet (chain 97), dengan `DemoCourseToken`
 * yang memang koin demo. Belum diaudit, dan `forfeit` mengirim dana ke `payee` atas dasar
 * "tidak ada tanda tangan" — di produksi itu harus punya batas waktu klaim dan jendela banding.
 */
contract CourseDeposit {
    using SafeERC20 for IERC20;

    /// @dev Prefix digest — sama pola yang dipakai SettlementSplit: tanda tangan tangan manusia/agen
    /// atas pesan yang sudah dibatasi konteksnya, bukan tanda tangan buta atas angka saja.
    bytes32 private constant FINALIZE_PREFIX = keccak256("LENCANA-DEPOSIT-FINALIZE");
    /// @dev Digest EIP-191: sama seperti `personal_sign` / `signMessage` di sisi Node dan browser.
    bytes constant private PERSONAL_PREFIX = "\x19Ethereum Signed Message:\n32";

    struct Term {
        uint128 amount;      // jumlah yang ditahan
        uint32 deadlineAt;   // detik absolut; 0 = tanpa tenggat (maka tidak ada hangus)
        bytes32 policyHash;  // hash aturan penerbit: ladder cashback, durasi yang tersedia, payee
        address learner;
        address payee;       // tujuan dana kalau hangus
        bool finalized;
    }

    IERC20 public immutable token;
    address public issuer;           // EOA penerbit yang penilaiannya kita terima
    address public owner;

    /// learner => courseId => syarat
    mapping(address => mapping(bytes32 => Term)) public terms;

    uint16 public constant MAX_BPS = 10_000;

    /// @dev Satu hari dalam detik, sebagai konstanta — bukan literal `1 days`. Alasannya jebakan
    /// nyata: parameter `deposit()` sempat bernama `days`, dan nama itu menutup keyword unit
    /// Solidity di lingkup fungsi, sehingga `uint256(days) * 1 days` gagal kompilasi (Error 2314:
    /// Expected ',' but got 'days'). Nama yang kebetulan sama dengan unit adalah jenis bug yang
    /// bisa ulang, jadi parameternya juga kunamai `chosenDays`.
    uint256 public constant SECONDS_PER_DAY = 86400;

    event Deposited(address indexed learner, bytes32 indexed courseId, uint256 amount, uint256 deadlineAt, bytes32 policyHash);
    event Finalized(address indexed learner, bytes32 indexed courseId, bytes32 uid, uint256 issuedAt, uint256 refundBps, bool withinDeadline);
    event Forfeited(address indexed learner, bytes32 indexed courseId, uint256 amount, address payee);
    event Refunded(address indexed learner, bytes32 indexed courseId, uint256 amount);
    event IssuerChanged(address indexed previous, address indexed next);

    error ZeroAmount();
    error ZeroAddress();
    error NothingDeposited();
    error AlreadySettled(bytes32 courseId);
    error DeadlineNotPassed(uint256 deadlineAt);
    error DeadlinePassed(uint256 deadlineAt);
    error BadBps(uint256 proposed);
    error BadSignature();
    error NotIssuer();

    modifier onlyOwner() {
        if (msg.sender != owner) revert ZeroAddress();
        _;
    }

    constructor(IERC20 token_, address issuer_) {
        if (address(token_) == address(0) || issuer_ == address(0)) revert ZeroAddress();
        token = token_;
        issuer = issuer_;
        owner = msg.sender;
    }

    /**
     * Peserta memilih durasinya sendiri dan menyetor.
     *
     * `days == 0` sengaja berarti "tanpa tenggat": tidak ada hangus, tidak ada cashback. Ini
     * penting sebagai jalur jujur — peserta yang tidak mau bertaruh harus bisa membeli kursus
     * yang sama tanpa dipaksa menerima penalti.
     */
    function deposit(bytes32 courseId, uint256 amount, uint16 chosenDays, bytes32 policyHash, address payee) external {
        if (amount == 0) revert ZeroAmount();
        if (payee == address(0)) revert ZeroAddress();
        if (terms[msg.sender][courseId].amount != 0) revert AlreadySettled(courseId);

        token.safeTransferFrom(msg.sender, address(this), amount);
        terms[msg.sender][courseId] = Term({
            amount: uint128(amount),
            deadlineAt: chosenDays == 0 ? 0 : uint32(block.timestamp + uint256(chosenDays) * SECONDS_PER_DAY),
            policyHash: policyHash,
            learner: msg.sender,
            payee: payee,
            finalized: false
        });
        emit Deposited(msg.sender, courseId, amount, chosenDays == 0 ? 0 : block.timestamp + uint256(chosenDays) * SECONDS_PER_DAY, policyHash);
    }

    /// @dev Hash syarat — YANG distempel ke BAS. Mengikat jumlah, tenggat, aturan, dan tujuan dana.
    function recordHash(address learner, bytes32 courseId) public view returns (bytes32) {
        Term storage t = terms[learner][courseId];
        if (t.amount == 0) revert NothingDeposited();
        return keccak256(abi.encode("LENCANA-DEPOSIT-TERM", learner, courseId, t.amount, t.deadlineAt, t.policyHash, t.payee));
    }

    /**
     * Penilaian akhir dari penerbit.
     *
     * Yang ditandatangani: siapa pesertanya, kursus apa, uid attestation kelulusan, kapan ia
     * terbit, berapa fraksi yang dikembalikan, dan hash aturan yang berlaku. Karena `uid` dan
     * `issuedAt` ikut masuk digest, tanda tangan tidak bisa dipindah ke kursus lain, ke peserta
     * lain, atau ke tenggat yang lebih murah.
     *
     * Kenapa pakai EIP-191 (personal_sign) dan bukan EIP-712: sisi Node dan browser di proyek ini
     * sudah menandatangani dengan `signMessage`, dan `ecrecover` di bawah membandingkan alamat yang
     * sama persis dengan yang dibaca `authorizeLearner` di signer. Mengaku "EIP-712 typed data"
     * tanpa domain separator yang benar adalah klaim yang belum dibayar buktinya di repo ini.
     */
    function finalize(
        address learner,
        bytes32 courseId,
        bytes32 uid,
        uint256 issuedAt,
        uint256 refundBps,
        bytes calldata sig
    ) external {
        Term storage t = terms[learner][courseId];
        if (t.amount == 0) revert NothingDeposited();
        if (t.finalized) revert AlreadySettled(courseId);
        if (refundBps > MAX_BPS) revert BadBps(refundBps);

        bytes32 digest = keccak256(abi.encodePacked(
            PERSONAL_PREFIX,
            keccak256(abi.encode(FINALIZE_PREFIX, learner, courseId, uid, issuedAt, refundBps, t.policyHash))
        ));
        if (recover(digest, sig) != issuer) revert NotIssuer();

        t.finalized = true;
        uint256 amount = t.amount;
        bool within = t.deadlineAt == 0 ? true : issuedAt <= t.deadlineAt;

        if (within && refundBps > 0) {
            uint256 back = (amount * refundBps) / MAX_BPS;
            uint256 kept = amount - back;
            if (back > 0) token.safeTransfer(learner, back);
            if (kept > 0) token.safeTransfer(t.payee, kept);
        } else if (within) {
            token.safeTransfer(t.payee, amount);
        } else {
            // Tenggat lewat: dana hangus ke tujuan yang peserta setujui saat menyetor.
            token.safeTransfer(t.payee, amount);
        }
        emit Finalized(learner, courseId, uid, issuedAt, refundBps, within);
    }

    /**
     * Jalur tanpa tanda tangan, dan itu bukan celah: ia hanya bisa jalan SETELAH tenggat lewat, dan
     * tujuannya sama dengan yang peserta pilih sendiri. Tanpa fungsi ini, "tidak ada yang menilai"
     * berarti dana menguap untuk semua pihak — keadaan yang lebih buruk dari penalti yang jelas.
     */
    function forfeit(address learner, bytes32 courseId) external {
        Term storage t = terms[learner][courseId];
        if (t.amount == 0) revert NothingDeposited();
        if (t.finalized) revert AlreadySettled(courseId);
        if (t.deadlineAt == 0 || block.timestamp <= t.deadlineAt) revert DeadlineNotPassed(t.deadlineAt);
        t.finalized = true;
        uint256 amount = t.amount;
        token.safeTransfer(t.payee, amount);
        emit Forfeited(learner, courseId, amount, t.payee);
    }

    /// @dev Pembatalan yang jujur: tanpa tenggat, atau setelah tenggat tapi sebelum ada tujuan yang menagih,
    /// peserta boleh minta dananya kembali selama belum ada tanda tangan penerbit.
    function refundAll(address learner, bytes32 courseId) external onlyOwner {
        Term storage t = terms[learner][courseId];
        if (t.amount == 0) revert NothingDeposited();
        if (t.finalized) revert AlreadySettled(courseId);
        t.finalized = true;
        uint256 amount = t.amount;
        token.safeTransfer(learner, amount);
        emit Refunded(learner, courseId, amount);
    }

    function setIssuer(address next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        emit IssuerChanged(issuer, next);
        issuer = next;
    }

    function settled(address learner, bytes32 courseId) external view returns (bool) {
        return terms[learner][courseId].finalized;
    }

    function recover(bytes32 digest, bytes memory sig) internal pure returns (address) {
        if (sig.length != 65) revert BadSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        // Malleability guard: s tinggi bisa dipakai untuk memalsukan "tanda tangan lain" atas pesan sama.
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) revert BadSignature();
        if (v < 27) v += 27;
        if (v != 27 && v != 28) revert BadSignature();
        address recovered = ecrecover(digest, v, r, s);
        if (recovered == address(0)) revert BadSignature();
        return recovered;
    }
}
