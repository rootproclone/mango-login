const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;

mongoose.connect("mongodb+srv://sadamdon1234:1YktFZRZ1cX0PRj4@cluster0.nhacelr.mongodb.net/?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.connection.on('error', (error) => console.error('MongoDB connection error:', error));

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

const secretKey = process.env.SECRET_KEY || 'mn1f4mfulKNrMZ0aAqbrw';

const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization');
    if (!token) return res.sendStatus(401);

    const user = await jwt.verify(token.split(' ')[1], secretKey);
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

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
    res.status(200).json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

app.post('/api/create-agency', authenticateToken, async (req, res) => {
  try {
    const agencyData = req.body;
    const newAgency = await Agency.create(agencyData);
    res.status(200).json({ success: true, agency: newAgency });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/api/agency/:agencyId/client', authenticateToken, async (req, res) => {
  try {
    const agencyId = req.params.agencyId; 
    const clients = req.body.clients;

    const newClients = [];

    for (const client of clients) {
      client.agencyId = agencyId;
      const newClient = await Client.create(client);
      newClients.push(newClient);
    }

    res.status(200).json({ success: true, clients: newClients });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
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
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    res.status(200).json({ success: true, message: 'Update Successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/api/top-clients', authenticateToken, async (req, res) => {
  try {
    const topClients = await Client.find()
      .sort({ totalBill: -1 })
      .limit(5)
      .populate('agencyId', 'name');

    const result = topClients.map((client) => ({
      AgencyName: client.agencyId.name,
      ClientName: client.name,
      TotalBill: client.totalBill,
    }));

    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
