import { AssetInfo } from '../types/terra.js'

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
