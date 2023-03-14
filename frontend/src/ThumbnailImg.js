import React, { useEffect, useRef } from 'react';
import { Link } from "react-router-dom";

import VideoIcon from "./VideoIcon";

const ThumbnailImg = ({data, file}) => {
  const elemRef = useRef(null);

  const scrollCenter = () => {
    if (elemRef && elemRef.current && elemRef.current.scrollIntoView) {
      elemRef.current.scrollIntoView({ behavior: "smooth", inline: "center"});
    }
  };

  useEffect(() => {
    if (file.uriPath && file.uriPath === data.uriPath) {
      scrollCenter();
    }
  });

  return (
    <Link replace={true} ref={elemRef} onClick={scrollCenter} className={'thumbnailLink' + (file.uriPath === data.uriPath ? ' sel' : '')} to={ file.uriPath } title={ file.title }>
      <img src={`${file.photoPath}?size=300x300&crop`} alt={ file.title }/>
      {(file.type === 'video') && <VideoIcon />}
    </Link>
  );
};

export default ThumbnailImg;
