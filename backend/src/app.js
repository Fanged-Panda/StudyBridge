import express from 'express';
import cors from 'cors';

import apiRoutes from './routes/index.js';

const app = express();

app.use(cors());
// Community photo uploads arrive as small base64 data URLs.
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'StudyBridge API is running',
  });
});

app.use('/api', apiRoutes);

export default app;
