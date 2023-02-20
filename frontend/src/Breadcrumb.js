import './Breadcrumb.css';

export default function Breadcrumb(props) {
  const crumbArr = props.crumbs.map((crumb, idx) => {
    let itemMarkup;
    if (idx === props.crumbs.length - 1) {
      itemMarkup = (
        <>
          {crumb.title}
        </>
      );
    } else {
      itemMarkup = (
        <button onClick={ () => props.browseTo(crumb.path, crumb.apiPath) }>
          { crumb.title }
        </button>
      );
    }
    return (
      <li key={ crumb.path }>
        { itemMarkup }
      </li>
    );
  });
  return (
    <ul className="Breadcrumb">
      { crumbArr }
    </ul>
  );
}
