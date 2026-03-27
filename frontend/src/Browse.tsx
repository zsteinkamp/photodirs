import './Browse.css'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)
import { useContext, useRef, useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Markdown from 'react-markdown'

import Breadcrumb from './Breadcrumb'
import AlbumList from './AlbumList'
import FileList from './FileList'
import AdminFileList from './AdminFileList'
import PhotoElement from './PhotoElement'
import TimeSlider from './TimeSlider'
import InlineEditArea from './InlineEditArea'
import { AdminContext } from './AdminContext'
import ThemeSwitcher from './ThemeSwitcher'
import { RecordType } from './getDateBins'
import { ApiData, AlbumData, AlbumSummary, BreadcrumbItem } from './types'

export default function Browse() {
  const isAdmin = useContext(AdminContext)
  const makeApiPath = (path: string) => {
    return '/api/albums' + path
  }

  const [apiPath, setApiPath] = useState(makeApiPath(window.location.pathname))
  const [adminApiPath, setAdminApiPath] = useState(apiPath)
  const [data, setData] = useState<ApiData | null>(null)
  const [filteredData, setFilteredData] = useState<AlbumSummary[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()

  // Save album scroll positions so we can restore when returning from a photo
  const albumScrollPositions = useRef<Record<string, number>>({})

  // Save scroll position on click (capture phase, before navigation resets it)
  const browseRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!data || data.type !== 'album') return
    const el = browseRef.current
    if (!el) return
    const onClick = () => {
      albumScrollPositions.current[data.path] = window.scrollY
    }
    el.addEventListener('click', onClick, true)
    return () => el.removeEventListener('click', onClick, true)
  }, [data])

  const location = useLocation()
  useEffect(() => {
    setApiPath(makeApiPath(location.pathname))
  }, [location])

  /*
   * Keyboard Controls
   */
  const goToParentAlbum = () => {
    if (data && data.breadcrumb && data.breadcrumb.length > 1) {
      // not at root
      navigate(data.breadcrumb[data.breadcrumb.length - 2].path, { preventScrollReset: true })
    }
  }

  const keyCodeToAction: Record<number, () => void> = {
    27: goToParentAlbum, // escape
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

  /*
   * Fetch data when the apiPath changes
   */
  useEffect(() => {
    const getData = async () => {
      try {
        setLoading(true)
        const response = await fetch(apiPath)
        if (!response.ok) {
          const body = await response.json()
          throw new Error(
            `HTTP error ${response.status}: ${JSON.stringify(body)}`
          )
        }
        const actualData: ApiData = await response.json()
        setData(actualData)
        if (actualData.type === 'album') {
          setFilteredData(actualData.albums)
        }

        // set page title
        if (actualData.type !== 'album' && actualData.album?.title && actualData.title) {
          document.title = [actualData.album.title, actualData.title].join(
            ' / '
          )
        } else if (actualData.title) {
          document.title = actualData.title
        }

        setError(null)
      } catch (err) {
        setError((err as Error).message)
        setData(null)
        setFilteredData(null)
      } finally {
        setLoading(false)
      }
    }
    setAdminApiPath(apiPath.replace(/^\/api/, '/api/admin'))
    getData()
  }, [apiPath])

  // Restore scroll position when returning to an album from a photo
  useEffect(() => {
    if (!loading && data && data.type === 'album') {
      const savedPosition = albumScrollPositions.current[data.path]
      if (savedPosition !== undefined) {
        requestAnimationFrame(() => {
          window.scrollTo(0, savedPosition)
        })
      }
    }
  }, [loading, data])

  /*
   * Something to put in breadcrumb if there is an error fetching
   */
  const errorBreadcrumb: BreadcrumbItem[] = [
    { title: 'Home', path: '/', apiPath: '/api/albums/' },
    { title: 'Error', path: '/', apiPath: '/api/albums/' },
  ]

  /*
   * Received photo data on api, return a PhotoElement
   */
  if (!error && !loading && data && (data.type === 'photo' || data.type === 'video')) {
    return <PhotoElement data={data} />
  }

  const editAlbumMetadata = async (payload: Record<string, string>) => {
    try {
      const response = await fetch(adminApiPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      console.log('Success:', result)
    } catch (error) {
      console.error('Error:', error)
    }
    if (data) {
      Object.assign(data, payload)
    }
  }

  /*
   * Main content section, all these cases share a layout
   */
  const getPageBody = () => {
    if (loading) {
      return <div className='loading'>Loading...</div>
    }

    if (error) {
      return (
        <div className='error'>{`There is a problem fetching the data - ${error}`}</div>
      )
    }

    const updateAlbumThumb = (val: string) => {
      editAlbumMetadata({ thumbnail: val })
    }

    if (data && data.type === 'album') {
      const albumData = data as AlbumData
      const thumbnailFname =
        albumData.thumbnail && albumData.thumbnail.split('/').reverse()[0]
      return (
        <div className='album'>
          <div className='header'>
            {albumData.path !== '/' && (
              <div className='date'>
                {dayjs(albumData.date).utc().format('YYYY-MM-DD dddd')}
              </div>
            )}
            {isAdmin ? (
              <InlineEditArea
                placeholder='Enter a description...'
                value={albumData.description ?? ''}
                setValue={(val) => editAlbumMetadata({ description: val })}
              >
                {albumData.description}
              </InlineEditArea>
            ) : (
              <div className='desc'>
                <Markdown>{albumData.description}</Markdown>
              </div>
            )}
          </div>
          {location.pathname !== '/' ? null : (
            <TimeSlider
              data={albumData.albums as unknown as RecordType[]}
              filteredData={(filteredData ?? []) as unknown as RecordType[]}
              setFilteredData={setFilteredData as unknown as (data: RecordType[]) => void}
            />
          )}
          <AlbumList albums={filteredData} sortAlbums={albumData.sortAlbums} />
          {isAdmin ? (
            <AdminFileList
              files={albumData.files}
              thumbnail={thumbnailFname}
              updateAlbumThumb={updateAlbumThumb}
            />
          ) : (
            <FileList files={albumData.files} />
          )}
        </div>
      )
    }

    return (
      <div className='error'>
        Unknown type <pre>{data?.type}</pre>.
      </div>
    )
  }

  /*
   * Common layout for album/photo lists, loading, error
   */
  return (
    <div className='Browse' ref={browseRef}>
      <header>
        <div className='logo'>
          <Link to='/'>
            <img src='/logo.svg' alt='Photodirs Logo' />
          </Link>
        </div>
        {!loading && (
          <Breadcrumb
            crumbs={data ? data.breadcrumb : errorBreadcrumb}
            onEdit={(val) => editAlbumMetadata({ title: val })}
          />
        )}
      </header>
      <div className='pageBody'>{getPageBody()}</div>
      <footer>
        <div>
          Check out out{' '}
          <a
            rel='noreferrer'
            href='https://github.com/zsteinkamp/photodirs'
            target='_blank'
          >
            Photodirs on GitHub
          </a>
        </div>
        <div>
          <ThemeSwitcher />
        </div>
        <div>
          by <a href='https://steinkamp.us/'>Zack Steinkamp</a>
        </div>
      </footer>
    </div>
  )
}
