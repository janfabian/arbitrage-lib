import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { getDenom } from '../lib.js'
import { DEX, SwapOperation } from '../types/cosm.js'
import { AssetInfoJuno } from '../types/juno.js'

export function encodeJunoTokens(token1: string, token2: string): string {
  return token1 + '::' + token2
}

export function decodeJunoTokens(decoded: string): [string, string] {
  const [token1, token2] = decoded.split('::')
  if (!token1 || !token2) {
    throw new Error('unparsable juno token')
  }
  return [token1, token2]
}

export function createJunoSwapPair(
  contract: string,
  token1: AssetInfoJuno,
  token2: AssetInfoJuno,
): DEX {
  const decodedJunoTokensOrder = encodeJunoTokens(
    getDenom(token1),
    getDenom(token2),
  )

  return {
    id: contract,
    label: decodedJunoTokensOrder,
    factory: contract,
    router: contract,
    swapName: decodedJunoTokensOrder,
  }
}

export async function simulateJunoSwap(
  amount: string,
  swapOps: SwapOperation[],
  client: SigningCosmWasmClient,
): Promise<[string, string[]]> {
  const allResults: string[] = []
  let finalAmount = amount
  for (const op of swapOps) {
    const [token1] = decodeJunoTokens(op.offer.dex.swapName)
    const query =
      token1 === getDenom(op.offer.assetInfo)
        ? {
            token1_for_token2_price: {
              token1_amount: finalAmount,
            },
          }
        : {
            token2_for_token1_price: {
              token2_amount: finalAmount,
            },
          }
    const response = await client.queryContractSmart(op.offer.dex.router, query)

    finalAmount = response.token1_amount || response.token2_amount

    allResults.push(finalAmount)
  }

  return [finalAmount, allResults]
}
