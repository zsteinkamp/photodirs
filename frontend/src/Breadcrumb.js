import './Breadcrumb.css';

import { Link } from "react-router-dom";

export default function Breadcrumb(props) {
  const crumbArr = props.crumbs.map((crumb, idx) => {
    let itemMarkup;
    if (idx === props.crumbs.length - 1) {
      itemMarkup = (
        <>
          <strong>{crumb.title}</strong>
        </>
      );
    } else {
      itemMarkup = (
        <Link to={ crumb.path }>
          { crumb.title }
        </Link>
      );
    }
    return (
      <div key={ crumb.path }>
        { itemMarkup }
      </div>
    );
  });
  return (
    <div className="Breadcrumb">
      { crumbArr }
    </div>
  );
}
