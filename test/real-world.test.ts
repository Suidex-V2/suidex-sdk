/**
 * @suidex/sdk — Real-World Simulation Tests
 *
 * Simulates every SDK method on mainnet using a funded wallet.
 * No transactions are executed — simulateTransaction only.
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { suidex } from '../src/sdk.js';
import { TOKENS, V2 } from '../src/constants.js';

// Funded wallet on mainnet (has SUI + VICTORY)
// Set SENDER env var to run with a funded wallet, e.g.:
// SENDER=0xYourAddress npx tsx test/real-world.test.ts
const SENDER = process.env.SENDER ?? '0x0000000000000000000000000000000000000000000000000000000000000000';
const SUI_VICTORY_PAIR = '0xd5fb3cde57c8e792276c30580721599f9f8162f9136416bb4b2312cf79e6d6ae';

const client = new SuiGrpcClient({
  network: 'mainnet',
  baseUrl: 'https://fullnode.mainnet.sui.io:443',
}).$extend(suidex());

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, msg: string) {
  if (cond) { console.log(`  PASS: ${msg}`); passed++; }
  else { console.error(`  FAIL: ${msg}`); failed++; failures.push(msg); }
}

async function simulate(tx: any, label: string): Promise<{ success: boolean; error?: string; balanceChanges?: any[] }> {
  try {
    const result = await client.core.simulateTransaction({
      transaction: tx,
      checksEnabled: false,
      include: { effects: true, balanceChanges: true },
    });
    const txResult = (result as any)?.Transaction;
    const failResult = (result as any)?.FailedTransaction;
    if (txResult?.effects?.status?.success) {
      return { success: true, balanceChanges: txResult.balanceChanges };
    }
    const error = failResult?.status?.error?.message ?? txResult?.effects?.status?.error?.message ?? 'unknown';
    return { success: false, error };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── V2 AMM Swap ─────────────────────────────────────────────────

async function testV2SwapSuiToVictory() {
  console.log('\n=== V2 Swap: 0.01 SUI → VICTORY ===');

  const tx = client.suidex.amm.swap({
    sender: SENDER,
    pairId: SUI_VICTORY_PAIR,
    token0Type: TOKENS.SUI,
    token1Type: TOKENS.VICTORY,
    zeroToOne: true,
    amountIn: 10_000_000n, // 0.01 SUI
    minAmountOut: 1n,
  });

  const { success, error, balanceChanges } = await simulate(tx, 'V2 swap SUI→VICTORY');
  assert(success, `V2 swap SUI→VICTORY: ${success ? 'SUCCESS' : error}`);

  if (balanceChanges) {
    const suiChange = balanceChanges.find((c: any) => c.coinType?.includes('sui::SUI'));
    const vicChange = balanceChanges.find((c: any) => c.coinType?.includes('VICTORY'));
    if (suiChange) console.log(`    SUI: ${Number(BigInt(suiChange.amount)) / 1e9}`);
    if (vicChange) {
      const vicAmount = BigInt(vicChange.amount);
      console.log(`    VICTORY: ${Number(vicAmount) / 1e6} (raw: ${vicAmount})`);
      assert(vicAmount > 0n, `Received VICTORY: ${Number(vicAmount) / 1e6}`);
    }
  }
}

async function testV2SwapVictoryToSui() {
  console.log('\n=== V2 Swap: 100 VICTORY → SUI ===');

  const tx = client.suidex.amm.swap({
    sender: SENDER,
    pairId: SUI_VICTORY_PAIR,
    token0Type: TOKENS.SUI,
    token1Type: TOKENS.VICTORY,
    zeroToOne: false,
    amountIn: 500_000n, // 0.5 VICTORY (6 decimals) — wallet has ~1.9
    minAmountOut: 1n,
  });

  const { success, error, balanceChanges } = await simulate(tx, 'V2 swap VICTORY→SUI');
  assert(success, `V2 swap VICTORY→SUI: ${success ? 'SUCCESS' : error}`);

  if (balanceChanges) {
    const suiChange = balanceChanges.find((c: any) => c.coinType?.includes('sui::SUI') && BigInt(c.amount) > 0n);
    if (suiChange) {
      const suiAmount = BigInt(suiChange.amount);
      console.log(`    Received SUI: ${Number(suiAmount) / 1e9}`);
      assert(suiAmount > 0n, `Received SUI: ${Number(suiAmount) / 1e9}`);
    }
  }
}

// ─── V2 Add Liquidity ────────────────────────────────────────────

async function testV2AddLiquidity() {
  console.log('\n=== V2 Add Liquidity: 0.01 SUI + VICTORY ===');

  const tx = client.suidex.amm.addLiquidity({
    sender: SENDER,
    pairId: SUI_VICTORY_PAIR,
    token0Type: TOKENS.SUI,
    token1Type: TOKENS.VICTORY,
    amount0: 10_000_000n,    // 0.01 SUI
    amount1: 500_000n,       // 0.5 VICTORY
    amount0Min: 0n,
    amount1Min: 0n,
  });

  const { success, error, balanceChanges } = await simulate(tx, 'V2 add liquidity');
  assert(success, `V2 add liquidity: ${success ? 'SUCCESS' : error}`);

  if (balanceChanges) {
    const lpChange = balanceChanges.find((c: any) => c.coinType?.includes('LPCoin'));
    if (lpChange) {
      console.log(`    LP tokens received: ${lpChange.amount}`);
      assert(BigInt(lpChange.amount) > 0n, `Got LP tokens: ${lpChange.amount}`);
    }
  }
}

// ─── xVICTORY Lock ───────────────────────────────────────────────

async function testStakingLock() {
  console.log('\n=== xVICTORY Lock: 10 VICTORY for 7 days ===');

  const tx = client.suidex.staking.lock({
    sender: SENDER,
    amount: 1_000_000n, // 1 VICTORY (minimum for 7-day lock)
    periodDays: 7,
  });

  const { success, error, balanceChanges } = await simulate(tx, 'xVICTORY lock');
  assert(success, `xVICTORY lock: ${success ? 'SUCCESS' : error}`);

  if (balanceChanges) {
    const vicChange = balanceChanges.find((c: any) => c.coinType?.includes('VICTORY'));
    if (vicChange) {
      console.log(`    VICTORY locked: ${Number(BigInt(vicChange.amount)) / 1e6}`);
      assert(BigInt(vicChange.amount) < 0n, `VICTORY was deducted (locked)`);
    }
  }
}

async function testStakingLockInsufficientAmount() {
  console.log('\n=== xVICTORY Lock: Below minimum (should fail) ===');

  const tx = client.suidex.staking.lock({
    sender: SENDER,
    amount: 100_000n, // 0.1 VICTORY — below 1 VICTORY minimum
    periodDays: 7,
  });

  const { success, error } = await simulate(tx, 'Below minimum lock');
  assert(!success, `Below minimum lock correctly rejected: ${(error ?? '').slice(0, 50)}`);
}

// ─── xVICTORY Claim ──────────────────────────────────────────────

async function testStakingClaimVictory() {
  console.log('\n=== xVICTORY Claim VICTORY rewards ===');

  // First discover if wallet has any locks
  const { objects } = await (client as any).core.listOwnedObjects({
    owner: SENDER,
    type: `${V2.PACKAGE_ID}::token_locker::LockPosition`,
    limit: 5,
    include: { json: true },
  });

  if (!objects || objects.length === 0) {
    console.log('  SKIP: No lock positions found for this wallet');
    return;
  }

  const lock = objects[0];
  const lockJson = (lock as any).json;
  const lockId = BigInt(lockJson?.lock_id ?? '0');
  const lockPeriod = Number(lockJson?.lock_period ?? '0');
  console.log(`  Found lock: id=${lockId}, period=${lockPeriod} days`);

  const tx = client.suidex.staking.claimVictory({
    sender: SENDER,
    lockId,
    lockPeriodDays: lockPeriod,
  });

  const { success, error, balanceChanges } = await simulate(tx, 'Claim VICTORY rewards');
  assert(success, `Claim VICTORY: ${success ? 'SUCCESS' : error}`);

  if (balanceChanges) {
    const vicChange = balanceChanges.find((c: any) => c.coinType?.includes('VICTORY') && BigInt(c.amount) > 0n);
    if (vicChange) {
      console.log(`    VICTORY claimed: ${Number(BigInt(vicChange.amount)) / 1e6}`);
    }
  }
}

// ─── Run All ─────────────────────────────────────────────────────

async function main() {
  console.log('@suidex/sdk — Real-World Simulation Tests');
  console.log(`Sender: ${SENDER}`);
  console.log('Mode: simulateTransaction only (no execution)\n');

  // Check wallet balance first
  const bal = await (client as any).core.getBalance({ owner: SENDER });
  const suiBal = Number(BigInt((bal as any).balance?.balance ?? '0')) / 1e9;
  console.log(`Wallet SUI balance: ${suiBal.toFixed(4)} SUI`);

  const vicBal = await (client as any).core.getBalance({
    owner: SENDER,
    coinType: TOKENS.VICTORY,
  });
  const vicBalance = Number(BigInt((vicBal as any).balance?.balance ?? '0')) / 1e6;
  console.log(`Wallet VICTORY balance: ${vicBalance.toFixed(2)} VICTORY`);
  assert(suiBal > 0, `Wallet has SUI: ${suiBal.toFixed(4)}`);
  assert(vicBalance > 0, `Wallet has VICTORY: ${vicBalance.toFixed(2)}`);

  try {
    await testV2SwapSuiToVictory();
    await testV2SwapVictoryToSui();
    await testV2AddLiquidity();
    await testStakingLock();
    await testStakingLockInsufficientAmount();
    await testStakingClaimVictory();
  } catch (err) {
    console.error('\nFATAL:', err);
    failed++;
    failures.push(`FATAL: ${err}`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failures.length) failures.forEach(f => console.log(`  - ${f}`));
  process.exit(failed > 0 ? 1 : 0);
}

main();
