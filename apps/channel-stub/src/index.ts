import express from 'express';
import cors from 'cors';
import { handleSend } from './simulator';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/send', handleSend);
app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Channel stub running on :${PORT}`));
