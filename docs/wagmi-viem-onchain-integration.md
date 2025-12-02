---
title: "Implementasi Wagmi + Viem untuk Semua Transaksi On‑chain (Mini App Farcaster + Next.js)"
---

# Ringkasan Eksekutif

Tujuan: menstandarkan seluruh transaksi on‑chain di project ini (Base chain, chainId 8453) menggunakan pola Wagmi v2 + Viem: simulate → write → wait. Untuk Mini App Farcaster, gunakan connector resmi agar transaksi berjalan mulus di Warpcast/klien Farcaster, dan manfaatkan batching EIP‑5792 bila tersedia. Setelah on‑chain sukses, sinkronkan state ke SpacetimeDB via reducer/endpoint server yang sudah ada.

Inti pipeline:
- Pastikan wallet tersambung & chain benar (Base).
- Simulasikan panggilan kontrak (`simulateContract`) [5].
- Eksekusi transaksi (`writeContract`) [1].
- Tunggu konfirmasi (`waitForTransactionReceipt`) [3][6].
- Jalankan side‑effects di server (verifikasi/SpacetimeDB).

Dokumen ini berisi langkah implementasi, snippet, serta checklist untuk klaim Starter Pack dan transaksi lain (approve, transfer, dll.).


## Mode yang dipilih: Opsi A (kontrak klaim + pembayaran FBC di dalam claim)

- Kontrak StarterClaim memverifikasi tanda tangan EIP‑712 dari server, membatasi 1x klaim per FID/wallet, memungut biaya dalam token FBC via `transferFrom` ke `TREASURY_ADDRESS`, dan men‑emit event (mis. `StarterPackGranted`).
- Client flow: `/api/starter/prepare` → (approve/permit FBC) → `claim()` (Warplet) → `/api/starter/verify`.
- Server memverifikasi event kontrak + keterkaitan FID/wallet, lalu memberi 18 pemain di SpacetimeDB.

Catatan penting:
- Tidak perlu deploy token FBC baru. Gunakan alamat FBC yang sudah ada di Base sebagai `NEXT_PUBLIC_FBC_ADDRESS`.
- Jika Anda TIDAK ingin deploy kontrak StarterClaim, set `NEXT_PUBLIC_STARTER_CLAIM_ADDRESS = 0x0000000000000000000000000000000000000000` dan gunakan mode fallback tanpa kontrak (lihat §6.1).


# 1) Dependensi & Setup Dasar

Instal paket (Wagmi v2 + Viem + connector Farcaster + React Query):

```bash
pnpm add wagmi viem @wagmi/connectors @tanstack/react-query \
  @farcaster/miniapp-sdk @farcaster/miniapp-wagmi-connector
```

Catatan versi Wagmi v2 (aksi/`actions` selalu menerima `config` sebagai argumen pertama) [4].


# 2) Konfigurasi Wagmi (menambahkan Farcaster Mini App Connector)

File: `src/lib/wagmi-config.ts`

```ts
import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'; // [2]
import { CHAIN_CONFIG } from './constants';

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    // Urutan penting: pakai connector Farcaster saat berjalan dalam Mini App,
    // fallback ke injected (MetaMask, Coinbase, dll.)
    miniAppConnector(),
    injected(),
  ],
  transports: {
    [base.id]: http(CHAIN_CONFIG.rpcUrl),
  },
});
```

Jika tidak ingin menambah dependensi connector, alternatifnya membuat custom connector yang membungkus `sdk.wallet.getEthereumProvider()` dari Mini App SDK [2].


## 2.1) Memaksa Warplet (Warpcast Wallet) di Mini App (Mobile & Web)

Agar SEMUA transaksi di Mini App selalu memakai Warplet, lakukan deteksi lingkungan Mini App dan paksa koneksi via Farcaster connector. Di luar Mini App, tampilkan CTA “Buka di Warpcast” atau fallback ke injected sesuai kebutuhan Anda.

Contoh helper universal:

