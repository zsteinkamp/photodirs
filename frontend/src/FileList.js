import './FileList.css';

export default function FileList(props) {
  let fileList = null;

  if (props.files && props.files.length > 0) {
    const fileListItems = props.files.map((file) => {
      console.log(file.photoPath);
      return (
        <div key={ file.apiPath }>
          <button onClick={ ()=> props.browseTo(file.uriPath) }>
            <img src={file.photoPath + "?size=300x300&crop"} alt={file.name} />
          </button>
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
