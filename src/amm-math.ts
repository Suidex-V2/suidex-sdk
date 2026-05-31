/**
 * SuiDex V2 — Constant product AMM math
 *
 * x * y = k model with 0.30% swap fee (matching Uniswap V2)
 */

/** Calculate output amount for a constant-product swap (x * y = k). */
export function getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n;
  const amountInWithFee = amountIn * 997n; // 0.3% fee
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;
  return numerator / denominator;
}

/** Calculate input amount needed for a desired output. */
export function getAmountIn(amountOut: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountOut <= 0n || reserveIn <= 0n || reserveOut <= amountOut) return 0n;
  const numerator = reserveIn * amountOut * 1000n;
  const denominator = (reserveOut - amountOut) * 997n;
  return numerator / denominator + 1n;
}

/** Calculate price impact as a percentage. */
export function calculatePriceImpact(
  amountIn: bigint, amountOut: bigint,
  reserveIn: bigint, reserveOut: bigint,
): number {
  if (reserveIn <= 0n || reserveOut <= 0n || amountIn <= 0n) return 0;
  // Spot price: reserveOut / reserveIn
  // Execution price: amountOut / amountIn
  // Impact = 1 - (executionPrice / spotPrice) = 1 - (amountOut * reserveIn) / (amountIn * reserveOut)
  const spotNumerator = amountOut * reserveIn;
  const spotDenominator = amountIn * reserveOut;
  if (spotDenominator <= 0n) return 0;
  const impactScaled = ((spotDenominator - spotNumerator) * 10000n) / spotDenominator;
  return Math.max(0, Number(impactScaled) / 100);
}

/** Calculate LP tokens minted for a deposit. */
export function calculateLpMint(
  amount0: bigint, amount1: bigint,
  reserve0: bigint, reserve1: bigint,
  totalSupply: bigint,
): bigint {
  if (totalSupply === 0n) {
    // Initial liquidity: sqrt(amount0 * amount1)
    return sqrt(amount0 * amount1);
  }
  const lp0 = (amount0 * totalSupply) / reserve0;
  const lp1 = (amount1 * totalSupply) / reserve1;
  return lp0 < lp1 ? lp0 : lp1;
}

/** Integer square root (Babylonian method). */
function sqrt(n: bigint): bigint {
  if (n <= 0n) return 0n;
  if (n <= 3n) return 1n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }
  return x;
}
