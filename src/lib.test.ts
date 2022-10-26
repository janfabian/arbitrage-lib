import { getDenom } from './lib.js'
import { AssetInfoNative, AssetInfoToken } from './types/cosm.js'
import { AssetInfoNativeJuno, AssetInfoTokenJuno } from './types/juno.js'

describe('lib', () => {
  describe('getDenom', () => {
    it('get native denom', () => {
      const obj: AssetInfoNative = {
        kind: 'native',
        native_token: {
          denom: 'native_denom',
        },
      }

      expect(getDenom(obj)).toEqual('native_denom')
    })

    it('get token denom', () => {
      const obj: AssetInfoToken = {
        kind: 'token',
        token: {
          contract_addr: 'token_addr',
        },
      }

      expect(getDenom(obj)).toEqual('token_addr')
    })

    it('get native denom', () => {
      const obj: AssetInfoNativeJuno = {
        kind: 'juno_native',
        native: 'native_denom',
      }

      expect(getDenom(obj)).toEqual('native_denom')
    })

    it('get token denom', () => {
      const obj: AssetInfoTokenJuno = {
        kind: 'juno_token',
        cw20: 'token_addr',
      }

      expect(getDenom(obj)).toEqual('token_addr')
    })
  })
})
