const Client = require('./client.model');

exports.getClients = async (req, res) => {
  try {
    const clients = await Client.find({ deleted: false }).sort({ createdAt: -1 });
    res.json({ ok: true, clients });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok:false, message: err.message });
  }
};

exports.getClientById = async (req, res) => { 
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ ok:false, message: 'No encontrado' });
    res.json({ ok:true, client });
  } catch(err){ res.status(500).json({ ok:false, message: err.message }); }
};

exports.createClient = async (req, res) => {
  try {
    const newClient = new Client(req.body);
    const client = await newClient.save();
    res.status(201).json({ ok:true, client });
  } catch(err) { res.status(500).json({ ok:false, message: err.message }); }
};

exports.updateClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ ok:true, client });
  } catch(err){ res.status(500).json({ ok:false, message: err.message }); }
};

exports.deleteClient = async (req, res) => {
  try {
    // soft delete
    const client = await Client.findByIdAndUpdate(req.params.id, { deleted: true }, { new: true });
    res.json({ ok:true, client });
  } catch(err){ res.status(500).json({ ok:false, message: err.message }); }
};
