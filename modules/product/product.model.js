const mongoose = require('mongoose')

// CREAMOS EL ESQUEMA DEL PRODUCTO LA BASE DE DATOS EN MONGO

const productSchema = mongoose.Schema({
    artikelName: {type: String, required: true},
    lagerPlatz: {type: String, required: false},
    artikelNumber: {type: String, required: false},
    description: {type: String, required: false},
    publicId: { type: String, default: '' },
    imagen: { type: String, required: false },
    deleted: {type: Boolean, default: false},
},
{ timestamps: true })




//ALMACENAMOS EN UNA CONSTANTE EL MODELADO DEL ALMACEN
const Product = mongoose.model('Product', productSchema)  
//EXPORTACION DE MODULO
module.exports = Product