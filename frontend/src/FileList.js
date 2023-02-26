import './FileList.css';

import { Link } from "react-router-dom";

export default function FileList(props) {
  let fileList = null;

  if (props.files && props.files.length > 0) {
    const fileListItems = props.files.map((file) => {
      //console.log(file.photoPath);
      return (
        <div key={ file.apiPath }>
          <Link to={ file.uriPath }>
            <img src={file.photoPath + "?size=300x300&crop"} alt={file.name} />
          </Link>
          <p>{file.name}</p>
        </div>
      )
    });
    fileList = (
      <div className="FileList">
        { fileListItems }
      </div>
    );
  }

  return fileList;
}
