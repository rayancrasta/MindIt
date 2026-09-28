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
import { Diagrams } from './pages/Diagrams';
import { Schemas } from './pages/Schemas';
import { Specs } from './pages/Specs';
import { Projects } from './pages/Projects';

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
            <Route path="/diagrams" element={<Diagrams />} />
            <Route path="/diagrams/:kind" element={<Diagrams />} />
            <Route path="/diagrams/:kind/:project" element={<Diagrams />} />
            <Route path="/diagrams/:kind/:project/*" element={<Diagrams />} />
            <Route path="/schemas" element={<Schemas />} />
            <Route path="/schemas/:project" element={<Schemas />} />
            <Route path="/schemas/:project/*" element={<Schemas />} />
            <Route path="/specs" element={<Specs />} />
            <Route path="/specs/:platform" element={<Specs />} />
            <Route path="/specs/:platform/:project" element={<Specs />} />
            <Route path="/specs/:platform/:project/*" element={<Specs />} />
            <Route path="/projects" element={<Projects />} />
          </Routes>
        </Layout>
      </ProjectProvider>
    </ThemeProvider>
  );
}
