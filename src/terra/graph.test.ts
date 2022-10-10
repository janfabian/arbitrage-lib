import { GraphAssetNode } from '../types/terra.js'
import { generateGraphNodeId } from './graph.js'

describe('graph', () => {
  describe('generateGraphNodeId', () => {
    it('native asset', () => {
      const obj: GraphAssetNode = {
        dexId: 'dexId',
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'native_denom',
          },
        },
      }

      expect(generateGraphNodeId(obj)).toEqual('dexId_native_denom')
    })

    it('token asset', () => {
      const obj: GraphAssetNode = {
        dexId: 'dexId',
        assetInfo: {
          kind: 'token',
          token: {
            contract_addr: 'contract_addr',
          },
        },
      }

      expect(generateGraphNodeId(obj)).toEqual('dexId_contract_addr')
    })
  })
})
