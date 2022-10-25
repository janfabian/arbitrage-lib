/**
 * Collection of shared functionality
 *
 * @module
 */

import { AssetInfo } from './types/cosm.js'

/**
 * Get denom from assetInfo
 *
 * @example
const obj: AssetInfoNative = {
  kind: 'native',
  native_token: {
    denom: 'native_denom',
  },
}

expect(getDenom(obj)).toEqual('native_denom')
 */

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
    /* c8 ignore stop */
  }
}
