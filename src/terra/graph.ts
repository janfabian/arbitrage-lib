import { DEX, Graph, GraphAssetNode, GraphAssetNodeId } from '../types/terra.js'
import { getDenom } from './lib.js'

export function formatGraphNodeId(dexId: string, denom: string) {
  return `${dexId}_${denom}`
}

export function generateGraphNodeId(node: GraphAssetNode): GraphAssetNodeId {
  return formatGraphNodeId(node.dexId, getDenom(node.assetInfo))
}

export function createGraph(pairs: [GraphAssetNode, GraphAssetNode][]) {
  function addToSetInMap(
    map: Map<string, Set<string>>,
    key: string,
    value: string,
  ) {
    const setItem = map.get(key) || new Set<string>()
    setItem.add(value)
    map.set(key, setItem)
  }

  const graph: Graph = new Map()

  // Add connection between assets on the same DEX
  pairs.forEach((pair) => {
    const asset1Id = generateGraphNodeId(pair[0])
    const asset2Id = generateGraphNodeId(pair[1])

    addToSetInMap(graph, asset1Id, asset2Id)
    addToSetInMap(graph, asset2Id, asset1Id)
  })

  const assetDex: Map<string, Set<DEX['id']>> = new Map()
  pairs.forEach((pair) => {
    pair.forEach((assetNode) => {
      const denom = getDenom(assetNode.assetInfo)
      const dexId = assetNode.dexId

      addToSetInMap(assetDex, denom, dexId)
    })
  })

  for (const [denom, dexes] of assetDex.entries()) {
    for (const dexFrom of dexes) {
      for (const dexTarget of dexes) {
        if (dexFrom === dexTarget) {
          continue
        }

        const asset1Id = formatGraphNodeId(dexFrom, denom)
        const asset2Id = formatGraphNodeId(dexTarget, denom)

        addToSetInMap(graph, asset1Id, asset2Id)
        addToSetInMap(graph, asset2Id, asset1Id)
      }
    }
  }

  return graph
}
