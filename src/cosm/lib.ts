import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { toBase64, toUtf8 } from '@cosmjs/encoding'
import { EncodeObject } from '@cosmjs/proto-signing'
import { MsgExecuteContract } from 'cosmjs-types/cosmwasm/wasm/v1/tx.js'

import {
  AssetInfo,
  AssetInfoNative,
  AssetInfoRaw,
  AssetInfoToken,
  GraphAssetNodeId,
  GraphAssetNodeMap,
  PairTypeStable,
  PairTypeXyk,
  SwapOperationRaw,
  SwapOperation,
  Asset,
  ExecuteSwapOperation,
  WasmMessage,
  FlashLoanMessage,
  SimulateSwapResponse,
} from '../types/cosm.js'

export function toRaw<K>(obj: any): K {
  const obj_copy = { ...obj }
  delete obj_copy.kind

  return obj_copy
}

export function toKindPairType(pairTypeRaw: any) {
  if (pairTypeRaw.xyk) {
    return {
      kind: 'xyk',
      ...pairTypeRaw,
    } as PairTypeXyk
  }

  if (pairTypeRaw.stable) {
    return {
      kind: 'stable',
      ...pairTypeRaw,
    } as PairTypeStable
  }
}

export function toKindAssetInto(assetInfo: any) {
  if (assetInfo.token) {
    return {
      kind: 'token',
      ...assetInfo,
    } as AssetInfoToken
  }

  if (assetInfo.native_token) {
    return {
      kind: 'native',
      ...assetInfo,
    } as AssetInfoNative
  }
}

export function getDenom(assetInfo: AssetInfo) {
  switch (assetInfo.kind) {
    case 'native':
      return assetInfo.native_token.denom
    case 'token':
      return assetInfo.token.contract_addr
    /* c8 ignore start */
    default: {
      const _exhaustiveCheck: never = assetInfo
      return _exhaustiveCheck
    }
    /* c8 ignore stop */
  }
}

export function swapOpsFromPath(
  path: GraphAssetNodeId[],
  assetMap: GraphAssetNodeMap,
): SwapOperation[] {
  const ops = path
    .map((_node, ix) => path.slice(ix, ix + 2))
    .slice(0, -1)
    .map((hop) => {
      const offer = assetMap[hop[0]]
      const ask = assetMap[hop[1]]

      if (!offer) {
        throw new Error(`Missing offer asset in map ${hop[0]}`)
      }

      if (!ask) {
        throw new Error(`Missing ask asset in map ${hop[1]}`)
      }

      return {
        offer,
        ask,
      }
    })

  const result: SwapOperation[] = []

  for (const op of ops) {
    if (op.offer.dex.id === op.ask.dex.id) {
      result.push(op)
      continue
    }

    if (getDenom(op.offer.assetInfo) !== getDenom(op.ask.assetInfo)) {
      throw new Error('Unsupported cross DEX swap')
    }

    if (result.length < 1) {
      throw new Error('Cant route an operation if theres not any previous')
    }

    result[result.length - 1].to = op.ask.dex.router
  }

  return result
}

export function toBinary(msg: any) {
  return Buffer.from(JSON.stringify(msg)).toString('base64')
}

export function toSwapOpsRaw(
  swapOps: SwapOperation[],
): [SwapOperationRaw[][], string[], (string | undefined)[]] {
  const operationsResult: SwapOperationRaw[][] = []
  const dexResult: string[] = []
  const tos: (string | undefined)[] = []
  let operations: SwapOperationRaw[] = []
  for (const [ix, op] of swapOps.entries()) {
    operations.push({
      [op.ask.dex.swapName]: {
        offer_asset_info: toRaw<AssetInfoRaw>(op.offer.assetInfo),
        ask_asset_info: toRaw<AssetInfoRaw>(op.ask.assetInfo),
      },
    })
    if (op.to || ix === swapOps.length - 1) {
      dexResult.push(op.ask.dex.router)
      tos.push(op.to)
      operationsResult.push(operations)

      operations = []
    }
  }

  return [operationsResult, dexResult, tos]
}

export async function simulateSwap(
  amount: string,
  swapOps: SwapOperation[],
  client: SigningCosmWasmClient,
): Promise<[string, string[]]> {
  const [swapOpsRaw, dexes] = toSwapOpsRaw(swapOps)
  const allResults: string[] = []
  let finalAmount = amount
  for (const [ix, operations] of swapOpsRaw.entries()) {
    const response: SimulateSwapResponse = await client.queryContractSmart(
      dexes[ix],
      {
        simulate_swap_operations: {
          offer_amount: finalAmount,
          operations: operations,
        },
      },
    )

    finalAmount = response.amount

    allResults.push(finalAmount)
  }

  return [finalAmount, allResults]
}

export function getExecuteSwapMsg(
  flashLoanAddr: string,
  flashLoanAsset: Asset,
  sender: string,
  minimumReceives: string[],
  swapOps: SwapOperation[],
  max_spread = '0.005',
): EncodeObject[] {
  const [swapOpsRaw, dexes, tos] = toSwapOpsRaw(swapOps)

  if (swapOpsRaw.length !== minimumReceives.length) {
    throw new Error(
      `Nonparsable input, minimumReceives length (${minimumReceives.length}) and swapOpsRaw length (${swapOpsRaw.length}) differ`,
    )
  }

  const msgs: WasmMessage[] = []

  for (const [ix, operations] of swapOpsRaw.entries()) {
    const swapMsg: ExecuteSwapOperation = {
      execute_swap_operations: {
        operations,
        to: tos[ix],
        minimum_receive: minimumReceives[ix],
        max_spread: max_spread,
      },
    }

    const executeSwapMsg: WasmMessage = {
      wasm: {
        execute: {
          contract_addr: dexes[ix],
          funds: [],
          msg: toBase64(toUtf8(JSON.stringify(swapMsg))),
        },
      },
    }

    if (ix === 0) {
      executeSwapMsg.wasm.execute.funds.push({
        amount: flashLoanAsset.amount,
        denom: getDenom(flashLoanAsset.assetInfo),
      })
    }

    msgs.push(executeSwapMsg)
  }

  const flashLoanMessage: FlashLoanMessage = {
    flash_loan: {
      assets: [
        {
          amount: flashLoanAsset.amount,
          info: toRaw<AssetInfoRaw>(flashLoanAsset.assetInfo),
        },
      ],
      msgs: msgs,
    },
  }

  const encodedMsgObject: EncodeObject = {
    typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
    value: MsgExecuteContract.fromPartial({
      sender: sender,
      contract: flashLoanAddr,
      msg: toUtf8(JSON.stringify(flashLoanMessage)),
      funds: [],
    }),
  }

  return [encodedMsgObject]
}
