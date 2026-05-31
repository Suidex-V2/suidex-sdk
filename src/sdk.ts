/**
 * SuiDex Unified SDK
 *
 * Complete DeFi SDK for SuiDex on Sui:
 *   - amm.*      — V2 constant product swap & liquidity
 *   - farm.*     — LP farming (stake, unstake, claim VICTORY)
 *   - staking.*  — xVICTORY locker (lock, unlock, claim rewards)
 *
 * Uses the Sui SDK client extension pattern.
 *
 * Usage:
 *   const client = new SuiGrpcClient({ ... }).$extend(suidex());
 *   const tx = client.suidex.amm.swap({ ... });
 *   const tx = client.suidex.staking.lock({ ... });
 */

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { Transaction, coinWithBalance } from '@mysten/sui/transactions';
import { V2, FARM, LOCKER, TARGETS, TOKENS, VALID_LOCK_PERIODS, MAX_EPOCHS_PER_TX } from './constants.js';
import type {
  V2SwapParams, V2AddLiquidityParams, V2RemoveLiquidityParams,
  FarmStakeParams, FarmUnstakeParams, FarmClaimParams,
  LockParams, UnlockParams, ClaimVictoryRewardsParams, ClaimSuiRewardsParams, BatchClaimAllParams,
  SuiDexSDKOptions,
} from './types.js';

// ─── Client Extension Factory ────────────────────────────────────

export function suidex<const Name = 'suidex'>({
  name = 'suidex' as Name,
}: SuiDexSDKOptions<Name> = {}) {
  return {
    name,
    register: (client: ClientWithCoreApi) => {
      return new SuiDexClient({ client });
    },
  };
}

// ─── SDK Client ──────────────────────────────────────────────────

export class SuiDexClient {
  #client: ClientWithCoreApi;

  constructor({ client }: { client: ClientWithCoreApi }) {
    this.#client = client;
  }

  // ═══════════════════════════════════════════════════════════════
  // V2 AMM — Constant Product Swap & Liquidity
  // ═══════════════════════════════════════════════════════════════

