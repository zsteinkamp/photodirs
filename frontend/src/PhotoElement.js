import './PhotoElement.css'
import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import SVGDownload from "./SVGDownload";
import SVGClose from "./SVGClose";

export default function PhotoElement({data}) {

  const parentPath = data.album.uriPath;

  const albumFiles = data.album.files;

  const [currFileIdx, setCurrFileIdx] = useState(albumFiles.findIndex( (file) => { return file.path === data.path; } ));

  const [currData, setCurrData] = useState(data);

  const navigate = useNavigate();
  const carouselRef = useRef(null);
  const thumbsRef = useRef(null);

  // if the data in state is the same as the data in props
  const isInitialLoad = currData === data;

  // a ref for each image tile
  const tileRefs = useRef([]);
  const thumbRefs = useRef([]);

  const returnToAlbum = () => { navigate(parentPath) };
  const goToPrevPhoto = () => { scrollCarouselTo(currFileIdx - 1); };
  const goToNextPhoto = () => { scrollCarouselTo(currFileIdx + 1); };

  const downloadOriginal = () => { window.location.href = data.photoPath + "?size=orig"; }

  const scrollCarouselTo = (idx) => {
    setCurrFileIdx((albumFiles.length + idx) % albumFiles.length);
  };

  useEffect(() => {
    if (!tileRefs.current || !thumbRefs.current) {
      return;
    }
    const tileRef = tileRefs.current[currFileIdx];
    const thumbRef = thumbRefs.current[currFileIdx];
    if (tileRef) {
      tileRef.scrollIntoView();
      // can't have two smooth scrollers at once in Chrome
      setTimeout(() => {
        thumbRefs.current.forEach((ref) => ref.classList.remove('sel'));
        thumbRef.classList.add('sel');
        thumbRef.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }, 1000);
    }
  }, [currFileIdx]);

  const keyCodeToAction = {
    27: returnToAlbum, // escape
    37: goToPrevPhoto, // left arrow
    39: goToNextPhoto  // right arrow
  };

  const handleKeypress = (event) => {
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

  const updateData = async () => {
    const crc = carouselRef.current;
    if (!crc) {
      return;
    }
    scrollCarouselTo(Math.round(crc.scrollLeft / crc.clientWidth));

    const response = await fetch(albumFiles[currFileIdx].apiPath);
    if (!response.ok) {
      const body = await response.json();
      throw new Error(
        `HTTP error ${response.status}: ${JSON.stringify(body)}`
      );
    }

    let actualData = await response.json();
    setCurrData(actualData);

    // update displayed URL without engaging router -- have to do it this way
    // because we use a catch-all route
    window.history.replaceState(null, actualData.title, actualData.path);
  };

  const debounceRef = useRef(null);
  const handleScroll = (e) => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    // if no scrolling for 250ms then update data
    debounceRef.current = window.setTimeout(updateData, 250);
  };

  // subscribe to carousel scroll to trigger fetching metadata for other images
  useEffect(() => {
    const current = carouselRef.current;
    if (current) {
      carouselRef.current.addEventListener("scroll", handleScroll);
    }
    return () => {
      current.removeEventListener("scroll", handleScroll);
    }
  });

  let exifElement = null;
  if (currData.exif && Object.keys(currData.exif).length > 0) {
    const exifDetails = Object.entries(currData.exif)
      .map(([key, val]) => {
        return (
          <Fragment key={key}>
            <dt>{key}</dt>
            <dd>{val}</dd>
          </Fragment>
        );
      });

    exifElement = (
      <div className="exif">
        <div className="exifInner invisible-scrollbar">
          <dl>{exifDetails}</dl>
        </div>
        <div className="tag">EXIF / INFO</div>
      </div>
    );
  }

  const tiles = albumFiles.map((file, i) => {
    return (
      <div ref={(el) => tileRefs.current[i] = el} key={file.uriPath} className="carouselItem">
        { file.type === 'video' ? (
          <video draggable="false" controls autoPlay={false} poster={`${file.photoPath}?size=1600x1600`} loading='lazy'>
            <source src={file.videoPath} type="video/mp4" />
          </video>
        ) : (
          <img draggable="false" src={`${file.photoPath}?size=1600x1600`}
            srcSet={`${file.photoPath}?size=400x400 400w, ${file.photoPath}?size=800x400 800w, ${file.photoPath}?size=1600x1600 1600w`}
            alt={file.title}
            loading='lazy'
          />
        ) }
      </div>
    );
  });

  const thumbnails = albumFiles.map((file, i) => {
    return (
      <Link ref={(el) => thumbRefs.current[i] = el} to={file.uriPath} key={file.uriPath} onClick={()=>scrollCarouselTo(i)}>
        <img draggable="false" src={`${file.photoPath}?size=400x400`}
          alt={file.title}
          loading='lazy'
        />
      </Link>
    );
  });

  const mainElement = (
    <div ref={carouselRef} className="carousel">
      {tiles}
    </div>
  );

  // this will run on initial load and center the tile corresponding to the URL
  useEffect(() => {
    if (!isInitialLoad || !tileRefs.current || !thumbRefs.current) {
      return;
    }
    const tileRef = tileRefs.current[currFileIdx];
    if (tileRef) {
      tileRef.scrollIntoView();
      carouselRef.current.style['scroll-behavior'] = 'smooth';
    }
    const thumbRef = thumbRefs.current[currFileIdx];
    if (thumbRef) {
      thumbRef.scrollIntoView();
    }
  });

  return (
    <div className="PhotoElement">
      <div className="header">
        <h1>{currData.title}</h1>
        {currData.description && <p>{currData.description}</p>}
      </div>
      <div className="imageContainer">
        {mainElement}
        {exifElement}
      </div>
      <div ref={thumbsRef} className="thumbContainer">
        {thumbnails}
      </div>
      <Link title="Return to Album" className="closeBtn" to={parentPath}><SVGClose /></Link>
      <Link title="Download Original" className="downloadBtn" onClick={downloadOriginal} to="#"><SVGDownload /></Link>
    </div>
  );
}
