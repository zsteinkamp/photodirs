import './PhotoElement.css'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import SVGDownload from './SVGDownload'
import SVGFullscreen from './SVGFullscreen'
import SVGClose from './SVGClose'
import VideoIcon from './VideoIcon'

import dayjs from 'dayjs'
const utc = require('dayjs/plugin/utc')
dayjs.extend(utc)

export default function PhotoElement({ data }) {
  const parentPath = data.album.uriPath
  const albumFiles = data.album.files

  const [careAboutScroll, setCareAboutScroll] = useState(true)
  const [currData, setCurrData] = useState(data)
  const [currFileIdx, setCurrFileIdx] = useState(
    albumFiles.findIndex((file) => {
      return file.path === data.path
    })
  )
  const [scrollCareTimeout, setScrollCareTimeout] = useState(null)

  const navigate = useNavigate()
  const carouselRef = useRef(null)
  const thumbsRef = useRef(null)
  const imageContainerRef = useRef(null)

  // if the data in state is the same as the data in props
  const isInitialLoad = currData === data

  // a ref for each image tile
  const tileRefs = useRef([])
  const thumbRefs = useRef([])

  const returnToAlbum = () => {
    navigate(parentPath)
  }
  const goToPrevPhoto = () => {
    scrollCarouselTo(currFileIdx - 1)
  }
  const goToNextPhoto = () => {
    scrollCarouselTo(currFileIdx + 1)
  }

  const downloadOriginal = () => {
    window.location.href = data.photoPath + '?size=orig'
  }

  const scrollCarouselTo = (idx) => {
    handleThumbClick((albumFiles.length + idx) % albumFiles.length)
  }

  // Debounce fetching metadata for the currFileIdx, since it can change
  // rapidly while scrolling
  const debounceRef = useRef(null)

  // currFileIdx effect
  useEffect(() => {
    if (!tileRefs.current || !thumbRefs.current) {
      return
    }

    // pause any videos
    tileRefs.current.forEach((e) => {
      for (const ce of e.children) {
        if (ce.tagName === 'VIDEO') {
          ce.pause()
          ce.blur()
        }
      }
    })

    const tileRef = tileRefs.current[currFileIdx]
    const thumbRef = thumbRefs.current[currFileIdx]
    if (tileRef) {
      thumbRefs.current.forEach((ref) => ref.classList.remove('sel'))
      thumbRef.classList.add('sel')
    }

    const safeIndex = (idx) => {
      return (albumFiles.length + idx) % albumFiles.length
    }

    // preload images -- turn off lazy attribute of adjacent images
    tileRefs.current[safeIndex(currFileIdx + 1)].firstChild.loading = 'auto'
    tileRefs.current[safeIndex(currFileIdx - 1)].firstChild.loading = 'auto'

    const updateData = async () => {
      //console.log('UPDATE DATA');
      const crc = carouselRef.current
      if (!crc) {
        return
      }

      const response = await fetch(albumFiles[currFileIdx].apiPath)
      if (!response.ok) {
        const body = await response.json()
        throw new Error(
          `HTTP error ${response.status}: ${JSON.stringify(body)}`
        )
      }

      let actualData = await response.json()
      setCurrData(actualData)

      // update displayed URL without engaging router -- have to do it this way
      // because we use a catch-all route
      window.history.replaceState(null, actualData.title, actualData.path)
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }
    // if no index change for 250ms then update data
    debounceRef.current = window.setTimeout(updateData, 250)
  }, [currFileIdx, albumFiles])

  const toggleFullScreen = () => {
    if (!imageContainerRef.current) {
      return
    }
    imageContainerRef.current.classList.toggle('fullscreen')
  }

  const keyCodeToAction = {
    27: returnToAlbum, // escape
    37: goToPrevPhoto, // left arrow
    39: goToNextPhoto, // right arrow
    70: toggleFullScreen, // letter f
  }

  const handleKeypress = (event) => {
    if (!event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
      const keypressAction = keyCodeToAction[event.keyCode]
      if (keypressAction) {
        keypressAction()
        event.preventDefault()
      } else {
        //console.log('KEYPRESS', event.keyCode);
      }
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeypress)
    return () => {
      window.removeEventListener('keydown', handleKeypress)
    }
  })

  const alignThumbToCarousel = () => {
    const crc = carouselRef.current
    if (!crc) {
      return
    }
    const trc = thumbsRef.current
    const carouselScrollCoeff =
      crc.scrollLeft / (crc.scrollWidth - crc.clientWidth)

    const thumbContentWidth = trc.scrollWidth - trc.clientWidth // half client width added as padding to the ends
    // the width of one thumbnail image. The ratio of this number to the "sel" class padding is important for some of the math below.
    const thumbnailWidth = thumbRefs.current[0].clientWidth
    // get the proportion of thumbnail pixels        full width        - one thumbnail  - sel margin treatment (2 rem on 5 rem thumb) */
    const thumbContentProp =
      carouselScrollCoeff *
      (thumbContentWidth - thumbnailWidth - thumbnailWidth / 2.5)

    // now apply back to the
    // scrollLeft property:  proprtion in px + half of a thumbnail width + half of the sel margin treatment
    thumbsRef.current.scrollLeft =
      thumbContentProp + thumbnailWidth / 2 + thumbnailWidth / 5
  }

  const handleScroll = () => {
    if (!careAboutScroll) {
      return
    }

    alignThumbToCarousel()

    const crc = carouselRef.current
    const newFileIdx = Math.round(crc.scrollLeft / crc.clientWidth)
    if (currFileIdx !== newFileIdx) {
      setCurrFileIdx(newFileIdx)
    }
  }

  // subscribe to carousel scroll to trigger fetching metadata for other images
  useEffect(() => {
    const current = carouselRef.current
    if (current) {
      carouselRef.current.addEventListener('scroll', handleScroll)
    }
    return () => {
      current.removeEventListener('scroll', handleScroll)
    }
  })

  let exifElement = null
  if (currData.exif && Object.keys(currData.exif).length > 0) {
    const exifDetails = Object.entries(currData.exif).map(([key, val]) => {
      return (
        <Fragment key={key}>
          <dt>{key}</dt>
          <dd>{val}</dd>
        </Fragment>
      )
    })

    exifElement = (
      <div className="exif">
        <div className="exifInner invisible-scrollbar">
          <dl>{exifDetails}</dl>
        </div>
        <div className="tag">EXIF / INFO</div>
      </div>
    )
  }

  const handleClick = (e) => {
    const xProp = e.clientX / tileRefs.current[currFileIdx].clientWidth
    if (xProp < 0.25) {
      goToPrevPhoto()
    } else if (xProp > 0.75) {
      goToNextPhoto()
    }
  }

  const tiles = albumFiles.map((file, i) => {
    return (
      <div
        ref={(el) => (tileRefs.current[i] = el)}
        key={file.uriPath}
        onClick={handleClick}
        className="carouselItem"
      >
        <div>
          {file.type === 'video' ? (
            <video
              draggable="false"
              controls
              autoPlay={false}
              poster={`${file.photoPath}?size=1600x1600`}
              preload="none"
            >
              <source src={file.videoPath} type="video/mp4" />
            </video>
          ) : (
            <img
              draggable="false"
              src={`${file.photoPath}?size=1600x1600`}
              srcSet={`${file.photoPath}?size=400x400 400w, ${file.photoPath}?size=800x400 800w, ${file.photoPath}?size=1600x1600 1600w`}
              alt={file.title}
              loading="lazy"
            />
          )}
        </div>
      </div>
    )
  })

  const handleThumbClick = (tileIndex) => {
    setCareAboutScroll(false)
    if (scrollCareTimeout) {
      clearTimeout(scrollCareTimeout)
    }
    setScrollCareTimeout(
      setTimeout(() => {
        setCareAboutScroll(true)
        thumbRefs.current[tileIndex].scrollIntoView({
          block: 'center',
          inline: 'center',
          behavior: 'smooth',
        })
        setScrollCareTimeout(null)
        //alignThumbToCarousel();
      }, 1000)
    )
    //console.log(tileIndex, tileRefs.current[tileIndex]);
    tileRefs.current[tileIndex].scrollIntoView()
    setCurrFileIdx(tileIndex)
  }

  const thumbnails = albumFiles.map((file, i) => {
    return (
      <Link
        ref={(el) => (thumbRefs.current[i] = el)}
        to={file.uriPath}
        key={file.uriPath}
        onClick={(e) => handleThumbClick(i)}
      >
        <img
          draggable="false"
          src={`${file.photoPath}?size=400x400`}
          alt={file.title}
          loading="lazy"
        />
        {file.type === 'video' && <VideoIcon />}
      </Link>
    )
  })

  const mainElement = (
    <div ref={carouselRef} className="carousel">
      {tiles}
    </div>
  )

  // this will run on initial load and center the tile corresponding to the URL
  useEffect(() => {
    if (!isInitialLoad || !tileRefs.current || !thumbRefs.current) {
      return
    }
    const tileRef = tileRefs.current[currFileIdx]
    if (tileRef) {
      tileRef.scrollIntoView()
      //carouselRef.current.style['scroll-behavior'] = 'smooth';
    }
    const thumbRef = thumbRefs.current[currFileIdx]
    if (thumbRef) {
      thumbRef.scrollIntoView({
        block: 'center',
        inline: 'center',
        behavior: 'smooth',
      })
    }
  })

  return (
    <div className="PhotoElement">
      <div className="header">
        <h1>{currData.title}</h1>
        {currData.date && (
          <p className="date">
            {dayjs(currData.date).utc().format('YYYY-MM-DD dddd')}
          </p>
        )}
        <p className="description">{currData.description}</p>
      </div>
      <div ref={imageContainerRef} className="imageContainer">
        {mainElement}
        {exifElement}
      </div>
      <div ref={thumbsRef} className="thumbContainer">
        {thumbnails}
      </div>
      <Link title="Return to Album" className="closeBtn" to={parentPath}>
        <SVGClose />
      </Link>
      <Link
        title="Full Screen"
        className="fullscreenBtn"
        onClick={toggleFullScreen}
        to="#"
      >
        <SVGFullscreen />
      </Link>
      <Link
        title="Download Original"
        className="downloadBtn"
        onClick={downloadOriginal}
        to="#"
      >
        <SVGDownload />
      </Link>
    </div>
  )
}
