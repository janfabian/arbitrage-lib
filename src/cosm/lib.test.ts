import {
  AssetInfoNative,
  AssetInfoToken,
  DEX,
  GraphAssetNodeMap,
} from '../types/cosm.js'
import { getDenom, swapOpsFromPath, toBinary, toRaw } from './lib.js'

const dex1: DEX = {
  id: 'dexId',
  factory: 'dex1_factory',
  router: 'dex1_router',
  swapName: 'dex1_swap_name',
  label: 'my dex1',
}

const dex2: DEX = {
  id: 'dexId2',
  factory: 'dex2_factory',
  router: 'dex2_router',
  swapName: 'dex2_swap_name',
  label: 'my dex2',
}

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

  describe('swapOpsFromPath', () => {
    it('creates swap operations from single swap path', () => {
      const path = ['dexId:A', 'dexId:B']
      const assetMap: GraphAssetNodeMap = {
        'dexId:A': {
          assetInfo: {
            kind: 'native',
            native_token: {
              denom: 'A',
            },
          },
          dex: dex1,
        },
        'dexId:B': {
          assetInfo: {
            kind: 'native',
            native_token: {
              denom: 'B',
            },
          },
          dex: dex1,
        },
      }

      const result = swapOpsFromPath(path, assetMap)

      expect(result).toEqual([
        {
          offer: assetMap['dexId:A'],
          ask: assetMap['dexId:B'],
        },
      ])
    })

    it('creates swap operations with multiple dexes path', () => {
      const path = ['dexId:A', 'dexId:B', 'dexId2:B', 'dexId2:C']
      const assetMap: GraphAssetNodeMap = {
        'dexId:A': {
          assetInfo: {
            kind: 'native',
            native_token: {
              denom: 'A',
            },
          },
          dex: dex1,
        },
        'dexId:B': {
          assetInfo: {
            kind: 'native',
            native_token: {
              denom: 'B',
            },
          },
          dex: dex1,
        },
        'dexId2:B': {
          assetInfo: {
            kind: 'native',
            native_token: {
              denom: 'B',
            },
          },
          dex: dex2,
        },
        'dexId2:C': {
          assetInfo: {
            kind: 'native',
            native_token: {
              denom: 'C',
            },
          },
          dex: dex2,
        },
      }

      const result = swapOpsFromPath(path, assetMap)

      expect(result).toEqual([
        {
          offer: assetMap['dexId:A'],
          ask: assetMap['dexId:B'],
          to: dex2.router,
        },
        {
          offer: assetMap['dexId2:B'],
          ask: assetMap['dexId2:C'],
        },
      ])
    })

    it('throws error if missing ask asset in assetMap', () => {
      const path = ['dexId:A', 'dexId:B']
      const assetMap: GraphAssetNodeMap = {
        'dexId:A': {
          assetInfo: {
            kind: 'native',
            native_token: {
              denom: 'A',
            },
          },
          dex: dex1,
        },
      }

      expect(() => swapOpsFromPath(path, assetMap)).toThrowError()
    })

    it('throws error if missing offer asset in assetMap', () => {
      const path = ['dexId:B', 'dexId:A']
      const assetMap: GraphAssetNodeMap = {
        'dexId:A': {
          assetInfo: {
            kind: 'native',
            native_token: {
              denom: 'A',
            },
          },
          dex: dex1,
        },
      }

      expect(() => swapOpsFromPath(path, assetMap)).toThrowError()
    })

    it('throws error if cross dex swap', () => {
      const path = ['dexId:A', 'dexId:B', 'dexId2:A']
      const assetMap: GraphAssetNodeMap = {
        'dexId:A': {
          assetInfo: {
            kind: 'native',
            native_token: {
              denom: 'A',
            },
          },
          dex: dex1,
        },
        'dexId:B': {
          assetInfo: {
            kind: 'native',
            native_token: {
              denom: 'B',
            },
          },
          dex: dex1,
        },
        'dexId2:A': {
          assetInfo: {
            kind: 'native',
            native_token: {
              denom: 'A',
            },
          },
          dex: dex2,
        },
      }

      expect(() => swapOpsFromPath(path, assetMap)).toThrowError()
    })

    it('throws error if cross dex swap is first', () => {
      const path = ['dexId:A', 'dexId2:A', 'dexId2:B']
      const assetMap: GraphAssetNodeMap = {
        'dexId:A': {
          assetInfo: {
            kind: 'native',
            native_token: {
              denom: 'A',
            },
          },
          dex: dex1,
        },
        'dexId2:B': {
          assetInfo: {
            kind: 'native',
            native_token: {
              denom: 'B',
            },
          },
          dex: dex1,
        },
        'dexId2:A': {
          assetInfo: {
            kind: 'native',
            native_token: {
              denom: 'A',
            },
          },
          dex: dex2,
        },
      }

      expect(() => swapOpsFromPath(path, assetMap)).toThrowError()
    })
  })

  describe('toBinary', () => {
    it('converts object to binary', () => {
      const obj = { a: 1 }
      const result = toBinary(obj)

      expect(result).toBe('eyJhIjoxfQ==')
    })
  })
})
