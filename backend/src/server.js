import './config/env.js';
import app from './app.js';
import { initBackgroundScheduler } from './services/backgroundSync.js';

const port = process.env.PORT || 5001;

app.listen(port, () => {
  console.log(`StudyBridge server running on port ${port}`);
  initBackgroundScheduler();
});
