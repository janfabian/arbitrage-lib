import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { SwapOperation } from '../types/cosm.js'
import { AssetInfoJuno } from '../types/juno.js'
import {
  createJunoSwapPair,
  decodeJunoTokens,
  encodeJunoTokens,
  simulateJunoSwap,
} from './juno.js'

describe('juno', () => {
  describe('encodeJunoTokens', () => {
    it('encodes two denom string', () => {
      const denom1 = 'denom1'
      const denom2 = 'denom2'

      expect(encodeJunoTokens(denom1, denom2)).toBe('denom1::denom2')
    })
  })
  describe('decodeJunoTokens', () => {
    it('decodes', () => {
      const decoded = 'denom1::denom2'
      const [denom1, denom2] = decodeJunoTokens(decoded)
      expect(denom1).toBe('denom1')
      expect(denom2).toBe('denom2')
    })

    it('throws error if bad format', () => {
      const decoded = 'denom1::'
      expect(() => decodeJunoTokens(decoded)).toThrowError()
    })
  })

  describe('simulateSwap', () => {
    const getMockedClient = () =>
      jest.mocked({
        queryContractSmart: jest.fn(),
      } as any as SigningCosmWasmClient)

    it('simulates swap on single dex', async () => {
      const amount = '100'
      const asset1: AssetInfoJuno = {
        kind: 'juno_native',
        native: 'A',
      }
      const asset2: AssetInfoJuno = {
        kind: 'juno_native',
        native: 'B',
      }
      const junoSwapPair1 = createJunoSwapPair(
        'junoSwapPairAddr',
        asset1,
        asset2,
      )
      const offerGraphAsset = {
        assetInfo: asset1,
        dex: junoSwapPair1,
      }
      const askGraphAsset = {
        assetInfo: asset2,
        dex: junoSwapPair1,
      }

      let swapOps = [
        {
          offer: offerGraphAsset,
          ask: askGraphAsset,
        },
      ]

      const client = getMockedClient()
      client.queryContractSmart.mockResolvedValueOnce({ token2_amount: '101' })
      client.queryContractSmart.mockResolvedValueOnce({ token1_amount: '202' })

      const [result, semiResults] = await simulateJunoSwap(
        amount,
        swapOps,
        client,
      )

      expect(result).toBe('101')
      expect(semiResults).toStrictEqual(['101'])
      expect(client.queryContractSmart).toBeCalledTimes(1)
      expect(client.queryContractSmart).toBeCalledWith(junoSwapPair1.router, {
        token1_for_token2_price: {
          token1_amount: amount,
        },
      })

      swapOps = [
        {
          offer: askGraphAsset,
          ask: offerGraphAsset,
        },
      ]

      const [resultReverse, semiResultsReverse] = await simulateJunoSwap(
        amount,
        swapOps,
        client,
      )

      expect(resultReverse).toBe('202')
      expect(semiResultsReverse).toStrictEqual(['202'])
      expect(client.queryContractSmart).toBeCalledTimes(2)
      expect(client.queryContractSmart).toBeCalledWith(junoSwapPair1.router, {
        token2_for_token1_price: {
          token2_amount: amount,
        },
      })
    })

    it('simulates multiswap on junoswap', async () => {
      const amount = '100'
      const asset1: AssetInfoJuno = {
        kind: 'juno_native',
        native: 'A',
      }
      const asset2: AssetInfoJuno = {
        kind: 'juno_native',
        native: 'B',
      }
      const asset3: AssetInfoJuno = {
        kind: 'juno_native',
        native: 'C',
      }
      const junoSwapPair1 = createJunoSwapPair(
        'junoSwapPairAddr1',
        asset1,
        asset2,
      )
      const junoSwapPair2 = createJunoSwapPair(
        'junoSwapPairAddr2',
        asset3,
        asset2,
      )
      const offerGraphAsset = {
        assetInfo: asset1,
        dex: junoSwapPair1,
      }
      const middleGraphAsset1 = {
        assetInfo: asset2,
        dex: junoSwapPair1,
      }
      const middleGraphAsset2 = {
        assetInfo: asset2,
        dex: junoSwapPair2,
      }
      const askGraphAsset = {
        assetInfo: asset3,
        dex: junoSwapPair2,
      }

      const swapOps: SwapOperation[] = [
        {
          offer: offerGraphAsset,
          ask: middleGraphAsset1,
          to: junoSwapPair2.router,
        },
        {
          offer: middleGraphAsset2,
          ask: askGraphAsset,
        },
      ]

      const client = getMockedClient()
      client.queryContractSmart.mockResolvedValueOnce({ token2_amount: '110' })
      client.queryContractSmart.mockResolvedValueOnce({ token1_amount: '220' })

      const [result, semiResults] = await simulateJunoSwap(
        amount,
        swapOps,
        client,
      )

      expect(result).toBe('220')
      expect(semiResults).toStrictEqual(['110', '220'])
      expect(client.queryContractSmart).toBeCalledTimes(2)
      expect(client.queryContractSmart).toBeCalledWith(junoSwapPair1.router, {
        token1_for_token2_price: {
          token1_amount: amount,
        },
      })
      expect(client.queryContractSmart).toBeCalledWith(junoSwapPair2.router, {
        token2_for_token1_price: {
          token2_amount: '110',
        },
      })
    })
  })
})
