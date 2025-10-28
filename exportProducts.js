// exportProducts.js
require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');

// ===============================
// ⚙️ CONFIGURACIÓN DE CONEXIÓN
// ===============================
const MONGO_PASS = process.env.MONGO_DB_PASS;
if (!MONGO_PASS) {
  console.error('❌ ERROR: falta MONGO_DB_PASS en el .env');
  process.exit(1);
}

const mongoURI = `mongodb+srv://MR-2291:${MONGO_PASS}@cluster0.brhpx.mongodb.net/LZ-INVENTAR?retryWrites=true&w=majority`;

// ===============================
// 🧩 DEFINICIÓN DE MODELO (ajustá el nombre según tu colección real)
// ===============================
const productSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model('Product', productSchema, 'products'); 
// 👆 el tercer parámetro 'products' es el nombre exacto de la colección

// ===============================
// 🧠 FUNCIÓN PRINCIPAL
// ===============================
(async () => {
  try {
    console.log('⏳ Conectando a MongoDB...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB Atlas');

    const products = await Product.find({});
    console.log(`📦 Se encontraron ${products.length} productos.`);

    // Transformar al formato solicitado
    const formatted = products.map(p => ({
      artikelName: p.artikelName || "",
      lagerPlatz: p.lagerPlatz || "",
      artikelNumber: p.artikelNumber || "",
      description: p.description || "",
      publicId: p.publicId || "",
      imagen: p.imagen || "",
      deleted: p.deleted || "",
    }));

    // Guardar en archivo
    const outputPath = './productos_exportados.txt';
    fs.writeFileSync(outputPath, JSON.stringify(formatted, null, 2), 'utf8');
    console.log(`💾 Archivo generado correctamente: ${outputPath}`);

    await mongoose.disconnect();
    console.log('👋 Conexión cerrada, todo listo.');
  } catch (err) {
    console.error('❌ Error al exportar productos:', err.message);
  }
})();