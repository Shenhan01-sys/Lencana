---
tags: [contract, "C4"]
---

# C4 - DemoCourseToken and the x402 interface

**Part of:** [[02-Contracts/01 - Contracts]]
**Source:** `contracts/DemoCourseToken.sol:27` · `contracts/interfaces/IX402ExactPermit2Proxy.sol:26`

**Summary:** The two files that make the paid path executable without pretending it is a product. `DemoCourseToken` is a toy ERC-20 with
EIP-2612 `permit` and an open `mint()`, deployed on chain 97 so the money path can be exercised without asking a stranger for real tokens.
`IX402ExactPermit2Proxy` is a hand-written **mirror** of contracts we did not deploy: the canonical `x402ExactPermit2Proxy` and Permit2, called
at their real addresses. Neither file carries credential semantics, and the honesty of every paid-path claim depends on keeping that line
visible.

**Key points:**
- `contract DemoCourseToken is ERC20, ERC20Permit` (`:27`), with `function mint(address to, uint256 amount) external` and **no access control**
  (`:30-32`), and a constructor `ERC20("Lencana Demo Coin", "LDC-demo")` plus `_mint(msg.sender, 1_000_000e6)` (`:34-35`). Supply is unbounded
  by design, so no claim about scarcity, revenue or price can rest on this token. What it does support is narrower: a payment moved, divided,
  and a response served.
- `permit` is the reason the zero-client-gas path exists at all (`:15-18` of the file). Without EIP-2612, "the payer holds no BNB" would need an
  `approve`, and an `approve` needs BNB: the same circle the delegation route closes on the issuance side.
- **Two different EIP-712 domains are signed in one settlement, and they are not the same shape.** Permit2's domain is
  `EIP712Domain(string name,uint256 chainId,address verifyingContract)` with **no `version` field**
  (`test/SettlementSplitOnBsc.fork.t.sol:39-40`, assembled at `:92`). The token's domain has `version: "1"` because OpenZeppelin's constructor
  is `constructor(string memory name) EIP712(name, "1") {}`
  (`node_modules/@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol:39`), and `signer/src/x402.js:9-10` writes the two domains
  separately and says so. Swapping them yields a signature that is well-formed and rejected on chain.
- The mirror's structs, whose field order is part of the ABI encoding: `TokenPermissions(address token, uint256 amount)` and
  `PermitTransferFrom(TokenPermissions permitted, uint256 nonce, uint256 deadline)` (`:13-22`),
  `Witness(address to, uint256 validAfter)` (`:27`), and `EIP2612Permit{uint256 value; uint256 deadline; bytes32 r; bytes32 s; uint8 v}`
  mirroring `x402BasePermit2Proxy` (`:34`). A shifted field is a signature mismatch, not a silent pass.
- Two entry points. `settle(IPermit2.PermitTransferFrom calldata permit, address owner, Witness calldata witness, bytes calldata signature)`
  (`:50`) is the path where the client approved Permit2 itself; `settleWithPermit(EIP2612Permit calldata tokenPermit, ...)` (`:56-62`) does the
  EIP-2612 permit and moves the funds in one call, so the client sends no transaction. Events `Settled()` and `SettledWithPermit()` (`:64-65`)
  carry **no arguments**, so tests match them by `topic0` (`:47-48`, via `_emitted()` `:146`).
- The proxy is identified by its own on-chain constants rather than by an address in a document:
  `test_fork_proxinya_memang_proxy_exact_x402` (`test/SettlementSplitOnBsc.fork.t.sol:158`) asserts bytecode exists at both addresses, that
  `proxy.PERMIT2()` returns `0x000000000022D473030F116dDEE9F6B43aC78BA3`, and that `WITNESS_TYPEHASH()` and `WITNESS_TYPE_STRING()` match the
  `exact` witness shape. "There is code at that address" would be far too weak.

**Detail:**
- Why a bespoke token instead of one already on the testnet: the amount can be a round number (1000 base units, the `price: "$0.001"` of the
  official x402 example, `test/SettlementSplitOnBsc.fork.t.sol:57`) and the test does not depend on anyone agreeing to send us a real token
  (`contracts/DemoCourseToken.sol:11`).
- Domain separation is verified rather than assumed: the fork test signs the token permit with `token.DOMAIN_SEPARATOR()` and
  `token.nonces(payer)` both read from the contract (`test/SettlementSplitOnBsc.fork.t.sol:128-130`).
- The zero-gas claim is measured: `test_fork_klien_nol_gas_sampai_dana_terbagi` (`:267`) starts from `allowance(payer, PERMIT2) == 0`, records
  the payer's transaction nonce before and after `settleWithPermit`, asserts it is unchanged, and follows the money through the split to
  900/100. And `test_fork_witness_dengan_tujuan_berbeda_gagal_ditandatangani` (`:245`) signs for `to: split`, calls with `to: attacker`, and
  the settlement reverts with nothing entering the contract: the `to` inside the witness is what lets the broadcaster stay untrusted.
- Stated on the page rather than buried: an open `mint()` is acceptable on 97 and a mistake on 56 (`contracts/DemoCourseToken.sol:24-26`).
  Nothing of ours is deployed on mainnet; chain 56 appears only as a cross-check, and these tests `vm.skip` unless the chain is 97 or 56
  (`test/SettlementSplitOnBsc.fork.t.sol:71`).
- Deployed on chain 97 at `0xEd19cDeB8b4Bb3355651680b089222d1140bCDDe` by `script/PaidVerificationDemo.s.sol:82`, which constructs the split
  (`:83`), settles once through the canonical proxy with `settleWithPermit` (`:118`) and calls `splitErc20` (`:121`). The HTTP side has its own
  harness: `npm run x402` (`signer/package.json:19`).
- Trap: a balance of this token is not money. The script mints to the test client and the fork tests mint to the split contract to simulate
  funds arriving, so every figure there is a unit count; the only honest conversion is a measured gas cost
  → [[10-Contributors/Claims-Cheat-Sheet]].
- What this file does **not** license: calling the demo `USDT`, quoting an income from `PRICE = 1000`, or presenting `SettlementSplit`'s 10% in
  the tests as the deployed rate. The deployed split's own `platformBps()` is the only fee figure that is a fact.

**Related:** [[02-Contracts/01 - Contracts]] · [[02-Contracts/C3 - SettlementSplit]] · [[01-Architecture/01 - Architecture]] ·
[[06-Spec-Research/01 - Spec Research]] · [[00-Overview/03 - Decisions]] · [[09-Testing/00 - Hub Testing]]
