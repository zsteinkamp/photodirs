import Browse from './Browse'
import { ScrollRestoration } from 'react-router-dom'
import IsAdmin from './IsAdmin'
import ThemeSwitcher from './ThemeSwitcher'

function App() {
  return (
    <div className="App">
      <IsAdmin>
        <ThemeSwitcher />
        <Browse />
        <ScrollRestoration />
      </IsAdmin>
    </div>
  )
}

export default App
