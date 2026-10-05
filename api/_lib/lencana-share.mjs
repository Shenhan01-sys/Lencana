// GENERATED oleh web/scripts/build-api.mjs dari web/src/api-entry.ts (+ certificate.ts, share.ts, hosts.ts, certificate-logo.ts) — JANGAN disunting.
// Bangun ulang: cd web && npm run build:api. Kesegaran diperiksa oleh npm run probe (B168).

var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};

// node_modules/viem/_esm/errors/version.js
var version;
var init_version = __esm({
  "node_modules/viem/_esm/errors/version.js"() {
    version = "2.56.5";
  }
});

// node_modules/viem/_esm/errors/base.js
function walk(err, fn) {
  if (fn?.(err))
    return err;
  if (err && typeof err === "object" && "cause" in err && err.cause !== void 0)
    return walk(err.cause, fn);
  return fn ? null : err;
}
var errorConfig, BaseError;
var init_base = __esm({
  "node_modules/viem/_esm/errors/base.js"() {
    init_version();
    errorConfig = {
      getDocsUrl: ({ docsBaseUrl, docsPath = "", docsSlug }) => docsPath ? `${docsBaseUrl ?? "https://viem.sh"}${docsPath}${docsSlug ? `#${docsSlug}` : ""}` : void 0,
      version: `viem@${version}`
    };
    BaseError = class _BaseError extends Error {
      constructor(shortMessage, args = {}) {
        const details = (() => {
          if (args.cause instanceof _BaseError)
            return args.cause.details;
          if (args.cause?.message)
            return args.cause.message;
          return args.details;
        })();
        const docsPath = (() => {
          if (args.cause instanceof _BaseError)
            return args.cause.docsPath || args.docsPath;
          return args.docsPath;
        })();
        const docsUrl = errorConfig.getDocsUrl?.({ ...args, docsPath });
        const message = [
          shortMessage || "An error occurred.",
          "",
          ...args.metaMessages ? [...args.metaMessages, ""] : [],
          ...docsUrl ? [`Docs: ${docsUrl}`] : [],
          ...details ? [`Details: ${details}`] : [],
          ...errorConfig.version ? [`Version: ${errorConfig.version}`] : []
        ].join("\n");
        super(message, args.cause ? { cause: args.cause } : void 0);
        Object.defineProperty(this, "details", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "docsPath", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "metaMessages", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "shortMessage", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "version", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "BaseError"
        });
        this.details = details;
        this.docsPath = docsPath;
        this.metaMessages = args.metaMessages;
        this.name = args.name ?? this.name;
        this.shortMessage = shortMessage;
        this.version = version;
      }
      walk(fn) {
        return walk(this, fn);
      }
    };
  }
});

// node_modules/viem/_esm/utils/data/isHex.js
function isHex(value, { strict = true } = {}) {
  if (!value)
    return false;
  if (typeof value !== "string")
    return false;
  return strict ? /^0x[0-9a-fA-F]*$/.test(value) : value.startsWith("0x");
}
var init_isHex = __esm({
  "node_modules/viem/_esm/utils/data/isHex.js"() {
  }
});

// node_modules/viem/_esm/errors/data.js
var SizeExceedsPaddingSizeError;
var init_data = __esm({
  "node_modules/viem/_esm/errors/data.js"() {
    init_base();
    SizeExceedsPaddingSizeError = class extends BaseError {
      constructor({ size: size2, targetSize, type }) {
        super(`${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()} size (${size2}) exceeds padding size (${targetSize}).`, { name: "SizeExceedsPaddingSizeError" });
      }
    };
  }
});

// node_modules/viem/_esm/utils/data/pad.js
function pad(hexOrBytes, { dir, size: size2 = 32 } = {}) {
  if (typeof hexOrBytes === "string")
    return padHex(hexOrBytes, { dir, size: size2 });
  return padBytes(hexOrBytes, { dir, size: size2 });
}
function padHex(hex_, { dir, size: size2 = 32 } = {}) {
  if (size2 === null)
    return hex_;
  const hex = hex_.replace("0x", "");
  if (hex.length > size2 * 2)
    throw new SizeExceedsPaddingSizeError({
      size: Math.ceil(hex.length / 2),
      targetSize: size2,
      type: "hex"
    });
  return `0x${hex[dir === "right" ? "padEnd" : "padStart"](size2 * 2, "0")}`;
}
function padBytes(bytes, { dir, size: size2 = 32 } = {}) {
  if (size2 === null)
    return bytes;
  if (bytes.length > size2)
    throw new SizeExceedsPaddingSizeError({
      size: bytes.length,
      targetSize: size2,
      type: "bytes"
    });
  const paddedBytes = new Uint8Array(size2);
  for (let i = 0; i < size2; i++) {
    const padEnd = dir === "right";
    paddedBytes[padEnd ? i : size2 - i - 1] = bytes[padEnd ? i : bytes.length - i - 1];
  }
  return paddedBytes;
}
var init_pad = __esm({
  "node_modules/viem/_esm/utils/data/pad.js"() {
    init_data();
  }
});

// node_modules/viem/_esm/errors/encoding.js
var IntegerOutOfRangeError, SizeOverflowError;
var init_encoding = __esm({
  "node_modules/viem/_esm/errors/encoding.js"() {
    init_base();
    IntegerOutOfRangeError = class extends BaseError {
      constructor({ max, min, signed, size: size2, value }) {
        super(`Number "${value}" is not in safe ${size2 ? `${size2 * 8}-bit ${signed ? "signed" : "unsigned"} ` : ""}integer range ${max ? `(${min} to ${max})` : `(above ${min})`}`, { name: "IntegerOutOfRangeError" });
      }
    };
    SizeOverflowError = class extends BaseError {
      constructor({ givenSize, maxSize }) {
        super(`Size cannot exceed ${maxSize} bytes. Given size: ${givenSize} bytes.`, { name: "SizeOverflowError" });
      }
    };
  }
});

// node_modules/viem/_esm/utils/data/size.js
function size(value) {
  if (isHex(value, { strict: false }))
    return Math.ceil((value.length - 2) / 2);
  return value.length;
}
var init_size = __esm({
  "node_modules/viem/_esm/utils/data/size.js"() {
    init_isHex();
  }
});

