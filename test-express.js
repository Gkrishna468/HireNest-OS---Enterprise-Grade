import express from 'express';
const app = express();
app.all('/api/*', (req, res) => {
  res.json({ matched: true, path: req.path });
});
app.use('*', (req, res) => {
  res.send('HTML');
});
app.listen(3001, () => {
  console.log('started');
});
