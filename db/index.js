require("dotenv").config();
const mongoose = require("mongoose");

const PORT = process.env.PORT || 3000;
const MONGO_PASS = process.env.MONGO_DB_PASS;

// Validación de variables de entorno
if (!MONGO_PASS) {
  console.error(
    "❌ ERROR: La variable MONGO_DB_PASS no está definida en el archivo .env",
  );
  process.exit(1);
}

// Cadena de conexión a MongoDB Atlas
const mongoURI = `mongodb+srv://MR-2291:${MONGO_PASS}@cluster0.brhpx.mongodb.net/LZ-INVENTAR?retryWrites=true&w=majority`;

// Conexión principal
const dbConnect = (app) => {
  mongoose.set("strictQuery", true);
  mongoose
    .connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("\x1b[32m%s\x1b[0m", "✅ Conectado a MongoDB Atlas");

      app
        .listen(PORT, () => {
          console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
        })
        .on("error", (err) => {
          if (err.code === "EADDRINUSE") {
            console.error(`❌ El puerto ${PORT} ya está en uso.`);
          } else {
            console.error("❌ Error al iniciar el servidor:", err);
          }
        });

      setTimeout(
        () => console.log("📦 Base de datos lista (dbConnect.js)"),
        500,
      );
    })
    .catch((err) => {
      console.error("\n❌ ERROR al conectar con MongoDB Atlas:");
      console.error("🔎 Mensaje:", err.message);

      if (err.message.includes("bad auth")) {
        console.error("🚨 Verifica usuario y contraseña en tu archivo .env");
      } else if (err.message.includes("ENOTFOUND")) {
        console.error("🌐 No se pudo resolver la URI. ¿Estás sin internet?");
      } else if (err.message.includes("ECONNREFUSED")) {
        console.error(
          "⛔ Conexión rechazada. Revisa si tu IP está autorizada en MongoDB Atlas.",
        );
      }

      process.exit(1); // Cortamos para evitar seguir sin conexión
    });
};

module.exports = dbConnect;