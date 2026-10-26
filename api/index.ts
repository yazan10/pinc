import express from 'express';
import { createApiRouter } from '../src/server/apiRouter.js';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use('/api', createApiRouter());

export default app;
