import React, { useRef, useEffect } from 'react';
import { Link } from "react-router-dom";

import VideoIcon from "./VideoIcon";

const ThumbnailImg = ({data, file}) => {
  const elemRef = useRef(null);

  const scrollCenter = () => {
    elemRef.current.scrollIntoView({ behavior: "smooth", inline: "center"});
  };

  useEffect(() => {
    if (file.uriPath === data.uriPath) {
      scrollCenter();
    }
  });


  return (
    <Link ref={elemRef} onClick={scrollCenter} preventScrollReset={true} className={'thumbnailLink' + (file.uriPath === data.uriPath ? ' sel' : '')} to={ file.uriPath } title={ file.title }>
      <img src={ `${file.photoPath}?size=300x300&crop` } alt={ file.title }/>
      {(file.type === 'video') && <VideoIcon />}
    </Link>
  );
};

export default ThumbnailImg;
