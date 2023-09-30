const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect("mongodb+srv://sadamdon1234:1YktFZRZ1cX0PRj4@cluster0.nhacelr.mongodb.net/?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.connection.on('error', (error) => console.error('MongoDB connection error:', error));

// Define Mongoose models
const agencySchema = new mongoose.Schema({
  name: { type: String, required: true },
  address1: { type: String, required: true },
  address2: String,
  state: { type: String, required: true },
  city: { type: String, required: true },
  phoneNumber: { type: String, required: true },
});

const clientSchema = new mongoose.Schema({
  agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  totalBill: { type: Number, required: true },
});

const Agency = mongoose.model('Agency', agencySchema);
const Client = mongoose.model('Client', clientSchema);

app.use(bodyParser.json());

const secretKey = 'mn1f4mfulKNrMZ0aAqbrw';

const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization');
  console.log('Received token:', token);

  if (!token) return res.sendStatus(401);

  jwt.verify(token.split(' ')[1], secretKey, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token has expired' });
      }
      console.error(err);
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

const generateToken = (user) => {
  const token = jwt.sign(user, secretKey, { expiresIn: '15m' });
  return token;
};

const authenticateUser = (username, password) => {
  if (username === 'sadam' && password === 'password123') {
    const user = { id: 1, username: 'sadam' };
    return generateToken(user);
  }
  return null;
};

app.post('/api/get-new-token', (req, res) => {
  const { username, password } = req.body;

  const token = authenticateUser(username, password);

  if (token) {
    res.status(200).json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/create-agency', authenticateToken, async (req, res) => {
  try {
    const agencyData = req.body;
    const newAgency = await Agency.create(agencyData);
    res.status(200).json({ agency: newAgency });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/agency-client', authenticateToken, async (req, res) => {
  try {
    const { agency, client } = req.body;
    const newAgency = await Agency.create(agency);
    client.agencyId = newAgency._id;
    const newClient = await Client.create(client);
    res.status(200).json({ agency: newAgency, client: newClient });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/client/:clientId', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const updatedClientData = req.body;
    const updatedClient = await Client.findOneAndUpdate(
      { _id: clientId },
      updatedClientData,
      { new: true }
    );
    if (!updatedClient) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.status(200).json({ message: 'Update Successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/top-clients', authenticateToken, async (req, res) => {
    try {
      const topClients = await Client.find()
        .sort({ totalBill: -1 })
        .limit(5)
        .populate('agencyId', 'name'); // Populate the agencyId field with the name property
  
      const result = topClients.map((client) => ({
        AgencyName: client.agencyId.name,
        ClientName: client.name,
        TotalBill: client.totalBill,
      }));
  
      res.status(200).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });
  

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
