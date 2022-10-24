import { AssetInfo, DEX } from './cosm.js'

export type GraphAssetNodeMap = {
  [key: GraphAssetNodeId]: GraphAssetNode
}

export type GraphAssetNode = {
  dex: DEX
  assetInfo: AssetInfo
}

export type GraphAssetNodeId = string
export type Graph = Map<GraphAssetNodeId, Set<GraphAssetNodeId>>
