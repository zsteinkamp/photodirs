import './PhotoElement.css'
import { Fragment, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

import ThumbnailImg from "./ThumbnailImg";
import SVGDownload from "./SVGDownload";
import SVGClose from "./SVGClose";

export default function PhotoElement(props) {
  const data = props.data;

  const parentPath = data.album.uriPath;

  const albumFiles = props.data.album.files;
  const thisPos = albumFiles.findIndex( (file) => { return file.title === props.data.title; } );
  const prevPhoto = albumFiles[(thisPos + albumFiles.length - 1) % albumFiles.length];
  const nextPhoto = albumFiles[(thisPos + albumFiles.length + 1) % albumFiles.length];

  const navigate = useNavigate();

  const returnToAlbum = () => { navigate(parentPath) };
  const goToPrevPhoto = () => { handleNavigate(); navigate(prevPhoto.uriPath) };
  const goToNextPhoto = () => { handleNavigate(); navigate(nextPhoto.uriPath) };
  const downloadOriginal = () => { window.location.href = data.photoPath + "?size=orig"; }

  const keyCodeToAction = {
      27: returnToAlbum, // escape
      37: goToPrevPhoto, // left arrow
      39: goToNextPhoto  // right arrow
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

  const elemRef = useRef();

  useEffect(() => {
    elemRef.current && (elemRef.current.style.opacity = 1);
  }, [data]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeypress);
    return () => {
      window.removeEventListener("keydown", handleKeypress);
    };
  });

  let exif = null;
  if (data.exif && Object.keys(data.exif).length > 0) {
    const exifDetails = Object.entries(data.exif)
      .map(([key, val]) => {
        return (
          <Fragment key={key}>
            <dt>{key}</dt>
            <dd>{val}</dd>
          </Fragment>
        );
      });

    exif = (
        <div className="exif">
          <div className="exifInner invisible-scrollbar">
            <dl>{exifDetails}</dl>
          </div>
          <div className="tag">EXIF / INFO</div>
        </div>
    );
  }

  let pointerDown = false;
  let origCX = 0;
  const onPointerDown = (e) => {
    pointerDown = true;
    origCX = e.clientX;
  };
  const onPointerMove = (e) => {
    if (pointerDown) {
      const movementX = (origCX - e.clientX);
      if (Math.abs(movementX) > 10) {
        // only trigger the movement once
        pointerDown = false;
        if (movementX < 0) {
          goToPrevPhoto();
        } else {
          goToNextPhoto();
        }
      }
    }
  };
  const onPointerUp = (e) => {
    pointerDown = false;
  };

  const handleNavigate = () => {
    elemRef.current && (elemRef.current.style.opacity = 0);
  }

  const mainElement = data.type === 'video' ? (
    <div ref={elemRef} className="mainElement video">
      <video draggable="false" key={data.videoPath} controls autoPlay={true} poster={`${data.photoPath}?size=1600x1600`}>
        <source src={data.videoPath} type="video/mp4" />
      </video>
    </div>
  ) : (
    <div ref={elemRef} className="mainElement image">
      <img draggable="false" src={`${data.photoPath}?size=1600x1600`}
        srcSet={`${data.photoPath}?size=400x400 400w, ${data.photoPath}?size=800x400 800w, ${data.photoPath}?size=1600x1600 1600w`}
        alt={data.title}
      />
    </div>
  );

  return (
    <div onPointerUp={onPointerUp} className="PhotoElement">
      <div className="header">
        <h1>{data.title}</h1>
        {data.description && <p>{data.description}</p>}
      </div>
      <div className="imageContainer" onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
        {exif}
        {mainElement}
      </div>
      <div className="thumbContainer invisible-scrollbar">
        { data.album.files.map((file) => (
          <ThumbnailImg key={file.uriPath} data={data} file={file} handleNavigate={handleNavigate} />
        ))}
      </div>
      <Link title="Return to Album" className="closeBtn" to={parentPath}><SVGClose /></Link>
      <Link title="Download Original" className="downloadBtn" onClick={downloadOriginal} to="#"><SVGDownload /></Link>
    </div>
  );
}
