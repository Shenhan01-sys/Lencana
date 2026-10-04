# Signer Lencana di Railway (B154). Konteks build = akar repo `app/`, diunggah dari `git archive HEAD` (hanya berkas
# ter-commit — `.env`, `signer/.keys`, `signer/.store` tidak pernah masuk image). Rahasia datang dari variabel layanan.
#
# Kenapa web/ ikut: server mengimpor `web/src/*.ts` lewat tsx (harga, manifest, ABI, rubrik, prompt penilai), dan `viem`
# untuk berkas-berkas itu dicari Node dari `web/node_modules`. `engines` signer: Node >= 22.18.
FROM node:22-bookworm-slim

WORKDIR /srv/app

COPY signer/package.json signer/package-lock.json signer/
RUN cd signer && npm ci --no-audit --no-fund

COPY web/package.json web/package-lock.json web/.npmrc web/tsconfig.json web/
RUN cd web && npm ci --no-audit --no-fund

COPY signer/ signer/
COPY web/src/ web/src/

ENV HOST=0.0.0.0
CMD ["sh", "signer/scripts/cloud-start.sh"]
