/**
 * @suidex/sdk — Complete DeFi SDK for SuiDex on Sui
 *
 * Covers V2 AMM, LP farming, xVICTORY staking, and V3 CLMM.
 *
 * Quick start:
 *   import { SuiGrpcClient } from '@mysten/sui/grpc';
 *   import { suidex } from '@suidex/sdk';
 *
 *   const client = new SuiGrpcClient({
 *     network: 'mainnet',
 *     baseUrl: 'https://fullnode.mainnet.sui.io:443',
 *   }).$extend(suidex());
 *
 *   // V2 swap
 *   const tx = client.suidex.amm.swap({ ... });
 *
 *   // Farm stake
 *   const tx = client.suidex.farm.stake({ ... });
 *
 *   // xVICTORY lock
 *   const tx = client.suidex.staking.lock({ amount: 10_000_000n, periodDays: 365, sender });
 */

// Client extension
export { suidex, SuiDexClient } from './sdk.js';

// Types
export type {
  V2Pool,
  V2SwapParams,
  V2AddLiquidityParams,
  V2RemoveLiquidityParams,
  FarmStakeParams,
  FarmUnstakeParams,
  FarmClaimParams,
  LockParams,
  UnlockParams,
  ClaimVictoryRewardsParams,
  ClaimSuiRewardsParams,
  BatchClaimAllParams,
  SuiDexSDKOptions,
} from './types.js';

// AMM Math
export {
  getAmountOut,
  getAmountIn,
  calculatePriceImpact,
  calculateLpMint,
} from './amm-math.js';

// Constants
export {
  V2, V3, FARM, LOCKER, TOKENS, TARGETS,
  LOCK_PERIODS, VALID_LOCK_PERIODS, MAX_EPOCHS_PER_TX,
} from './constants.js';
