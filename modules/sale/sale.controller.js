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

    // Validación de estado
    if (!['pending', 'paid', 'cancelled'].includes(status)) {
      return res.status(400).json({ ok: false, message: 'Estado inválido' });
    }

    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale) return res.status(404).json({ ok: false, message: 'No existe la venta' });

    const previousStatus = sale.status;
    const wasPaid = previousStatus === 'paid';
    const nowPaid = status === 'paid';

    // -------------------------------
    // Mapas de productos: antiguos y nuevos
    // -------------------------------
    const oldItemsMap = {};
    sale.items.forEach(i => { oldItemsMap[i.product.toString()] = i.quantity; });

    const newItemsMap = {};
    newItems.forEach(i => { newItemsMap[i.productId] = i.quantity; });

    // Todos los productos involucrados
    const allProductIds = Array.from(new Set([...Object.keys(oldItemsMap), ...Object.keys(newItemsMap)]));

    // -------------------------------
    // Ajuste de stock
    // -------------------------------
    for (const productId of allProductIds) {
      const oldQty = oldItemsMap[productId] || 0;
      const newQty = newItemsMap[productId] || 0;

      // Solo ajustamos si hay algún cambio
      if (oldQty === newQty && wasPaid === nowPaid) continue;

      const prod = await Product.findById(productId).session(session);
      if (!prod) throw new Error(`Producto ${productId} no encontrado`);

      // Devolver stock si antes estaba pagada
      if (wasPaid) {
        prod.stock += oldQty;
      }

      // Descontar stock si ahora es pagada
      if (nowPaid) {
        if (prod.stock < newQty) throw new Error(`Stock insuficiente para ${prod.artikelName}`);
        prod.stock -= newQty;
      }

      await prod.save({ session });
    }

    // -------------------------------
    // Reconstruir items actualizados
    // -------------------------------
    const updatedItems = [];
    let subtotal = 0;

    for (const it of newItems) {
      const prod = await Product.findById(it.productId).session(session);
      const unitPrice = it.unitPrice ?? prod.price ?? 0;
      const lineTotal = Number((unitPrice * it.quantity).toFixed(2));
      subtotal += lineTotal;

      updatedItems.push({
        product: prod._id,
        artikelName: prod.artikelName,
        quantity: it.quantity,
        unitPrice,
        lineTotal,
      });
    }

    const taxAmount = Number((subtotal * (sale.tax ? sale.tax / 100 : 0.10)).toFixed(2));
    const total = Number((subtotal + taxAmount).toFixed(2));

    // -------------------------------
    // Actualizar la venta
    // -------------------------------
    sale.items = updatedItems;
    sale.status = status;
    sale.subtotal = subtotal;
    sale.tax = taxAmount;
    sale.total = total;

    await sale.save({ session });
    await session.commitTransaction();
    session.endSession();

    // Poblar relaciones
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

