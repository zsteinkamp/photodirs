import './PhotoElement.css'
import { useEffect, Fragment } from "react";
import { Link, useNavigate } from "react-router-dom";

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

  const downloadSVG = (
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 1000 1000">
      <g>
        <path d="M622.5,173.3h163.3c33.8,0,62.7,12,86.6,35.9s35.9,52.8,35.9,86.6v571.7c0,33.8-12,62.7-35.9,86.6S819.6,990,785.8,990H214.2c-33.8,0-62.7-12-86.6-35.9s-35.9-52.8-35.9-86.6V295.8c0-33.8,12-62.7,35.9-86.6s52.8-35.9,86.6-35.9h163.3V255H214.2c-11.3,0-20.9,4-28.9,12c-8,8-12,17.6-12,28.9v571.7c0,11.3,4,20.9,12,28.9c8,8,17.6,12,28.9,12h571.7c11.3,0,20.9-4,28.9-12c8-8,12-17.6,12-28.9V295.8c0-11.3-4-20.9-12-28.9c-8-8-17.6-12-28.9-12H622.5V173.3z M500,10c11.3,0,20.9,4,28.9,12c8,8,12,17.6,12,28.9v513.9l93.5-93.8c7.9-7.9,17.5-11.8,29-11.8c11.7,0,21.4,3.9,29.2,11.6c7.8,7.8,11.6,17.5,11.6,29.2c0,11.5-3.9,21.2-11.8,29L529,692.4c-7.9,7.9-17.5,11.8-29,11.8c-11.5,0-21.2-3.9-29-11.8L307.6,529c-7.9-8.3-11.8-18-11.8-29c0-11.3,4-20.9,12-28.9c8-8,17.6-12,28.9-12c11.5,0,21.2,3.9,29,11.8l93.5,93.8V50.8c0-11.3,4-20.9,12-28.9C479.1,14,488.7,10,500,10L500,10z"/>
      </g>
    </svg>
  );

  const closeSVG = (
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 1000 1000">
      <g>
        <path d="M500,10C229.4,10,10,229.4,10,500c0,270.7,219.4,490,490,490c270.7,0,490-219.3,490-490C990,229.4,770.7,10,500,10z M500,924.7C265.8,924.7,75.3,734.2,75.3,500S265.8,75.3,500,75.3S924.7,265.8,924.7,500S734.2,924.7,500,924.7z"/>
        <path d="M680.8,273L501.3,452.6L340.2,273c-12.7-12.7-33.5-12.7-46.2,0c-12.7,12.7-12.7,33.5,0,46.2l161.1,179.6L273,680.8c-12.7,12.7-12.7,33.5,0,46.2c12.7,12.7,33.5,12.7,46.2,0l179.6-179.5L659.9,727c12.7,12.7,33.5,12.7,46.1,0c12.7-12.7,12.7-33.5,0-46.2L544.9,501.3L727,319.2c12.7-12.7,12.7-33.5,0-46.2S693.6,260.2,680.8,273z"/>
      </g>
    </svg>
  );

  const thumbContainer = (
    <div className="thumbContainer">
      {
        data.album.files.map( (file) => (
          <Link className={ file.uriPath === data.uriPath ? 'sel' : null } key={ file.uriPath } to={ file.uriPath } title={ file.title }>
            <img src={ `${file.photoPath}?size=300x300&crop` } alt={ file.title }/>
          </Link>
        ))
      }
    </div>
  );

  return (
    <div className="PhotoElement">
      <div className="flexContainer">
        <div className="imageContainer">
          <div className="exif">
            <div className="exifInner">
              <h2>{ data.title }</h2>
              <dl>
                { Object.entries(data.exif).map(([key, val]) => (
                    <Fragment key={ key }>
                      <dt>{ key }</dt>
                      <dd>{ val }</dd>
                    </Fragment>
                  ))}
              </dl>
            </div>
            <div className="tag">EXIF / INFO</div>
          </div>
          <img src={ data.photoPath + "?size=1600x1600" } alt={ data.title } /></div>
      </div>
      { thumbContainer }
      <Link title="Return to Album" className="closeBtn" to={ parentPath }>{ closeSVG }</Link>
      <Link title="Download Original" className="downloadBtn" onClick={ downloadOriginal } to="#">{ downloadSVG }</Link>
    </div>
  );
}
