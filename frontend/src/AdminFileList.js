import './AdminFileList.css'

import VideoIcon from './VideoIcon'
import InlineEditArea from './InlineEditArea'
import InlineEdit from './InlineEdit'

export default function FileList(props) {
  let adminFileList = null

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

  if (props.files && props.files.length > 0) {
    const fileListItems = props.files.map((file) => {
      //console.log(file)
      return (
        <div className="fileRow" key={file.apiPath}>
          <div className="colDefault">
            <input type="radio" name="defaultImg" />
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
              />
            </div>
            <div>
              <InlineEditArea
                placeholder="Enter a description..."
                value={file.description}
                setValue={(val) =>
                  editMediaMetadata(file, { description: val })
                }
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