// node_modules/viem/_esm/utils/encoding/fromHex.js
function assertSize(hexOrBytes, { size: size2 }) {
  if (size(hexOrBytes) > size2)
    throw new SizeOverflowError({
      givenSize: size(hexOrBytes),
      maxSize: size2
    });
}
var init_fromHex = __esm({
  "node_modules/viem/_esm/utils/encoding/fromHex.js"() {
    init_encoding();
    init_size();
  }
});

// node_modules/viem/_esm/utils/encoding/toHex.js
function toHex(value, opts = {}) {
  if (typeof value === "number" || typeof value === "bigint")
    return numberToHex(value, opts);
  if (typeof value === "string") {
    return stringToHex(value, opts);
  }
  if (typeof value === "boolean")
    return boolToHex(value, opts);
  return bytesToHex(value, opts);
}
function boolToHex(value, opts = {}) {
  const hex = `0x${Number(value)}`;
  if (typeof opts.size === "number") {
    assertSize(hex, { size: opts.size });
    return pad(hex, { size: opts.size });
  }
  return hex;
}
function bytesToHex(value, opts = {}) {
  let string = "";
  for (let i = 0; i < value.length; i++) {
    string += hexes[value[i]];
  }
  const hex = `0x${string}`;
  if (typeof opts.size === "number") {
    assertSize(hex, { size: opts.size });
    return pad(hex, { dir: "right", size: opts.size });
  }
  return hex;
}
function numberToHex(value_, opts = {}) {
  const { signed, size: size2 } = opts;
  const value = BigInt(value_);
  let maxValue;
  if (size2) {
    if (signed)
      maxValue = (1n << BigInt(size2) * 8n - 1n) - 1n;
    else
      maxValue = 2n ** (BigInt(size2) * 8n) - 1n;
  } else if (typeof value_ === "number") {
    maxValue = BigInt(Number.MAX_SAFE_INTEGER);
  }
  const minValue = typeof maxValue === "bigint" && signed ? -maxValue - 1n : 0;
  if (maxValue && value > maxValue || value < minValue) {
    const suffix = typeof value_ === "bigint" ? "n" : "";
    throw new IntegerOutOfRangeError({
      max: maxValue ? `${maxValue}${suffix}` : void 0,
      min: `${minValue}${suffix}`,
      signed,
      size: size2,
      value: `${value_}${suffix}`
    });
  }
  const hex = `0x${(signed && value < 0 ? (1n << BigInt(size2 * 8)) + BigInt(value) : value).toString(16)}`;
  if (size2)
    return pad(hex, { size: size2 });
  return hex;
}
function stringToHex(value_, opts = {}) {
  const value = encoder.encode(value_);
  return bytesToHex(value, opts);
}
var hexes, encoder;
var init_toHex = __esm({
  "node_modules/viem/_esm/utils/encoding/toHex.js"() {
    init_encoding();
    init_pad();
    init_fromHex();
    hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_v, i) => i.toString(16).padStart(2, "0"));
    encoder = /* @__PURE__ */ new TextEncoder();
  }
});

// node_modules/viem/_esm/utils/encoding/toBytes.js
function toBytes(value, opts = {}) {
  if (typeof value === "number" || typeof value === "bigint")
    return numberToBytes(value, opts);
  if (typeof value === "boolean")
    return boolToBytes(value, opts);
  if (isHex(value))
    return hexToBytes(value, opts);
  return stringToBytes(value, opts);
}
function boolToBytes(value, opts = {}) {
  const bytes = new Uint8Array(1);
  bytes[0] = Number(value);
  if (typeof opts.size === "number") {
    assertSize(bytes, { size: opts.size });
    return pad(bytes, { size: opts.size });
  }
  return bytes;
}
function charCodeToBase16(char) {
  if (char >= charCodeMap.zero && char <= charCodeMap.nine)
    return char - charCodeMap.zero;
  if (char >= charCodeMap.A && char <= charCodeMap.F)
    return char - (charCodeMap.A - 10);
  if (char >= charCodeMap.a && char <= charCodeMap.f)
    return char - (charCodeMap.a - 10);
  return void 0;
}
function hexToBytes(hex_, opts = {}) {
  let hex = hex_;
  if (opts.size) {
    assertSize(hex, { size: opts.size });
    hex = pad(hex, { dir: "right", size: opts.size });
  }
  let hexString = hex.slice(2);
  if (hexString.length % 2)
    hexString = `0${hexString}`;
  const length = hexString.length / 2;
  const bytes = new Uint8Array(length);
  for (let index = 0, j = 0; index < length; index++) {
    const nibbleLeft = charCodeToBase16(hexString.charCodeAt(j++));
    const nibbleRight = charCodeToBase16(hexString.charCodeAt(j++));
    if (nibbleLeft === void 0 || nibbleRight === void 0) {
      throw new BaseError(`Invalid byte sequence ("${hexString[j - 2]}${hexString[j - 1]}" in "${hexString}").`);
    }
    bytes[index] = nibbleLeft * 16 + nibbleRight;
  }
  return bytes;
}
function numberToBytes(value, opts) {
  const hex = numberToHex(value, opts);
  return hexToBytes(hex);
}
function stringToBytes(value, opts = {}) {
  const bytes = encoder2.encode(value);
  if (typeof opts.size === "number") {
    assertSize(bytes, { size: opts.size });
    return pad(bytes, { dir: "right", size: opts.size });
  }
  return bytes;
}
var encoder2, charCodeMap;
var init_toBytes = __esm({
  "node_modules/viem/_esm/utils/encoding/toBytes.js"() {
    init_base();
    init_isHex();
    init_pad();
    init_fromHex();
    init_toHex();
    encoder2 = /* @__PURE__ */ new TextEncoder();
    charCodeMap = {
      zero: 48,
      nine: 57,
      A: 65,
      F: 70,
      a: 97,
      f: 102
    };
  }
});

// node_modules/@noble/hashes/esm/_u64.js
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
var U32_MASK64, _32n, rotlSH, rotlSL, rotlBH, rotlBL;
var init_u64 = __esm({
  "node_modules/@noble/hashes/esm/_u64.js"() {
    U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
    _32n = /* @__PURE__ */ BigInt(32);
    rotlSH = (h, l, s) => h << s | l >>> 32 - s;
    rotlSL = (h, l, s) => l << s | h >>> 32 - s;
    rotlBH = (h, l, s) => l << s - 32 | h >>> 64 - s;
    rotlBL = (h, l, s) => h << s - 32 | l >>> 64 - s;
  }
});

