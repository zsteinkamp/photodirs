import './AdminFileList.css'

import { useState } from 'react'
import { Link } from 'react-router-dom'
import VideoIcon from './VideoIcon'
import InlineEditArea from './InlineEditArea'
import InlineEdit from './InlineEdit'
import SVGRotateLeft from './SVGRotateLeft'
import SVGRotateRight from './SVGRotateRight'
import { AlbumFile } from './types'

interface AdminFileListProps {
  files: AlbumFile[] | null
  thumbnail: string | undefined
  updateAlbumThumb: (val: string) => void
}

export default function AdminFileList({ files, thumbnail, updateAlbumThumb }: AdminFileListProps) {
  const [currThumb, setCurrThumb] = useState(thumbnail)
  const [rotationVersions, setRotationVersions] = useState<Record<string, number>>({})
  const [orientations, setOrientations] = useState<Record<string, number>>({})

  const editMediaMetadata = async (media: AlbumFile, payload: Partial<AlbumFile>) => {
    try {
      const adminApiPath = media.apiPath.replace(/^\/api/, '/api/admin')
      await fetch(adminApiPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    } catch (error) {
      console.error('Error:', error)
    }
    Object.assign(media, payload)
  }

  const updateThumb = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value
    if (val) {
      updateAlbumThumb(val)
      setCurrThumb(val)
    }
  }

  const setOrientation = async (file: AlbumFile, orientation: number) => {
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
      setOrientations((prev) => ({ ...prev, [file.uriPath]: orientation }))
      setRotationVersions((prev) => ({
        ...prev,
        [file.uriPath]: Date.now(),
      }))
    } catch (err) {
      console.error('Rotation error', err)
    }
  }

  const toggleRotation = (file: AlbumFile, target: number) => {
    const current = orientations[file.uriPath] ?? 1
    setOrientation(file, current === target ? 1 : target)
  }

  if (!files || files.length === 0) {
    return null
  }

  const fileListItems = files.map((file, idx) => {
    const isDefault = file.fileName === currThumb
    return (
      <div className='fileRow' key={file.apiPath}>
        <div className='colDefault'>
          <input
            type='radio'
            id={`defaultImg-${file.fileName}`}
            name='defaultImg'
            value={file.fileName}
            checked={isDefault}
            tabIndex={idx}
            onChange={updateThumb}
            title='Set as album thumbnail'
          />
        </div>
        <div className={`colImage${isDefault ? ' isDefault' : ''}`}>
          <Link title={file.title} to={file.uriPath}>
            <img
              src={
                file.photoPath +
                '?size=300x300&crop' +
                (rotationVersions[file.uriPath] ? '&v=' + rotationVersions[file.uriPath] : '')
              }
              alt={file.name}
              loading='lazy'
            />
            {file.type === 'video' && <VideoIcon />}
          </Link>
        </div>
        <div className='colTitleDesc'>
          <div>
            <InlineEdit
              placeholder='Enter a title...'
              value={file.title}
              setValue={(val) => editMediaMetadata(file, { title: val })}
              tabIndex={1000 + 2 * idx}
            />
          </div>
          <div>
            <InlineEditArea
              placeholder='Enter a description...'
              value={file.description ?? ''}
              setValue={(val) =>
                editMediaMetadata(file, { description: val })
              }
              tabIndex={1001 + 2 * idx}
            >
              {file.description}
            </InlineEditArea>
          </div>
          {file.type !== 'video' && (
            <div className='rotateBtns'>
              <button
                className={(orientations[file.uriPath] ?? 1) === 8 ? 'pressed' : ''}
                title='Rotate 90° counter-clockwise'
                onClick={() => toggleRotation(file, 8)}
              >
                <SVGRotateLeft />
              </button>
              <button
                className={(orientations[file.uriPath] ?? 1) === 6 ? 'pressed' : ''}
                title='Rotate 90° clockwise'
                onClick={() => toggleRotation(file, 6)}
              >
                <SVGRotateRight />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  })

  return <div className='AdminFileList'>{fileListItems}</div>
}
