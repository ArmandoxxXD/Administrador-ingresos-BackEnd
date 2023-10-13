const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads_temporal/' }); // Configura el directorio de almacenamiento de los archivos
const fs = require('fs');
const router = express.Router();
const excelService = require('./services.js'); // Asegúrate de importar tu servicio de manejo de archivos Excel

// Endpoint para cargar un archivo Excel
router.post('/cargar-excel', upload.single('archivoExcel'), async (req, res) => {
  try {
    var filePath = req.file.path; // Ruta del archivo Excel subido

    // Llama a tu servicio para procesar el archivo Excel
    const data = await excelService.procesarArchivoExcel(filePath);
    console.log(data);
    res.json(data);
  } catch (error) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Error al eliminar el archivo temporal: ${err}`);
        }
      });
    console.error(error);
    res.status(500).json({ error: 'Error al procesar el archivo Excel.' });
  }
});

module.exports = router;