// node_modules/@noble/hashes/esm/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function anumber(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("positive integer expected, got " + n);
}
function abytes(b, ...lengths) {
  if (!isBytes(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}
function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function byteSwap(word) {
  return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
}
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
  return arr;
}
function utf8ToBytes(str2) {
  if (typeof str2 !== "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str2));
}
function toBytes2(data) {
  if (typeof data === "string")
    data = utf8ToBytes(data);
  abytes(data);
  return data;
}
function createHasher(hashCons) {
  const hashC = (msg) => hashCons().update(toBytes2(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}
var isLE, swap32IfBE, Hash;
var init_utils = __esm({
  "node_modules/@noble/hashes/esm/utils.js"() {
    isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
    swap32IfBE = isLE ? (u) => u : byteSwap32;
    Hash = class {
    };
  }
});

// node_modules/@noble/hashes/esm/sha3.js
function keccakP(s, rounds = 24) {
  const B = new Uint32Array(5 * 2);
  for (let round = 24 - rounds; round < 24; round++) {
    for (let x = 0; x < 10; x++)
      B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
    for (let x = 0; x < 10; x += 2) {
      const idx1 = (x + 8) % 10;
      const idx0 = (x + 2) % 10;
      const B0 = B[idx0];
      const B1 = B[idx0 + 1];
      const Th = rotlH(B0, B1, 1) ^ B[idx1];
      const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
      for (let y = 0; y < 50; y += 10) {
        s[x + y] ^= Th;
        s[x + y + 1] ^= Tl;
      }
    }
    let curH = s[2];
    let curL = s[3];
    for (let t = 0; t < 24; t++) {
      const shift = SHA3_ROTL[t];
      const Th = rotlH(curH, curL, shift);
      const Tl = rotlL(curH, curL, shift);
      const PI = SHA3_PI[t];
      curH = s[PI];
      curL = s[PI + 1];
      s[PI] = Th;
      s[PI + 1] = Tl;
    }
    for (let y = 0; y < 50; y += 10) {
      for (let x = 0; x < 10; x++)
        B[x] = s[y + x];
      for (let x = 0; x < 10; x++)
        s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
    }
    s[0] ^= SHA3_IOTA_H[round];
    s[1] ^= SHA3_IOTA_L[round];
  }
  clean(B);
}
var _0n, _1n, _2n, _7n, _256n, _0x71n, SHA3_PI, SHA3_ROTL, _SHA3_IOTA, IOTAS, SHA3_IOTA_H, SHA3_IOTA_L, rotlH, rotlL, Keccak, gen, keccak_256;
var init_sha3 = __esm({
  "node_modules/@noble/hashes/esm/sha3.js"() {
    init_u64();
    init_utils();
    _0n = BigInt(0);
    _1n = BigInt(1);
    _2n = BigInt(2);
    _7n = BigInt(7);
    _256n = BigInt(256);
    _0x71n = BigInt(113);
    SHA3_PI = [];
    SHA3_ROTL = [];
    _SHA3_IOTA = [];
    for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
      [x, y] = [y, (2 * x + 3 * y) % 5];
      SHA3_PI.push(2 * (5 * y + x));
      SHA3_ROTL.push((round + 1) * (round + 2) / 2 % 64);
      let t = _0n;
      for (let j = 0; j < 7; j++) {
        R = (R << _1n ^ (R >> _7n) * _0x71n) % _256n;
        if (R & _2n)
          t ^= _1n << (_1n << /* @__PURE__ */ BigInt(j)) - _1n;
      }
      _SHA3_IOTA.push(t);
    }
    IOTAS = split(_SHA3_IOTA, true);
    SHA3_IOTA_H = IOTAS[0];
    SHA3_IOTA_L = IOTAS[1];
    rotlH = (h, l, s) => s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s);
    rotlL = (h, l, s) => s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s);
    Keccak = class _Keccak extends Hash {
      // NOTE: we accept arguments in bytes instead of bits here.
      constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
        super();
        this.pos = 0;
        this.posOut = 0;
        this.finished = false;
        this.destroyed = false;
        this.enableXOF = false;
        this.blockLen = blockLen;
        this.suffix = suffix;
        this.outputLen = outputLen;
        this.enableXOF = enableXOF;
        this.rounds = rounds;
        anumber(outputLen);
        if (!(0 < blockLen && blockLen < 200))
          throw new Error("only keccak-f1600 function is supported");
        this.state = new Uint8Array(200);
        this.state32 = u32(this.state);
      }
      clone() {
        return this._cloneInto();
      }
      keccak() {
        swap32IfBE(this.state32);
        keccakP(this.state32, this.rounds);
        swap32IfBE(this.state32);
        this.posOut = 0;
        this.pos = 0;
      }
      update(data) {
        aexists(this);
        data = toBytes2(data);
        abytes(data);
        const { blockLen, state } = this;
        const len = data.length;
        for (let pos = 0; pos < len; ) {
          const take = Math.min(blockLen - this.pos, len - pos);
          for (let i = 0; i < take; i++)
            state[this.pos++] ^= data[pos++];
          if (this.pos === blockLen)
            this.keccak();
        }
        return this;
      }
      finish() {
        if (this.finished)
          return;
        this.finished = true;
        const { state, suffix, pos, blockLen } = this;
        state[pos] ^= suffix;
        if ((suffix & 128) !== 0 && pos === blockLen - 1)
          this.keccak();
        state[blockLen - 1] ^= 128;
        this.keccak();
      }
      writeInto(out) {
        aexists(this, false);
        abytes(out);
        this.finish();
        const bufferOut = this.state;
        const { blockLen } = this;
        for (let pos = 0, len = out.length; pos < len; ) {
          if (this.posOut >= blockLen)
            this.keccak();
          const take = Math.min(blockLen - this.posOut, len - pos);
          out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
          this.posOut += take;
          pos += take;
        }
        return out;
      }
      xofInto(out) {
        if (!this.enableXOF)
          throw new Error("XOF is not possible for this instance");
        return this.writeInto(out);
      }
      xof(bytes) {
        anumber(bytes);
        return this.xofInto(new Uint8Array(bytes));
      }
      digestInto(out) {
        aoutput(out, this);
        if (this.finished)
          throw new Error("digest() was already called");
        this.writeInto(out);
        this.destroy();
        return out;
      }
      digest() {
        return this.digestInto(new Uint8Array(this.outputLen));
      }
      destroy() {
        this.destroyed = true;
        clean(this.state);
      }
      _cloneInto(to) {
        const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
        to || (to = new _Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
        to.state32.set(this.state32);
        to.pos = this.pos;
        to.posOut = this.posOut;
        to.finished = this.finished;
        to.rounds = rounds;
        to.suffix = suffix;
        to.outputLen = outputLen;
        to.enableXOF = enableXOF;
        to.destroyed = this.destroyed;
        return to;
      }
    };
    gen = (suffix, blockLen, outputLen) => createHasher(() => new Keccak(blockLen, suffix, outputLen));
    keccak_256 = /* @__PURE__ */ (() => gen(1, 136, 256 / 8))();
  }
});

// node_modules/viem/_esm/utils/hash/keccak256.js
function keccak256(value, to_) {
  const to = to_ || "hex";
  const bytes = keccak_256(isHex(value, { strict: false }) ? toBytes(value) : value);
  if (to === "bytes")
    return bytes;
  return toHex(bytes);
}
var init_keccak256 = __esm({
  "node_modules/viem/_esm/utils/hash/keccak256.js"() {
    init_sha3();
    init_isHex();
    init_toBytes();
    init_toHex();
  }
});

// node_modules/viem/_esm/utils/lru.js
var LruMap;
var init_lru = __esm({
  "node_modules/viem/_esm/utils/lru.js"() {
    LruMap = class extends Map {
      constructor(size2) {
        super();
        Object.defineProperty(this, "maxSize", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        this.maxSize = size2;
      }
      get(key) {
        const value = super.get(key);
        if (super.has(key)) {
          super.delete(key);
          super.set(key, value);
        }
        return value;
      }
      set(key, value) {
        if (super.has(key))
          super.delete(key);
        super.set(key, value);
        if (this.maxSize && this.size > this.maxSize) {
          const firstKey = super.keys().next().value;
          if (firstKey !== void 0)
            super.delete(firstKey);
        }
        return this;
      }
    };
  }
});

// node_modules/viem/_esm/utils/address/isAddress.js
function isAddress(address, options) {
  const { strict = true } = options ?? {};
  const cacheKey = `${address}.${strict}`;
  if (isAddressCache.has(cacheKey))
    return isAddressCache.get(cacheKey);
  const result = (() => {
    if (!addressRegex.test(address))
      return false;
    if (address.toLowerCase() === address)
      return true;
    if (strict)
      return checksumAddress(address) === address;
    return true;
  })();
  isAddressCache.set(cacheKey, result);
  return result;
}
var addressRegex, isAddressCache;
var init_isAddress = __esm({
  "node_modules/viem/_esm/utils/address/isAddress.js"() {
    init_lru();
    init_getAddress();
    addressRegex = /^0x[a-fA-F0-9]{40}$/;
    isAddressCache = /* @__PURE__ */ new LruMap(8192);
  }
});

// node_modules/viem/_esm/utils/address/getAddress.js
function checksumAddress(address_, chainId) {
  if (checksumAddressCache.has(`${address_}.${chainId}`))
    return checksumAddressCache.get(`${address_}.${chainId}`);
  const hexAddress = chainId ? `${chainId}${address_.toLowerCase()}` : address_.substring(2).toLowerCase();
  const hash = keccak256(stringToBytes(hexAddress), "bytes");
  const address = (chainId ? hexAddress.substring(`${chainId}0x`.length) : hexAddress).split("");
  for (let i = 0; i < 40; i += 2) {
    if (hash[i >> 1] >> 4 >= 8 && address[i]) {
      address[i] = address[i].toUpperCase();
    }
    if ((hash[i >> 1] & 15) >= 8 && address[i + 1]) {
      address[i + 1] = address[i + 1].toUpperCase();
    }
  }
  const result = `0x${address.join("")}`;
  checksumAddressCache.set(`${address_}.${chainId}`, result);
  return result;
}
var checksumAddressCache;
var init_getAddress = __esm({
  "node_modules/viem/_esm/utils/address/getAddress.js"() {
    init_toBytes();
    init_keccak256();
    init_lru();
    checksumAddressCache = /* @__PURE__ */ new LruMap(8192);
  }
});

// node_modules/viem/_esm/utils/index.js
init_isAddress();

// src/certificate-logo.ts
var LOGO = {
  w: 424,
  h: 393,
  black: "M 155.722 59.372 C 117.823 78.576, 94.724 90.844, 92.612 92.891 C 86.944 98.386, 86.999 97.564, 87.009 175.616 L 87.019 247.500 89.994 242.313 C 91.630 239.460, 94.438 236.015, 96.234 234.658 C 99.248 232.382, 160.905 195.284, 202 171.022 C 211.625 165.340, 220.284 160.018, 221.243 159.197 C 222.867 157.805, 222.982 153.476, 222.930 96.042 C 222.870 30.106, 222.840 29.702, 217.977 29.291 C 216.416 29.159, 193.385 40.287, 155.722 59.372 M 323.500 239.680 C 314.700 243.828, 292.200 254.303, 273.500 262.958 C 254.800 271.613, 229.488 283.375, 217.251 289.097 L 195.002 299.500 195.001 329.633 L 195 359.766 200.750 363.235 C 203.912 365.143, 210.620 369.246, 215.655 372.352 C 220.690 375.458, 225.088 378, 225.428 378 C 225.957 378, 257.539 361.050, 299 338.514 C 305.325 335.076, 315.675 329.534, 322 326.198 C 333.898 319.922, 338.113 316.512, 339.936 311.685 C 341.161 308.444, 341.462 231.957, 340.250 232.069 C 339.837 232.107, 332.300 235.532, 323.500 239.680",
  gold: "M 209 31.879 C 139.819 66.504, 95.937 88.735, 93.634 90.324 C 92.058 91.411, 89.700 94.596, 88.394 97.401 L 86.020 102.500 86.010 175.750 C 86.003 223.672, 86.344 249, 86.995 249 C 87.542 249, 88.976 246.901, 90.182 244.336 C 94.206 235.775, 89.640 238.784, 183.250 182.992 L 224 158.704 224 95.807 L 224 32.909 221.545 30.455 C 218.419 27.328, 217.997 27.376, 209 31.879 M 328 133.074 C 326.619 133.955, 286.397 153.469, 272.500 160.001 C 269.200 161.552, 258.175 166.743, 248 171.537 C 237.825 176.330, 226.350 181.713, 222.500 183.498 C 180.656 202.899, 159.399 212.802, 148.500 217.971 C 141.350 221.361, 126.163 228.433, 114.751 233.685 C 85.921 246.953, 86.644 245.930, 87.178 272.707 L 87.500 288.836 90.543 293.168 C 92.216 295.551, 94.916 298.326, 96.543 299.336 C 98.169 300.345, 112.325 309.075, 128 318.735 C 143.675 328.395, 163.601 340.732, 172.280 346.149 C 180.958 351.567, 188.496 356, 189.030 356 C 189.634 356, 190 345.214, 190 327.385 L 190 298.771 192.702 293.807 C 194.219 291.020, 196.690 288.177, 198.337 287.326 C 199.951 286.491, 207.848 281.725, 215.886 276.734 C 223.923 271.744, 232.975 266.228, 236 264.478 C 239.025 262.728, 246.675 258.143, 253 254.290 C 263.826 247.695, 296.489 228.883, 316.500 217.717 C 335.046 207.369, 339.061 204.837, 340.563 202.544 C 341.889 200.520, 342.064 195.727, 341.803 168.507 L 341.500 136.824 338.694 134.412 C 335.778 131.905, 330.808 131.283, 328 133.074 M 339 231.742 C 338.175 232.064, 331.875 234.997, 325 238.260 C 304.672 247.908, 283.503 257.779, 273.166 262.432 C 254.676 270.753, 225.089 284.478, 206.736 293.247 L 193.972 299.346 194.236 329.823 L 194.500 360.301 209.921 369.807 L 225.342 379.314 229.921 376.794 C 238.591 372.022, 284.546 347.173, 309 334.034 C 333.465 320.890, 337.931 317.887, 340.589 312.800 C 342.131 309.849, 342.769 230.919, 341.250 231.079 C 340.837 231.122, 339.825 231.421, 339 231.742"
};

// src/certificate.ts
var isoOk = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}T/.test(s) && !Number.isNaN(Date.parse(s));
var str = (v) => typeof v === "string" && v.trim() ? v.trim() : null;
var rec = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : null;
var lastSegment = (url) => {
  const s = str(url);
  if (!s) return null;
  const seg = s.split("#")[0].split("?")[0].replace(/\/+$/, "").split("/").pop() ?? "";
  try {
    return decodeURIComponent(seg) || null;
  } catch {
    return null;
  }
};
var isCourseSlug = (s) => typeof s === "string" && /^[a-z0-9][a-z0-9-]{0,80}$/.test(s);
var isCredentialHash = (s) => typeof s === "string" && /^0x[0-9a-fA-F]{64}$/.test(s);
function parseCredentialDoc(raw) {
  const d = rec(raw);
  if (!d) return null;
  const subject = rec(d.credentialSubject);
  const ach = rec(subject?.achievement);
  const title = str(d.name) ?? str(ach?.name);
  const learner = lastSegment(subject?.id);
  if (!title || !learner || !isAddress(learner) || !isoOk(d.validFrom) || !isoOk(d.validUntil)) return null;
  const results = Array.isArray(subject?.result) ? subject.result : [];
  const rawScore = rec(results[0])?.value;
  const score = typeof rawScore === "string" || typeof rawScore === "number" ? Number(rawScore) : NaN;
  const proof = rec(d.proof);
  const types = Array.isArray(d.type) ? d.type : [];
  const crit = rec(ach?.criteria);
  const courseId = lastSegment(ach?.id) ?? lastSegment(crit?.id);
  return {
    id: str(d.id) ?? "",
    title,
    learner,
    courseId: isCourseSlug(courseId) ? courseId : null,
    issuerAgent: str(rec(d.issuer)?.name) ?? "",
    validFrom: d.validFrom,
    validUntil: d.validUntil,
    score: Number.isFinite(score) && score >= 0 && score <= 100 ? score : null,
    proof: str(proof?.type) && str(proof?.cryptosuite) ? { type: str(proof?.type), suite: str(proof?.cryptosuite) } : null,
    format: types.includes("OpenBadgeCredential") ? "Open Badges 3.0" : "Verifiable Credential",
    narrative: str(crit?.narrative)
  };
}
var COMPONENT_ORDER = ["kuis", "esai", "praktik"];
var COMPONENT_LABEL = { kuis: "Kuis", esai: "Esai", praktik: "Praktik" };
function parseCriteria(raw) {
  const d = rec(raw);
  if (!d) return null;
  const policy = rec(d.policy);
  const w = rec(policy?.weights) ?? {};
  const weights = Object.entries(w).filter(([k, v]) => /^[A-Za-z0-9_-]{1,24}$/.test(k) && typeof v === "number" && Number.isFinite(v) && v > 0).map(([key, v]) => ({ key, label: COMPONENT_LABEL[key] ?? key.charAt(0).toUpperCase() + key.slice(1), weight: v })).sort((a, b) => {
    const ia = COMPONENT_ORDER.indexOf(a.key), ib = COMPONENT_ORDER.indexOf(b.key);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.key.localeCompare(b.key);
  });
  const pass = policy?.passMark ?? rec(d.scale)?.passingScore;
  return {
    publisher: str(rec(d.issuer)?.name),
    passMark: typeof pass === "number" && Number.isFinite(pass) && pass >= 0 && pass <= 100 ? pass : null,
    weights,
    narrative: str(d.narrative)
  };
}
function splitPublisher(name) {
  if (!name) return { name: null, note: null };
  const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(name);
  return m && m[1] ? { name: m[1].trim(), note: m[2].trim() || null } : { name: name.trim(), note: null };
}
var GENERIC_LIMIT = "Menyatakan hasil kelas ini menurut kriteria yang tertanda tangan penerbit \u2014 bukan ijazah.";
function limitLine(narrative) {
  if (!narrative) return GENERIC_LIMIT;
  const sentences = narrative.replace(/\[[^\]]*\]/g, "").trim().split(/(?<=\.)\s+/).filter(Boolean);
  const last = sentences[sentences.length - 1] ?? "";
  return /\bbukan\b/i.test(last) && last.length <= 240 ? last : GENERIC_LIMIT;
}
var wib = (iso) => new Date(new Date(iso).getTime() + 7 * 36e5);
var MON3 = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
var idDateShort = (iso) => {
  const d = wib(iso);
  return `${d.getUTCDate()} ${MON3[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
var mid = (s, a, b) => s.slice(0, a) + "\u2026" + s.slice(-b);
function statusNoteFor(status) {
  if (status.verdict === "BELUM TERBACA") return "Status belum terbaca dari chain; pindai QR untuk status terkini.";
  const on = idDateShort(status.readOn);
  return status.verdict === "BERLAKU" ? `Status dibaca dari chain pada ${on}; pindai QR untuk status terkini.` : `Status dibaca dari chain pada ${on} (${status.verdict}); pindai QR untuk status terkini.`;
}
function buildCertificate(input) {
  const { cred, criteria, status, hash } = input;
  const pub = splitPublisher(criteria?.publisher ?? null);
  const days = Math.max(1, Math.round((Date.parse(cred.validUntil) - Date.parse(cred.validFrom)) / 864e5));
  const passMark = criteria?.passMark ?? null;
  const verifyUrl = `${input.appHost.replace(/\/+$/, "")}/?q=${hash}#/verify`;
  const demo = [pub.note && /demo|fiktif/i.test(pub.note) ? "Penerbit demo (fiktif)" : null, input.testnet ? "jaringan uji" : null, "bukan ijazah"].filter(Boolean).join(" \xB7 ");
  return {
    hash,
    learner: cred.learner,
    title: cred.title,
    courseId: cred.courseId,
    publisher: pub.name,
    publisherNote: pub.note,
    issuerAgent: cred.issuerAgent,
    score: cred.score,
    passMark,
    passed: cred.score !== null && passMark !== null && cred.score >= passMark,
    components: criteria?.weights ?? [],
    issuedAt: cred.validFrom,
    validUntil: cred.validUntil,
    validDays: days,
    proof: cred.proof ? `${cred.proof.type} \xB7 ${cred.proof.suite}` : null,
    format: cred.format,
    verifyUrl,
    verifyUrlShort: `${verifyUrl.replace(/^https?:\/\//, "").split("?")[0]}?q=${hash.slice(0, 10)}\u2026#/verify`,
    limit: limitLine(criteria?.narrative ?? cred.narrative),
    demo,
    status,
    statusNote: statusNoteFor(status)
  };
}
var LOGO_VIEWBOX = `0 0 ${LOGO.w} ${LOGO.h}`;
function hashBytes(hash) {
  return Uint8Array.from((hash.slice(2).match(/../g) ?? []).map((h) => parseInt(h, 16)));
}
function hashArt(bytes) {
  const n = bytes.length || 1;
  const byteAt = (i) => bytes[(i % n + n) % n] ?? 0;
  const rng = (from = 0) => {
    let a = (byteAt(from) << 24 | byteAt(from + 1) << 16 | byteAt(from + 2) << 8 | byteAt(from + 3)) >>> 0;
    return () => {
      a |= 0;
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  return { byteAt, rng };
}
var W = 1122;
var H = 793;
var ORIGIN = [900, 262];
var STOPS = [
  [0, [18, 20, 25]],
  [0.35, [27, 31, 37]],
  [0.6, [43, 49, 58]],
  [0.76, [54, 56, 55]],
  [0.85, [92, 72, 10]],
  [0.91, [138, 106, 0]],
  [0.97, [217, 158, 0]],
  [1.02, [240, 185, 11]],
  [1.1, [252, 213, 53]],
  [1.2, [255, 241, 190]]
];
var KEEP = [[52, 104, 660, 292], [52, 286, 696, 446], [52, 440, 690, 512]];
var inKeep = (x, y) => KEEP.some((r) => x > r[0] - 18 && x < r[2] + 18 && y > r[1] - 18 && y < r[3] + 18);
var mixc = (c1, c2, k) => [c1[0] + (c2[0] - c1[0]) * k, c1[1] + (c2[1] - c1[1]) * k, c1[2] + (c2[2] - c1[2]) * k];
var ramp = (t) => {
  if (t <= STOPS[0][0]) return STOPS[0][1];
  for (let i = 1; i < STOPS.length; i++) if (t <= STOPS[i][0]) return mixc(STOPS[i - 1][1], STOPS[i][1], (t - STOPS[i - 1][0]) / (STOPS[i][0] - STOPS[i - 1][0]));
  return STOPS[STOPS.length - 1][1];
};
var VEIN = [240, 185, 11];
var WARM = [255, 236, 170];
var DEEP = [4, 5, 7];
var LIGHT = (() => {
  const v = [-0.48, -0.7, 0.9];
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / n);
})();
var rgb = (c) => "rgb(" + c.map((v) => Math.max(0, Math.min(255, Math.round(v)))).join(",") + ")";
var CLUSTERS = [
  { id: "tr", cx: W, cy: 0, rx: 545, ry: 660, x0: 470, y0: -70, x1: W + 70, y1: 780, cell: 58, seed: 0, hz: 34 },
  { id: "bl", cx: 0, cy: H, rx: 310, ry: 250, x0: -70, y0: 500, x1: 380, y1: H + 70, cell: 52, seed: 16, hz: 30 }
];
function facets(bytes) {
  const HA = hashArt(bytes);
  const out = { tr: [], bl: [], front: [], g: [[], [], []] };
  const facet = (o, t, idx) => {
    const cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
    const f = Math.hypot((cx - o.cx) / o.rx, (cy - o.cy) / o.ry);
    const by = HA.byteAt(idx * 7 + (idx >> 5) * 11), by2 = HA.byteAt(idx * 5 + 3 + (idx >> 5) * 5);
    const thr = 0.86 + 0.16 * (by2 / 255);
    let kind;
    if (f < thr) kind = "core";
    else if (f < thr + 0.16 && by > 196) kind = "shard";
    else return;
    if (t.some((p) => inKeep(p[0], p[1])) || inKeep(cx, cy)) return;
    const u = [t[1][0] - t[0][0], t[1][1] - t[0][1], t[1][2] - t[0][2]];
    const v = [t[2][0] - t[0][0], t[2][1] - t[0][1], t[2][2] - t[0][2]];
    let nx = u[1] * v[2] - u[2] * v[1], ny = u[2] * v[0] - u[0] * v[2], nz = u[0] * v[1] - u[1] * v[0];
    if (nz < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    const s = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / (Math.hypot(nx, ny, nz) || 1);
    let col = ramp(f);
    if (by % 13 === 0 && f > 0.3 && f < 0.8) col = mixc(col, VEIN, 0.32);
    const k = (s - 0.85) * 1.7 + (by / 255 - 0.5) * 0.1;
    col = k > 0 ? mixc(col, WARM, Math.min(0.34, k)) : mixc(col, DEEP, Math.min(0.4, -k));
    let pts = t;
    let op = 1;
    if (kind === "shard") {
      pts = t.map((p) => [cx + (p[0] - cx) * 0.66, cy + (p[1] - cy) * 0.66]);
      op = 0.5 + 0.28 * (by2 / 255);
      col = mixc(ramp(0.8 + 0.26 * (by / 255)), WARM, Math.max(0, k) * 0.4);
    } else if (f > thr - 0.1) op = 0.88;
    const dly = Math.round(Math.hypot(cx - ORIGIN[0], cy - ORIGIN[1]) / 30) * 32;
    const ps = pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const c = rgb(col);
    const el = `<polygon class="f" points="${ps}" fill="${c}"` + (op < 1 ? ` fill-opacity="${op.toFixed(2)}"` : ` stroke="${c}" stroke-width=".7" stroke-linejoin="round"`) + ` style="--d:${dly}ms"/>`;
    (kind === "shard" ? out.front : out[o.id]).push(el);
    if (kind === "core" && o.id === "tr" && f >= 0.35 && (s > 0.96 || by > 226)) out.g[idx % 3].push(`<polygon points="${ps}"/>`);
  };
  let n = 0;
  for (const o of CLUSTERS) {
    const rnd = HA.rng(o.seed);
    const cols = Math.ceil((o.x1 - o.x0) / o.cell) + 1, rows = Math.ceil((o.y1 - o.y0) / o.cell) + 1;
    const P = [];
    for (let j = 0; j < rows; j++) {
      const row = [];
      for (let i = 0; i < cols; i++) {
        const jx = (rnd() - 0.5) * o.cell * 0.64, jy = (rnd() - 0.5) * o.cell * 0.64;
        row.push([o.x0 + i * o.cell + jx, o.y0 + j * o.cell + jy, HA.byteAt(i * 7 + j * 13 + o.seed) / 255 * o.hz]);
      }
      P.push(row);
    }
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = P[j][i], b = P[j][i + 1], c = P[j + 1][i], d = P[j + 1][i + 1];
        const d1 = (a[0] - d[0]) ** 2 + (a[1] - d[1]) ** 2, d2 = (b[0] - c[0]) ** 2 + (b[1] - c[1]) ** 2;
        const tris = d1 < d2 ? [[a, b, d], [a, d, c]] : [[a, b, c], [b, d, c]];
        for (const t of tris) facet(o, t, n++);
      }
    }
  }
  return out;
}