```ts
// src/lib/wallet/ensureWarpcast.ts
import { connect, getAccount, switchChain } from 'wagmi/actions';
import { wagmiConfig } from '@/lib/wagmi-config';

export class NotMiniAppError extends Error { constructor(){ super('Not running inside Warpcast Mini App'); } }

export async function ensureWarpcastAndBase() {
  // 1) Deteksi Mini App dengan mencoba mendapatkan provider dari SDK
  let isMiniApp = false;
  try {
    const sdk = await import('@farcaster/miniapp-sdk');
    const provider = await sdk.wallet.getEthereumProvider();
    isMiniApp = !!provider;
  } catch { /* noop */ }

  // 2) Pastikan connect via Farcaster connector jika di Mini App
  const account = getAccount(wagmiConfig);
  if (!account.isConnected) {
    if (isMiniApp) {
      const farcaster = wagmiConfig.connectors.find(
        (c) => c.id?.toLowerCase().includes('farcaster') || c.name?.toLowerCase().includes('farcaster')
      );
      if (!farcaster) throw new Error('Farcaster connector missing');
      await connect(wagmiConfig, { connector: farcaster }); // akan memanggil Warplet di Mini App
    } else {
      // Di luar Mini App: tampilkan CTA untuk membuka di Warpcast atau lakukan fallback sesuai desain
      throw new NotMiniAppError();
    }
  }

  // 3) Paksa chain Base (8453)
  const acc2 = getAccount(wagmiConfig);
  if (acc2.chainId !== 8453) {
    await switchChain(wagmiConfig, { chainId: 8453 });
  }
}

// Validasi cepat: pastikan benar-benar tersambung via Farcaster/Warplet
export async function assertUsingWarplet() {
  const { connector } = getAccount(wagmiConfig);
  const name = connector?.name?.toLowerCase() ?? '';
  if (!name.includes('farcaster')) {
    // Opsi tambahan: cek dukungan EIP-5792
    try {
      const provider: any = await connector?.getProvider();
      const supportsBatch = !!provider?.request;
      if (!supportsBatch) throw new Error('Provider does not expose request');
    } catch {
      throw new Error('Not using Warplet / Farcaster connector');
    }
  }
}
```

Contoh CTA sederhana untuk pengguna di luar Mini App:

```tsx
// src/components/OpenInWarpcastCTA.tsx
export function OpenInWarpcastCTA() {
  return (
    <a
      href="https://warpcast.com/~/mini-apps/YOUR_APP_SLUG"
      target="_blank"
      rel="noreferrer"
      className="btn btn-primary"
    >
      Buka di Warpcast
    </a>
  );
}
```

Penggunaan di setiap entry point on‑chain (sebelum simulate/write):

```ts
import { ensureWarpcastAndBase } from '@/lib/wallet/ensureWarpcast';

async function onUserAction() {
  try {
    await ensureWarpcastAndBase();
  } catch (e) {
    if (e instanceof NotMiniAppError) {
      // render <OpenInWarpcastCTA /> atau fallback lain
      return;
    }
    throw e;
  }
  // lanjut: simulate → write → wait
}
```


# 3) Pola Standar Transaksi (simulate → write → wait)

Seluruh transaksi on‑chain mengikuti pola ini agar aman & terukur:

1. Pastikan wallet connect dan chain = Base (8453).
2. `publicClient.simulateContract(...)` (Viem) untuk validasi & gas estimation [5].
3. `writeContract(config, request)` untuk mengirim transaksi [1].
4. `waitForTransactionReceipt(config, { hash, confirmations })` untuk menunggu konfirmasi dan deteksi replacement [3][6].
5. Panggil endpoint server untuk verifikasi/SpacetimeDB setelah tx sukses.

Contoh helper generik (framework‑agnostik, menggunakan Wagmi Actions + Viem):

