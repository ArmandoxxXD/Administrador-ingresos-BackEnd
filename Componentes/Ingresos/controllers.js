const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads_temporal/' }); // Configura el directorio de almacenamiento de los archivos
const fs = require('fs');
const router = express.Router();
const ingresosService = require('./services.js'); // Asegúrate de importar tu servicio de manejo de archivos Excel

// Endpoint para cargar un archivo Excel
router.post('/cargar-excel', upload.single('archivoExcel'), async (req, res) => {
  try {
    var filePath = req.file.path; // Ruta del archivo Excel subido

    // Llama a tu servicio para procesar el archivo Excel
    const data = await ingresosService.procesarArchivoExcel(filePath);

    const response = {
      message: 'Archivo Excel procesado con éxito',
      data: data
    };

    res.json(response);
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

router.post('/cargar-ingreso', async (req, res) => {
  try {
      const { reporteDiario, reporteMensual, fechaReporte  } = req.body;
      await ingresosService.insertarDatos({ reporteDiario, reporteMensual, fechaReporte  });

      res.status(200).json({ message: 'Información almacenada con éxito.' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al almacenar la información.' });
  }
});

router.get('/reporte-fecha/:fechaInicio/:fechaFin', obtenerReportePorRangoFechas);
async function obtenerReportePorRangoFechas(req, res) {
    try {
        const fechaInicio = req.params.fechaInicio;
        const fechaFin = req.params.fechaFin;
        const reportes = await ingresosService.obtenerReportePorRangoFechas(fechaInicio, fechaFin);

        if (!reportes || reportes.length === 0) {
            return res.status(404).json({ message: 'No se encontraron reportes para el rango de fechas especificado.' });
        }

        res.status(200).json(reportes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los reportes.' });
    }
}

router.get('/reporte-diario/:fechaInicio/:fechaFin', obtenerReporteDiarioPorRangoFechas);
async function obtenerReporteDiarioPorRangoFechas(req, res) {
    try {
        const fechaInicio = req.params.fechaInicio;
        const fechaFin = req.params.fechaFin;
        const reportesDiarios = await ingresosService.obtenerReporteDiarioPorRangoFechas(fechaInicio, fechaFin);

        if (!reportesDiarios || reportesDiarios.length === 0) {
            return res.status(404).json({ message: 'No se encontraron reportes diarios para el rango de fechas especificado.' });
        }

        res.status(200).json(reportesDiarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los reportes diarios.' });
    }
}


module.exports = router;
