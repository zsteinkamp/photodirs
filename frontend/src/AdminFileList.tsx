import './AdminFileList.css'

import { useState } from 'react'
import VideoIcon from './VideoIcon'
import InlineEditArea from './InlineEditArea'
import InlineEdit from './InlineEdit'
import { AlbumFile } from './types'

interface AdminFileListProps {
  files: AlbumFile[] | null
  thumbnail: string | undefined
  updateAlbumThumb: (val: string) => void
}

export default function AdminFileList({ files, thumbnail, updateAlbumThumb }: AdminFileListProps) {
  const [currThumb, setCurrThumb] = useState(thumbnail)

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

  if (!files || files.length === 0) {
    return null
  }

  const fileListItems = files.map((file, idx) => {
    return (
      <div className='fileRow' key={file.apiPath}>
        <div className='colDefault'>
          <input
            type='radio'
            id={file.fileName}
            name='defaultImg'
            value={file.fileName}
            checked={file.fileName === currThumb}
            tabIndex={idx}
            onChange={updateThumb}
          />
          <label htmlFor={file.fileName}>
            <div className='colImage'>
              <img
                src={file.photoPath + '?size=300x300&crop'}
                alt={file.name}
                loading='lazy'
              />
              {file.type === 'video' && <VideoIcon />}
            </div>
          </label>
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
        </div>
      </div>
    )
  })

  return <div className='AdminFileList'>{fileListItems}</div>
}
