export async function promiseAllInBatches<T, R>(
  items: T[],
  task: (item: T) => Promise<R>,
  batchSize: number,
): Promise<R[]> {
  let position = 0
  let results: R[] = []
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
