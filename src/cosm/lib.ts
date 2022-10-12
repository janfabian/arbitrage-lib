import {
  AssetInfo,
  GraphAssetNodeId,
  GraphAssetNodeMap,
  SwapOperation,
} from '../types/cosm.js'

export function toRaw<K>(obj: any): K {
  delete obj.kind

  return obj
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
