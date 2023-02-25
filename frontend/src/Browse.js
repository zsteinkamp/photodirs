import './Browse.css';

import moment from 'moment';
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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

  const location = useLocation();
  useEffect(() => {
    setApiPath(makeApiPath(location.pathname));
  }, [location]);

  let navigate = useNavigate();

  const browseTo = (path, apiPath) => {
    navigate(path);
  };

  useEffect(() => {
    const getData = async () => {
      try {
        const response = await fetch(apiPath);
        if (!response.ok) {
          const body = await response.json();
          throw new Error(
            `HTTP error ${response.status}: ${JSON.stringify(body)}`
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

  const getPageBody = (loading, error, browseTo, data) => {
    if (loading) {
      return (<div className="loading">Loading...</div>);
    }

    if (error) {
      return (<div className="error">{`There is a problem fetching the data - ${error}`}</div>);
    }

    if (data.type === 'photo') {
      return (
        <PhotoElement browseTo={ browseTo } data={ data } />
      );
    }

    if (data.type === 'album') {
      return (
        <div className="album">
          { data.path !== "/" ? (<p className="date">{ moment(data.date).utc().format("YYYY-MM-DD") }</p>) : null }
          <p className="desc">{ data.description }</p>
          <AlbumList browseTo={ browseTo } albums={ data.albums } />
          <FileList browseTo={ browseTo } files={ data.files } />
        </div>
      );
    }

    return (
      <div className="error">Unknown type <pre>{ data.type }</pre>.</div>
    );
  };

  const errorBreadcrumb = [
    { title: "Home", path: "/", apiPath: "/api/albums/" },
    { title: "Error", path: "/", apiPath: "/api/albums/" }
  ];

  return (
    <div className="Browse">
      <header>
        <Breadcrumb browseTo={ browseTo } crumbs={ data ? data.breadcrumb : errorBreadcrumb } />
      </header>
      <div className="pageBody">
        { getPageBody(loading, error, browseTo, data) }
      </div>
      <footer>
        <div>
          Check out out <a rel="noreferrer" href="https://github.com/zsteinkamp/photodirs" target="_blank">
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
