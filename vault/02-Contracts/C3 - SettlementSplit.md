---
tags: [contract, "C3"]
---

# C3 - SettlementSplit

**Part of:** [[02-Contracts/01 - Contracts]]
**Source:** `contracts/SettlementSplit.sol:125` (`splitErc20`) · `contracts/SettlementSplit.sol:112` (`sharesOf`)

**Summary:** Takes one payment that has already landed inside it, divides it between the issuer whose content was bought and the platform, and
keeps nothing for anybody afterwards. It exists for a structural reason: the x402 `exact` witness has exactly one recipient,
`Witness(address to, uint256 validAfter)` (`contracts/interfaces/IX402ExactPermit2Proxy.sol:27`), so an x402 settlement cannot divide at all. It
does not verify payments and does not touch Permit2: a hard fee cap, a fee that can only fall, no debt ledger.

**Key points:**
- `uint16 public constant MAX_BPS = 2500` (`:76`), 25%, enforced in the constructor:
  `if (bps_ > MAX_BPS) revert BpsTooHigh(uint16 proposed, uint16 maximum)` (`:99`, declared `:54`). Refused at deploy rather than quietly
  clamped, and the platform can never be the majority.
- `decreasePlatformBps(uint16 next)` (`:183`) reverts `BpsMayOnlyDecrease(uint16 current, uint16 proposed)` (`:56`) when
  `next >= platformBps` (`:184`), so an unchanged value is refused too. A human input may tighten a number, never loosen it, as with the
  delisting flag in [[02-Contracts/C1 - CredentialResolver]]; raising the share means deploying again, visible in the address
  → [[00-Overview/03 - Decisions]] D38.
- `sharesOf(uint256 amount)` (`:112`) floors the platform side: `platformShare = (amount * platformBps) / BPS_DENOM` (`:113`,
  `BPS_DENOM = 10000` at `:77`), then `issuerShare = amount - platformShare` (`:114`), so the remainder always lands with the issuer. Measured
  in `test/SettlementSplit.t.sol:143`: 999 at 1000 bps gives platform 99, issuer 900, contract 0. A payment small enough to floor the platform
  to zero still splits (9 → issuer 9, platform 0), so a `Split` with a zero platform share is not a bug.
- Replay is refused per reference: `mapping(bytes32 => bool) public splitDone` (`:87`) and `AlreadySplit(bytes32 ref)` (`:52`). The only
  per-`ref` state is "this command already ran"; `test/SettlementSplitOnBsc.fork.t.sol:228` re-funds the contract and reuses the old `ref` on
  top of a real settlement, and is still refused.
- **Why no debt ledger.** Everything is pushed out inside one call, so nobody holds a balance here between transactions. A "who owes how much"
  map would add a bug class (reconciliation, outstanding balances, double claims) and no capability. It is tested as state, not declared as
  intent: `test/SettlementSplit.t.sol:242` asserts the token and native balances are both zero after a split.
- `splitErc20(IERC20 token, address payee, uint256 amount, bytes32 ref)` (`:125`) is `onlyOwner` + `nonReentrant` and reads **its own**
  balance (`:136`), reverting `InsufficientBalance(uint256 needed, uint256 available)` (`:58`, raised `:137`). No `transferFrom` and no
  `approve` appear anywhere in the file: the money already arrived, because the facilitator settles to `payTo` and `payTo` is this contract.

**Detail:**
- Order inside `splitErc20`: `amount == 0` → `ZeroAmount()` (`:130`), `payee == 0` → `ZeroAddress()` (`:131`), `splitDone[ref]` →
  `AlreadySplit()` (`:132`), balance check (`:136-137`), then `splitDone[ref] = true` (`:139`) **before** any external call, then
  `token.safeTransfer(payee, issuerShare)` and `token.safeTransfer(platform, platformShare)` (`:146-147`), then
  `emit Split(ref, payee, token, Shares(gross, platform, issuer))` (`:89`, struct `:68`) carrying all three numbers.
- Reentrancy has two layers: the `nonReentrant` modifier (`ReentrancyGuard`, `:43`) and that flag set before interactions.
  `test/SettlementSplit.t.sol:64` is a token that calls `splitErc20` back into itself with the same `ref` and fails the test if the callback
  *succeeds*, so a green run is evidence the guard bit.
- `SafeERC20` is required, not stylistic: some BEP-20s return `false` instead of reverting and a raw `IERC20.transfer` reads that as success.
  `test/SettlementSplit.t.sol:54` is such a token; `:258` shows the split reverting and moving nothing.
- Native path `splitNative(address payable payee, uint256 amount, bytes32 ref)` (`:154`) caps `amount` at `address(this).balance` (`:162`) and
  calls **issuer first, platform second** (`:171-174`). A `payee` that rejects BNB reverts `NativeTransferFailed` (`:64`), whose arguments are
  `(address target, uint256 amount)`, and the transaction unwinds, so the platform is never the half already paid
  (`test/SettlementSplit.t.sol:294` locks that order). Funds enter through `receive() external payable {}` (`:105`); a plain transfer here
  splits nobody (`test/SettlementSplit.t.sol:338`).
- `sweep(IERC20 token) external onlyOwner returns (uint256 amount)` (`:200`) moves the whole token balance to `platform` (`:201-202`): the
  salvage route that makes "no ledger" cheap to operate, not a payment mechanism. It takes an `IERC20` only, so native BNB left here exits
  through `splitNative`, which spends a fresh `ref` to do it. `setPlatform(address payable next)` (`:191`) changes the recipient without
  touching `platformBps`, and the recipient stays distinct from the operator (`test/SettlementSplitOnBsc.fork.t.sol:86`).
- Trap: `amount` is not "what should be split", it is "what we pull out of our own balance". A settlement that differs from what the caller
  assumed reverts with `InsufficientBalance(needed, available)` and pays nobody; reading `amount` as an instruction to the payer is the mistake.
- Deployed on chain 97 at `0xcB00E62B888113A1B09Fe9bbd01afC946e8e1bBE`; `script/PaidVerificationDemo.s.sol:83` constructs it with
  `BPS10 = 1000` (10%, `:44`). 22 offline tests plus 7 fork tests against the canonical proxy, from the 25 Sep run whose command is in the hub.
  Delete this contract and verification still works → [[00-Overview/03 - Decisions]] D23.

**Related:** [[02-Contracts/01 - Contracts]] · [[02-Contracts/C4 - DemoCourseToken and the x402 interface]] ·
[[02-Contracts/C1 - CredentialResolver]] · [[01-Architecture/01 - Architecture]] · [[00-Overview/03 - Decisions]] · [[09-Testing/00 - Hub Testing]]
