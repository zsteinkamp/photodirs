import { useEffect, useState } from 'react'
import { RecordType, getDateBins } from './getDateBins'
import DateBins from './DateBins'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)
import React from 'react'
import ReactSlider from 'react-slider'

import './TimeSlider.css'

type TimeSliderProps = {
  data: RecordType[]
  filteredData: RecordType[]
  setFilteredData: (arg0: RecordType[]) => void
}

const TimeSlider: React.FC<TimeSliderProps> = ({
  data,
  filteredData,
  setFilteredData,
}) => {
  const dateBins = getDateBins({
    data: data,
    targetNumBins: 100,
    dateFn: (e) => dayjs(e.date as string).valueOf(),
  })
  const [minSlider, setMinSlider] = useState(dateBins.minDate)
  const [maxSlider, setMaxSlider] = useState(dateBins.maxDate)
  const [filter, setFilter] = useState('')

  const handleSliderChange = (e: number[]) => {
    if (undefined === dateBins.granularity) {
      return
    }
    setMinSlider(dayjs(e[0]).utc().startOf(dateBins.granularity).valueOf())
    setMaxSlider(dayjs(e[1]).utc().endOf(dateBins.granularity).valueOf())
    //console.log("SLIDER CHANGE", { e })
  }

  useEffect(() => {
    const tempData: RecordType[] = []
    if (undefined === dateBins.granularity) {
      return
    }
    for (const record of data) {
      const recordDate = dayjs(record.date as string)
        .utc()
        .startOf(dateBins.granularity)
        .valueOf()
      //console.log("IN HERE", { minSlider, maxSlider, recordDate, goodMin: recordDate >= minSlider, goodMax: recordDate <= maxSlider })
      if (recordDate >= minSlider && recordDate <= maxSlider) {
        const flatRecord = JSON.stringify(record)
        if (filter === '' || flatRecord.toLowerCase().indexOf(filter) > -1) {
          tempData.push(record)
        }
      }
    }
    setFilteredData(tempData)
  }, [minSlider, maxSlider, filter])

  const onBinClick = (ts: number) => {
    if (!dateBins.granularity) {
      return
    }
    const maxdjs = dayjs(ts).utc().endOf(dateBins.granularity)
    const maxval = maxdjs.valueOf()
    setMinSlider(ts)
    setMaxSlider(maxval)
  }

  const thumbFormatForGranularity = (granularity: string) => {
    return {
      year: 'YYYY',
      month: 'YYYY MMM',
    }[granularity]
  }

  return (
    <div className='TimeSlider'>
      <div className='tsHeader'>
        <div className='tsShowing'>Showing {filteredData.length} albums</div>
        <div className='tsFilterOuter'>
          <input
            placeholder='Filter...'
            type='text'
            onChange={(e) => setFilter(e.target.value)}
            className='tsFilterInner'
          />
        </div>
      </div>
      <DateBins dateBins={dateBins} onBinClick={onBinClick} />
      <div className='tsSliderHolder'>
        <ReactSlider
          onChange={(e) => handleSliderChange(e)}
          className='tsSliderClassName'
          thumbClassName='tsSliderThumbClassName'
          trackClassName='tsSliderTrackClassName'
          min={dateBins.minDate}
          max={dateBins.maxDate}
          value={[Number(minSlider), Number(maxSlider)]}
          ariaLabel={['Lower thumb', 'Upper thumb']}
          ariaValuetext={(state) =>
            `Thumb value ${dayjs(state.valueNow).utc().format('YYYY')}`
          }
          renderThumb={(props, state) => (
            <div {...props}>
              {dayjs(state.valueNow)
                .utc()
                .format(
                  thumbFormatForGranularity(dateBins.granularity as string)
                )}
            </div>
          )}
          pearling
          minDistance={10}
          withTracks
        />
      </div>
    </div>
  )
}

export default TimeSlider
