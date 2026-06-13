import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateRoom from './pages/CreateRoom';
import JoinRoom from './pages/JoinRoom';
import Lobby from './pages/Lobby';
import Battle from './pages/Battle';
import Result from './pages/Result';
import AdminQuestions from './pages/AdminQuestions';
import Solo from './pages/Solo';
import { ThemeToggle } from './components/ui/ThemeToggle';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateRoom />} />
        <Route path="/join" element={<JoinRoom />} />
        <Route path="/room/:code" element={<Lobby />} />
        <Route path="/room/:code/battle" element={<Battle />} />
        <Route path="/room/:code/result" element={<Result />} />
        <Route path="/admin/questions" element={<AdminQuestions />} />
        <Route path="/solo" element={<Solo />} />
      </Routes>
    </BrowserRouter>
  );
}
