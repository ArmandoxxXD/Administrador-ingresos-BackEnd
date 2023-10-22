const XLSX = require('xlsx');
const fs = require('fs');
const { pool } = require('../../index'); 

async function procesarArchivoExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Puedes acceder a las celdas específicas o a rangos de celdas aquí
  const inscripciones_total_mes = sheet['C18'].v; 
  const titulos_total_mes = sheet['C19'].v;
  const subvenciones_total_mes = sheet['C20'].v;
  const ventaProductos_total_mes = sheet['C21'].v;
  const auxiliares_total_mes = sheet['C22'].v;

  const Dias = {
    s: { c: 1, r: 27 }, // Inicio en B28 (B es la segunda columna, por lo que c=1)
    e: { c: 1, r: 57 }, // Fin en B58
  };

  const datosDelRangoDias = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', range: Dias });

  // Formatea las fechas a partir de los números almacenados en Excel
  const fechaFormat = 'dd/mm/yyyy';
  datosDelRangoDias.forEach((fila) => {
    const valorNumerico = fila[0];
    if (!isNaN(valorNumerico)) {
      const fecha = new Date((valorNumerico - 25568) * 86400 * 1000); // 25569 es un ajuste para fechas en Excel
      fila[0] = fecha.toLocaleDateString('es-ES', { dateFormat: fechaFormat }); // Formatea la fecha
    }
  });

  const Total_por_Dias = {
    s: { c: 7, r: 27 }, // Inicio en B28 (B es la segunda columna, por lo que c=1)
    e: { c: 7, r: 57 }, // Fin en B58
  };

  const datosDelRangoTotalDia = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', range: Total_por_Dias });

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Error al eliminar el archivo temporal: ${err}`);
    }
  });
  
  return {
    DatosMensuales:{
    inscripciones_total_mes,
    titulos_total_mes,
    subvenciones_total_mes,
    ventaProductos_total_mes,
    auxiliares_total_mes
    },
    Diario:{datosDelRangoDias,datosDelRangoTotalDia}
  };
}

async function insertarDatos({ reporteDiario, reporteMensual, fechaReporte }) {
  const client = await pool.connect();

  try {
      await client.query('BEGIN');

      // 1. Insertar en la tabla 'ingreso'
      const insertIngresoQuery = `
          INSERT INTO ingreso (fecha, data)
          VALUES ($1, $2)
          RETURNING id;
      `;
      const ingresoValues = [fechaReporte, JSON.stringify(reporteMensual)];
      const result = await client.query(insertIngresoQuery, ingresoValues);
      const ingresoId = result.rows[0].id;

      // 2. Insertar en la tabla 'sub_ingreso'
      for (let i = 0; i < reporteDiario.fechas.length; i++) {
          const insertSubIngresoQuery = `
              INSERT INTO sub_ingreso (ingreso_id, fecha, total)
              VALUES ($1, $2, $3);
          `;
          const subIngresoValues = [ingresoId, reporteDiario.fechas[i][0], reporteDiario.totales[i][0]];
          await client.query(insertSubIngresoQuery, subIngresoValues);
      }
      
      console.log("Datos insertados con éxito.");

      await client.query('COMMIT');
  } catch (error) {
      await client.query('ROLLBACK');
      throw error;
  } finally {
      client.release();
  }
}

async function obtenerReportePorRangoFechas(fechaInicio, fechaFin) {
  const client = await pool.connect();

  try {
      const query = `
          SELECT * FROM ingreso 
          WHERE fecha BETWEEN $1 AND $2
          ORDER BY fecha ASC;  -- Esto ordenará los reportes por fecha en orden ascendente
      `;
      const result = await client.query(query, [fechaInicio, fechaFin]);
      
      return result.rows;
  } catch (error) {
      throw error;
  } finally {
      client.release();
  }
}

async function obtenerReporteDiarioPorRangoFechas(fechaInicio, fechaFin) {
  const client = await pool.connect();

  try {
      const query = `
          SELECT * FROM sub_ingreso 
          WHERE fecha BETWEEN $1 AND $2
          ORDER BY fecha ASC;  -- Esto ordenará los reportes diarios por fecha en orden ascendente
      `;
      const result = await client.query(query, [fechaInicio, fechaFin]);
      
      return result.rows;
  } catch (error) {
      throw error;
  } finally {
      client.release();
  }
}

module.exports = {
  procesarArchivoExcel,
  insertarDatos,
  obtenerReportePorRangoFechas,
  obtenerReporteDiarioPorRangoFechas
};
