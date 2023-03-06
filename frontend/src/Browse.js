import './Browse.css';

import dayjs from 'dayjs';
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Breadcrumb from "./Breadcrumb";
import AlbumList from "./AlbumList";
import FileList from "./FileList";
import PhotoElement from "./PhotoElement";

var utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

export default function Browse() {
  const makeApiPath = (path) => {
    return '/api/albums' + path;
  };
  const [apiPath, setApiPath] = useState(makeApiPath(window.location.pathname));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const navigate = useNavigate();

  const location = useLocation();
  useEffect(() => {
    setApiPath(makeApiPath(location.pathname));
  }, [location]);

  /*
   * Keyboard Controls
   */
  const goToParentAlbum = () => {
    if (data && data.breadcrumb && data.breadcrumb.length > 1) { // not at root
      navigate(data.breadcrumb[data.breadcrumb.length - 2].path);
    }
  };

  const keyCodeToAction = {
    27: goToParentAlbum, // escape
    38: goToParentAlbum, // up arrow
  };

  const handleKeypress = (event) => {
    //console.log(event.keyCode, event.ctrlKey, event.shiftKey, event.altKey, event.metaKey);
    if (!event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
      const keypressAction = keyCodeToAction[event.keyCode];
      if (keypressAction) {
        keypressAction();
        event.preventDefault();
      }
    }
  };
  useEffect(() => {
    window.addEventListener("keydown", handleKeypress);
    return () => {
      window.removeEventListener("keydown", handleKeypress);
    };
  });

  /*
   * Fetch data when the apiPath changes
   */
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

        // set page title
        if (actualData.album && actualData.album.title && actualData.title) {
          document.title = [actualData.album.title, actualData.title].join(' / ');
        } else if (actualData.title) {
          document.title = actualData.title;
        }

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

  /*
   * Something to put in breadcrumb if there is an error fetching
   */
  const errorBreadcrumb = [
    { title: "Home", path: "/", apiPath: "/api/albums/" },
    { title: "Error", path: "/", apiPath: "/api/albums/" }
  ];

  /*
   * Received photo data on api, return a PhotoElement
   */
  if (!error && !loading && (data.type === 'photo' || data.type === 'video')) {
    return (
      <PhotoElement data={ data } />
    );
  }

  /*
   * Main content section, all these cases share a layout
   */
  const getPageBody = (loading, error, data) => {
    if (loading) {
      return (<div className="loading">Loading...</div>);
    }

    if (error) {
      return (<div className="error">{`There is a problem fetching the data - ${error}`}</div>);
    }

    if (data.type === 'album') {
      return (
        <div className="album">
          <div className="header">
              { data.path !== "/" && (<div className="date">{ dayjs(data.date).utc().format("YYYY-MM-DD (dddd)") }</div>) }
              <div className="desc">{ data.description }</div>
          </div>
          <AlbumList albums={ data.albums } />
          <FileList files={ data.files } />
        </div>
      );
    }

    return (
      <div className="error">Unknown type <pre>{ data.type }</pre>.</div>
    );
  };

  /*
   * Common layout for album/photo lists, loading, error
   */
  return (
    <div className="Browse">
      <header>
        { !loading && <Breadcrumb crumbs={ data ? data.breadcrumb : errorBreadcrumb } /> }
      </header>
      <div className="pageBody">
        { getPageBody(loading, error, data) }
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
