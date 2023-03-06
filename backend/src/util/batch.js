'use strict';

module.exports = {
  /**
   * Same as Promise.all(items.map(item => task(item))), but it waits for
   * the first {batchSize} promises to finish before starting the next batch.
   *
   * @template A
   * @template B
   * @param {function(A): B} task The task to run for each item.
   * @param {A[]} items Arguments to pass to the task for each call.
   * @param {int} batchSize
   * @returns {Promise<B[]>}
   */
  promiseAllInBatches: async (items, task, batchSize) => {
    let position = 0;
    let results = [];
    while (position < items.length) {
      const itemsForBatch = items.slice(position, position + batchSize);
      results = [...results, ...await Promise.all(itemsForBatch.map(item => task(item)))];
      position += batchSize;
    }
    return results;
  }
};
