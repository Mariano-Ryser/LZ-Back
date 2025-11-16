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
    const { email } = req.body;
    
    // Validar si el email ya existe (solo si se proporciona email)
    if (email) {
      const existingClient = await Client.findOne({ 
        email: email.toLowerCase(), 
        deleted: false 
      });
      
      if (existingClient) {
        return res.status(400).json({ 
          ok: false, 
          message: 'El email ya está registrado' 
        });
      }
    }

    const newClient = new Client(req.body);
    const client = await newClient.save();
    res.status(201).json({ ok:true, client });
  } catch(err) { 
    if (err.code === 11000) {
      return res.status(400).json({ 
        ok: false, 
        message: 'El email ya está registrado' 
      });
    }
    res.status(500).json({ ok:false, message: err.message }); 
  }
};

exports.updateClient = async (req, res) => {
  try {
    const { email } = req.body;
    const clientId = req.params.id;
    
    // Validar si el email ya existe en otro cliente (solo si se proporciona email)
    if (email) {
      const existingClient = await Client.findOne({ 
        email: email.toLowerCase(), 
        deleted: false,
        _id: { $ne: clientId } // Excluir el cliente actual
      });
      
      if (existingClient) {
        return res.status(400).json({ 
          ok: false, 
          message: 'El email ya está registrado en otro cliente' 
        });
      }
    }

    const client = await Client.findByIdAndUpdate(clientId, req.body, { 
      new: true,
      runValidators: true 
    });
    
    if (!client) {
      return res.status(404).json({ ok: false, message: 'Cliente no encontrado' });
    }
    
    res.json({ ok:true, client });
  } catch(err) { 
    if (err.code === 11000) {
      return res.status(400).json({ 
        ok: false, 
        message: 'El email ya está registrado' 
      });
    }
    res.status(500).json({ ok:false, message: err.message }); 
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id, 
      { deleted: true }, 
      { new: true }
    );
    
    if (!client) {
      return res.status(404).json({ ok: false, message: 'Cliente no encontrado' });
    }
    
    res.json({ ok:true, client });
  } catch(err){ 
    res.status(500).json({ ok:false, message: err.message }); 
  }
};