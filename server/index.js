const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const ordersRouter = require('./routes/orders');
const customersRouter = require('./routes/customers');
const blendsRouter = require('./routes/blends');
const greenBeansRouter = require('./routes/greenBeans');
const bagsRouter = require('./routes/bags');

app.use('/api/orders', ordersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/blends', blendsRouter);
app.use('/api/green-beans', greenBeansRouter);
app.use('/api/bags', bagsRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve the built React app in production
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('/{*path}', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
