/**
 * SuiDex SDK — Type definitions
 */

// ─── V2 AMM ──────────────────────────────────────────────────────

export interface V2Pool {
  pairId: string;
  token0Type: string;
  token1Type: string;
  reserve0: bigint;
  reserve1: bigint;
  lpSupply: bigint;
  feeRate: number;
}

export interface V2SwapParams {
  sender: string;
  pairId: string;
  token0Type: string;
  token1Type: string;
  /** true = token0 → token1, false = token1 → token0 */
  zeroToOne: boolean;
  amountIn: bigint;
  minAmountOut: bigint;
}

export interface V2AddLiquidityParams {
  sender: string;
  pairId: string;
  token0Type: string;
  token1Type: string;
  amount0: bigint;
  amount1: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
}

export interface V2RemoveLiquidityParams {
  sender: string;
  pairId: string;
  token0Type: string;
  token1Type: string;
  lpAmount: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
}

// ─── Farm ────────────────────────────────────────────────────────

export interface FarmStakeParams {
  sender: string;
  token0Type: string;
  token1Type: string;
  lpAmount: bigint;
  /** Existing staking position ID (if adding to existing) */
  existingPositionId?: string;
}

export interface FarmUnstakeParams {
  sender: string;
  token0Type: string;
  token1Type: string;
  positionId: string;
}

export interface FarmClaimParams {
  sender: string;
  token0Type: string;
  token1Type: string;
  positionId: string;
}

// ─── xVICTORY Locker ─────────────────────────────────────────────

export interface LockParams {
  sender: string;
  /** Amount of VICTORY to lock (raw, 6 decimals) */
  amount: bigint;
  /** Lock period in days: 7, 90, 365, or 1095 */
  periodDays: 7 | 90 | 365 | 1095;
}

export interface UnlockParams {
  sender: string;
  lockId: bigint;
  lockPeriodDays: number;
}

export interface ClaimVictoryRewardsParams {
  sender: string;
  lockId: bigint;
  lockPeriodDays: number;
}

export interface ClaimSuiRewardsParams {
  sender: string;
  lockId: bigint;
  epochIds: bigint[];
}

export interface BatchClaimAllParams {
  sender: string;
  lockId: bigint;
  epochIds: bigint[];
}

// ─── SDK Options ─────────────────────────────────────────────────

export interface SuiDexSDKOptions<Name = 'suidex'> {
  name?: Name;
}
