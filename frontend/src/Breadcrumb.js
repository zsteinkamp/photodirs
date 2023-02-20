export default function Breadcrumb(props) {
  return (
    <ul className="breadcrumb">
      {
        props.crumbs.map((crumb, idx) => {
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
        })
      }
    </ul>
  );
}
