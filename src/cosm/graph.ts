import {
  DEX,
  Graph,
  GraphAssetNode,
  GraphAssetNodeId,
  GraphAssetNodeMap,
  SwapOperation,
} from '../types/cosm.js'
import { getDenom } from './lib.js'

export function decodeGraphNodeId(graphNodeId: GraphAssetNodeId) {
  const result = graphNodeId.split(':')

  if (result.length !== 2) {
    throw new Error(`graphNodeId ${graphNodeId} can't be parsed`)
  }

  return result
}

export function encodeGraphNodeId(dexId: string, denom: string) {
  return `${dexId}:${denom}`
}

export function generateGraphNodeId(node: GraphAssetNode): GraphAssetNodeId {
  return encodeGraphNodeId(node.dex.id, getDenom(node.assetInfo))
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
      const dexId = assetNode.dex.id

      addToSetInMap(assetDex, denom, dexId)
    })
  })

  for (const [denom, dexes] of assetDex.entries()) {
    for (const dexFrom of dexes) {
      for (const dexTarget of dexes) {
        if (dexFrom === dexTarget) {
          continue
        }

        const asset1Id = encodeGraphNodeId(dexFrom, denom)
        const asset2Id = encodeGraphNodeId(dexTarget, denom)

        addToSetInMap(graph, asset1Id, asset2Id)
        addToSetInMap(graph, asset2Id, asset1Id)
      }
    }
  }

  return graph
}

export function encodeGraphEdge(
  previous: GraphAssetNodeId,
  current: GraphAssetNodeId,
) {
  return `${previous}::${current}`
}

export function* findPaths(
  graph: Graph,
  from: Set<GraphAssetNodeId>,
  to: Set<GraphAssetNodeId>,
  maxHops: number,
  whitelisted?: Set<GraphAssetNodeId>,
) {
  const toVisit = [...from]
  const paths: GraphAssetNodeId[][] = toVisit.map(() => [])

  while (toVisit.length > 0 && paths.length > 0) {
    const node = toVisit.shift() as GraphAssetNodeId
    const [, nodeDenom] = decodeGraphNodeId(node)
    let path = paths.shift() as GraphAssetNodeId[]

    path = [...path, node]
    let edges: string[] = []

    if (path.length > 1) {
      const previous = path[path.length - 2]
      const [, previousDenom] = decodeGraphNodeId(previous)
      edges = path
        .reduce(
          (acc, node, ix) => acc.concat(encodeGraphEdge(node, path[ix + 1])),
          [] as string[],
        )
        .slice(0, -1)

      if (to.has(node)) {
        if (previousDenom !== nodeDenom) {
          yield path
        }
      }

      if (whitelisted && !whitelisted.has(node)) {
        continue
      }
    }

    if (path.length - 1 >= maxHops) {
      continue
    }

    const neighbours = graph.get(node) || new Set()

    for (const neighbour of neighbours) {
      if (node === neighbour) {
        continue
      }

      const [, neighbourDenom] = decodeGraphNodeId(neighbour)

      if (path.length === 1) {
        if (neighbourDenom === nodeDenom) {
          continue
        }
      }

      if (edges.includes(encodeGraphEdge(node, neighbour))) {
        continue
      }

      toVisit.push(neighbour)
      paths.push(path)
    }
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