// src/share.ts
var trimSlash = (s) => s.replace(/\/+$/, "");
var shareUrl = (appHost, hash) => `${trimSlash(appHost)}/s/${hash}`;
var cardUrl = (appHost, hash) => `${shareUrl(appHost, hash)}/card.png`;
function ogMeta(cert, appHost) {
  const testnet = /jaringan uji/.test(cert.demo);
  const parts = [];
  if (cert.score !== null) parts.push(`Nilai ${cert.score}/100.`);
  parts.push(`Kredensial Open Badges 3.0 yang tertanda tangan penerbit dan tercatat di BNB Smart Chain${testnet ? " testnet" : ""}. Periksa statusnya di verifier Lencana.`);
  if (cert.demo) parts.push(`${cert.demo}.`);
  return {
    title: `Sertifikat: ${cert.title}`.slice(0, 150),
    description: parts.join(" ").slice(0, 300),
    url: shareUrl(appHost, cert.hash),
    image: cardUrl(appHost, cert.hash),
    imageAlt: `Sertifikat Lencana: ${cert.title}`.slice(0, 200)
  };
}
var escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function shareHtml(meta, redirectUrl) {
  const t = escapeHtml(meta.title), d = escapeHtml(meta.description), u = escapeHtml(meta.url), i = escapeHtml(meta.image), a = escapeHtml(meta.imageAlt), r = escapeHtml(redirectUrl);
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t}</title>
<meta name="description" content="${d}">
<link rel="canonical" href="${u}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Lencana">
<meta property="og:locale" content="id_ID">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${u}">
<meta property="og:image" content="${i}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${a}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${i}">
<meta name="robots" content="noindex">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0e11;color:#eaecef;font:16px/1.5 system-ui,sans-serif}a{color:#f0b90b}</style>
<script>location.replace(${JSON.stringify(redirectUrl).replace(/</g, "\\u003c")})</script>
</head><body><p>Membuka verifier Lencana\u2026 <a href="${r}">Buka sekarang</a></p></body></html>
`;
}
var xe = escapeHtml;
function wrapLines(text, maxChars, maxLines) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= maxChars) cur += " " + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length <= maxLines) return lines.map((l) => l.length > maxChars ? l.slice(0, maxChars - 1) + "\u2026" : l);
  const head = lines.slice(0, maxLines);
  const last = head[maxLines - 1];
  head[maxLines - 1] = (last.length > maxChars - 1 ? last.slice(0, maxChars - 1) : last).replace(/[\s,.;:]+$/, "") + "\u2026";
  return head;
}
var arcPoint = (cx, cy, r, f) => {
  const a = (f * 360 - 90) * Math.PI / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
function socialCardSvg(cert) {
  const W2 = 1200, H2 = 630, cx = 930, cy = 300;
  const fa = facets(hashBytes(cert.hash));
  const strip = (s) => s.replace(/ style="--d:\d+ms"/g, "");
  const crystal = strip(fa.tr.join(""));
  const course = wrapLines(cert.title, 32, 2);
  const pub = cert.publisher ? wrapLines(`Penerbit: ${cert.publisher}${cert.publisherNote ? ` (${cert.publisherNote})` : ""}`, 74, 1)[0] : "";
  const dates = `Diterbitkan ${idDateShort(cert.issuedAt)} \xB7 berlaku sampai ${idDateShort(cert.validUntil)}`;
  const host = cert.verifyUrl.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  const sc = cert.score !== null ? Math.max(1e-3, Math.min(1, cert.score / 100)) : null;
  let ring = `<circle cx="${cx}" cy="${cy}" r="150" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="14"/><circle cx="${cx}" cy="${cy}" r="150" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="10"/>`;
  if (sc !== null) {
    if (sc >= 0.999) ring += `<circle cx="${cx}" cy="${cy}" r="150" fill="none" stroke="url(#gold)" stroke-width="10"/>`;
    else {
      const [x1, y1] = arcPoint(cx, cy, 150, sc);
      ring += `<path d="M${cx} ${cy - 150}A150 150 0 ${sc > 0.5 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}" fill="none" stroke="url(#gold)" stroke-width="10" stroke-linecap="round"/>`;
    }
  }
  const number = cert.score !== null ? `<text x="${cx}" y="${cy + 38}" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="${cert.score >= 100 ? 88 : 112}" fill="#eaecef">${cert.score}</text><text x="${cx + (cert.score >= 100 ? 78 : 92)}" y="${cy + 6}" font-family="Outfit" font-size="${cert.score >= 100 ? 20 : 22}" fill="#b7bdc6">/100</text>` : `<text x="${cx}" y="${cy + 30}" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="64" fill="#eaecef">\u2014</text>`;
  const pass = cert.passed ? `<rect x="${cx - 56}" y="${cy + 70}" width="112" height="32" rx="16" fill="url(#gold)"/><text x="${cx}" y="${cy + 92}" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="16" letter-spacing="4" fill="#0b0e11">LULUS</text>` : "";
  const courseSvg = course.map((l, i) => `<text x="64" y="${392 + i * 40}" font-family="Outfit" font-weight="600" font-size="34" fill="#eaecef">${xe(l)}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W2}" height="${H2}" viewBox="0 0 ${W2} ${H2}">
