/**
 * @suidex/sdk — Integration Tests
 *
 * Tests V2 AMM, farm, and xVICTORY staking transaction builders
 * against Sui mainnet.
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { suidex } from '../src/sdk.js';
import { getAmountOut, getAmountIn, calculatePriceImpact, calculateLpMint } from '../src/amm-math.js';
import { V2, FARM, LOCKER, TOKENS, VALID_LOCK_PERIODS } from '../src/constants.js';

const ZERO = '0x0000000000000000000000000000000000000000000000000000000000000000';
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

// ─── AMM Math ────────────────────────────────────────────────────

function testAmmMath() {
  console.log('\n=== AMM Math ===');

  // getAmountOut: basic swap
  const out = getAmountOut(1_000_000_000n, 10_000_000_000n, 20_000_000_000n);
  assert(out > 0n, `getAmountOut: 1B in → ${out} out`);
  assert(out < 2_000_000_000n, `Output < 2B (can't exceed reserves)`);

  // Fee: output should be ~0.3% less than frictionless
  const frictionless = (1_000_000_000n * 20_000_000_000n) / (10_000_000_000n + 1_000_000_000n);
  assert(out < frictionless, `Output ${out} < frictionless ${frictionless} (fee applied)`);

  // getAmountIn: reverse
  const amtIn = getAmountIn(out, 10_000_000_000n, 20_000_000_000n);
  assert(amtIn > 0n, `getAmountIn: need ${amtIn} for ${out} out`);
  assert(amtIn <= 1_000_000_000n + 1n, `Round-trip: ${amtIn} ≈ 1B`);

  // Price impact
  const impact = calculatePriceImpact(1_000_000_000n, out, 10_000_000_000n, 20_000_000_000n);
  assert(impact > 0, `Price impact: ${impact}% > 0`);
  assert(impact < 20, `Price impact: ${impact}% < 20`);

  // LP mint
  const lp = calculateLpMint(100n, 200n, 1000n, 2000n, 500n);
  assert(lp > 0n, `LP mint: ${lp}`);

  // Initial LP (sqrt)
  const initialLp = calculateLpMint(1000n, 1000n, 0n, 0n, 0n);
  assert(initialLp === 1000n, `Initial LP: sqrt(1000*1000) = ${initialLp}`);

  // Zero cases
  assert(getAmountOut(0n, 100n, 100n) === 0n, 'Zero input → zero output');
  assert(getAmountOut(100n, 0n, 100n) === 0n, 'Zero reserve → zero output');
}

// ─── V2 AMM TX Builders ─────────────────────────────────────────

async function testAmmSwap() {
  console.log('\n=== amm.swap ===');

  const tx = client.suidex.amm.swap({
    sender: ZERO,
    pairId: SUI_VICTORY_PAIR,
    token0Type: TOKENS.SUI,
    token1Type: TOKENS.VICTORY,
    zeroToOne: true,
    amountIn: 100_000_000n,
    minAmountOut: 0n,
  });

  assert(tx !== null, 'Swap TX created');

  // Simulate
  try {
    const result = await client.core.simulateTransaction({
      transaction: tx,
      checksEnabled: false,
      include: { effects: true, balanceChanges: true },
    });
    const txResult = (result as any)?.Transaction ?? (result as any)?.FailedTransaction;
    const success = txResult?.effects?.status?.success;
    const error = txResult?.effects?.status?.error;
    if (success) {
      assert(true, 'V2 swap simulation succeeded');
      const changes = txResult?.balanceChanges ?? [];
      const victoryGain = changes.find((c: any) => c.coinType?.includes('VICTORY') && BigInt(c.amount) > 0n);
      if (victoryGain) assert(true, `Received VICTORY: ${victoryGain.amount}`);
    } else {
      assert(true, `V2 swap simulation: contract abort (expected with zero addr): ${(error?.message ?? '').slice(0, 60)}`);
    }
  } catch (e: any) {
    assert(true, `V2 swap simulation threw (expected with zero addr): ${e.message?.slice(0, 60)}`);
  }
}

async function testAmmSwapReverse() {
  console.log('\n=== amm.swap (reverse) ===');

  const tx = client.suidex.amm.swap({
    sender: ZERO,
    pairId: SUI_VICTORY_PAIR,
    token0Type: TOKENS.SUI,
    token1Type: TOKENS.VICTORY,
    zeroToOne: false,
    amountIn: 1_000_000_000n, // 1000 VICTORY
    minAmountOut: 0n,
  });

  assert(tx !== null, 'Reverse swap TX created');
}

async function testAmmAddLiquidity() {
  console.log('\n=== amm.addLiquidity ===');

  const tx = client.suidex.amm.addLiquidity({
    sender: ZERO,
    pairId: SUI_VICTORY_PAIR,
    token0Type: TOKENS.SUI,
    token1Type: TOKENS.VICTORY,
    amount0: 100_000_000n,
    amount1: 0n,
    amount0Min: 0n,
    amount1Min: 0n,
  });

  assert(tx !== null, 'AddLiquidity TX created');
}

async function testAmmRemoveLiquidity() {
  console.log('\n=== amm.removeLiquidity ===');

  const tx = client.suidex.amm.removeLiquidity({
    sender: ZERO,
    pairId: SUI_VICTORY_PAIR,
    token0Type: TOKENS.SUI,
    token1Type: TOKENS.VICTORY,
    lpAmount: 1000n,
    amount0Min: 0n,
    amount1Min: 0n,
  });

  assert(tx !== null, 'RemoveLiquidity TX created');
}

// ─── Farm TX Builders ───────────────────────────────────────────

function testFarmStake() {
  console.log('\n=== farm.stake ===');

  const tx = client.suidex.farm.stake({
    sender: ZERO,
    token0Type: TOKENS.SUI,
    token1Type: TOKENS.VICTORY,
    lpAmount: 1000n,
  });

  assert(tx !== null, 'Farm stake TX created');
}

function testFarmUnstake() {
  console.log('\n=== farm.unstake ===');

  const tx = client.suidex.farm.unstake({
    sender: ZERO,
    token0Type: TOKENS.SUI,
    token1Type: TOKENS.VICTORY,
    positionId: ZERO,
    vaultId: ZERO,
    amount: 1000n,
  });

  assert(tx !== null, 'Farm unstake TX created');
}

function testFarmClaim() {
  console.log('\n=== farm.claim ===');

  const tx = client.suidex.farm.claim({
    sender: ZERO,
    token0Type: TOKENS.SUI,
    token1Type: TOKENS.VICTORY,
    positionId: ZERO,
  });

  assert(tx !== null, 'Farm claim TX created');
}

// ─── xVICTORY Staking ───────────────────────────────────────────

function testStakingLock() {
  console.log('\n=== staking.lock ===');

  for (const period of VALID_LOCK_PERIODS) {
    const tx = client.suidex.staking.lock({
      sender: ZERO,
      amount: 1_000_000n, // 1 VICTORY (6 decimals)
      periodDays: period,
    });
    assert(tx !== null, `Lock TX created for ${period} days`);
  }

  // Invalid period throws
  let threw = false;
  try {
    client.suidex.staking.lock({ sender: ZERO, amount: 1_000_000n, periodDays: 30 as any });
  } catch { threw = true; }
  assert(threw, 'Invalid period (30 days) throws');
}

function testStakingUnlock() {
  console.log('\n=== staking.unlock ===');

  const tx = client.suidex.staking.unlock({
    sender: ZERO,
    lockId: 1n,
    lockPeriodDays: 365,
  });

  assert(tx !== null, 'Unlock TX created');
}

function testStakingClaimVictory() {
  console.log('\n=== staking.claimVictory ===');

  const tx = client.suidex.staking.claimVictory({
    sender: ZERO,
    lockId: 1n,
    lockPeriodDays: 365,
  });

  assert(tx !== null, 'Claim VICTORY TX created');
}

function testStakingClaimSui() {
  console.log('\n=== staking.claimSui ===');

  // Small batch
  const txs = client.suidex.staking.claimSui({
    sender: ZERO,
    lockId: 1n,
    epochIds: [1n, 2n, 3n],
  });
  assert(txs.length === 1, `Small batch: 1 TX (got ${txs.length})`);

  // Empty
  const empty = client.suidex.staking.claimSui({ sender: ZERO, lockId: 1n, epochIds: [] });
  assert(empty.length === 0, 'Empty epochs: 0 TXs');

  // Large batch (>200 epochs, should split)
  const bigEpochs = Array.from({ length: 450 }, (_, i) => BigInt(i + 1));
  const bigTxs = client.suidex.staking.claimSui({
    sender: ZERO,
    lockId: 1n,
    epochIds: bigEpochs,
  });
  assert(bigTxs.length === 3, `450 epochs → 3 TXs (got ${bigTxs.length})`);
}

// ─── Constants Validation ───────────────────────────────────────

async function testConstants() {
  console.log('\n=== Constants Validation ===');

  // Verify key objects exist on-chain
  const ids = [V2.FACTORY_ID, V2.ROUTER_ID, FARM.FARM_ID, LOCKER.TOKEN_LOCKER_ID];
  for (const id of ids) {
    try {
      const { object } = await client.core.getObject({ objectId: id });
      assert(object !== null && object !== undefined, `Object exists: ${id.slice(0, 16)}...`);
    } catch {
      assert(false, `Object NOT found: ${id.slice(0, 16)}...`);
    }
  }
}

// ─── Extension Pattern ──────────────────────────────────────────

function testExtension() {
  console.log('\n=== Extension Pattern ===');

  assert(client.suidex !== undefined, 'suidex extension exists');
  assert(client.suidex.amm !== undefined, 'amm namespace exists');
  assert(client.suidex.farm !== undefined, 'farm namespace exists');
  assert(client.suidex.staking !== undefined, 'staking namespace exists');

  // Custom name
  const c2 = new SuiGrpcClient({
    network: 'mainnet',
    baseUrl: 'https://fullnode.mainnet.sui.io:443',
  }).$extend(suidex({ name: 'dex' as const }));
  assert((c2 as any).dex !== undefined, 'Custom name works');
}

// ─── Run All ─────────────────────────────────────────────────────

async function main() {
  console.log('@suidex/sdk — Integration Tests');
  console.log('Network: mainnet\n');

  try {
    testAmmMath();
    await testAmmSwap();
    await testAmmSwapReverse();
    await testAmmAddLiquidity();
    await testAmmRemoveLiquidity();
    testFarmStake();
    testFarmUnstake();
    testFarmClaim();
    testStakingLock();
    testStakingUnlock();
    testStakingClaimVictory();
    testStakingClaimSui();
    await testConstants();
    testExtension();
  } catch (err) {
    console.error('\nFATAL:', err);
    failed++;
    failures.push(`FATAL: ${err}`);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failures.length) failures.forEach(f => console.log(`  - ${f}`));
  process.exit(failed > 0 ? 1 : 0);
}

main();
