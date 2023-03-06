import React from 'react';
import { Link } from "react-router-dom";

const ThumbnailImg = ({data, file}) => {
  return (
    <Link preventScrollReset={true} className={file.uriPath === data.uriPath ? 'sel' : null}
      key={ file.uriPath } to={ file.uriPath } title={ file.title }>
      <img src={ `${file.photoPath}?size=300x300&crop` } alt={ file.title }/>
    </Link>
  );
};

export default ThumbnailImg;
