import express from 'express';
import cors from 'cors';
import http from 'http';
import { initWebSocket } from './ws/broadcaster';
import { pool } from './db';
import customersRouter from './routes/customers';
import segmentsRouter from './routes/segments';
import campaignsRouter from './routes/campaigns';
import receiptsRouter from './routes/receipts';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/customers', customersRouter);
app.use('/api/segments', segmentsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/receipts', receiptsRouter);

app.get('/api/health', async (_, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW()');
    res.json({ ok: true, ts: new Date(), db: 'connected', dbTime: dbRes.rows[0].now });
  } catch (err: any) {
    res.status(500).json({ ok: false, ts: new Date(), db: 'error', error: err.message, stack: err.stack });
  }
});

initWebSocket(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`CRM backend running on :${PORT}`));
