import { Router } from 'express';
import { resumeForAllProjects, resumeForProject } from '../../../../src/store/resume.js';

export const resumeRouter = Router();

resumeRouter.get('/', (req, res) => {
  const project = typeof req.query.project === 'string' ? req.query.project : undefined;
  res.json(project ? resumeForProject(project) : resumeForAllProjects());
});
