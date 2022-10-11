import { DEX, GraphAssetNode, GraphAssetNodeMap } from '../types/terra.js'
import {
  createGraph,
  decodeGraphNodeId,
  findPaths,
  generateGraphNodeId,
  swapOpsFromPath,
} from './graph.js'

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

describe('graph', () => {
  describe('decodeGraphNodeId', () => {
    it('throws error if invalid nodeid', () => {
      expect(() => decodeGraphNodeId('invalidNodeId')).toThrowError()
    })

    it('throws error if invalid nodeid', () => {
      expect(() => decodeGraphNodeId('invalidNodeId:foo:bar')).toThrowError()
    })

    it('decode nodeid', () => {
      expect(decodeGraphNodeId('dexId:valid')).toEqual(['dexId', 'valid'])
    })
  })

  describe('generateGraphNodeId', () => {
    it('native asset', () => {
      const obj: GraphAssetNode = {
        dex: dex1,
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'native_denom',
          },
        },
      }

      expect(generateGraphNodeId(obj)).toEqual('dexId:native_denom')
    })

    it('token asset', () => {
      const obj: GraphAssetNode = {
        dex: dex1,
        assetInfo: {
          kind: 'token',
          token: {
            contract_addr: 'contract_addr',
          },
        },
      }

      expect(generateGraphNodeId(obj)).toEqual('dexId:contract_addr')
    })
  })

  describe('createGraph', () => {
    it('creates graph from single dex', () => {
      const asset1: GraphAssetNode = {
        dex: dex1,
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'native_denom',
          },
        },
      }
      const asset2: GraphAssetNode = {
        dex: dex1,
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'native_denom2',
          },
        },
      }

      const graph = createGraph([[asset1, asset2]])

      expect([...graph.entries()]).toEqual([
        ['dexId:native_denom', new Set(['dexId:native_denom2'])],
        ['dexId:native_denom2', new Set(['dexId:native_denom'])],
      ])
    })

    it('creates graph from single dex multiple assets', () => {
      const asset1: GraphAssetNode = {
        dex: dex1,
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'native_denom',
          },
        },
      }
      const asset2: GraphAssetNode = {
        dex: dex1,
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'native_denom2',
          },
        },
      }
      const asset3: GraphAssetNode = {
        dex: dex1,
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
          'dexId:native_denom',
          new Set(['dexId:native_denom2', 'dexId:token_addr']),
        ],
        ['dexId:native_denom2', new Set(['dexId:native_denom'])],
        ['dexId:token_addr', new Set(['dexId:native_denom'])],
      ])
    })

    it('creates graph from multiple dexes multiple assets', () => {
      const asset1: GraphAssetNode = {
        dex: dex1,
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'native_denom',
          },
        },
      }
      const asset2: GraphAssetNode = {
        dex: dex1,
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'native_denom2',
          },
        },
      }
      const asset3: GraphAssetNode = {
        dex: dex2,
        assetInfo: {
          kind: 'native',
          native_token: {
            denom: 'native_denom',
          },
        },
      }
      const asset4: GraphAssetNode = {
        dex: dex2,
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
          'dexId:native_denom',
          new Set(['dexId:native_denom2', 'dexId2:native_denom']),
        ],
        ['dexId:native_denom2', new Set(['dexId:native_denom'])],
        [
          'dexId2:native_denom',
          new Set(['dexId2:token_addr', 'dexId:native_denom']),
        ],
        ['dexId2:token_addr', new Set(['dexId2:native_denom'])],
      ])
    })
  })

  describe('findPaths', () => {
    it('finds single pair path', () => {
      const graph = new Map([
        ['dexId:native_denom', new Set(['dexId:native_denom2'])],
        ['dexId:native_denom2', new Set(['dexId:native_denom'])],
      ])

      const result = findPaths(
        graph,
        new Set(['dexId:native_denom']),
        new Set(['dexId:native_denom2']),
        5,
      )

      expect([...result]).toEqual([
        ['dexId:native_denom', 'dexId:native_denom2'],
      ])
    })

    it('finds nothing', () => {
      const graph = new Map([
        ['dexId:native_denom', new Set(['dexId:native_denom2'])],
        ['dexId:native_denom2', new Set(['dexId:native_denom'])],
      ])

      const result = findPaths(
        graph,
        new Set(['dexId:native_denom']),
        new Set(['dexId:nonexisting_addr']),
        5,
      )

      expect([...result]).toEqual([])
    })

    it('finds multiple paths for single pair', () => {
      const graph = new Map([
        ['dexId:A', new Set(['dexId:B', 'dexId:C'])],
        ['dexId:B', new Set(['dexId:A', 'dexId:C'])],
        ['dexId:C', new Set(['dexId:A', 'dexId:B'])],
      ])

      const result = [
        ...findPaths(graph, new Set(['dexId:A']), new Set(['dexId:C']), 3),
      ]

      expect(result).toEqual(
        expect.arrayContaining([
          ['dexId:A', 'dexId:B', 'dexId:C'],
          ['dexId:A', 'dexId:C'],
          ['dexId:A', 'dexId:B', 'dexId:A', 'dexId:C'],
          ['dexId:A', 'dexId:C', 'dexId:B', 'dexId:C'],
        ]),
      )
      expect(result).toHaveLength(4)
    })

    it('finds path single pair with cycle', () => {
      const graph = new Map([
        ['dexId:A', new Set(['dexId:A', 'dexId:B'])],
        ['dexId:B', new Set(['dexId:A', 'dexId:B'])],
      ])

      const result = [
        ...findPaths(graph, new Set(['dexId:A']), new Set(['dexId:B']), 5),
      ]

      expect(result).toEqual(expect.arrayContaining([['dexId:A', 'dexId:B']]))
      expect(result).toHaveLength(1)
    })

    it('finds path single pair with dead-end', () => {
      const graph = new Map([
        ['dexId:A', new Set(['dexId:B', 'dexId:C'])],
        ['dexId:B', new Set(['dexId:A', 'dexId:C'])],
      ])

      const result = [
        ...findPaths(graph, new Set(['dexId:A']), new Set(['dexId:B']), 5),
      ]

      expect(result).toEqual(expect.arrayContaining([['dexId:A', 'dexId:B']]))
      expect(result).toHaveLength(1)
    })

    it('finds single pair where start is also target', () => {
      const graph = new Map([
        ['dexId:A', new Set(['dexId:A', 'dexId:B'])],
        ['dexId:B', new Set(['dexId:A', 'dexId:B'])],
      ])

      const result = [
        ...findPaths(
          graph,
          new Set(['dexId:A', 'dexId:B']),
          new Set(['dexId:B']),
          5,
        ),
      ]

      expect(result).toEqual(
        expect.arrayContaining([
          ['dexId:A', 'dexId:B'],
          ['dexId:B', 'dexId:A', 'dexId:B'],
        ]),
      )
      expect(result).toHaveLength(2)
    })

    it('finds pairs multiple from and multiple to', () => {
      const graph = new Map([
        ['dexId:A', new Set(['dexId:B', 'dexId2:A'])],
        ['dexId:B', new Set(['dexId:A', 'dexId2:B'])],
        ['dexId2:A', new Set(['dexId2:B', 'dexId:A'])],
        ['dexId2:B', new Set(['dexId2:A', 'dexId:B'])],
      ])

      const result = [
        ...findPaths(
          graph,
          new Set(['dexId:A', 'dexId2:A']),
          new Set(['dexId:B', 'dexId2:B']),
          2,
        ),
      ]

      expect(result).toEqual(
        expect.arrayContaining([
          ['dexId:A', 'dexId:B'],
          ['dexId2:A', 'dexId2:B'],
        ]),
      )
      expect(result).toHaveLength(2)
    })

    it('finds routes with whitelisted', () => {
      const graph = new Map([
        ['dexId:A', new Set(['dexId:B', 'dexId:C'])],
        ['dexId:B', new Set(['dexId:A', 'dexId:C'])],
        ['dexId:C', new Set(['dexId:B', 'dexId:A'])],
      ])

      const result = [
        ...findPaths(
          graph,
          new Set(['dexId:A', 'dexId:B']),
          new Set(['dexId:C']),
          5,
          new Set([]),
        ),
      ]

      expect(result).toEqual(
        expect.arrayContaining([
          ['dexId:A', 'dexId:C'],
          ['dexId:B', 'dexId:C'],
        ]),
      )
      expect(result).toHaveLength(2)
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
})
