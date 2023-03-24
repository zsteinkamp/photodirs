import Browse from './Browse';
import { ScrollRestoration } from 'react-router-dom';

function App() {
  return (
    <div className="App">
      <Browse />
      <ScrollRestoration />
    </div>
  );
}

export default App;
