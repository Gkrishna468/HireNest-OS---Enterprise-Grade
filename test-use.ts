import express from 'express';
const app = express();
app.use('/api/*', (req, res, next) => { console.log('use matched!'); next(); });
app.all('/api/*', (req, res) => res.json({ msg: 'all matched' }));
app.all('*', (req, res) => res.send('<!doctype html>...'));
const server = app.listen(3002, async () => {
   const fetch = (await import('node-fetch')).default;
   const res = await fetch('http://localhost:3002/api/cleanup-matches', { method: 'POST' });
   console.log(await res.text());
   server.close();
});
