import './PhotoElement.css'
import { Fragment, useContext, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Markdown from 'react-markdown'

import SVGDownload from './SVGDownload'
import SVGFullscreen from './SVGFullscreen'
import SVGClose from './SVGClose'
import VideoIcon from './VideoIcon'
import { AdminContext } from './AdminContext'

import dayjs from 'dayjs'
import 'dayjs/plugin/utc'
import { MediaData } from './types'

interface PhotoElementProps {
  data: MediaData
}

export default function PhotoElement({ data }: PhotoElementProps) {
  const parentPath = data.album.uriPath
  const albumFiles = data.album.files

  const [careAboutScroll, setCareAboutScroll] = useState(true)
  const [currData, setCurrData] = useState<MediaData>(data)
  const [currFileIdx, setCurrFileIdx] = useState(
    albumFiles.findIndex((file) => {
      return file.path === data.path
    })
  )
  const [scrollCareTimeout, setScrollCareTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [rotationVersions, setRotationVersions] = useState<Record<string, number>>({})

  const isAdmin = useContext(AdminContext)
  const navigate = useNavigate()
  const carouselRef = useRef<HTMLDivElement>(null)
  const thumbsRef = useRef<HTMLDivElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)

  // if the data in state is the same as the data in props
  const isInitialLoad = currData === data

  // a ref for each image tile
  const tileRefs = useRef<HTMLDivElement[]>([])
  const thumbRefs = useRef<HTMLAnchorElement[]>([])

  const returnToAlbum = () => {
    navigate(parentPath, { preventScrollReset: true })
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

  const setOrientation = async (orientation: number) => {
    const file = albumFiles[currFileIdx]
    if (!file) return
    const adminApiPath = file.apiPath.replace(/^\/api/, '/api/admin')
    try {
      const res = await fetch(adminApiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orientation }),
      })
      if (!res.ok) {
        console.error('Rotation failed', res.status, await res.text())
        return
      }
      setRotationVersions((prev) => ({
        ...prev,
        [file.uriPath]: Date.now(),
      }))
    } catch (err) {
      console.error('Rotation error', err)
    }
  }

  const scrollCarouselTo = (idx: number) => {
    handleThumbClick((albumFiles.length + idx) % albumFiles.length)
  }

  // Debounce fetching metadata for the currFileIdx, since it can change
  // rapidly while scrolling
  const debounceRef = useRef<number | null>(null)

  // currFileIdx effect
  useEffect(() => {
    if (!tileRefs.current || !thumbRefs.current) {
      return
    }

    // pause any videos
    tileRefs.current.forEach((e) => {
      const video = e.querySelector('video')
      if (video) {
        video.pause()
        video.blur()
      }
    })

    // autoplay the video on the now-current slide. Playing with sound works
    // when we got here via a user gesture (thumbnail click, arrow key, scroll);
    // if the browser blocks it (e.g. a deep-link opening straight onto a video),
    // fall back to muted playback so it still starts.
    const currentVideo =
      tileRefs.current[currFileIdx]?.querySelector('video')
    if (currentVideo) {
      currentVideo.play().catch(() => {
        currentVideo.muted = true
        currentVideo.play().catch(() => {})
      })
    }

    const tileRef = tileRefs.current[currFileIdx]
    const thumbRef = thumbRefs.current[currFileIdx]
    if (tileRef) {
      thumbRefs.current.forEach((ref) => ref.classList.remove('sel'))
      thumbRef.classList.add('sel')
    }

    const safeIndex = (idx: number) => {
      return (albumFiles.length + idx) % albumFiles.length
    }

    // preload images -- turn off lazy attribute of adjacent images
    tileRefs.current[safeIndex(currFileIdx + 1)].firstChild &&
      ((tileRefs.current[safeIndex(currFileIdx + 1)].firstChild as HTMLImageElement).loading = 'eager')
    tileRefs.current[safeIndex(currFileIdx - 1)].firstChild &&
      ((tileRefs.current[safeIndex(currFileIdx - 1)].firstChild as HTMLImageElement).loading = 'eager')

    const updateData = async () => {
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

      const actualData: MediaData = await response.json()
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

  const toggleVideoPlayback = () => {
    const tile = tileRefs.current[currFileIdx]
    if (!tile) return
    const video = tile.querySelector('video')
    if (!video) return
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }

  const keyCodeToAction: Record<number, () => void> = {
    27: returnToAlbum, // escape
    32: toggleVideoPlayback, // spacebar
    37: goToPrevPhoto, // left arrow
    39: goToNextPhoto, // right arrow
    70: toggleFullScreen, // letter f
  }

  const handleKeypress = (event: KeyboardEvent) => {
    if (!event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
      const keypressAction = keyCodeToAction[event.keyCode]
      if (keypressAction) {
        keypressAction()
        event.preventDefault()
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
    const trc = thumbsRef.current!
    const carouselScrollCoeff =
      crc.scrollLeft / (crc.scrollWidth - crc.clientWidth)

    const thumbContentWidth = trc.scrollWidth - trc.clientWidth
    const thumbnailWidth = thumbRefs.current[0].clientWidth
    const thumbContentProp =
      carouselScrollCoeff *
      (thumbContentWidth - thumbnailWidth - thumbnailWidth / 2.5)

    thumbsRef.current!.scrollLeft =
      thumbContentProp + thumbnailWidth / 2 + thumbnailWidth / 5
  }

  const handleScroll = () => {
    if (!careAboutScroll) {
      return
    }

    alignThumbToCarousel()

    const crc = carouselRef.current!
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
      current?.removeEventListener('scroll', handleScroll)
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
      <div className='exif'>
        <div className='exifInner invisible-scrollbar'>
          <dl>{exifDetails}</dl>
        </div>
        <div className='tag'>EXIF / INFO</div>
      </div>
    )
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const xProp = e.clientX / tileRefs.current[currFileIdx].clientWidth
    if (xProp < 0.25) {
      goToPrevPhoto()
    } else if (xProp > 0.75) {
      goToNextPhoto()
    }
  }

  const tiles = albumFiles.map((file, i) => {
    const hashParam = file.hash ? '&hash=' + file.hash : ''
    const rv = rotationVersions[file.uriPath]
    const rvParam = rv ? '&rv=' + rv : ''
    return (
      <div
        ref={(el) => { if (el) tileRefs.current[i] = el }}
        key={file.uriPath}
        onClick={handleClick}
        className='carouselItem'
      >
        <div>
          {file.type === 'video' ? (
            <video
              draggable='false'
              controls
              loop
              autoPlay={false}
              poster={`${file.photoPath}?size=1600x1600`}
              preload='none'
            >
              <source src={file.videoPath} type='video/mp4' />
            </video>
          ) : (
            <img
              src={`${file.photoPath}?size=1600x1600${hashParam}${rvParam}`}
              srcSet={`${file.photoPath}?size=400x400${hashParam}${rvParam} 400w, ${file.photoPath}?size=800x800${hashParam}${rvParam} 800w, ${file.photoPath}?size=1600x1600${hashParam}${rvParam} 1600w`}
              alt={file.title}
              loading='lazy'
            />
          )}
        </div>
      </div>
    )
  })

  const handleThumbClick = (tileIndex: number) => {
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
      }, 1000)
    )
    tileRefs.current[tileIndex].scrollIntoView()
    setCurrFileIdx(tileIndex)
  }

  const thumbnails = albumFiles.map((file, i) => {
    const hashParam = file.hash ? '&hash=' + file.hash : ''
    const rv = rotationVersions[file.uriPath]
    const rvParam = rv ? '&rv=' + rv : ''
    return (
      <Link
        ref={(el) => { if (el) thumbRefs.current[i] = el }}
        to={file.uriPath}
        key={file.uriPath}
        onClick={() => handleThumbClick(i)}
      >
        <img
          draggable='false'
          src={`${file.photoPath}?size=400x400${hashParam}${rvParam}`}
          alt={file.title}
          loading='lazy'
        />
        {file.type === 'video' && <VideoIcon />}
      </Link>
    )
  })

  const mainElement = (
    <div ref={carouselRef} className='carousel'>
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
    <div className='PhotoElement'>
      <div className='header'>
        <div
          className={`headerTitle ${currData.description ? '' : 'solomente'}`}
        >
          <h1 className='titlePlaceholder' title={currData.title}>
            {currData.title}
          </h1>
          {currData.description && (
            <h1 className='titleLong'>
              {currData.title}
              {currData.date && (
                <p className='date'>
                  {dayjs(currData.date).utc().format('YYYY-MM-DD dddd')}
                </p>
              )}
            </h1>
          )}
          {currData.date && (
            <p className='date'>
              {dayjs(currData.date).utc().format('YYYY-MM-DD dddd')}
            </p>
          )}
        </div>
        {currData.description && (
          <div className='headerElems'>
            <div className='description'>
              <div className='descriptionPlaceholder'>
                {currData.description || <em>No Description</em>}
              </div>
              <div className='descriptionLong'>
                <Markdown>{currData.description}</Markdown>
              </div>
            </div>
          </div>
        )}
      </div>
      <div ref={imageContainerRef} className='imageContainer'>
        {mainElement}
        {exifElement}
      </div>
      <div ref={thumbsRef} className='thumbContainer'>
        {thumbnails}
      </div>
      <Link title='Return to Album' className='closeBtn' to={parentPath} preventScrollReset>
        <SVGClose />
      </Link>
      <Link
        title='Full Screen'
        className='fullscreenBtn'
        onClick={toggleFullScreen}
        to='#'
      >
        <SVGFullscreen />
      </Link>
      <Link
        title='Download Original'
        className='downloadBtn'
        onClick={downloadOriginal}
        to='#'
      >
        <SVGDownload />
      </Link>
      {isAdmin && albumFiles[currFileIdx]?.type !== 'video' && (
        <div className='rotateBtns'>
          <button title='Rotate 90° counter-clockwise' onClick={() => setOrientation(8)}>↶</button>
          <button title='Rotate 180°' onClick={() => setOrientation(3)}>⇅</button>
          <button title='Rotate 90° clockwise' onClick={() => setOrientation(6)}>↷</button>
          <button title='Reset orientation' onClick={() => setOrientation(1)}>1:1</button>
        </div>
      )}
    </div>
  )
}
