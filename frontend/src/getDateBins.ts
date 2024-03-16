import dayjs, { ManipulateType, OpUnitType } from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)

export type DateBinType = Record<string, number>
export type RecordType = Record<string, unknown>

export type DateBinObjType = {
  maxVal: number
  minDate: number
  maxDate: number
  granularity?: OpUnitType
  bins: DateBinType
}

export type GetDateBinsPropsType = {
  data: RecordType[]
  targetNumBins: number
  dateFn: (arg0: RecordType) => number
}

export function getDateBins({
  data,
  targetNumBins,
  dateFn,
}: GetDateBinsPropsType): DateBinObjType {
  const ret: DateBinObjType = {
    maxVal: 0,
    minDate: Infinity,
    maxDate: -Infinity,
    granularity: undefined,
    bins: {},
  }
  // get min/max
  let minDate = null as dayjs.Dayjs | null
  let maxDate = null as dayjs.Dayjs | null
  data.forEach((record) => {
    const postDate = dayjs(dateFn(record)).utc()
    if (null === minDate || postDate < minDate) {
      minDate = postDate
    }
    if (null === maxDate || postDate > maxDate) {
      maxDate = postDate
    }
  })

  if (minDate === null || maxDate === null) {
    console.warn('No dates in data.')
    return ret
  }

  const dateRange = maxDate.diff(minDate)
  const desiredBinSize = dateRange / targetNumBins

  // map a duration name to milliseconds
  const granularityDurations: [number, OpUnitType][] = [
    [86400000, 'day'],
    [86400000 * 7, 'week'],
    [86400000 * 30, 'month'],
    [86400000 * 365, 'year'],
  ]

  for (const [granDur, granStr] of granularityDurations) {
    if (desiredBinSize < granDur) {
      // found the granularity
      ret.granularity = granStr
      break
    }
  }

  if (ret.granularity === undefined) {
    return ret
  }

  // round off start/end to bounds of the time period
  minDate = minDate.startOf(ret.granularity)
  maxDate = maxDate.endOf(ret.granularity)

  // initialize bins
  let currStep = dayjs(minDate).utc()
  while (currStep <= maxDate) {
    ret.bins[currStep.valueOf().toString()] = 0
    currStep = currStep.add(1, ret.granularity as ManipulateType)
    //console.log({ currStep: currStep.valueOf() })
  }

  for (const record of data) {
    const recordDate = dateFn(record)
    //console.log('RECORDDATE', { recordDate })
    if (isNaN(recordDate)) {
      continue
    }
    const bin = dayjs(recordDate)
      .utc()
      .startOf(ret.granularity)
      .valueOf()
      .toString()
    //console.log({ title: record.title, date: dateFn(record), bin: dayjs(bin).format('YYYY MMM') })
    ret.bins[bin]++
    if (ret.bins[bin] > ret.maxVal) {
      ret.maxVal = ret.bins[bin]
    }
  }

  ret.minDate = minDate.valueOf()
  ret.maxDate = maxDate.valueOf()

  //console.log({ ret })

  return ret
}
