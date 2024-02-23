import './AdminFileList.css'

import { useState } from 'react'
import VideoIcon from './VideoIcon'
import InlineEditArea from './InlineEditArea'
import InlineEdit from './InlineEdit'

export default function AdminFileList({ files, thumbnail, updateAlbumThumb }) {
  let adminFileList = null

  const [currThumb, setCurrThumb] = useState(thumbnail)

  const editMediaMetadata = async (media, payload) => {
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

  const updateThumb = (event) => {
    const val = event && event.target && event.target.value
    if (val) {
      console.log('IN HERE', { val })
      updateAlbumThumb(val)
      setCurrThumb(val)
    }
  }

  if (files && files.length > 0) {
    const fileListItems = files.map((file, idx) => {
      //console.log(file)
      return (
        <div className="fileRow" key={file.apiPath}>
          <div className="colDefault">
            <input
              type="radio"
              name="defaultImg"
              value={file.fileName}
              checked={file.fileName === currThumb}
              tabIndex={idx}
              onChange={updateThumb}
            />
          </div>
          <div className="colImage">
            <img
              src={file.photoPath + '?size=300x300&crop'}
              alt={file.name}
              loading="lazy"
            />
            {file.type === 'video' && <VideoIcon />}
          </div>
          <div className="colTitleDesc">
            <div>
              <InlineEdit
                placeholder="Enter a title..."
                value={file.title}
                setValue={(val) => editMediaMetadata(file, { title: val })}
                tabIndex={1000 + 2 * idx}
              />
            </div>
            <div>
              <InlineEditArea
                placeholder="Enter a description..."
                value={file.description}
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
    adminFileList = <div className="AdminFileList">{fileListItems}</div>
  }

  return adminFileList
}
