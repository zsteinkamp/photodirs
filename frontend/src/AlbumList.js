import './AlbumList.css'

import dayjs from 'dayjs'
import 'dayjs/plugin/utc'
import { Link } from 'react-router-dom'
import Markdown from 'react-markdown'

export default function AlbumList(props) {
  let albumList = null
  if (props.albums && props.albums.length > 0) {
    const albumListItems = props.albums.map((album) => {
      // always make description an array to simplify impl
      if (typeof album.description === 'string' && album.description) {
        album.description = [album.description]
      }
      const descriptionParagraph = album.description && (
        <div className='desc'>
          <Markdown>{album.description[0]}</Markdown>
        </div>
      )

      return (
        <div className='AlbumItem' key={album.apiPath}>
          <Link to={album.uriPath}>
            {album.thumbnail && (
              <div className='thumbnail'>
                <img
                  src={`${album.thumbnail}?size=300x300&crop`}
                  loading='lazy'
                  alt={album.title}
                />
              </div>
            )}
            <div className='body'>
              <p className='date'>
                {dayjs(album.date).utc().format('YYYY-MM-DD dddd')}
              </p>
              <h1>{album.title}</h1>
              {descriptionParagraph}
            </div>
          </Link>
        </div>
      )
    })
    albumList = <div className='AlbumList'>{albumListItems}</div>
  }
  return albumList
}