```ts
// src/lib/onchain/sendTx.ts
import { simulateContract, writeContract, waitForTransactionReceipt } from 'wagmi/actions';
import type { Abi } from 'viem';
import { wagmiConfig } from '@/lib/wagmi-config';

type SendTxParams = {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: any[];
  value?: bigint;
  chainId?: number; // default Base
  confirmations?: number; // default 1-2
};

export async function sendTx<T extends SendTxParams>(p: T) {
  const { request } = await simulateContract(wagmiConfig, {
    address: p.address,
    abi: p.abi,
    functionName: p.functionName as any,
    args: (p.args ?? []) as any[],
    value: p.value,
    chainId: p.chainId,
  });

  const hash = await writeContract(wagmiConfig, request);

  const receipt = await waitForTransactionReceipt(wagmiConfig, {
    hash,
    chainId: p.chainId,
    confirmations: p.confirmations ?? 2,
  });

  return { hash, receipt };
}
```


# 4) Batching (opsional) dengan EIP‑5792 di Mini App

Farcaster Wallet mendukung `wallet_sendCalls` (EIP‑5792) untuk membundel beberapa panggilan (mis. approve + transfer) jadi satu konfirmasi [2].

Contoh minimal (fallback ke sequential bila method tidak ada):

```ts
// src/lib/onchain/batch.ts
import { getAccount } from 'wagmi/actions';
import { wagmiConfig } from '@/lib/wagmi-config';

export async function tryBatchSend(calls: Array<{ to: `0x${string}`; data: `0x${string}`; value?: `0x${string}` }>) {
  const { connector } = getAccount(wagmiConfig);
  const provider: any = await connector?.getProvider();
  if (!provider?.request) return null;

  try {
    const hash: `0x${string}` = await provider.request({
      method: 'wallet_sendCalls',
      params: [{ calls }],
    });
    return hash;
  } catch {
    return null; // wallet tidak mendukung / user membatalkan
  }
}
```

Catatan: bentuk payload `calls` mengikuti implementasi wallet; mulai dari encode data (ABI) hingga value. Jika gagal, jalankan pola sequential (approve → wait → action).


# 5) Struktur Kode & ABI

- Buat folder `src/lib/abis/` untuk mengelola ABI kontrak: ERC20, StarterClaim, Marketplace, dsb.
- Gunakan tipe Viem (`as const`) untuk ABI agar type inference maksimal.

Contoh: `src/lib/abis/StarterClaim.ts`

```ts
// Struktur minimal untuk klaim bertanda tangan + pembebanan FBC di dalam kontrak
export const STARTER_CLAIM_ABI = [
  {
    type: 'function',
    name: 'claim',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'c',
        type: 'tuple',
        components: [
          { name: 'fid', type: 'uint256' },
          { name: 'wallet', type: 'address' },
          { name: 'packHash', type: 'bytes32' },
          { name: 'pool', type: 'uint256' },
          { name: 'deadline', type: 'uint64' },
        ],
      },
      { name: 'sig', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'StarterPackGranted',
    inputs: [
      { name: 'account', type: 'address', indexed: true },
      { name: 'fid', type: 'uint256', indexed: true },
      { name: 'packHash', type: 'bytes32', indexed: false },
      { name: 'pool', type: 'uint256', indexed: false },
      { name: 'priceWei', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
] as const;
```


# 6) Klaim Starter Pack (Opsi A: kontrak klaim memungut FBC)

Alur UI (client):
1. `ensureWarpcastAndBase()` untuk menjamin Warplet + Base (8453) [2].
2. Panggil `/api/starter/prepare` → server membuat 18 pemain + `packHash` dan menandatangani EIP‑712 (Claim) dengan kunci signer server. Response: `{ claim, sig, priceWei, expiry }`.
3. Siapkan pembayaran FBC:
   - Jika wallet mendukung EIP‑5792: batch `approve(FBC, starterClaim, priceWei)` + `claim(claim, sig)` dalam satu konfirmasi.
   - Jika tidak: jalankan `approve` dulu, tunggu receipt, lalu `claim`.
4. Tunggu receipt `claim` (≥2 konfirmasi) [3][6].
5. Panggil `/api/starter/verify { txHash }` → server memverifikasi event kontrak dan grant 18 pemain.

Contoh implementasi (ringkas):

