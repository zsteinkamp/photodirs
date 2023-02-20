import './FileList.css';

export default function FileList(props) {
  let fileList = null;

  if (props.files && props.files.length > 0) {
    const fileListItems = props.files.map((file) => (
      <li key={file.photoPath}>
        <button onClick={ ()=> props.browseTo(file.path) }>
          <img height="300" width="300" src={file.photoPath + "?size=300x300&crop"} alt={file.name} />
        </button>
        <p>{file.name}</p>
      </li>
    ));
    fileList = (
      <ul className="FileList">
        { fileListItems }
      </ul>
    );
  }

  return fileList;
}
