import { GraphAssetNode, GraphAssetNodeId } from '../types/terra.js'
import { getDenom } from './lib.js'

export function generateGraphNodeId(node: GraphAssetNode): GraphAssetNodeId {
  return `${node.dexId}_${getDenom(node.assetInfo)}`
}

// export function createGraph(pairs: Pair[]) {
//   const graph: Graph = new Map()

//   pairs.forEach((p) => {
//     const token1 =
//       p.asset_infos?.[0]?.token?.contract_addr ||
//       p.asset_infos?.[0]?.native_token?.denom

//     const token2 =
//       p.asset_infos?.[1]?.token?.contract_addr ||
//       p.asset_infos?.[1]?.native_token?.denom

//     if (!token1 || !token2) {
//       return
//     }

//     const token1Neighbours = graph.get(token1) || new Set<string>()
//     token1Neighbours.add(token2)
//     graph.set(token1, token1Neighbours)

//     const token2Neighbours = graph.get(token2) || new Set<string>()
//     token2Neighbours.add(token1)
//     graph.set(token2, token2Neighbours)
//   })

//   return graph
// }
