import './Browse.css';
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "./Breadcrumb";
import AlbumList from "./AlbumList";
import FileList from "./FileList";
import PhotoElement from "./PhotoElement";

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
    setApiPath(apiPath || makeApiPath(path));
    navigate(path);
  };

  useEffect(() => {
    console.log('In useEffect()');
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
      <PhotoElement browseTo={ browseTo } data={ data } />
    );
  } else if (data.type === 'album') {
    pageBody = (
      <div className="album">
        <AlbumList browseTo={ browseTo } albums={ data.albums } />
        <FileList browseTo={ browseTo } files={ data.files } />
      </div>
    );
  }

  return (
    <div className="Browse">
      <header>
        <Breadcrumb browseTo={ browseTo } crumbs={ data.breadcrumb } />
      </header>
      <div className="pageBody">
        { pageBody }
      </div>
      <footer>
        <div>
          Check out out <a href="https://github.com/zsteinkamp/photodirs" target="_blank">
            Photodirs on GitHub
          </a>.
        </div>
        <div>
          by <a href="https://steinkamp.us/">Zack Steinkamp</a>
        </div>
      </footer>
    </div>
  );
}
