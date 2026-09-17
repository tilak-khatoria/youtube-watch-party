import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RoomPage } from './pages/RoomPage';
import { ErrorBoundary } from './components/ErrorBoundary';

export function App() {
  return (
    <Router>
      <ErrorBoundary fallbackTitle="Application Error">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/room/:roomId"
            element={
              <ErrorBoundary fallbackTitle="Watch Room Error">
                <RoomPage />
              </ErrorBoundary>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
