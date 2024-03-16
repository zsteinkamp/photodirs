import { DateBinObjType } from './getDateBins'
import dayjs, { OpUnitType } from 'dayjs'

import './DateBins.css'

type DateBinsProps = {
  dateBins: DateBinObjType
  className?: string
  onBinClick?: (arg0: number) => void
}
const DateBins: React.FC<DateBinsProps> = ({
  dateBins,
  className = '',
  onBinClick,
}) => {
  if (dateBins.granularity === undefined) {
    return <div className={className}>Error</div>
  }

  function granularityToFormat(granularity: OpUnitType) {
    if (granularity === 'year') {
      return 'YYYY'
    }
    if (granularity === 'month') {
      return 'YYYY MMM'
    }
    if (granularity === 'week') {
      return 'YYYY-mm-dd'
    }
    if (granularity === 'day') {
      return 'YYYY-mm-dd'
    }
  }

  //      <div className='absolute top-[0rem] hidden w-full group-hover:block '>
  //        {binVal}
  //      </div>

  const binKeys = Object.keys(dateBins.bins)
  binKeys.sort((a, b) => parseInt(a) - parseInt(b))
  //console.log({ binKeys })
  const bucketDivs = binKeys.map((key) => {
    const binVal = dateBins.bins[key]
    const bucketPct = Math.round((binVal / dateBins.maxVal) * 100) + '%'
    return (
      <div
        key={key}
        onClick={() => onBinClick && onBinClick(parseInt(key))}
        className='dbBin'
      >
        <div className='dbBar' style={{ height: bucketPct }} />
        <div className='dbLabel'>
          {dateBins.granularity &&
            dayjs(parseInt(key))
              .utc()
              .format(granularityToFormat(dateBins.granularity))}
        </div>
      </div>
    )
  })

  return <div className='DateBins'>{bucketDivs}</div>
}

export default DateBins
