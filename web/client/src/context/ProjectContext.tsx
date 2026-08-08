import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

interface ProjectContextValue {
  projects: string[];
  project: string | undefined;
  setProject: (p: string) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);
const STORAGE_KEY = 'work-tracker:selected-project';

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.projects });
  const [project, setProjectState] = useState<string | undefined>(
    () => localStorage.getItem(STORAGE_KEY) ?? undefined
  );

  useEffect(() => {
    if ((!project || !projects.includes(project)) && projects.length > 0) {
      setProjectState(projects[0]);
    }
  }, [project, projects]);

  function setProject(p: string) {
    setProjectState(p);
    localStorage.setItem(STORAGE_KEY, p);
  }

  return <ProjectContext.Provider value={{ projects, project, setProject }}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}