```ts
// src/lib/onchain/starter.ts
import { parseAbi, encodeFunctionData } from 'viem';
import { sendTx } from './sendTx';
import { STARTER_CLAIM_ABI } from '@/lib/abis/StarterClaim';
import { CONTRACT_ADDRESSES } from '@/lib/constants';
import { tryBatchSend } from '@/lib/onchain/batch';

const ERC20 = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)'
]);

export async function claimStarterWithFBC(claim: any, sig: `0x${string}`, priceWei: bigint) {
  // Coba batch (approve + claim) via EIP-5792
  const approveData = encodeFunctionData({
    abi: ERC20,
    functionName: 'approve',
    args: [CONTRACT_ADDRESSES.starterClaim, priceWei],
  });
  const claimData = encodeFunctionData({
    abi: STARTER_CLAIM_ABI as any,
    functionName: 'claim',
    args: [claim, sig],
  });

  const batched = await tryBatchSend([
    { to: CONTRACT_ADDRESSES.fbc, data: approveData },
    { to: CONTRACT_ADDRESSES.starterClaim, data: claimData },
  ]);
  if (batched) return { hash: batched };

  // Fallback sequential
  await sendTx({ address: CONTRACT_ADDRESSES.fbc, abi: ERC20, functionName: 'approve', args: [CONTRACT_ADDRESSES.starterClaim, priceWei], chainId: 8453 });
  return sendTx({ address: CONTRACT_ADDRESSES.starterClaim, abi: STARTER_CLAIM_ABI as any, functionName: 'claim', args: [claim, sig], chainId: 8453 });
}
```

## 6.1) Guard Zero-Address: fallback TANPA kontrak (FBC transfer = claim)

Jika `NEXT_PUBLIC_STARTER_CLAIM_ADDRESS` adalah zero address (0x000…000), jangan panggil `claim()` kontrak. Gunakan flow transfer FBC → verify server.

Guard + implementasi ringkas:

```ts
// src/lib/onchain/starter.ts (tambahan)
import { parseAbi } from 'viem';
import { sendTx } from './sendTx';
import { CONTRACT_ADDRESSES } from '@/lib/constants';

const ERC20 = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)'
]);

const ZERO = '0x0000000000000000000000000000000000000000' as const;
const isZero = (a?: string) => !a || a.toLowerCase() === ZERO.toLowerCase();

export async function payFbcDirect(amountWei: bigint) {
  // Direct ERC20 transfer to treasury (tidak perlu approve)
  return sendTx({
    address: CONTRACT_ADDRESSES.fbc,
    abi: ERC20,
    functionName: 'transfer',
    args: [CONTRACT_ADDRESSES.treasury, amountWei],
    chainId: 8453,
  });
}

export function shouldUseNoContract() {
  return isZero(CONTRACT_ADDRESSES.starterClaim);
}
```

Contoh pemakaian di komponen:

```ts
import { quickAuth } from '@farcaster/miniapp-sdk';
import { ensureWarpcastAndBase } from '@/lib/wallet/ensureWarpcast';
import { claimStarterWithFBC, payFbcDirect, shouldUseNoContract } from '@/lib/onchain/starter';

async function onClickClaim() {
  await ensureWarpcastAndBase();

  if (shouldUseNoContract()) {
    // Fallback no‑contract: quote → transfer → verify
    const q = await quickAuth.fetch('/api/starter/quote', { method: 'POST' });
    const { amountWei } = await q.json();
    const { hash } = await payFbcDirect(BigInt(amountWei));
    const res = await quickAuth.fetch('/api/starter/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHash: hash }),
    });
    if (!res.ok) throw new Error('Verification failed');
    return;
  }

  // Opsi A (kontrak klaim)
  const pre = await quickAuth.fetch('/api/starter/prepare', { method: 'POST' });
  const { claim, sig, priceWei } = await pre.json();
  const { hash } = await claimStarterWithFBC(claim, sig, BigInt(priceWei));
  const res = await quickAuth.fetch('/api/starter/verify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txHash: hash }),
  });
  if (!res.ok) throw new Error('Verification failed');
}
```

