'use strict'

export async function promiseAllInBatches(items, task, batchSize) {
  let position = 0
  let results = []
  while (position < items.length) {
    const itemsForBatch = items.slice(position, position + batchSize)
    results = [
      ...results,
      ...(await Promise.all(itemsForBatch.map(item => task(item)))),
    ]
    position += batchSize
  }
  return results
}
