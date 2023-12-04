const express = require('express'); // Configura el directorio de almacenamiento de los archivos
const router = express.Router();
const activityLogService = require('./services.js'); // Asegúrate de importar tu servicio de manejo de archivos Excel


const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;


router.post('/log', async (req, res) => {
  try {
      const { responsable, gmail, actividad } = req.body;
      await activityLogService.insertarDatos({ responsable,gmail,actividad });

      res.status(200).json({ message: 'almaceno información con exito' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al almacenar la información.' });
  }
});

router.get('/logs-mensual/:fechaInicio/:fechaFin', obtenerlogsPorRangoFechas);
async function obtenerlogsPorRangoFechas(req, res) {
    try {
        const fechaInicio = req.params.fechaInicio;
        const fechaFin = req.params.fechaFin;
        const logs = await activityLogService.obtenerLogsPorRangoFechasMensual(fechaInicio, fechaFin);

        if (!logs || logs.length === 0) {
            return res.status(404).json({ message: 'No se encontraron logs para el rango de fechas especificado.' });
        }

        res.status(200).json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los logs.' });
    }
}

router.get('/logs-diarios/:fechaInicio/:fechaFin', obtenerlogsDiarioPorRangoFechas);
async function obtenerlogsDiarioPorRangoFechas(req, res) {
    try {
        const fechaInicio = req.params.fechaInicio;
        const fechaFin = req.params.fechaFin;
        const logsDiarios = await activityLogService.obtenerLogsPorRangoFechasDias(fechaInicio, fechaFin);

        if (!logsDiarios || logsDiarios.length === 0) {
            return res.status(404).json({ message: 'No se encontraron logs diarios para el rango de fechas especificado.' });
        }

        res.status(200).json(logsDiarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los logs diarios.' });
    }
}

router.get('/log/:id',obtenerlogsPorId);
async function obtenerlogsPorId(req, res) {
    try {
        const id = req.params.id;
        const logs = await activityLogService.obtenerLogPorId(id);

        if (!logs || logs.length === 0) {
            return res.status(404).json({ message: 'No se encontro un log con ese id.' });
        }

        res.status(200).json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los logs.' });
    }
}


module.exports = router;
