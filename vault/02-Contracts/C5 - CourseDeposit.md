---
tags: [contract, "C5"]
updated: 2026-10-03
---

# C5 - CourseDeposit

**Part of:** [[02-Contracts/01 - Contracts]] · **Backlog:** B90 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**Testing:** [[09-Testing/T34 - signer deposit-check.js]] · **Keputusan:** D52 di [[00-Overview/03 - Decisions]]
**Source:** `contracts/CourseDeposit.sol:108` (`deposit`) · `contracts/CourseDeposit.sol:145` (`finalize`) · `contracts/CourseDeposit.sol:187` (`forfeit`)

**Summary:** Holds a learner's **deadline premium** until the publisher signs the outcome. The learner picks a duration and deposits; when
the credential is issued, the publisher's EOA signs `(learner, course, uid, issuedAt, refundBps, policyHash)` and anyone may submit that
signature; on time → the signed fraction returns to the learner and the rest goes to the `payee`, late → everything goes to the `payee`.
The contract does not grade and does not take payments for the course itself: x402 still carries money in, and this contract only
decides who owns a deposit once "finished / not finished" is a fact (`contracts/CourseDeposit.sol:13-17`). Deployed on chain 97 at
`0xbeB57bC1a3Ad050b66Ad6ce1E2e42a6cd040E6c3` on 30 Sep (B90; address read from `broadcast/DeployCourseDeposit.s.sol/97/run-latest.json`).
**Not part of the product a visitor can use** — no page calls it, and it is separate from the course payment of B125.

**Key points:**
- `deposit(bytes32 courseId, uint256 amount, uint16 chosenDays, bytes32 policyHash, address payee)` (`:108`) pulls `amount` with
  `safeTransferFrom` and stores a `Term` (`:48`) per learner per course. `chosenDays == 0` means **no deadline**: no forfeit and no
  cashback (`:116`) — the honest path for a learner who does not want to bet. Refusals: `ZeroAmount()` (`:109`), `ZeroAddress()` for a
  zero payee (`:110`), `AlreadySettled(courseId)` if a term exists (`:111`). Because `amount` stays set after settlement, **one learner can
  deposit for one course only once, ever** (`test/CourseDeposit.t.sol:169`).
- `recordHash(learner, courseId)` (`:126`) = keccak over amount, deadline, `policyHash` and payee — the hash the platform stamps on BAS so
  "I chose 5 days" is on chain before any proof of completion exists (`:21-24`).
- `finalize(...)` (`:145`) accepts only an EIP-191 signature that recovers to `issuer` (`:162`, else `NotIssuer()`); the digest binds
  `uid` and `issuedAt` (`:158-161`), so a signature cannot move to another course, learner, or a cheaper deadline
  (`test/CourseDeposit.t.sol:112`). On time with `refundBps > 0`: `amount * refundBps / 10000` back to the learner, the rest to `payee`
  (`:168-172`); on time with `refundBps == 0`: all to `payee` (`:173-174`); late: all to `payee` whatever `refundBps` says (`:175-177`).
- `forfeit(learner, courseId)` (`:187`) needs no signature but only runs **after** `deadlineAt` and never for a no-deadline term
  (`DeadlineNotPassed`, `:191`); the funds go to the `payee` the learner chose at deposit time.
- The publisher, not the platform, decides the number: the contract only enforces the arithmetic ceiling `refundBps <= 10000`
  (`BadBps`, `:156`). Whether `refundBps` matches the publisher's policy is checked off chain by `POST /deposit/finalize` before gas
  (`signer/src/deposit.js:172`, [[04-Signer-Service/S7 - Server routes and lifecycle]]).

**Detail:**
- **D52 premium model is a usage rule, not a contract rule.** Only the premium is meant to be deposited (the course price is paid
  elsewhere); `test_premiumModel_onlyThePremiumIsAtRisk` (`test/CourseDeposit.t.sol:240`) locks that a late finalize forfeits the premium
  and nothing else. The contract itself accepts any `amount` — it is not judged against a price (see the B90 row in
  [[10-Contributors/Claims-Cheat-Sheet]]).
- `onlyOwner` reverts with `ZeroAddress()`, not a dedicated error (`:89-92`) — a misleading name a reader of a revert log should know
  (`test/CourseDeposit.t.sol:182` expects exactly that selector).
- `refundAll(learner, courseId)` (`:200`) returns the full deposit to the learner, but it is `onlyOwner`: the comment at `:198-199` says
  "peserta boleh minta dananya kembali", which means *ask the owner*; the learner cannot call it.
- `amount` is stored as `uint128(amount)` (`:115`) without a range check, and `deadlineAt` as `uint32` (`:116`). Harmless with the demo
  token, but an explicit narrowing conversion does not revert — one of the reasons the header says **not audited** (`:35-37`).
- Signature hygiene: 65-byte length, low-`s` malleability guard, `v` in {27, 28}, non-zero recovery (`:220-236`;
  `test/CourseDeposit.t.sol:144`).
- `setIssuer(next)` (`:210`) lets the owner change which EOA's judgement is accepted; it emits `IssuerChanged`.
- Tests: 16 in `test/CourseDeposit.t.sol`, **16/16** printed by `forge test --match-path test/CourseDeposit.t.sol` on 30 Sep (recorded in
  [[10-Contributors/Claims-Cheat-Sheet]]); the late/forfeit path exists only there, with `vm.warp` — on chain 97 only the on-time path
  and `refundAll` have run ([[09-Testing/T34 - signer deposit-check.js]]).
- Limits stated by the source itself (`:35-37`): testnet prototype, `DemoCourseToken`, not audited, and `forfeit` pays the `payee` on
  "no signature arrived" — production would need a claim window and an appeal path.

**Related:** [[02-Contracts/01 - Contracts]] · [[02-Contracts/C3 - SettlementSplit]] ·
[[02-Contracts/C4 - DemoCourseToken and the x402 interface]] · [[06-Spec-Research/R9 - x402 v2 and the deadline-escrow idea]] ·
[[00-Overview/03 - Decisions]] · [[09-Testing/T34 - signer deposit-check.js]]
