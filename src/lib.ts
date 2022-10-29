/**
 * Collection of shared functionality
 *
 * @module
 */

import { Decimal, Uint64 } from '@cosmjs/math'
import { AssetInfo } from './types/cosm.js'
import { AssetInfoJuno } from './types/juno.js'

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

export function getDenom(assetInfo: AssetInfo | AssetInfoJuno) {
  switch (assetInfo.kind) {
    case 'native':
      return assetInfo.native_token.denom
    case 'token':
      return assetInfo.token.contract_addr
    case 'juno_native':
      return assetInfo.native
    case 'juno_token':
      return assetInfo.cw20
    /* c8 ignore start */
    default: {
      const _exhaustiveCheck: never = assetInfo
      return _exhaustiveCheck
    }
    /* c8 ignore stop */
  }
}

export function multiplyDecimals(
  a: Decimal,
  b: Decimal,
  numOfDecimals: number,
) {
  return Decimal.fromAtomics(
    a.multiply(Uint64.fromString(b.atomics)).atomics.slice(0, -numOfDecimals),
    numOfDecimals,
  )
}
