---
tags: [signer, "S6"]
---

# S6 - x402 paid verification

**Part of:** [[04-Signer-Service/01 - Signer Service]]
**Source:** `signer/src/x402.js:60`, `signer/src/server.js:146`, `signer/scripts/x402-check.js`

**Summary:** `POST /verify` answers `402 Payment Required` until it is paid. The client produces two
EIP-712 signatures and **zero transactions**; the server acts as facilitator, broadcasts the
settlement, divides the income in `SettlementSplit`, then serves the reports with an
`X-PAYMENT-RESPONSE`. What is sold here is a batch of machine-readable reports, not the truth itself —
public verification stays free and wallet-less (**D23**). The guards before any gas are what separate
"the platform fronts gas" from "the platform pays gas for a stranger's transfer".

**Key points:**
- `notPaid()` (`server.js:131`) emits 402 with `{x402Version: 1, error, accepts}` plus
  `www-authenticate: X-PAYMENT realm="x402", error="insufficient_payment"`. `accepts[]` is rebuilt per
  request so `resource` matches the URL actually asked (`server.js:124`).
- `paymentRequirements()` (`x402.js:60-77`) is the `exact` scheme's shape as an x402 client reads it, not
  a shape we invented: `scheme`, `network: eip155:<chainId>`, `maxAmountRequired` as a **string**,
  `resource`, `description`, `mimeType`, `payTo`, `paymentTimeout`, `maxTimeoutSeconds`, `asset`,
  `extra: {name, version}`. `payTo` is the **split contract**, never a platform EOA.
- Two client signatures, two domains differing by exactly one field: EIP-2612 `Permit` on the token
  domain **with** `version: "1"` (`x402.js:28`), Permit2 `PermitWitnessTransferFrom` on a domain
  **without** it (`x402.js:27`). Swapping them gives a well-formed, contract-refused signature
  (`x402.js:9-11`); the witness type must be named exactly `Witness` because Permit2 weaves the type
  name into the typehash (`x402.js:45`). `tokenNonce` is read from the token's `nonces(owner)`
  (`x402-check.js:108`) — paying twice with nonce `0` fails far from the fix (`x402.js:77-79`).
- Zero transactions is measured: the payer's key is derived from a constant string and has never held
  BNB (`x402-check.js:56-57`), and its token balance must drop by exactly the price (`:160`).
- `checkPayment()` runs **before** any gas leaves (`server.js:249-263`): the token must be ours, `payTo`
  must be our split contract, the nonce must be an integer, `BigInt(amount)` must be ≥ `PRICE` (an
  unparsable amount is refused, not coerced), the deadline must not have passed, both signatures present.
  Without these the server could be told to move someone else's money to any address, paying the gas.
- `settlePayment()` (`x402.js:180`) calls `settleWithPermit` on the x402 proxy, then `splitErc20` on
  `SettlementSplit`, then reads `balanceOf` for payee, facilitator and the split **from the chain**
  (`x402.js:217-221`). `splitRef = keccak256("x402-http:<salt>")` needs a salt unique per payment — the
  contract's replay guard is what makes `splitErc20` safe to re-call, and a constant salt would break
  every payment after the first (`x402.js:177-178`, salt at `server.js:176`). A failed settlement
  returns 402 with the reason instead of withholding the data (`server.js:178-181`).
- Batch, not comfort: `BATCH_MAX = 25` (`server.js:229`), items validated as `0x` + 64 hex, lower-cased and
  de-duplicated (`server.js:232-247`). Reports are built 4 at a time (`server.js:189-195`): 25 parallel
  verifications ≈ 300 simultaneous `eth_call` at a public RPC, which returns half-empty reports.

**Detail:**
- The arithmetic that forced the batch sits in a code comment: one settlement is 190,659 gas —
  `settleWithPermit` 114,728 + `splitErc20` 75,931, both read from receipts — against a price of
  `BigInt(process.env.X402_PRICE ?? '1000')` (`server.js:39`), i.e. 1000 atomic units of a 6-decimal
  token. `PER_VERIFICATION_GAS` (`server.js:230`) is echoed in every batch response, and
  `server.js:223-227` says plainly that only amortising across N reports keeps the platform's 10 % from
  being eaten by BNB price. Recorded as **D40** ([[00-Overview/03 - Decisions]]).
- The payee is the issuer whose content was bought; the platform takes its share through the contract,
  not by naming itself as recipient (`server.js:43-45`). The harness reads the platform address from
  `SettlementSplit.platform()` rather than from `.env` (`x402-check.js:83-87`), requires the two gains to
  sum to exactly the price (`:158`), requires the split to hold nothing afterwards — no debt ledger
  (`:161`) — and on the batch run found the payee's gain exactly 900 of the 1000-unit price (`:204`).
  The bps cap and "can only go down" belong to [[02-Contracts/01 - Contracts]].
- `X-PAYMENT-RESPONSE` carries the spec fields plus one addition made outside the specification:
  `settlement: {settleTx, splitTx, splitRef}` — evidence the income was *divided*, not merely received
  (`server.js:198-208`). The body keeps `report` filled only for a single hash so an existing client
  cannot silently change meaning (`server.js:217-220`). Each report comes from `verify()` in
  `web/src/verify.ts` (`server.js:183-196`) — the same code the free page runs, so the paid path is no
  second implementation of the truth.
- Limits: `settleWithPermit` is facilitator work, so in this demo **our** server pays the gas; in
  production that is a third party (`x402.js:13-16`). `npm run x402` needs `npm run serve` up plus
  `DEMO_TOKEN_ADDRESS` + `SPLIT_ADDRESS` + `ISSUER_ADDRESS` in `app/.env`, and stops with "server not
  configured for payment — this is not a test failure" (`x402-check.js:73-77`).
- This is the route where the BigInt crash landed **after** a settlement succeeded: **D39**, see
  [[S7 - Server routes and lifecycle]] — the shape of failure a payment system must never have.

**Related:** [[S7 - Server routes and lifecycle]] · [[S4 - Delegated issuance]] · [[02-Contracts/01 - Contracts]] ·
[[00-Overview/03 - Decisions]] · [[09-Testing/00 - Hub Testing]] · [[Concepts/Fronted Gas]]
