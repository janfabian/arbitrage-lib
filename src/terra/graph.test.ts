import { GraphAssetNode } from '../types/terra.js'
import { createGraph, generateGraphNodeId } from './graph.js'

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

  describe('createGraph', () => {
    it('creates graph from single dex', () => {
      const asset1: GraphAssetNode = {
        dexId: 'dexId',
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'native_denom',
          },
        },
      }
      const asset2: GraphAssetNode = {
        dexId: 'dexId',
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'native_denom2',
          },
        },
      }

      const graph = createGraph([[asset1, asset2]])

      expect([...graph.entries()]).toEqual([
        ['dexId_native_denom', new Set(['dexId_native_denom2'])],
        ['dexId_native_denom2', new Set(['dexId_native_denom'])],
      ])
    })

    it('creates graph from single dex multiple assets', () => {
      const asset1: GraphAssetNode = {
        dexId: 'dexId',
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'native_denom',
          },
        },
      }
      const asset2: GraphAssetNode = {
        dexId: 'dexId',
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'native_denom2',
          },
        },
      }
      const asset3: GraphAssetNode = {
        dexId: 'dexId',
        assetInfo: {
          kind: 'token',
          token: {
            contract_addr: 'token_addr',
          },
        },
      }

      const graph = createGraph([
        [asset1, asset2],
        [asset1, asset3],
      ])

      expect([...graph.entries()]).toEqual([
        [
          'dexId_native_denom',
          new Set(['dexId_native_denom2', 'dexId_token_addr']),
        ],
        ['dexId_native_denom2', new Set(['dexId_native_denom'])],
        ['dexId_token_addr', new Set(['dexId_native_denom'])],
      ])
    })

    it('creates graph from multiple dexes multiple assets', () => {
      const asset1: GraphAssetNode = {
        dexId: 'dexId',
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'native_denom',
          },
        },
      }
      const asset2: GraphAssetNode = {
        dexId: 'dexId',
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'native_denom2',
          },
        },
      }
      const asset3: GraphAssetNode = {
        dexId: 'dexId2',
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'native_denom',
          },
        },
      }
      const asset4: GraphAssetNode = {
        dexId: 'dexId2',
        assetInfo: {
          kind: 'token',
          token: {
            contract_addr: 'token_addr',
          },
        },
      }

      const graph = createGraph([
        [asset1, asset2],
        [asset3, asset4],
      ])

      expect([...graph.entries()]).toEqual([
        [
          'dexId_native_denom',
          new Set(['dexId_native_denom2', 'dexId2_native_denom']),
        ],
        ['dexId_native_denom2', new Set(['dexId_native_denom'])],
        [
          'dexId2_native_denom',
          new Set(['dexId2_token_addr', 'dexId_native_denom']),
        ],
        ['dexId2_token_addr', new Set(['dexId2_native_denom'])],
      ])
    })
  })
})
