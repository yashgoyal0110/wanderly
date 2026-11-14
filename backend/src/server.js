import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDb, state } from './db.js';
import countriesRouter from './routes/countries.js';
import { handleHealth } from './web/handlers.js';
import { send } from './web/respond.js';
import tripsRouter from './routes/trips.js';
import chatRouter from './routes/chat.js';

const app = express();
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins?.length ? allowedOrigins : ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (req, res, next) => {
  try {
    send(res, await handleHealth());
  } catch (err) {
    next(err);
  }
});
app.use('/api/countries', countriesRouter);
app.use('/api/trips', tripsRouter);
app.use('/api/chat', chatRouter);

app.use((err, req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Internal server error' });
});

const port = Number(process.env.PORT) || 5000;
await connectDb();
app.listen(port, () => console.log(`[server] API listening on http://localhost:${port} (db: ${state.mode})`));
