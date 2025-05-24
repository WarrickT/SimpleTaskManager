import { Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import TeamDashboard from './pages/TeamDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/team/:teamId" element={<TeamDashboard />} />


    </Routes>
  );
}

export default App;
