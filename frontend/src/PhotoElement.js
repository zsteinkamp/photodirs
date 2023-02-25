import './PhotoElement.css'
import { useEffect, Fragment } from "react";

export default function PhotoElement(props) {
  const data = props.data;

  const parentPath = data.album.uriPath;
  const parentApiPath = data.album.apiPath;

  const albumFiles = props.data.album.files;
  const thisPos = albumFiles.findIndex( (file) => { return file.title === props.data.title; } );
  const prevPhoto = albumFiles[(thisPos + albumFiles.length - 1) % albumFiles.length];
  const nextPhoto = albumFiles[(thisPos + albumFiles.length + 1) % albumFiles.length];
  //console.log({ thisPos, prevPhoto, nextPhoto });

  const returnToAlbum = () => { props.browseTo(parentPath, parentApiPath) };
  const goToPrevPhoto = () => { props.browseTo(prevPhoto.uriPath, prevPhoto.apiPath) };
  const goToNextPhoto = () => { props.browseTo(nextPhoto.uriPath, nextPhoto.apiPath) };
  const downloadOriginal = () => { window.location.href=data.photoPath + "?size=orig"; }

  const keyCodeToAction = {
      27: returnToAlbum,
      37: goToPrevPhoto,
      39: goToNextPhoto
  };

  const handleKeypress = (event) => {
    const keypressAction = keyCodeToAction[event.keyCode];
    if (keypressAction) {
      keypressAction();
    //} else {
    //  console.log(event.keyCode);
    }
  };


  useEffect(() => {
    window.addEventListener("keydown", handleKeypress);
    return () => {
      window.removeEventListener("keydown", handleKeypress);
    };
  });

  return (
    <div className="PhotoElement">
      <img src={ data.photoPath + "?size=1600x1600" } alt={ data.title } />
      <p className="title">{ data.title }</p>
      <div className="exif">
        <dl>
            { Object.entries(data.exif).map(([key, val]) => (
                <Fragment key={ key }>
                  <dt>{ key }</dt>
                  <dd>{ val }</dd>
                </Fragment>
              ))}
        </dl>
        <div className="tag">EXIF DATA</div>
      </div>
      <button title="Return to Album" className="closeBtn" onClick={ returnToAlbum }>X</button>
      <button title="Download Original" className="downloadBtn" onClick={ downloadOriginal }>V</button>
    </div>
  );
}
