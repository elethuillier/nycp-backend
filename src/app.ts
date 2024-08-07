import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';

import casesRoutes from './routes/criminalcases';
import prisonerRoutes from './routes/prisoners';
import actionsRoute from './routes/actions';
import extraRoute from './routes/extra';

mongoose.set('useCreateIndex', true);

mongoose.connect('mongodb+srv://elethuillier:6PCPBuIfOfCVng3c@learningcluster.csr6l.mongodb.net/nycpdb?retryWrites=true&w=majority',
  { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connexion à MongoDB réussie'))
  .catch(() => console.log('Connexion à MongoDB échouée'));

const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  next();
});

app.use(bodyParser.json());

app.use('/api/criminalcases', casesRoutes);

app.use('/api/prisoners', prisonerRoutes);

app.use('/api/actions', actionsRoute);

app.use('/api/extra', extraRoute);

export default app;
