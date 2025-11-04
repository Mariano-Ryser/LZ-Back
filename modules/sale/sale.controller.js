const Sale = require('./sale.model');
const Product = require('../product/product.model');
const Client = require('../client/client.model');
const mongoose = require('mongoose');


exports.getSales = async (req, res) => {
  try {
    const sales = await Sale.find().populate('client').populate('items.product').sort({ createdAt: -1 });
    res.json({ ok:true, sales });
  } catch(err) {
    res.status(500).json({ ok:false, message: err.message });
  }
};

exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('client').populate('items.product');
    if (!sale) return res.status(404).json({ ok:false, message: 'No encontrado' });
    res.json({ ok:true, sale });
  } catch(err) {
    res.status(500).json({ ok:false, message: err.message });
  }
};

exports.createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { clientId, items = [], tax = 0, status = 'paid' } = req.body;
    if (!clientId || !items.length) throw new Error('clientId y items son requeridos');
    if (!['pending','paid','cancelled'].includes(status)) throw new Error('Estado inválido');

    const client = await Client.findById(clientId).session(session);
    if (!client) throw new Error('Cliente no encontrado');

    let subtotal = 0;
    const saleItems = [];

    // Primero verificamos existencias y armamos items
    const realProducts = {};

    for (const it of items) {
      const prod = await Product.findById(it.productId).session(session);
      if (!prod) throw new Error(`Producto ${it.productId} no encontrado`);

      realProducts[it.productId] = prod;

      if (status === 'paid' && prod.stock < it.quantity) {
        throw new Error(`Stock insuficiente para ${prod.artikelName}`);
      }

      const unitPrice = it.unitPrice ?? 0;
      const lineTotal = Number((unitPrice * it.quantity).toFixed(2));
      subtotal += lineTotal;

      saleItems.push({
        product: prod._id,
        artikelName: prod.artikelName,
        quantity: it.quantity,
        unitPrice,
        lineTotal
      });
    }

    // Segundo: descontar stock si es paid (ya seguro)
    if (status === 'paid') {
      for (const it of items) {
        const prod = realProducts[it.productId];
        prod.stock -= it.quantity;
        await prod.save({ session });
      }
    }

    subtotal = Number(subtotal.toFixed(2));
    const taxAmount = Number((subtotal * (tax / 100)).toFixed(2));
    const total = Number((subtotal + taxAmount).toFixed(2));

    // Generar Lieferschein
    async function generateUniqueLieferschein() {
      const prefix = 45020;
      let tries = 0;
      while (tries < 10) {
        const randomPart = Math.floor(100000000 + Math.random() * 900000000);
        const candidate = `${prefix}${randomPart}`;
        const exists = await Sale.findOne({ lieferschein: candidate }).session(session);
        if (!exists) return candidate;
        tries++;
      }
      throw new Error('No se pudo generar un número de Lieferschein único');
    }

    const lieferschein = await generateUniqueLieferschein();

    const newSale = new Sale({
      client: client._id,
      clientSnapshot: { name: client.name, email: client.email, phone: client.phone },
      items: saleItems,
      subtotal,
      tax: taxAmount,
      total,
      status,
      lieferschein
    });

    const savedSale = await newSale.save({ session });

    await session.commitTransaction();
    session.endSession();

    const populated = await Sale.findById(savedSale._id)
      .populate('client')
      .populate('items.product');

    res.status(201).json({ ok: true, sale: populated });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error createSale:', err.message);
    res.status(400).json({ ok: false, message: err.message });
  }
};

exports.deleteSale = async (req, res) => {
  try {
    const sale = await Sale.findByIdAndDelete(req.params.id);
    if (!sale) return res.status(404).json({ ok:false, message: 'No existe' });
    res.json({ ok:true, message: 'Venta eliminada' });
  } catch(err){
    res.status(500).json({ ok:false, message: err.message });
  }
};

exports.updateSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status, items: newItems = [] } = req.body;

    if (!['pending', 'paid', 'cancelled'].includes(status)) {
      return res.status(400).json({ ok: false, message: 'Estado inválido' });
    }

    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale) return res.status(404).json({ ok: false, message: 'No existe' });

    const previousStatus = sale.status;
    const wasPaid = previousStatus === 'paid';
    const nowPaid = status === 'paid';

    // Crear mapa de productos actuales
    const oldProductsMap = {};
    for (const item of sale.items) {
      oldProductsMap[item.product.toString()] = item;
    }

    // Obtener productos reales para todas las líneas nuevas
    const realProducts = {};
    for (const it of newItems) {
      const prod = await Product.findById(it.productId).session(session);
      if (!prod) throw new Error(`Producto ${it.productId} no encontrado`);
      realProducts[it.productId] = prod;
    }

    // -------------------------------------------------
    // Ajuste de stock basado en diferencias
    // -------------------------------------------------
    if (wasPaid || nowPaid) {
      // Primero, devolver stock de items antiguos si antes estaba pagado
      if (wasPaid) {
        for (const item of sale.items) {
          const prod = realProducts[item.product.toString()] || await Product.findById(item.product).session(session);
          prod.stock += item.quantity;
          await prod.save({ session });
        }
      }

      // Luego, descontar stock de items nuevos si ahora está pagado
      if (nowPaid) {
        for (const it of newItems) {
          const prod = realProducts[it.productId];
          if (prod.stock < it.quantity) {
            throw new Error(`Stock insuficiente para ${prod.artikelName}`);
          }
          prod.stock -= it.quantity;
          await prod.save({ session });
        }
      }
    }

    // -------------------------------------------------
    // Actualizar items
    // -------------------------------------------------
    const updatedItems = [];
    let subtotal = 0;

    for (const it of newItems) {
      const prod = realProducts[it.productId];
      const unitPrice = it.unitPrice ?? prod.price ?? 0;
      const lineTotal = Number((unitPrice * it.quantity).toFixed(2));
      subtotal += lineTotal;

      updatedItems.push({
        product: prod._id,
        artikelName: prod.artikelName,
        quantity: it.quantity,
        unitPrice,
        lineTotal
      });
    }

    const taxAmount = Number((subtotal * (sale.tax ? sale.tax / 100 : 0.1)).toFixed(2));
    const total = Number((subtotal + taxAmount).toFixed(2));

    sale.items = updatedItems;
    sale.status = status;
    sale.subtotal = subtotal;
    sale.tax = taxAmount;
    sale.total = total;

    await sale.save({ session });

    await session.commitTransaction();
    session.endSession();

    const populated = await Sale.findById(sale._id)
      .populate('items.product')
      .populate('client');

    res.json({ ok: true, sale: populated });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updateSale:', err.message);
    res.status(400).json({ ok: false, message: err.message });
  }
};
