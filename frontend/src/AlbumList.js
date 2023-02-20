import './AlbumList.css';

import moment from 'moment';

export default function AlbumList(props) {
  let albumList = null;
  if (props.albums && props.albums.length > 0) {
    console.log(props.albums);
    const albumListItems = props.albums.map((album) => (
      <div key={album.apiPath}>
        <button onClick={ () => props.browseTo(album.path, album.apiPath) }>
          <p className='date'>{moment(album.date).utc().format("YYYY-MM-DD")}</p>
          <div className='thumbnail' style={{ backgroundImage: `url(${album.thumbnail}?size=200x200&crop)` }} />
          <h1>{album.title}</h1>
          <p className='desc'>{album.description}</p>
        </button>
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