  amm = {
    /** Build a V2 AMM swap transaction. */
    swap: (params: V2SwapParams): Transaction => {
      const { sender, pairId, token0Type, token1Type, zeroToOne, amountIn, minAmountOut } = params;
      const tx = this.#newTx(sender);

      const inputType = zeroToOne ? token0Type : token1Type;
      const inputCoin = this.#prepareCoin(tx, inputType, amountIn);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);

      // V2 entry: swap_exact_tokens(router, factory, pair, coin, desired_amount_in:u256, amount_out_min:u256, deadline:u64, clock)
      tx.moveCall({
        target: zeroToOne ? TARGETS.SWAP_T0_FOR_T1 : TARGETS.SWAP_T1_FOR_T0,
        typeArguments: [token0Type, token1Type],
        arguments: [
          tx.object(V2.ROUTER_ID),
          tx.object(V2.FACTORY_ID),
          tx.object(pairId),
          inputCoin,
          tx.pure.u256(amountIn),
          tx.pure.u256(minAmountOut),
          tx.pure.u64(deadline),
          tx.object(V2.CLOCK_ID),
        ],
      });

      return tx;
    },

    /** Build a V2 add_liquidity transaction. */
    addLiquidity: (params: V2AddLiquidityParams): Transaction => {
      const { sender, pairId, token0Type, token1Type, amount0, amount1, amount0Min, amount1Min } = params;
      const tx = this.#newTx(sender);

      const coin0 = this.#prepareCoin(tx, token0Type, amount0);
      const coin1 = this.#prepareCoin(tx, token1Type, amount1);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);

      tx.moveCall({
        target: TARGETS.ADD_LIQUIDITY,
        typeArguments: [token0Type, token1Type],
        arguments: [
          tx.object(V2.ROUTER_ID),
          tx.object(V2.FACTORY_ID),
          tx.object(pairId),
          coin0, coin1,
          tx.pure.u256(amount0Min),
          tx.pure.u256(amount1Min),
          tx.pure.u64(deadline),
          tx.object(V2.CLOCK_ID),
        ],
      });

      return tx;
    },

    /** Build a V2 remove_liquidity transaction. */
    removeLiquidity: (params: V2RemoveLiquidityParams): Transaction => {
      const { sender, pairId, token0Type, token1Type, lpAmount, amount0Min, amount1Min } = params;
      const tx = this.#newTx(sender);

      const lpType = `${V2.PACKAGE_ID}::pair::LPCoin<${token0Type}, ${token1Type}>`;
      const lpCoin = coinWithBalance({ type: lpType, balance: lpAmount });
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);

      tx.moveCall({
        target: TARGETS.REMOVE_LIQUIDITY,
        typeArguments: [token0Type, token1Type],
        arguments: [
          tx.object(V2.ROUTER_ID),
          tx.object(V2.FACTORY_ID),
          tx.object(pairId),
          lpCoin,
          tx.pure.u256(amount0Min),
          tx.pure.u256(amount1Min),
          tx.pure.u64(deadline),
          tx.object(V2.CLOCK_ID),
        ],
      });

      return tx;
    },
  };

  // ═══════════════════════════════════════════════════════════════
  // Farm — LP Staking & VICTORY Rewards
  // ═══════════════════════════════════════════════════════════════

  farm = {
    /** Build a stake LP tokens transaction. */
    stake: (params: FarmStakeParams): Transaction => {
      const { sender, token0Type, token1Type, lpAmount, existingPositionId } = params;
      const tx = this.#newTx(sender);

      const lpType = `${V2.PACKAGE_ID}::pair::LPCoin<${token0Type}, ${token1Type}>`;
      const lpCoin = coinWithBalance({ type: lpType, balance: lpAmount });

      if (existingPositionId) {
        // Add to existing position
        tx.moveCall({
          target: `${V2.PACKAGE_ID}::suifarm::add_to_position_lp`,
          typeArguments: [token0Type, token1Type],
          arguments: [
            tx.object(FARM.FARM_ID),
            tx.object(FARM.REWARD_VAULT_ID),
            tx.object(FARM.EMISSION_CONTROLLER_ID),
            tx.object(existingPositionId),
            lpCoin,
            tx.object(V2.CLOCK_ID),
          ],
        });
      } else {
        // Create new staking position
        tx.moveCall({
          target: TARGETS.STAKE_LP,
          typeArguments: [token0Type, token1Type],
          arguments: [
            tx.object(FARM.FARM_ID),
            tx.object(FARM.REWARD_VAULT_ID),
            tx.object(FARM.EMISSION_CONTROLLER_ID),
            lpCoin,
            tx.pure.u64(lpAmount),
            tx.object(V2.CLOCK_ID),
          ],
        });
      }

      return tx;
    },

    /** Build an unstake LP tokens transaction. Returns LP + pending VICTORY. */
    unstake: (params: FarmUnstakeParams): Transaction => {
      const { sender, token0Type, token1Type, positionId } = params;
      const tx = this.#newTx(sender);

      tx.moveCall({
        target: TARGETS.UNSTAKE_LP,
        typeArguments: [token0Type, token1Type],
        arguments: [
          tx.object(FARM.FARM_ID),
          tx.object(FARM.REWARD_VAULT_ID),
          tx.object(FARM.EMISSION_CONTROLLER_ID),
          tx.object(positionId),
          tx.object(V2.CLOCK_ID),
        ],
      });

      return tx;
    },

    /** Build a claim VICTORY rewards transaction (without unstaking). */
    claim: (params: FarmClaimParams): Transaction => {
      const { sender, token0Type, token1Type, positionId } = params;
      const tx = this.#newTx(sender);

      tx.moveCall({
        target: TARGETS.CLAIM_FARM_REWARDS,
        typeArguments: [token0Type, token1Type],
        arguments: [
          tx.object(FARM.FARM_ID),
          tx.object(FARM.REWARD_VAULT_ID),
          tx.object(FARM.EMISSION_CONTROLLER_ID),
          tx.object(positionId),
          tx.object(V2.CLOCK_ID),
        ],
      });

      return tx;
    },
  };

  // ═══════════════════════════════════════════════════════════════
  // xVICTORY Staking — Lock, Unlock, Claim Rewards
  // ═══════════════════════════════════════════════════════════════

  staking = {
    /**
     * Build a lock VICTORY → xVICTORY transaction.
     * Lock periods: 7 days, 90 days, 365 days, 1095 days (3 years).
     * Longer locks earn higher VICTORY emission share + SUI epoch rewards.
     */
    lock: (params: LockParams): Transaction => {
      const { sender, amount, periodDays } = params;
      if (!VALID_LOCK_PERIODS.includes(periodDays)) {
        throw new Error(`Invalid lock period: ${periodDays}. Must be one of: ${VALID_LOCK_PERIODS.join(', ')}`);
      }

      const tx = this.#newTx(sender);
      const victoryCoin = coinWithBalance({ type: TOKENS.VICTORY, balance: amount });

      tx.moveCall({
        target: TARGETS.LOCK_VICTORY,
        arguments: [
          tx.object(LOCKER.TOKEN_LOCKER_ID),
          tx.object(LOCKER.LOCKED_TOKEN_VAULT_ID),
          victoryCoin,
          tx.pure.u64(BigInt(periodDays)),
          tx.object(LOCKER.EMISSION_CONTROLLER_ID),
          tx.object(V2.CLOCK_ID),
        ],
      });

      return tx;
    },

    /**
     * Build an unlock transaction. Only works after lock period expires.
     * Auto-claims all pending VICTORY + SUI rewards.
     */
    unlock: (params: UnlockParams): Transaction => {
      const { sender, lockId, lockPeriodDays } = params;
      const tx = this.#newTx(sender);

      tx.moveCall({
        target: TARGETS.UNLOCK_VICTORY,
        arguments: [
          tx.object(LOCKER.TOKEN_LOCKER_ID),
          tx.object(LOCKER.LOCKED_TOKEN_VAULT_ID),
          tx.object(LOCKER.VICTORY_REWARD_VAULT_ID),
          tx.object(LOCKER.SUI_REWARD_VAULT_ID),
          tx.object(LOCKER.EMISSION_CONTROLLER_ID),
          tx.pure.u64(lockId),
          tx.pure.u64(BigInt(lockPeriodDays)),
          tx.object(V2.CLOCK_ID),
        ],
      });

      return tx;
    },

    /** Claim pending VICTORY rewards without unlocking. */
    claimVictory: (params: ClaimVictoryRewardsParams): Transaction => {
      const { sender, lockId, lockPeriodDays } = params;
      const tx = this.#newTx(sender);

      tx.moveCall({
        target: TARGETS.CLAIM_LOCKER_VICTORY,
        arguments: [
          tx.object(LOCKER.TOKEN_LOCKER_ID),
          tx.object(LOCKER.VICTORY_REWARD_VAULT_ID),
          tx.object(LOCKER.EMISSION_CONTROLLER_ID),
          tx.pure.u64(lockId),
          tx.pure.u64(BigInt(lockPeriodDays)),
          tx.object(V2.CLOCK_ID),
        ],
      });

      return tx;
    },

    /**
     * Batch claim SUI epoch rewards. Auto-splits into multiple TXs
     * if more than 200 epochs (contract limit per TX).
     */
    claimSui: (params: ClaimSuiRewardsParams): Transaction[] => {
      const { sender, lockId, epochIds } = params;
      if (epochIds.length === 0) return [];

      const transactions: Transaction[] = [];
      for (let i = 0; i < epochIds.length; i += MAX_EPOCHS_PER_TX) {
        const batch = epochIds.slice(i, i + MAX_EPOCHS_PER_TX);
        const tx = this.#newTx(sender);

        tx.moveCall({
          target: TARGETS.BATCH_CLAIM_EPOCHS,
          arguments: [
            tx.object(LOCKER.TOKEN_LOCKER_ID),
            tx.object(LOCKER.SUI_REWARD_VAULT_ID),
            tx.pure.u64(lockId),
            tx.pure.vector('u64', batch),
            tx.object(LOCKER.EMISSION_CONTROLLER_ID),
            tx.object(V2.CLOCK_ID),
          ],
        });

        transactions.push(tx);
      }

      return transactions;
    },

    /**
     * Batch claim VICTORY + SUI rewards in one TX per batch.
     * Convenience method combining claimVictory + claimSui.
     */
    claimAll: (params: BatchClaimAllParams): Transaction[] => {
      return this.staking.claimSui(params);
    },
  };

  // ─── Internal Helpers ────────────────────────────────────────

  #newTx(sender: string): Transaction {
    const tx = new Transaction();
    tx.setSender(sender);
    tx.setExpiration({ None: true });
    return tx;
  }

  #prepareCoin(tx: Transaction, coinType: string, amount: bigint): any {
    if (coinType.endsWith('::sui::SUI')) {
      return tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);
    }
    return coinWithBalance({ type: coinType, balance: amount });
  }
}
