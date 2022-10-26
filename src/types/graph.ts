import { AssetInfo, DEX } from './cosm.js'
import { AssetInfoJuno } from './juno.js'

export type GraphAssetNodeMap = {
  [key: GraphAssetNodeId]: GraphAssetNode
}

export type GraphAssetNode = {
  dex: DEX
  assetInfo: AssetInfo | AssetInfoJuno
}

export type GraphAssetNodeId = string
export type Graph = Map<GraphAssetNodeId, Set<GraphAssetNodeId>>
