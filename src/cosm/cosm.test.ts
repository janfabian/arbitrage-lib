import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { fromBase64, fromUtf8 } from '@cosmjs/encoding'
import { Asset, DEX, SwapOperation } from '../types/cosm.js'
import { GraphAssetNodeMap } from '../types/graph.js'
import {
  getExecuteSwapMsg,
  simulateSwap,
  swapOpsFromPath,
  toBinary,
  toKindAssetInto,
  toKindPairType,
  toRaw,
  toSwapOpsRaw,
} from './cosm.js'

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

describe('cosm', () => {
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

      const client = getMockedClient()
      client.queryContractSmart.mockResolvedValue({ amount: '101' })

      const [result, semiResults] = await simulateSwap(amount, swapOps, client)

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

      const client = getMockedClient()
      client.queryContractSmart.mockResolvedValueOnce({ amount: '110' })

      const [result, semiResults] = await simulateSwap(amount, swapOps, client)

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

      const client = getMockedClient()
      client.queryContractSmart.mockResolvedValueOnce({ amount: '101' })
      client.queryContractSmart.mockResolvedValueOnce({ amount: '102' })
      client.queryContractSmart.mockResolvedValueOnce({ amount: '103' })

      const [result, semiResults] = await simulateSwap(amount, swapOps, client)

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

  describe('getExecuteSwapMsg', () => {
    it('throws error if minimum receive not same', async () => {
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
      const flashLoanAddr = 'flash_loan_addr'
      const flashLoanAsset: Asset = {
        amount: amount,
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'uluna',
          },
        },
      }
      const sender = 'sender'

      expect(() =>
        getExecuteSwapMsg(flashLoanAddr, flashLoanAsset, sender, [], swapOps),
      ).toThrowError()
    })

    it('executes swap on single dex', async () => {
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
      const flashLoanAddr = 'flash_loan_addr'
      const flashLoanAsset: Asset = {
        amount: amount,
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'uluna',
          },
        },
      }
      const sender = 'sender'

      const result = getExecuteSwapMsg(
        flashLoanAddr,
        flashLoanAsset,
        sender,
        ['101'],
        swapOps,
      )
      const decodedMsg: any = JSON.parse(fromUtf8(result[0].value.msg))

      const decodeSubMsg: any = JSON.parse(
        fromUtf8(fromBase64(decodedMsg.flash_loan.msgs[0].wasm.execute.msg)),
      )

      expect(decodedMsg.flash_loan).toEqual(
        expect.objectContaining({
          assets: [
            {
              amount: amount,
              info: {
                native_token: {
                  denom: 'uluna',
                },
              },
            },
          ],
        }),
      )
      expect(decodedMsg.flash_loan.msgs).toStrictEqual([
        {
          wasm: {
            execute: expect.objectContaining({
              contract_addr: dex1.router,
              funds: [{ amount: '100', denom: 'uluna' }],
            }),
          },
        },
      ])
      expect(decodeSubMsg).toStrictEqual({
        execute_swap_operations: {
          operations: [
            {
              [dex1.swapName]: {
                offer_asset_info: { native_token: { denom: 'A' } },
                ask_asset_info: { native_token: { denom: 'B' } },
              },
            },
          ],
          minimum_receive: '101',
          max_spread: '0.005',
        },
      })
    })

    it('executes multiswap on single dex', async () => {
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

      const flashLoanAddr = 'flash_loan_addr'
      const flashLoanAsset: Asset = {
        amount: amount,
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'uluna',
          },
        },
      }
      const sender = 'sender'

      const result = getExecuteSwapMsg(
        flashLoanAddr,
        flashLoanAsset,
        sender,
        ['101'],
        swapOps,
      )
      const decodedMsg: any = JSON.parse(fromUtf8(result[0].value.msg))

      const decodeSubMsg: any = JSON.parse(
        fromUtf8(fromBase64(decodedMsg.flash_loan.msgs[0].wasm.execute.msg)),
      )

      expect(decodedMsg.flash_loan).toEqual(
        expect.objectContaining({
          assets: [
            {
              amount: amount,
              info: {
                native_token: {
                  denom: 'uluna',
                },
              },
            },
          ],
        }),
      )
      expect(decodedMsg.flash_loan.msgs).toStrictEqual([
        {
          wasm: {
            execute: expect.objectContaining({
              contract_addr: dex1.router,
              funds: [{ amount: '100', denom: 'uluna' }],
            }),
          },
        },
      ])
      expect(decodeSubMsg).toStrictEqual({
        execute_swap_operations: {
          operations: [
            {
              [dex1.swapName]: {
                offer_asset_info: { native_token: { denom: 'A' } },
                ask_asset_info: { native_token: { denom: 'B' } },
              },
            },
            {
              [dex1.swapName]: {
                offer_asset_info: { native_token: { denom: 'B' } },
                ask_asset_info: { token: { contract_addr: 'C' } },
              },
            },
          ],
          minimum_receive: '101',
          max_spread: '0.005',
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

      const flashLoanAddr = 'flash_loan_addr'
      const flashLoanAsset: Asset = {
        amount: amount,
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'uluna',
          },
        },
      }
      const sender = 'sender'

      const result = getExecuteSwapMsg(
        flashLoanAddr,
        flashLoanAsset,
        sender,
        ['101', '102', '103'],
        swapOps,
      )
      const decodedMsg: any = JSON.parse(fromUtf8(result[0].value.msg))

      const decodeSubMsg1: any = JSON.parse(
        fromUtf8(fromBase64(decodedMsg.flash_loan.msgs[0].wasm.execute.msg)),
      )
      const decodeSubMsg2: any = JSON.parse(
        fromUtf8(fromBase64(decodedMsg.flash_loan.msgs[1].wasm.execute.msg)),
      )
      const decodeSubMsg3: any = JSON.parse(
        fromUtf8(fromBase64(decodedMsg.flash_loan.msgs[2].wasm.execute.msg)),
      )

      expect(decodedMsg.flash_loan).toEqual(
        expect.objectContaining({
          assets: [
            {
              amount: amount,
              info: {
                native_token: {
                  denom: 'uluna',
                },
              },
            },
          ],
        }),
      )
      expect(decodedMsg.flash_loan.msgs).toStrictEqual([
        {
          wasm: {
            execute: expect.objectContaining({
              contract_addr: dex1.router,
              funds: [{ amount: '100', denom: 'uluna' }],
            }),
          },
        },
        {
          wasm: {
            execute: expect.objectContaining({
              contract_addr: dex2.router,
              funds: [],
            }),
          },
        },
        {
          wasm: {
            execute: expect.objectContaining({
              contract_addr: dex1.router,
              funds: [],
            }),
          },
        },
      ])
      expect(decodeSubMsg1).toStrictEqual({
        execute_swap_operations: {
          operations: [
            {
              [dex1.swapName]: {
                offer_asset_info: { native_token: { denom: 'A' } },
                ask_asset_info: { token: { contract_addr: 'B' } },
              },
            },
          ],
          minimum_receive: '101',
          to: dex2.router,
          max_spread: '0.005',
        },
      })
      expect(decodeSubMsg2).toStrictEqual({
        execute_swap_operations: {
          operations: [
            {
              [dex2.swapName]: {
                offer_asset_info: { token: { contract_addr: 'B' } },
                ask_asset_info: { token: { contract_addr: 'C' } },
              },
            },
          ],
          minimum_receive: '102',
          to: dex1.router,
          max_spread: '0.005',
        },
      })
      expect(decodeSubMsg3).toStrictEqual({
        execute_swap_operations: {
          operations: [
            {
              [dex1.swapName]: {
                offer_asset_info: { token: { contract_addr: 'C' } },
                ask_asset_info: { native_token: { denom: 'A' } },
              },
            },
          ],
          minimum_receive: '103',
          max_spread: '0.005',
        },
      })
    })
  })
})
