Panduan Lengkap Implementasi “Claim Starterpack” TANPA Kontrak (Fallback)
Tujuan: implementasi klaim starterpack hanya dengan transfer ERC‑20 FBC ke treasury, lalu verifikasi di server — tanpa perlu deploy kontrak StarterClaim. Flow ini sudah didukung oleh API yang ada (/api/starter/quote, /api/starter/verify) dan library Wagmi + Viem di repo Anda.

1) Prasyarat & Dependency
Pastikan project sudah memiliki:

wagmi v2, viem, @tanstack/react-query, @wagmi/connectors
Jika belum, install:
plaintext
pnpm add wagmi viem @tanstack/react-query @wagmi/connectors

Wagmi config sudah ada di:

src/lib/wagmi-config.ts (chains: Base, connectors: Farcaster Mini App + injected)
2) Konfigurasi Environment
Buat/isi file .env (root project) dengan nilai valid:

plaintext
# Base RPC
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org

# Alamat token FBC di Base (ganti jika berbeda)
NEXT_PUBLIC_FBC_ADDRESS=0xcb6e9f9bab4164eaa97c982dee2d2aaffdb9ab07

# Alamat treasury (WAJIB: non-zero & benar)
NEXT_PUBLIC_TREASURY_ADDRESS=0xYourTreasuryAddressHere

# Harga starter pack dalam USD (default 1)
NEXT_PUBLIC_STARTER_PACK_PRICE_USD=1

# Konfirmasi yang disyaratkan server untuk verifikasi tx (dev: 2; prod: 10+)
TX_CONFIRMATIONS=2

# Paksa fallback tanpa kontrak (biarkan zero address)
NEXT_PUBLIC_STARTER_CLAIM_ADDRESS=0x0000000000000000000000000000000000000000

Catatan:

src/lib/constants.ts akan memvalidasi NEXT_PUBLIC_TREASURY_ADDRESS (tidak boleh zero) saat build; pastikan benar.
Server verifikasi (verifyFBCTransfer) default butuh 10 konfirmasi. Untuk dev cepat, set TX_CONFIRMATIONS=2.
3) Alur Fungsional (ringkas)
Client minta quote: POST /api/starter/quote → dapat amountWei.
Client kirim tx ERC20.transfer(treasury, amountWei) di Base (8453).
Client tunggu receipt (konfirmasi ≥ TX_CONFIRMATIONS).
Client POST /api/starter/verify dengan { txHash }.
Server verifikasi transfer FBC (from = user, to = treasury, amount ≈ quote) lalu grant 18 pemain via SpacetimeDB.
4) Helper On‑chain (Client)
Tambahkan helper agar reusable. Anda bisa menaruhnya di file baru src/lib/onchain/starter-fallback.ts (atau gabungkan ke modul on‑chain Anda):

ts
// src/lib/onchain/starter-fallback.ts
import { parseAbi } from 'viem';
import { simulateContract, writeContract, waitForTransactionReceipt } from 'wagmi/actions';
import { wagmiConfig } from '@/lib/wagmi-config';

const ERC20 = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
]);

const FBC = process.env.NEXT_PUBLIC_FBC_ADDRESS as `0x${string}`;
const TREASURY = process.env.NEXT_PUBLIC_TREASURY_ADDRESS as `0x${string}`;
const CHAIN_ID = 8453; // Base

export async function transferFbcToTreasury(amountWei: bigint) {
  const { request } = await simulateContract(wagmiConfig, {
    address: FBC,
    abi: ERC20,
    functionName: 'transfer',
    args: [TREASURY, amountWei],
    chainId: CHAIN_ID,
  });

  const hash = await writeContract(wagmiConfig, request);
  const confirmations = Number(process.env.TX_CONFIRMATIONS ?? '2');

  const receipt = await waitForTransactionReceipt(wagmiConfig, {
    hash,
    chainId: CHAIN_ID,
    confirmations,
  });

  return { hash, receipt };
}

Optional: jika sudah punya src/lib/onchain/sendTx.ts, Anda juga bisa menulis versi ringkas:

ts
// Menggunakan helper sendTx existing
import { parseAbi } from 'viem';
import { sendTx } from '@/lib/onchain/sendTx';
import { CONTRACT_ADDRESSES } from '@/lib/constants';

const ERC20 = parseAbi(['function transfer(address to, uint256 amount) returns (bool)']);

export async function transferFbcToTreasury(amountWei: bigint) {
  return sendTx({
    address: CONTRACT_ADDRESSES.fbc,
    abi: ERC20,
    functionName: 'transfer',
    args: [CONTRACT_ADDRESSES.treasury, amountWei],
    chainId: 8453,
  });
}

5) Orkestrasi Claim (Client)
Buat fungsi “end‑to‑end” untuk klaim fallback:

ts
// src/lib/onchain/claim-starter-fallback.ts
import { transferFbcToTreasury } from './starter-fallback';

export async function claimStarterFallback() {
  // 1) Quote
  const q = await fetch('/api/starter/quote', { method: 'POST' });
  if (!q.ok) throw new Error('Gagal ambil quote');
  const { amountWei } = await q.json();

  // 2) Transfer FBC → treasury
  const { hash } = await transferFbcToTreasury(BigInt(amountWei));

  // 3) Verifikasi server
  const v = await fetch('/api/starter/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txHash: hash }),
  });

  if (!v.ok) {
    const err = await v.json().catch(() => ({}));
    throw new Error(err?.error ?? 'Verifikasi gagal');
  }

  return { hash };
}

