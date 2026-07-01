import { Routes } from 'react-router'
import { Route } from 'react-router'
import Home from './pages/Home'
import Login from './pages/Login'

function App() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="/dang-nhap" element={<Login />} />
    </Routes>
  )
}

export default App
