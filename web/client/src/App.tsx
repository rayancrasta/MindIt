import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProjectProvider } from './context/ProjectContext';
import { ThemeProvider } from './context/ThemeContext';
import { Dashboard } from './pages/Dashboard';
import { Backlog } from './pages/Backlog';
import { Board } from './pages/Board';
import { ItemDetail } from './pages/ItemDetail';
import { Wiki } from './pages/Wiki';
import { Deployments } from './pages/Deployments';

export default function App() {
  return (
    <ThemeProvider>
      <ProjectProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/backlog" element={<Backlog />} />
            <Route path="/board" element={<Board />} />
            <Route path="/item/:id" element={<ItemDetail />} />
            <Route path="/wiki" element={<Wiki />} />
            <Route path="/wiki/:project" element={<Wiki />} />
            <Route path="/wiki/:project/*" element={<Wiki />} />
            <Route path="/deployments" element={<Deployments />} />
          </Routes>
        </Layout>
      </ProjectProvider>
    </ThemeProvider>
  );
}
