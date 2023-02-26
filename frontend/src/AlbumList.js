import './AlbumList.css';

import dayjs from 'dayjs';
import { Link } from "react-router-dom";

var utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

export default function AlbumList(props) {
  let albumList = null;
  if (props.albums && props.albums.length > 0) {
    const albumListItems = props.albums.map((album) => (
      <div key={album.apiPath}>
        <Link to={ album.uriPath }>
          <div className='thumbnail' style={{ backgroundImage: `url(${album.thumbnail}?size=200x200&crop)` }} />
          <div className='body'>
            <p className='date'>{dayjs(album.date).utc().format("YYYY-MM-DD")}</p>
            <h1>{album.title}</h1>
            <p className='desc'>{album.description}</p>
          </div>
        </Link>
      </div>
    ));
    albumList = (
      <div className="AlbumList">
        { albumListItems }
      </div>
    );
  }
  return albumList;
}
