import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Items from './pages/Items'
import Opname from './pages/Opname'
import Layout from './components/Layout'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  }, [token])

  if (!token) {
    return <Login onLogin={setToken} />
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/+$/, '')}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="items" element={<Items />} />
          <Route path="opname" element={<Opname />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App