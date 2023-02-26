import './PhotoElement.css'
import { useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";

export default function PhotoElement(props) {
  const data = props.data;

  const parentPath = data.album.uriPath;

  const albumFiles = props.data.album.files;
  const thisPos = albumFiles.findIndex( (file) => { return file.title === props.data.title; } );
  const prevPhoto = albumFiles[(thisPos + albumFiles.length - 1) % albumFiles.length];
  const nextPhoto = albumFiles[(thisPos + albumFiles.length + 1) % albumFiles.length];
  //console.log({ thisPos, prevPhoto, nextPhoto });

  const navigate = useNavigate();

  const returnToAlbum = () => { navigate(parentPath) };
  const goToPrevPhoto = () => { navigate(prevPhoto.uriPath) };
  const goToNextPhoto = () => { navigate(nextPhoto.uriPath) };
  const downloadOriginal = () => { window.location.href = data.photoPath + "?size=orig"; }

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
      <div className="exif">
        <dl>
            <dt>Title</dt>
            <dd>{ data.title }</dd>
            { Object.entries(data.exif).map(([key, val]) => (
                <Fragment key={ key }>
                  <dt>{ key }</dt>
                  <dd>{ val }</dd>
                </Fragment>
              ))}
        </dl>
        <div className="tag">EXIF / INFO</div>
      </div>
      <button title="Return to Album" className="closeBtn" onClick={ returnToAlbum }>X</button>
      <button title="Download Original" className="downloadBtn" onClick={ downloadOriginal }>V</button>
    </div>
  );
}
