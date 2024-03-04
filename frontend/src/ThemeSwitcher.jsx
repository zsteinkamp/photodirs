import './ThemeSwitcher.css'

import { useState, useEffect } from 'react'

// Inspired (and to a large degree copied) from Andrew Nelson's post on the topic
// https://medium.com/@--andrewnelson/add-a-dark-mode-toggle-to-your-nextjs-react-app-375b230a4c27
// I have simplified it, not just by reducing the number of themes from 3 to 2,
// but given a clearer understanding of how React works.

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState()

  const THEME_LIGHT = 'light'
  const THEME_DARK = 'dark'
  const THEME_KEY = 'theme'

  const toggleTheme = (e) => {
    console.log(e)
    setTheme(theme === THEME_DARK ? THEME_LIGHT : THEME_DARK)
  }

  const buttonIcon = () => {
    if (theme === THEME_DARK) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path
            className="svg-dark"
            d="M0 12c0 6.627 5.373 12 12 12s12-5.373 12-12-5.373-12-12-12-12 5.373-12 12zm2 0c0-5.514 4.486-10 10-10v20c-5.514 0-10-4.486-10-10z"
          />
        </svg>
      )
    }
    return (
      <svg width="24" height="24" viewBox="0 0 24 24">
        <path
          className="svg-light"
          d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4.95 5.636l1.414 1.414-2.195 2.195c-.372-.562-.853-1.042-1.414-1.414l2.195-2.195zm-5.95-1.636h2v3.101c-.323-.066-.657-.101-1-.101s-.677.035-1 .101v-3.101zm-3.95 1.636l2.195 2.195c-.561.372-1.042.853-1.414 1.415l-2.195-2.196 1.414-1.414zm-3.05 5.364h3.101c-.066.323-.101.657-.101 1s.035.677.101 1h-3.101v-2zm3.05 7.364l-1.414-1.414 2.195-2.195c.372.562.853 1.042 1.414 1.414l-2.195 2.195zm5.95 1.636h-2v-3.101c.323.066.657.101 1 .101s.677-.035 1-.101v3.101zm-1-5c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3zm4.95 3.364l-2.195-2.195c.562-.372 1.042-.853 1.414-1.414l2.195 2.195-1.414 1.414zm3.05-5.364h-3.101c.066-.323.101-.657.101-1s-.035-.677-.101-1h3.101v2z"
        />
      </svg>
    )
  }

  useEffect(() => {
    // initial set
    const storedTheme = localStorage.getItem(THEME_KEY)
    const prefTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? THEME_DARK
      : THEME_LIGHT
    setTheme(storedTheme ?? prefTheme)

    // watch for changes in system preference
    const useSetTheme = (e) => {
      setTheme(e.matches ? THEME_DARK : THEME_LIGHT)
    }
    const watchSysTheme = window.matchMedia('(prefers-color-scheme: dark)')
    watchSysTheme.addEventListener('change', useSetTheme)
    return () => {
      watchSysTheme.removeEventListener('change', useSetTheme)
    }
  }, [])

  useEffect(() => {
    if (!theme) {
      return
    }
    //console.log('THEME USEEFFECT TOP', { theme })
    const lastTheme = localStorage.getItem(THEME_KEY)
    if (lastTheme) {
      document.documentElement.classList.remove(lastTheme)
    }
    document.documentElement.classList.add(theme)
    localStorage.setItem(THEME_KEY, theme)
    //console.log('THEME USEEFFECT BOTTOM', { theme })
  }, [theme])

  return (
    <>
      <button
        key="themeToggle"
        title="Toggle Dark / Light Mode"
        onClick={toggleTheme}
        data-theme={theme}
        className="ThemeSwitcher"
      >
        {buttonIcon(theme)}
      </button>
    </>
  )
}
