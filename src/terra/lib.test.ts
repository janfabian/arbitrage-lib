import { AssetInfoNative, AssetInfoToken } from '../types/terra.js'
import { getDenom, toRaw } from './lib.js'

describe('lib', () => {
  describe('toRaw', () => {
    it('removes kind property', () => {
      const obj = {
        kind: 'foo',
        attr: 1,
      }

      const result = toRaw(obj)

      expect(result).not.toHaveProperty('kind')
      expect(result).toHaveProperty('attr', 1)
    })
  })
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
  })
})
