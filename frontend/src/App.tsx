import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RoomPage } from './pages/RoomPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';

export function App() {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}

export default App;