<defs>
<radialGradient id="glow" cx="85%" cy="0%" r="75%"><stop offset="0" stop-color="#f0b90b" stop-opacity=".16"/><stop offset="1" stop-color="#f0b90b" stop-opacity="0"/></radialGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6cf"/><stop offset=".45" stop-color="#fcd535"/><stop offset="1" stop-color="#f0b90b"/></linearGradient>
<radialGradient id="disc" cx="30%" cy="18%" r="120%"><stop offset="0" stop-color="#5a616d"/><stop offset=".42" stop-color="#262b33"/><stop offset="1" stop-color="#0e1115"/></radialGradient>
<clipPath id="clip"><rect width="${W2}" height="${H2}"/></clipPath>
</defs>
<rect width="${W2}" height="${H2}" fill="#0b0e11"/>
<rect width="${W2}" height="${H2}" fill="url(#glow)"/>
<g clip-path="url(#clip)"><g transform="translate(330 -70) scale(.84)">${crystal}</g></g>
<rect x="64" y="52" width="56" height="56" rx="16" fill="#fff"/>
<svg x="73" y="62" width="38" height="36" viewBox="0 0 ${LOGO.w} ${LOGO.h}"><path d="${LOGO.gold}" fill="#f0b90b"/><path d="${LOGO.black}" fill="#0b0e11"/></svg>
<text x="138" y="86" font-family="Outfit" font-weight="600" font-size="26" fill="#eaecef">Lencana</text>
<text x="138" y="108" font-family="Outfit" font-size="14" fill="#848e9c">format ${xe(cert.format)}</text>
<text x="60" y="214" font-family="Outfit" font-weight="700" font-size="80" fill="#eaecef" letter-spacing="-2">Sertifikat</text>
<text x="60" y="292" font-family="Outfit" font-weight="700" font-size="80" fill="#f0b90b" letter-spacing="-2">Kelulusan</text>
<text x="64" y="348" font-family="Outfit" font-size="18" fill="#848e9c">atas kelulusan di kelas</text>
${courseSvg}
${pub ? `<text x="64" y="${course.length > 1 ? 494 : 454}" font-family="Outfit" font-size="18" fill="#b7bdc6">${xe(pub)}</text>` : ""}
<text x="64" y="${course.length > 1 ? 522 : 482}" font-family="Outfit" font-size="17" fill="#848e9c">${xe(dates)}</text>
<circle cx="${cx}" cy="${cy}" r="132" fill="url(#disc)" stroke="#fff" stroke-opacity=".12" stroke-width="1.5"/>
${ring}${number}${pass}
<line x1="64" y1="552" x2="1136" y2="552" stroke="#fff" stroke-opacity=".12"/>
<text x="64" y="588" font-family="Outfit" font-size="17" fill="#b7bdc6">Periksa statusnya di ${xe(host)}</text>
<text x="1136" y="588" text-anchor="end" font-family="Outfit" font-size="16" fill="#848e9c">ID ${xe(mid(cert.hash, 10, 8))}</text>
${cert.demo ? `<text x="64" y="612" font-family="Outfit" font-size="14" fill="#848e9c">${xe(cert.demo)}</text>` : ""}
</svg>`;
}

// src/hosts.ts
var CREDENTIAL_HOST = "https://lencana-edge.hansgunawan775.workers.dev";
var APP_HOST = "https://lencana-psi.vercel.app";
export {
  APP_HOST,
  CREDENTIAL_HOST,
  buildCertificate,
  cardUrl,
  isCourseSlug,
  isCredentialHash,
  ogMeta,
  parseCredentialDoc,
  parseCriteria,
  shareHtml,
  shareUrl,
  socialCardSvg
};
