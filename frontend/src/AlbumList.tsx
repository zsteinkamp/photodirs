import './AlbumList.css'

import dayjs from 'dayjs'
import 'dayjs/plugin/utc'
import { Link } from 'react-router-dom'
import Markdown from 'react-markdown'
import { AlbumSummary } from './types'

interface AlbumListProps {
  albums: AlbumSummary[] | null
  sortAlbums?: string
}

export default function AlbumList({ albums, sortAlbums }: AlbumListProps) {
  if (!albums || albums.length === 0) {
    return null
  }

  if (sortAlbums === 'oldest') {
    albums.sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1))
  }

  const albumListItems = albums.map((album) => {
    const description = typeof album.description === 'string'
      ? [album.description]
      : album.description

    const descriptionParagraph = description && (
      <div className='desc'>
        <Markdown>{description[0]}</Markdown>
      </div>
    )

    return (
      <div className='AlbumItem' key={album.apiPath}>
        <Link to={album.uriPath}>
          {album.thumbnail && (
            <div className='thumbnail'>
              <img
                src={`${album.thumbnail}?size=300x300&crop${album.thumbnailHash ? '&hash=' + album.thumbnailHash : ''}`}
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

  return <div className='AlbumList'>{albumListItems}</div>
}
