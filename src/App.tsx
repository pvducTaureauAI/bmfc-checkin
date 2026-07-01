import { Routes } from 'react-router'
import { Route } from 'react-router'
import Home from './pages/Home'
import Login from './pages/Login'
import Layout from './components/Layout'
import Money from './pages/Money'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/quan-ly-thu-chi" element={<Money />} />
      </Route>
      <Route path="/dang-nhap" element={<Login />} />
    </Routes>
  )
}

export default App
