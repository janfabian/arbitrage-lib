export type COSM_WASM_SWAP = {
  token1_reserve: string
  token1_denom: AssetInfoJunoRaw
  token2_reserve: string
  token2_denom: AssetInfoJunoRaw
  lp_token_supply: string
  lp_token_address: string
}

export type AssetInfoJunoRaw = Omit<AssetInfoJuno, 'kind'>
export type AssetInfoJuno = AssetInfoTokenJuno | AssetInfoNativeJuno

export type AssetInfoTokenJuno = {
  kind: 'juno_token'
  cw20: string
}

export type AssetInfoNativeJuno = {
  kind: 'juno_native'
  native: string
}
