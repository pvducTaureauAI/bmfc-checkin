import { Routes, Route, Navigate } from 'react-router'
import Home from './pages/Home'
import Login from './pages/Login'
import useAuth from './hooks/useAuth'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return null
  }

  return (
    <Routes>
      <Route index element={<Home />} />
      <Route
        path="/dang-nhap"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
    </Routes>
  )
}

export default App