Contoh penggunaan di komponen (ringkas):

```ts
import { quickAuth } from '@farcaster/miniapp-sdk';
import { ensureWarpcastAndBase } from '@/lib/wallet/ensureWarpcast';
import { claimStarterWithFBC } from '@/lib/onchain/starter';

async function onClickClaim() {
  await ensureWarpcastAndBase();

  // 1) Dapatkan payload claim dari server
  const pre = await quickAuth.fetch('/api/starter/prepare', { method: 'POST' });
  const { claim, sig, priceWei } = await pre.json();

  // 2) Kirim approve + claim (batch/sequential)
  const { hash } = await claimStarterWithFBC(claim, sig, BigInt(priceWei));

  // 3) Verifikasi server
  const res = await quickAuth.fetch('/api/starter/verify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txHash: hash }),
  });
  if (!res.ok) throw new Error('Verification failed');
}
```


# 7) Transaksi ERC20 (approve/transfer) dengan Viem + Wagmi

Contoh pola ensure allowance → transfer (non‑batch):

```ts
import { parseAbi } from 'viem';
import { encodeFunctionData } from 'viem';
import { sendTx } from '@/lib/onchain/sendTx';

const ERC20 = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
]);

async function ensureAndPay(token: `0x${string}`, to: `0x${string}`, amount: bigint, owner: `0x${string}`) {
  // 1) Cek allowance via readContract (Viem) [7]
  // 2) Jika kurang, approve → wait
  await sendTx({ address: token, abi: ERC20, functionName: 'approve', args: [to, amount] });
  // 3) Transfer → wait
  await sendTx({ address: token, abi: ERC20, functionName: 'transfer', args: [to, amount] });
}
```

Untuk Mini App dengan EIP‑5792, encode dua call di atas, lalu `wallet_sendCalls` [2].


# 8) Verifikasi Server & Sinkronisasi SpacetimeDB

Server memverifikasi transaksi via Viem `getTransactionReceipt`/log parsing, kemudian memanggil reducer SpacetimeDB.

Untuk Opsi A (kontrak klaim + FBC):
- `/api/starter/prepare`: buat 18 pemain + `packHash`; tandatangani EIP‑712 (Claim) dengan signer server; simpan pending pack (TTL) terikat ke FID/wallet.
- `/api/starter/verify { txHash }`:
  - Ambil receipt; pastikan `to == STARTER_CLAIM_ADDRESS` atau terdapat event `StarterPackGranted` dari alamat tersebut.
  - Parse event: cocokkan `fid`, `packHash`, dan (opsional) `priceWei`/`pool` sesuai prepare.
  - Ikat ke identitas: wallet pemanggil harus cocok dengan sesi/Warpcast; FID harus sama dengan sesi.
  - Idempotensi: tolak jika FID sudah pernah klaim; tandai `txHash` sebagai used; untuk pemanggilan ulang oleh FID yang sama → return success.
  - (Opsional) Validasi juga log `Transfer` ERC20 FBC dalam tx yang sama: from=user, to=TREASURY, amount ≥ priceWei.
  - Jika valid → panggil reducer `grant_starter_pack` untuk memberi 18 pemain.

Untuk mode TANPA kontrak (fallback zero‑address):
- `/api/starter/quote`: kembalikan `amountWei` berdasar USD target.
- `/api/starter/verify { txHash }`:
  - Ambil receipt; temukan log `Transfer` dari `FBC_TOKEN_ADDRESS`.
  - Pastikan `from == wallet_user` dan `to == TREASURY_ADDRESS`, `amount ≥ amountWei`, chain = 8453, konfirmasi ≥ threshold.
  - Ikat ke identitas FID/wallet dan idempotensi (1x per FID, `txHash` tidak boleh dipakai ulang lintas FID).
  - Jika valid → panggil reducer `grant_starter_pack`.

Best practice:
- Tunggu ≥2 konfirmasi di client sebelum memanggil verifikasi (server bebas menambah threshold) [6].
- Tangani replacement transaksi (sped‑up/cancelled) di `waitForTransactionReceipt` [6].


