import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import {
  AssetInfoNative,
  AssetInfoToken,
  DEX,
  GraphAssetNodeMap,
  SwapOperation,
} from '../types/cosm.js'
import {
  getDenom,
  simulateSwap,
  swapOpsFromPath,
  toBinary,
  toKindAssetInto,
  toKindPairType,
  toRaw,
  toSwapOpsRaw,
} from './lib.js'

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

  describe('toKindPairType', () => {
    it('returns xyk pairtype', () => {
      const xyk = { foo: 'bar' }
      const result = toKindPairType({ xyk: xyk })
      expect(result).toHaveProperty('kind', 'xyk')
      expect(result).toHaveProperty('xyk', xyk)
    })
    it('returns stable pairtype', () => {
      const stable = { foo: 'bar' }
      const result = toKindPairType({ stable: stable })
      expect(result).toHaveProperty('kind', 'stable')
      expect(result).toHaveProperty('stable', stable)
    })
  })

  describe('toKindAssetInto', () => {
    it('returns token', () => {
      const token = { foo: 'bar' }
      const result = toKindAssetInto({ token: token })
      expect(result).toHaveProperty('kind', 'token')
      expect(result).toHaveProperty('token', token)
    })

    it('returns native', () => {
      const native_token = { foo: 'bar' }
      const result = toKindAssetInto({ native_token: native_token })
      expect(result).toHaveProperty('kind', 'native')
      expect(result).toHaveProperty('native_token', native_token)
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

  describe('toSwapOpsRaw', () => {
    it('cretes swapRaw on single dex', () => {
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

      const swapOps = [
        {
          offer: assetMap['dexId:A'],
          ask: assetMap['dexId:B'],
        },
      ]

      const [swapOpsRaw, dexes] = toSwapOpsRaw(swapOps)

      expect(dexes).toStrictEqual([dex1.router])
      expect(swapOpsRaw).toStrictEqual([
        [
          {
            [dex1.swapName]: {
              offer_asset_info: {
                native_token: {
                  denom: 'A',
                },
              },
              ask_asset_info: {
                native_token: {
                  denom: 'B',
                },
              },
            },
          },
        ],
      ])
    })

    it('creates multiswapRaw on single dex', async () => {
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
        'dexId:C': {
          assetInfo: {
            kind: 'token',
            token: {
              contract_addr: 'C',
            },
          },
          dex: dex1,
        },
      }

      const swapOps = [
        {
          offer: assetMap['dexId:A'],
          ask: assetMap['dexId:B'],
        },
        {
          offer: assetMap['dexId:B'],
          ask: assetMap['dexId:C'],
        },
      ]

      const [swapOpsRaw, dexes] = toSwapOpsRaw(swapOps)

      expect(dexes).toStrictEqual([dex1.router])
      expect(swapOpsRaw).toStrictEqual([
        [
          {
            [dex1.swapName]: {
              offer_asset_info: {
                native_token: {
                  denom: 'A',
                },
              },
              ask_asset_info: {
                native_token: {
                  denom: 'B',
                },
              },
            },
          },
          {
            [dex1.swapName]: {
              offer_asset_info: {
                native_token: {
                  denom: 'B',
                },
              },
              ask_asset_info: {
                token: {
                  contract_addr: 'C',
                },
              },
            },
          },
        ],
      ])
    })

    it('creates multiswapRaw on multiple dexes', async () => {
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
            kind: 'token',
            token: {
              contract_addr: 'B',
            },
          },
          dex: dex1,
        },
        'dexId:C': {
          assetInfo: {
            kind: 'token',
            token: {
              contract_addr: 'C',
            },
          },
          dex: dex1,
        },
        'dexId2:B': {
          assetInfo: {
            kind: 'token',
            token: {
              contract_addr: 'B',
            },
          },
          dex: dex2,
        },
        'dexId2:C': {
          assetInfo: {
            kind: 'token',
            token: {
              contract_addr: 'C',
            },
          },
          dex: dex2,
        },
      }

      const swapOps: SwapOperation[] = [
        {
          offer: assetMap['dexId:A'],
          ask: assetMap['dexId:B'],
          to: dex2.router,
        },
        {
          offer: assetMap['dexId2:B'],
          ask: assetMap['dexId2:C'],
          to: dex1.router,
        },
        {
          offer: assetMap['dexId:C'],
          ask: assetMap['dexId:A'],
        },
      ]

      const [swapOpsRaw, dexes] = toSwapOpsRaw(swapOps)

      expect(dexes).toStrictEqual([dex1.router, dex2.router, dex1.router])
      expect(swapOpsRaw).toStrictEqual([
        [
          {
            [dex1.swapName]: {
              offer_asset_info: {
                native_token: {
                  denom: 'A',
                },
              },
              ask_asset_info: {
                token: {
                  contract_addr: 'B',
                },
              },
            },
          },
        ],
        [
          {
            [dex2.swapName]: {
              offer_asset_info: {
                token: {
                  contract_addr: 'B',
                },
              },
              ask_asset_info: {
                token: {
                  contract_addr: 'C',
                },
              },
            },
          },
        ],
        [
          {
            [dex1.swapName]: {
              offer_asset_info: {
                token: {
                  contract_addr: 'C',
                },
              },
              ask_asset_info: {
                native_token: {
                  denom: 'A',
                },
              },
            },
          },
        ],
      ])
    })
  })

  describe('simulateSwap', () => {
    const getMockedClient = () =>
      jest.mocked({
        queryContractSmart: jest.fn(),
      } as any as SigningCosmWasmClient)

    it('throws error if simulate ops and dexes length differ', async () => {
      const amount = '100'
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

      const swapOps = [
        {
          offer: assetMap['dexId:A'],
          ask: assetMap['dexId:B'],
        },
      ]
      const [swapOpsRaw] = toSwapOpsRaw(swapOps)

      const client = getMockedClient()

      expect.assertions(1)
      try {
        await simulateSwap(amount, swapOpsRaw, [], client)
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
      }
    })

    it('simulates swap on single dex', async () => {
      const amount = '100'
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

      const swapOps = [
        {
          offer: assetMap['dexId:A'],
          ask: assetMap['dexId:B'],
        },
      ]
      const [swapOpsRaw, dexes] = toSwapOpsRaw(swapOps)

      const client = getMockedClient()
      client.queryContractSmart.mockResolvedValue('101')

      const [result, semiResults] = await simulateSwap(
        amount,
        swapOpsRaw,
        dexes,
        client,
      )

      expect(result).toBe('101')
      expect(semiResults).toStrictEqual(['101'])
      expect(client.queryContractSmart).toBeCalledTimes(1)
      expect(client.queryContractSmart).toBeCalledWith(dex1.router, {
        simulate_swap_operations: {
          offer_amount: '100',
          operations: [
            {
              [dex1.swapName]: {
                offer_asset_info: {
                  native_token: {
                    denom: 'A',
                  },
                },
                ask_asset_info: {
                  native_token: {
                    denom: 'B',
                  },
                },
              },
            },
          ],
        },
      })
    })

    it('simulates multiswap on single dex', async () => {
      const amount = '100'
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
        'dexId:C': {
          assetInfo: {
            kind: 'token',
            token: {
              contract_addr: 'C',
            },
          },
          dex: dex1,
        },
      }

      const swapOps = [
        {
          offer: assetMap['dexId:A'],
          ask: assetMap['dexId:B'],
        },
        {
          offer: assetMap['dexId:B'],
          ask: assetMap['dexId:C'],
        },
      ]
      const [swapOpsRaw, dexes] = toSwapOpsRaw(swapOps)

      const client = getMockedClient()
      client.queryContractSmart.mockResolvedValueOnce('110')

      const [result, semiResults] = await simulateSwap(
        amount,
        swapOpsRaw,
        dexes,
        client,
      )

      expect(result).toBe('110')
      expect(semiResults).toStrictEqual(['110'])
      expect(client.queryContractSmart).toBeCalledTimes(1)
      expect(client.queryContractSmart).toBeCalledWith(dex1.router, {
        simulate_swap_operations: {
          offer_amount: '100',
          operations: [
            {
              [dex1.swapName]: {
                offer_asset_info: {
                  native_token: {
                    denom: 'A',
                  },
                },
                ask_asset_info: {
                  native_token: {
                    denom: 'B',
                  },
                },
              },
            },
            {
              [dex1.swapName]: {
                offer_asset_info: {
                  native_token: {
                    denom: 'B',
                  },
                },
                ask_asset_info: {
                  token: {
                    contract_addr: 'C',
                  },
                },
              },
            },
          ],
        },
      })
    })

    it('simulates multiswap on multiple dexes', async () => {
      const amount = '100'
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
            kind: 'token',
            token: {
              contract_addr: 'B',
            },
          },
          dex: dex1,
        },
        'dexId:C': {
          assetInfo: {
            kind: 'token',
            token: {
              contract_addr: 'C',
            },
          },
          dex: dex1,
        },
        'dexId2:B': {
          assetInfo: {
            kind: 'token',
            token: {
              contract_addr: 'B',
            },
          },
          dex: dex2,
        },
        'dexId2:C': {
          assetInfo: {
            kind: 'token',
            token: {
              contract_addr: 'C',
            },
          },
          dex: dex2,
        },
      }

      const swapOps: SwapOperation[] = [
        {
          offer: assetMap['dexId:A'],
          ask: assetMap['dexId:B'],
          to: dex2.router,
        },
        {
          offer: assetMap['dexId2:B'],
          ask: assetMap['dexId2:C'],
          to: dex1.router,
        },
        {
          offer: assetMap['dexId:C'],
          ask: assetMap['dexId:A'],
        },
      ]
      const [swapOpsRaw, dexes] = toSwapOpsRaw(swapOps)

      const client = getMockedClient()
      client.queryContractSmart.mockResolvedValueOnce('101')
      client.queryContractSmart.mockResolvedValueOnce('102')
      client.queryContractSmart.mockResolvedValueOnce('103')

      const [result, semiResults] = await simulateSwap(
        amount,
        swapOpsRaw,
        dexes,
        client,
      )

      expect(result).toBe('103')
      expect(semiResults).toStrictEqual(['101', '102', '103'])
      expect(client.queryContractSmart).toBeCalledTimes(3)
      expect(client.queryContractSmart).toBeCalledWith(dex1.router, {
        simulate_swap_operations: {
          offer_amount: '100',
          operations: [
            {
              [dex1.swapName]: {
                offer_asset_info: {
                  native_token: {
                    denom: 'A',
                  },
                },
                ask_asset_info: {
                  token: {
                    contract_addr: 'B',
                  },
                },
              },
            },
          ],
        },
      })
      expect(client.queryContractSmart).toBeCalledWith(dex2.router, {
        simulate_swap_operations: {
          offer_amount: '101',
          operations: [
            {
              [dex2.swapName]: {
                offer_asset_info: {
                  token: {
                    contract_addr: 'B',
                  },
                },
                ask_asset_info: {
                  token: {
                    contract_addr: 'C',
                  },
                },
              },
            },
          ],
        },
      })
      expect(client.queryContractSmart).toBeCalledWith(dex1.router, {
        simulate_swap_operations: {
          offer_amount: '102',
          operations: [
            {
              [dex1.swapName]: {
                offer_asset_info: {
                  token: {
                    contract_addr: 'C',
                  },
                },
                ask_asset_info: {
                  native_token: {
                    denom: 'A',
                  },
                },
              },
            },
          ],
        },
      })
    })
  })
})
