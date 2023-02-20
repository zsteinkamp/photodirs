import './FileList.css';

export default function FileList(props) {
  let fileList = null;

  if (props.files && props.files.length > 0) {
    const fileListItems = props.files.map((file) => (
      <div key={file.photoPath}>
        <button onClick={ ()=> props.browseTo(file.path) }>
          <img src={file.photoPath + "?size=300x300&crop"} alt={file.name} />
        </button>
        <p>{file.name}</p>
      </div>
    ));
    fileList = (
      <div className="FileList">
        { fileListItems }
      </div>
    );
  }

  return fileList;
}