# 9) UX & Guardrails

- Deteksi chain & auto‑switch ke Base (8453) ketika user klik aksi.
- Tampilkan progres: Simulating → Signing → Waiting → Verified.
- Tangani error umum: insufficient funds, user rejected, simulation revert (tampilkan pesan dari Viem error) [5].
- Cache/disable tombol untuk mencegah double‑submit; lock by in‑flight hash.
- Untuk Mini App, pastikan `requiredChains` di manifes/metadata sesuai Base [9]. Tambahkan Base (8453) agar klien Farcaster mengetahui chain yang didukung.
- Bila aplikasi dibuka di luar Mini App, tampilkan CTA “Buka di Warpcast” (lihat §2.1) agar user berpindah ke lingkungan yang menyediakan Warplet.


# 10) Checklist Implementasi per Fitur

- Klaim Starter Pack (Opsi A): implement `claim()` di kontrak yang menagih FBC (approve/permit → claim) dan verifikasi event di server. Lihat §6–§8.
- Marketplace buy/list/auction on‑chain (bila dipindah ke chain): standar pola §3/§7; setelah success panggil reducer untuk sinkronisasi notifikasi/inventory.
- Link wallet on‑chain (jika diperlukan signature/permit): gunakan `signMessage`/`signTypedData` Viem; kirim ke server untuk verifikasi.
- Batch ops (approve + tindakan) di Mini App: coba `wallet_sendCalls`; fallback ke sequential (§4).


# 11) Konfigurasi Environment (disarankan)

Frontend (public):
- `NEXT_PUBLIC_BASE_RPC_URL`
- `NEXT_PUBLIC_FBC_ADDRESS`
- `NEXT_PUBLIC_TREASURY_ADDRESS`
- `NEXT_PUBLIC_STARTER_CLAIM_ADDRESS`

Server (privat):
- `PACK_SIGNER_PRIVATE_KEY` (EIP‑712 signer)
- `PACK_POOL_VERSION` (versi pool/season)
- `STARTER_PRICE_FBC_WEI` atau aturan konversi USD→FBC
- `MIN_CONFIRMATIONS` (mis. 2)

Catatan:
- Tidak perlu deploy token FBC. Isi `NEXT_PUBLIC_FBC_ADDRESS` dengan alamat token FBC yang sudah ada di Base.
- Jika tidak deploy kontrak StarterClaim, set `NEXT_PUBLIC_STARTER_CLAIM_ADDRESS=0x0000000000000000000000000000000000000000` dan UI otomatis memakai flow transfer FBC → verify.


# Referensi / Sumber

1. Wagmi – writeContract (v2): https://wagmi.sh/core/api/actions/writeContract
2. Farcaster Mini Apps – Wallets (Wagmi connector, EIP‑5792): https://miniapps.farcaster.xyz/docs/guides/wallets
3. Wagmi – waitForTransactionReceipt: https://wagmi.sh/core/api/actions/waitForTransactionReceipt
4. Wagmi – Migrate v1 → v2 (konsep actions + config): https://wagmi.sh/core/guides/migrate-from-v1-to-v2
5. Viem – simulateContract: https://viem.sh/docs/contract/simulateContract
6. Viem – waitForTransactionReceipt: https://v1.viem.sh/docs/actions/public/waitForTransactionReceipt.html
7. Viem – readContract: https://viem.sh/docs/contract/readContract
8. Farcaster Frames v2 demo (Wagmi provider di app Next.js): https://github.com/farcasterxyz/frames-v2-demo
9. Farcaster – Mini App/Frames v2 Spec (requiredChains & metadata): https://docs.farcaster.xyz/developers/frames/v2/spec
10. Wagmi – connect: https://wagmi.sh/core/api/actions/connect
11. Wagmi – getAccount: https://wagmi.sh/core/api/actions/getAccount
12. Wagmi – switchChain: https://wagmi.sh/core/api/actions/switchChain
