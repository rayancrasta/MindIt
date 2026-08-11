import express from 'express';
import { listProjectSlugs } from '../../../src/store/paths.js';
import { featuresRouter } from './routes/features.js';
import { storiesRouter } from './routes/stories.js';
import { tasksRouter } from './routes/tasks.js';
import { bugsRouter } from './routes/bugs.js';
import { itemsRouter } from './routes/items.js';
import { statusRouter } from './routes/status.js';
import { resumeRouter } from './routes/resume.js';
import { logRouter } from './routes/log.js';
import { wikiRouter } from './routes/wiki.js';
import { deploymentsRouter } from './routes/deployments.js';
import { diagramsRouter } from './routes/diagrams.js';

const app = express();
app.use(express.json());

app.get('/api/projects', (_req, res) => {
  res.json(listProjectSlugs());
});

app.use('/api/features', featuresRouter);
app.use('/api/stories', storiesRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/bugs', bugsRouter);
app.use('/api/items', itemsRouter);
app.use('/api/status', statusRouter);
app.use('/api/resume', resumeRouter);
app.use('/api/projects/:project/log', logRouter);
app.use('/api/projects/:project/wiki', wikiRouter);
app.use('/api/deployments', deploymentsRouter);
app.use('/api/projects/:project/diagrams', diagramsRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4001;
app.listen(PORT, () => {
  console.log(`work-tracker API listening on http://localhost:${PORT}`);
});
