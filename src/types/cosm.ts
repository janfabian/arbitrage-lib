import { GraphAssetNode } from './graph.js'

export type Pair = {
  asset_infos: AssetInfoRaw[]
  contract_addr: string
  liquidity_token: string
  pair_type: PairTypeRaw
}

export type ExecuteSwapOperation = {
  execute_swap_operations: {
    operations: SwapOperationRaw[]
    minimum_receive: undefined | string
    to: undefined | string
    max_spread: undefined | string
  }
}

export type SimulateSwapResponse = {
  amount: string
}

export type ExecuteMessage = {
  execute: {
    contract_addr: string
    funds: { amount: string; denom: string }[]
    msg: string
  }
}
export type WasmMessage = {
  wasm: ExecuteMessage
}

export type FlashLoanMessage = {
  flash_loan: {
    assets: AssetRaw[]
    msgs: WasmMessage[]
  }
}

export type SwapOperationRaw = {
  [k: string]: {
    offer_asset_info: AssetInfoRaw
    ask_asset_info: AssetInfoRaw
  }
}

export type SwapOperation = {
  offer: GraphAssetNode
  ask: GraphAssetNode
  to?: DEX['router']
}

export type PairTypeRaw = Omit<PairType, 'kind'>
export type PairType = PairTypeXyk | PairTypeStable

export type PairTypeXyk = {
  kind: 'xyk'
  xyk: Record<string, unknown>
}

export type PairTypeStable = {
  kind: 'stable'
  stable: Record<string, unknown>
}

export type Asset = {
  amount: string
  assetInfo: AssetInfo
}

export type AssetRaw = {
  amount: string
  info: AssetInfoRaw
}

export type AssetInfoRaw = Omit<AssetInfo, 'kind'>
export type AssetInfo = AssetInfoToken | AssetInfoNative

export type AssetInfoToken = {
  kind: 'token'
  token: Token
}

export type AssetInfoNative = {
  kind: 'native'
  native_token: NativeToken
}

export type Token = {
  contract_addr: string
}

export type NativeToken = {
  denom: string
}

export type DEX = {
  id: string
  label?: string
  factory: string
  router: string
  swapName: string
}
