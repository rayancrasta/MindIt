import express from 'express';
import { projectsRouter } from './routes/projects.js';
import { fsRouter } from './routes/fs.js';
import { featuresRouter } from './routes/features.js';
import { storiesRouter } from './routes/stories.js';
import { tasksRouter } from './routes/tasks.js';
import { bugsRouter } from './routes/bugs.js';
import { itemsRouter } from './routes/items.js';
import { statusRouter } from './routes/status.js';
import { resumeRouter } from './routes/resume.js';
import { logRouter } from './routes/log.js';
import { thoughtsRouter } from './routes/thoughts.js';
import { assumptionsRouter } from './routes/assumptions.js';
import { wikiRouter } from './routes/wiki.js';
import { deploymentsRouter } from './routes/deployments.js';
import { diagramsRouter } from './routes/diagrams.js';
import { schemasRouter } from './routes/schemas.js';
import { specsRouter } from './routes/specs.js';

const app = express();
app.use(express.json());

app.use('/api/projects', projectsRouter);
app.use('/api/fs', fsRouter);

app.use('/api/features', featuresRouter);
app.use('/api/stories', storiesRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/bugs', bugsRouter);
app.use('/api/items', itemsRouter);
app.use('/api/status', statusRouter);
app.use('/api/resume', resumeRouter);
app.use('/api/projects/:project/log', logRouter);
app.use('/api/projects/:project/thoughts', thoughtsRouter);
app.use('/api/projects/:project/assumptions', assumptionsRouter);
app.use('/api/projects/:project/wiki', wikiRouter);
app.use('/api/deployments', deploymentsRouter);
app.use('/api/projects/:project/diagrams', diagramsRouter);
app.use('/api/projects/:project/schemas', schemasRouter);
app.use('/api/projects/:project/specs/:platform', specsRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4001;
app.listen(PORT, () => {
  console.log(`work-tracker API listening on http://localhost:${PORT}`);
});
