import './App.css';
import Browse from './Browse';
import { ScrollRestoration } from "react-router-dom";

function App() {
  return (
    <div className="App">
      <Browse />
        <ScrollRestoration   getKey={(location, matches) => {
          return location.pathname;
        }} />
    </div>
  );
}

export default App;
