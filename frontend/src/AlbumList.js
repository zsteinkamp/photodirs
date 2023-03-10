import './AlbumList.css';

import dayjs from 'dayjs';
import { Link } from "react-router-dom";

var utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

export default function AlbumList(props) {
  let albumList = null;
  if (props.albums && props.albums.length > 0) {
    const albumListItems = props.albums.map((album) => {
      // always make description an array to simplify impl
      if (typeof album.description === 'string' && album.description) {
          album.description = [album.description];
      }
      const descriptionParagraph = album.description && (
        <p className='desc'>
          {album.description[0]}
        </p>
      );


      return (
        <div className="AlbumItem" key={album.apiPath}>
          <Link to={ album.uriPath }>
            {album.thumbnail && (
              <div className='thumbnail'>
                <img src={ `${album.thumbnail}?size=300x300&crop)` } loading="lazy" alt={ album.title } />
              </div>
            )}
            <div className='body'>
              <p className='date'>{dayjs(album.date).utc().format("YYYY-MM-DD")}</p>
              <h1>{album.title}</h1>
              {descriptionParagraph}
            </div>
          </Link>
        </div>
      );
    });
    albumList = (
      <div className="AlbumList">
        { albumListItems }
      </div>
    );
  }
  return albumList;
}
