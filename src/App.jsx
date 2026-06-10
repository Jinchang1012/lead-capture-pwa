import { Routes, Route, Navigate } from 'react-router-dom'
import { VoskProvider } from './context/VoskContext.jsx'
import UpdatePrompt from './components/UpdatePrompt.jsx'
import VersionWatermark from './components/VersionWatermark.jsx'
import HomePage from './pages/HomePage.jsx'
import TagPage from './pages/TagPage.jsx'
import ListPage from './pages/ListPage.jsx'
import ExportPage from './pages/ExportPage.jsx'

export default function App() {
  return (
    <VoskProvider>
      <div className="h-full w-full bg-bg text-zinc-100 flex flex-col safe-top safe-bottom">
        <VersionWatermark />
        <UpdatePrompt />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tag/:id" element={<TagPage />} />
          <Route path="/list" element={<ListPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </VoskProvider>
  )
}
