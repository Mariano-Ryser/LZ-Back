// // // REQUERIMIENTOS Y CONSTANTES
const path = require('node:path'); //requiriendo el path de node
const express = require('express') 
const cookieParser = require('cookie-parser');
require('dotenv').config() //Variables de entorno

const app = express()
const helmet = require('helmet') 
const dbConnect = require('./db') //PRIMERO Q TODO)

// const rateLimitMiddleware = require('./middleware/rateLimitMiddleware'); // Importar el middleware de rate limiting

const adminRouter = require('./modules/admin/admin.routes');
const productRouter = require('./modules/product/product.routes')

// Los Cors se maneja desde Azure App Service
const corsMiddleware = require('./middleware/corsMiddleware'); 
app.use(cookieParser());
app.use(corsMiddleware);

app.use(helmet())
dbConnect(app)

// Aplicar rate limiting a todas las rutas
// app.use(rateLimitMiddleware);

//SIEMPRE ARRIBA DE LAS RUTAS express.json() para que pueda leer el body
app.use(express.json())

// Rutas
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/products', productRouter)

app.get('/', (req,res) => {
    res.sendFile(path.join(__dirname, '/public/index.html'));
  })
app.get('/home', (req,res) => {
    res.sendFile(path.join(__dirname, '/public/home.html'));
  })

  
// Manejo de errores
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'Acceso no permitido' });
  } else {
    next(err);
  }
});

//la ultima que llega..
app.use((req,res) => {
  res.status(404).send('<h1>404</h1>')
})

