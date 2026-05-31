/**
 * SuiDex — On-chain contract addresses and constants
 *
 * V2 AMM + Farm + xVICTORY Locker: single package
 * V3 CLMM: separate package
 */

// ─── V2 AMM Core ─────────────────────────────────────────────────

export const V2 = {
  PACKAGE_ID: '0xbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a',
  FACTORY_ID: '0x81c286135713b4bf2e78c548f5643766b5913dcd27a8e76469f146ab811e922d',
  ROUTER_ID: '0x9cdbbd092634efdc0e7033dc1c49d9ea5fc9bc5969ba708f55e05b6fcac12177',
  CLOCK_ID: '0x6',
} as const;

// ─── Farm (MasterChef) ───────────────────────────────────────────

export const FARM = {
  FARM_ID: '0xc9c6844deb5031e87f14a9869736874327e4f7b9e2aef51c47f4e004c5b1053c',
  REWARD_VAULT_ID: '0x227929e900c085a1e55f7e455d3af66aa0f522cf26dc54ed3e111dc8797a3e00',
  EMISSION_CONTROLLER_ID: '0xfbd4d5f644cc82e7486ceb048b8951a6efffe39254a6646d99f0ea6b81b5c5f4',
} as const;

// ─── xVICTORY Locker ─────────────────────────────────────────────

export const LOCKER = {
  TOKEN_LOCKER_ID: '0xb604843d501173f9ea0762fbaa7cadaea3454c942deb527cb8905861ce39798b',
  LOCKED_TOKEN_VAULT_ID: '0x3632b8acce355fc8237998d44f1a68e58baac95f199714cdef5736d580dc6bf1',
  VICTORY_REWARD_VAULT_ID: '0xb70212065c2af0107a799517517e9170fcd38211aaa66f0ebc5a764d0506e2cc',
  SUI_REWARD_VAULT_ID: '0xd781268befec0270299d5089f182d8c1f1caed15f8b7db3fa1a267b73e89ce9f',
  EMISSION_CONTROLLER_ID: '0xfbd4d5f644cc82e7486ceb048b8951a6efffe39254a6646d99f0ea6b81b5c5f4',
} as const;

// ─── V3 CLMM ─────────────────────────────────────────────────────

export const V3 = {
  PACKAGE_ID: '0xb5f529c1dcda6580a61bf7ee9fbd524b50be62f11044d137c8202c8cbace9e56',
  VERSION_ID: '0x0999bbc9c063580eca62e888b8f0d8e6e9159cd9db1b8a8c88e448a2b5dd4d4d',
  CLOCK_ID: '0x6',
} as const;

// ─── Token Types ─────────────────────────────────────────────────

export const TOKENS = {
  SUI: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
  VICTORY: '0xbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a::victory_token::VICTORY_TOKEN',
  USDC: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
} as const;

// ─── Move Function Targets ───────────────────────────────────────

const PKG = V2.PACKAGE_ID;

export const TARGETS = {
  // Router
  SWAP_T0_FOR_T1: `${PKG}::router::swap_exact_tokens0_for_tokens1`,
  SWAP_T1_FOR_T0: `${PKG}::router::swap_exact_tokens1_for_tokens0`,
  SWAP_T0_FOR_T1_COMPOSABLE: `${PKG}::router::swap_exact_tokens0_for_tokens1_composable`,
  SWAP_T1_FOR_T0_COMPOSABLE: `${PKG}::router::swap_exact_tokens1_for_tokens0_composable`,
  ADD_LIQUIDITY: `${PKG}::router::add_liquidity`,
  REMOVE_LIQUIDITY: `${PKG}::router::remove_liquidity`,

  // Farm
  STAKE_LP: `${PKG}::suifarm::stake_lp`,
  STAKE_SINGLE: `${PKG}::suifarm::stake_single_token`,
  UNSTAKE_LP: `${PKG}::suifarm::unstake_lp`,
  UNSTAKE_SINGLE: `${PKG}::suifarm::unstake_single_token`,
  CLAIM_FARM_REWARDS: `${PKG}::suifarm::claim_victory_rewards`,
  CLAIM_FARM_REWARDS_SINGLE: `${PKG}::suifarm::claim_single_rewards`,

  // Locker (xVICTORY)
  LOCK_VICTORY: `${PKG}::token_locker::lock_tokens`,
  UNLOCK_VICTORY: `${PKG}::token_locker::unlock_tokens`,
  CLAIM_LOCKER_VICTORY: `${PKG}::token_locker::claim_victory_rewards`,
  BATCH_CLAIM_EPOCHS: `${PKG}::token_locker::batch_claim_epochs_for_lock`,
} as const;

// ─── Shared Constants ────────────────────────────────────────────

export const LOCK_PERIODS = {
  WEEK: 7,
  THREE_MONTHS: 90,
  ONE_YEAR: 365,
  THREE_YEARS: 1095,
} as const;

export const VALID_LOCK_PERIODS = [7, 90, 365, 1095] as const;
export const MAX_EPOCHS_PER_TX = 200;
