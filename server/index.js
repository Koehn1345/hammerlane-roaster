const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const dashboardRouter = require('./routes/dashboard');
const ordersRouter = require('./routes/orders');
const customersRouter = require('./routes/customers');
const blendsRouter = require('./routes/blends');
const greenBeansRouter = require('./routes/greenBeans');
const bagsRouter = require('./routes/bags');
const squareRouter = require('./routes/square');
const { ensureSchema: ensureSquareSchema, startSquareSync } = require('./square/sync');

app.use('/api/dashboard', dashboardRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/blends', blendsRouter);
app.use('/api/green-beans', greenBeansRouter);
app.use('/api/bags', bagsRouter);
app.use('/api/square', squareRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve the built React frontend for all non-API routes
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res) => res.sendFile(path.join(clientDist, 'index.html')));
} else {
  console.warn('client/dist not found — frontend not served. Run npm run build first.');
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Square inbox: create its tables if needed, then poll Square every 10 minutes.
ensureSquareSchema()
  .then(() => startSquareSync(10))
  .catch((err) => console.error('Square inbox setup failed:', err.message));
