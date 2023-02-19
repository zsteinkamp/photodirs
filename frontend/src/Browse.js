import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Browse() {
  const makeApiPath = (path) => {
    return '/api/albums' + path;
  };
  const [apiPath, setApiPath] = useState(makeApiPath(window.location.pathname));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  let navigate = useNavigate();

  const browseTo = (path, apiPath) => {
    navigate(path);
    setApiPath(apiPath || makeApiPath(path));
  };

  useEffect(() => {
    const getData = async () => {
      try {
        const response = await fetch(apiPath);
        if (!response.ok) {
          throw new Error(
            `HTTP error ${response.status}: ${response.body}`
          );
        }
        let actualData = await response.json();
        setData(actualData);
        setError(null);
      } catch(err) {
        setError(err.message);
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, [apiPath])

  if (loading) {
    return (<div>Loading...</div>);
  }

  if (error) {
    return (<div>{`There is a problem fetching the data - ${error}`}</div>);
  }

  let pageBody = (<div>Hmm not sure</div>);

  if (data.type === 'photo') {
    pageBody = (
      <>
        <div className="album_nav"><button onClick={ () => browseTo(data.album.path) }>{ data.album.title }</button></div>
        <div className="photo">
          <img src={ data.photoPath + "?size=1000x1000" } alt={ data.title } />
        </div>
      </>
    );
  } else if (data.type === 'album') {
    pageBody = (
      <>
        <ul>
          { data.albums &&
            data.albums.map((album) => (
              <li key={album.apiPath}>
                <h3 className="album_title"><button onClick={ () => browseTo(album.path, album.apiPath) }>{album.title}</button></h3>
                <p className="album_desc">{album.description}</p>
              </li>
            ))}
        </ul>
        <ul>
          {data && data.files &&
            data.files.map((file) => (
              <li key={file.photoPath}>
                <button onClick={ ()=> browseTo(file.path) }>
                  <img src={file.photoPath + "?size=300x300&crop"} alt={file.name} />
                </button>
                <p>{file.name}</p>
              </li>
            ))}
        </ul>
      </>
    );
  }

  return (
    <div className="album">
      <h1>{ data.title }</h1>
      <div className="album_nav"><button onClick={ () => browseTo('/') }>Albums</button></div>
      { pageBody }
    </div>
  );
}
