import { Routes, Route } from 'react-router-dom';
import Home from './pages/home';
import Login from './pages/login';
import Ask from './pages/ask';
import Browse from './pages/browse';
import Match from './pages/match';
import Personal from './pages/personal';
import Dialogue from './pages/dialogue';
import Post from './pages/post';
import Navbar from './components/Navbar';
import './app.css';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<><Navbar showMinimal={true} /><Home /></>} />
        <Route path="/login" element={<><Navbar showLoginOnly={true} /><Login /></>} />
        <Route path="/ask" element={<><Navbar /><Ask /></>} />
        <Route path="/browse" element={<><Navbar /><Browse /></>} />
        <Route path="/match" element={<><Navbar /><Match /></>} />
        <Route path="/personal" element={<><Navbar /><Personal /></>} />
        <Route path="/dialogue/:pairId" element={<><Navbar /><Dialogue /></>} />
        <Route path="/question/:id" element={<><Navbar /><Post /></>} />
      </Routes>
    </>
  );
}
