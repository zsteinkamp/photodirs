import React from 'react';
import { Link } from "react-router-dom";

import VideoIcon from "./VideoIcon";

const ThumbnailImg = ({data, file}) => {
  console.log(data);
  return (
    <Link preventScrollReset={true} className={'thumbnailLink' + (file.uriPath === data.uriPath ? ' sel' : '')} to={ file.uriPath } title={ file.title }>
      <img src={ `${file.photoPath}?size=300x300&crop` } alt={ file.title }/>
      {(file.type === 'video') && <VideoIcon />}
    </Link>
  );
};

export default ThumbnailImg;