6) Menjamin Koneksi Wallet & Chain = Base
Jika Anda berjalan di Mini App Warpcast, pakai connector Farcaster (sudah dikonfigurasi di wagmi-config.ts). Tambahkan guard sederhana sebelum aksi:

ts
// src/lib/wallet/ensureConnectedBase.ts
import { connect, getAccount, switchChain } from 'wagmi/actions';
import { injected } from 'wagmi/connectors';
import { wagmiConfig } from '@/lib/wagmi-config';

export async function ensureConnectedBase() {
  const acc = getAccount(wagmiConfig);
  if (!acc.isConnected) {
    // Di luar Mini App: fallback ke injected
    await connect(wagmiConfig, { connector: injected() });
  }
  const acc2 = getAccount(wagmiConfig);
  if (acc2.chainId !== 8453) {
    await switchChain(wagmiConfig, { chainId: 8453 });
  }
}

Jika Anda sudah punya src/lib/wallet/ensureWarpcast.ts, gunakan itu untuk memaksa Warplet + Base di Mini App.

7) Integrasi ke UI
Contoh minimal integrasi di komponen Starter:

tsx
// src/components/starter/StarterPackCard.tsx (contoh penggunaan)
'use client';

import React from 'react';
import { ensureConnectedBase } from '@/lib/wallet/ensureConnectedBase';
import { claimStarterFallback } from '@/lib/onchain/claim-starter-fallback';

export function StarterPackClaimButton() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hash, setHash] = React.useState<string | null>(null);

  const onClaim = async () => {
    setError(null);
    setHash(null);
    setLoading(true);
    try {
      await ensureConnectedBase();             // connect + switch chain
      const { hash } = await claimStarterFallback(); // quote → transfer → verify
      setHash(hash);
    } catch (e: any) {
      setError(e?.message ?? 'Gagal klaim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button disabled={loading} onClick={onClaim} className="btn btn-primary">
        {loading ? 'Processing…' : 'Claim Starter Pack ($1)'}
      </button>
      {hash && <div className="mt-2 text-xs">Tx: {hash}</div>}
      {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
    </div>
  );
}

Tempatkan komponen ini di halaman/onboarding Anda atau gantikan handler pada StarterPackCard/StarterPackModal.

8) Backend (sudah siap)
POST /api/starter/verify:
Memakai verifyFBCTransfer (Viem) untuk mengecek log Transfer FBC:
from = wallet user, to = TREASURY_ADDRESS, jumlah ≈ quote (toleransi ±1%)
Konfirmasi blok ≥ TX_CONFIRMATIONS
Idempotensi: cek stIsTxUsed, tandai stMarkTxUsed
Cek “sudah pernah klaim” via stHasClaimedStarter
Generate pack dan grant via stGrantStarterPack
Bypass dev FID jika isDevFID(fid) true
Tidak perlu ubah kode backend untuk mode fallback — cukup set .env benar.

9) Guardrails & Debug
Pastikan:
NEXT_PUBLIC_TREASURY_ADDRESS valid (non‑zero) → kalau tidak, build akan error oleh constants.ts.
Chain = Base (8453). Jika tidak, switchChain sebelum kirim tx.
TX_CONFIRMATIONS selaras antara client (menunggu) dan server (verifikasi). Untuk dev cepat: set TX_CONFIRMATIONS=2.
Jika verifikasi gagal dengan “Insufficient confirmations”, tunggu blok tambahan lalu panggil ulang /api/starter/verify.
Jika muncul “No FBC transfer found”, cek:
Alamat token FBC benar (NEXT_PUBLIC_FBC_ADDRESS)
to benar‐benar TREASURY_ADDRESS
Anda benar mengirim transfer(to, amountWei) (bukan approve)
10) Alternatif dengan Hooks (bukan actions)
Jika ingin di komponen langsung:

ts
import { parseAbi } from 'viem';
import { useSimulateContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

const ERC20 = parseAbi(['function transfer(address to, uint256 amount) returns (bool)']);

function useTransferFbc() {
  const { writeContract, data: hash, status } = useWriteContract();
  const wait = useWaitForTransactionReceipt({ hash, confirmations: 2 });

  async function transfer(to: `0x${string}`, amount: bigint) {
    // (opsional) simulate dulu untuk UX yang lebih baik
    // const sim = useSimulateContract({ abi: ERC20, address: FBC, functionName: 'transfer', args: [to, amount] })
    writeContract({ address: FBC, abi: ERC20, functionName: 'transfer', args: [to, amount] });
  }

  return { transfer, hash, wait };
}

11) Checklist Cepat
 Isi .env sesuai §2
 Pastikan Wagmi config (Base + connectors) siap
 Tambah helper on‑chain: transferFbcToTreasury()
 Tambah orchestrator claim: claimStarterFallback()
 Integrasikan tombol “Claim” → panggil orchestrator
 Uji alur:
 Connect wallet
 Quote → transfer → wait
 Verify → pack granted
 Cek idempotensi (klik dua kali harus aman)
 Naikkan TX_CONFIRMATIONS untuk staging/prod sesuai kebutuhan keamanan