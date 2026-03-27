import './FileList.css'

import { Link } from 'react-router-dom'

import VideoIcon from './VideoIcon'
import { AlbumFile } from './types'

interface FileListProps {
  files: AlbumFile[] | null
}

export default function FileList({ files }: FileListProps) {
  if (!files || files.length === 0) {
    return null
  }

  const fileListItems = files.map((file) => {
    return (
      <div key={file.apiPath}>
        <Link title={file.title} to={file.uriPath}>
          <img
            src={
              file.photoPath +
              '?size=300x300&crop' +
              (file.hash ? '&hash=' + file.hash : '')
            }
            alt={file.name}
            loading='lazy'
          />
          {file.type === 'video' && <VideoIcon />}
        </Link>
      </div>
    )
  })

  return <div className='FileList'>{fileListItems}</div>
}
