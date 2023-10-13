const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// Configuración de la conexión a la base de datos
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});


app.get('/', (req, res) => {
  res.send('¡Server, up!');
});

// Importa el router desde controller.js de Ingresos
const ingresosController = require('./Componentes/Ingresos/controllers.js');
app.use('/ingresos', ingresosController);


// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor en ejecución en http://localhost:${port}`);
});
