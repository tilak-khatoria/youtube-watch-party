import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RoomPage } from './pages/RoomPage';

export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
