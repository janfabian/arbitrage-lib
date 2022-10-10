export type Pair = {
  asset_infos: AssetInfoRaw[]
  contract_addr: string
  liquidity_token: string
  pair_type: PairTypeRaw
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

export type Graph = Map<string, Set<string>>
