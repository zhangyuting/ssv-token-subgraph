import {
  Approval as ApprovalEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  Transfer as SSVTransfer
} from "../generated/Contract/Contract"
import { Approval, OwnershipTransferred, Transfer, TokenHolder, TokenHolderCount } from "../generated/schema"
import { BigInt } from "@graphprotocol/graph-ts"
import { store } from '@graphprotocol/graph-ts'

function updateTokenHolderCount(): void {
  let tokenHolderCount = TokenHolderCount.load("1")
  if (tokenHolderCount == null) {
    tokenHolderCount = new TokenHolderCount("1")
    tokenHolderCount.count = 0
  }
  
  let count = 0
  let id = 0
  while (true) {
    let holder = TokenHolder.load(id.toString())
    if (holder == null) break
    count++
    id++
  }
  
  tokenHolderCount.count = count
  tokenHolderCount.save()
}

export function handleTransfer(event: SSVTransfer): void {
  let senderId = event.params.from.toHexString()
  let recipientId = event.params.to.toHexString()

  let sender = TokenHolder.load(senderId)
  let recipient = TokenHolder.load(recipientId)
  let tokenHolderCount = TokenHolderCount.load("1")

  if (tokenHolderCount == null) {
    tokenHolderCount = new TokenHolderCount("1")
    tokenHolderCount.count = 0
  }

  if (sender == null) {
    sender = new TokenHolder(senderId)
    sender.balance = BigInt.fromI32(0)
  }
  sender.balance = sender.balance.minus(event.params.value)

  if (recipient == null) {
    recipient = new TokenHolder(recipientId)
    recipient.balance = BigInt.fromI32(0)
    tokenHolderCount.count += 1
  }
  recipient.balance = recipient.balance.plus(event.params.value)

  if (sender.balance.equals(BigInt.fromI32(0))) {
    store.remove('TokenHolder', senderId)
    tokenHolderCount.count -= 1
  } else {
    sender.save()
  }

  if (recipient.balance.gt(BigInt.fromI32(0))) {
    recipient.save()
  }

  tokenHolderCount.save()

  let transfer = new Transfer(event.transaction.hash.concatI32(event.logIndex.toI32()))
  transfer.from = event.params.from
  transfer.to = event.params.to
  transfer.value = event.params.value
  transfer.blockNumber = event.block.number
  transfer.blockTimestamp = event.block.timestamp
  transfer.transactionHash = event.transaction.hash
  transfer.save()
}

export function handleApproval(event: ApprovalEvent): void {
  let entity = new Approval(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.spender = event.params.spender
  entity.value = event.params.value
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}