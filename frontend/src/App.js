import Browse from './Browse'
import { ScrollRestoration } from 'react-router-dom'
import IsAdmin from './IsAdmin'

function App() {
  return (
    <div className="App">
      <IsAdmin>
        <Browse />
        <ScrollRestoration />
      </IsAdmin>
    </div>
  )
}

export default App
