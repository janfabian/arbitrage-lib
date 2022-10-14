import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import {
  AssetInfo,
  AssetInfoNative,
  AssetInfoRaw,
  AssetInfoToken,
  GraphAssetNodeId,
  GraphAssetNodeMap,
  PairTypeStable,
  PairTypeXyk,
  SimulateOperation,
  SwapOperation,
} from '../types/cosm.js'

export function toRaw<K>(obj: any): K {
  delete obj.kind

  return obj
}

export function toKindPairType(pairTypeRaw: any) {
  if (pairTypeRaw.xyk) {
    return {
      kind: 'xyk',
      ...pairTypeRaw,
    } as PairTypeXyk
  }

  if (pairTypeRaw.stable) {
    return {
      kind: 'stable',
      ...pairTypeRaw,
    } as PairTypeStable
  }
}

export function toKindAssetInto(assetInfo: any) {
  if (assetInfo.token) {
    return {
      kind: 'token',
      ...assetInfo,
    } as AssetInfoToken
  }

  if (assetInfo.native_token) {
    return {
      kind: 'native',
      ...assetInfo,
    } as AssetInfoNative
  }
}

export function getDenom(assetInfo: AssetInfo) {
  switch (assetInfo.kind) {
    case 'native':
      return assetInfo.native_token.denom
    case 'token':
      return assetInfo.token.contract_addr
    /* c8 ignore start */
    default: {
      const _exhaustiveCheck: never = assetInfo
      return _exhaustiveCheck
    }
    /* c8 ignore end */
  }
}

export function swapOpsFromPath(
  path: GraphAssetNodeId[],
  assetMap: GraphAssetNodeMap,
): SwapOperation[] {
  const ops = path
    .map((_node, ix) => path.slice(ix, ix + 2))
    .slice(0, -1)
    .map((hop) => {
      const offer = assetMap[hop[0]]
      const ask = assetMap[hop[1]]

      if (!offer) {
        throw new Error(`Missing offer asset in map ${hop[0]}`)
      }

      if (!ask) {
        throw new Error(`Missing ask asset in map ${hop[1]}`)
      }

      return {
        offer,
        ask,
      }
    })

  const result: SwapOperation[] = []

  for (const op of ops) {
    if (op.offer.dex.id === op.ask.dex.id) {
      result.push(op)
      continue
    }

    if (getDenom(op.offer.assetInfo) !== getDenom(op.ask.assetInfo)) {
      throw new Error('Unsupported cross DEX swap')
    }

    if (result.length < 1) {
      throw new Error('Cant route an operation if theres not any previous')
    }

    result[result.length - 1].to = op.ask.dex.router
  }

  return result
}

export function toBinary(msg: any) {
  return Buffer.from(JSON.stringify(msg)).toString('base64')
}

export async function simulateSwap(
  amount: string,
  swapOps: SwapOperation[],
  client: SigningCosmWasmClient,
): Promise<string> {
  let finalAmount = amount
  let operations: SimulateOperation[] = []
  for (const [ix, op] of swapOps.entries()) {
    operations.push({
      [op.ask.dex.swapName]: {
        offer_asset_info: toRaw<AssetInfoRaw>(op.offer.assetInfo),
        ask_asset_info: toRaw<AssetInfoRaw>(op.ask.assetInfo),
      },
    })
    if (op.to || ix === swapOps.length - 1) {
      finalAmount = await client.queryContractSmart(op.ask.dex.router, {
        simulate_swap_operations: {
          offer_amount: finalAmount,
          operations: operations,
        },
      })
      operations = []
    }
  }

  return finalAmount
}
