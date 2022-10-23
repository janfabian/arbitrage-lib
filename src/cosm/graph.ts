import { DEX, Graph, GraphAssetNode, GraphAssetNodeId } from '../types/cosm.js'
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

export function getPathLength(path: GraphAssetNodeId[]): number {
  return path.reduce((l, node, ix) => {
    const previous = path[ix - 1]
    if (!previous) {
      return l
    }

    const [, previousDenom] = decodeGraphNodeId(previous)
    const [, denom] = decodeGraphNodeId(node)

    return previousDenom === denom ? l : l + 1
  }, 0)
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function* findPaths(
  graph: Graph,
  from: Set<GraphAssetNodeId>,
  to: Set<GraphAssetNodeId>,
  maxHops: number,
  whitelisted?: Set<GraphAssetNodeId>,
  blacklisted?: Set<GraphAssetNodeId>,
) {
  const toVisit = [...from]
  const paths: GraphAssetNodeId[][] = toVisit.map(() => [])

  while (toVisit.length > 0 && paths.length > 0) {
    const node = toVisit.shift() as GraphAssetNodeId
    const [, nodeDenom] = decodeGraphNodeId(node)
    let path = paths.shift() as GraphAssetNodeId[]
    let lastOpDexMove = false

    path = [...path, node]
    let edges: string[] = []

    if (path.length > 1) {
      const previous = path[path.length - 2]
      const [, previousDenom] = decodeGraphNodeId(previous)
      lastOpDexMove = previousDenom === nodeDenom

      edges = path
        .reduce(
          (acc, node, ix) => acc.concat(encodeGraphEdge(node, path[ix + 1])),
          [] as string[],
        )
        .slice(0, -1)

      if (to.has(node) && !lastOpDexMove) {
        yield path
      }

      if (whitelisted && !whitelisted.has(nodeDenom)) {
        continue
      }

      if (blacklisted?.has(nodeDenom)) {
        continue
      }
    }

    if (getPathLength(path) >= maxHops) {
      continue
    }

    const neighbours = graph.get(node) || new Set()

    for (const neighbour of neighbours) {
      if (node === neighbour) {
        continue
      }

      const [, neighbourDenom] = decodeGraphNodeId(neighbour)

      if (
        neighbourDenom === nodeDenom &&
        (path.length === 1 || lastOpDexMove)
      ) {
        continue
      }

      if (edges.includes(encodeGraphEdge(node, neighbour))) {
        continue
      }

      toVisit.push(neighbour)
      paths.push(path)
    }
  }
}
