const XLSX = require('xlsx');
const fs = require('fs');
const { pool } = require('../../index');

async function procesarArchivoExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Puedes acceder a las celdas específicas o a rangos de celdas aquí
    const salarios_total_mes = sheet['C18'].v;
    const infraestructura_Mantenimiento_total_mes = sheet['C19'].v;
    const becas_total_mes = sheet['C20'].v;
    const tecnologiaRecursosAprendizaje_total_mes = sheet['C21'].v;
    const serviciosEstudiantiles_total_mes = sheet['C22'].v;
    const total_mes = sheet['C23'].v;

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
        DatosMensuales: {
            salarios_total_mes,
            infraestructura_Mantenimiento_total_mes,
            becas_total_mes,
            tecnologiaRecursosAprendizaje_total_mes,
            serviciosEstudiantiles_total_mes,
            total_mes
        },
        Diario: { datosDelRangoDias, datosDelRangoTotalDia }
    };
}

async function insertarDatos({ reporteDiario, reporteMensual, fechaReporte }) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Insertar en la tabla 'ingreso'
        const insertIngresoQuery = `
          INSERT INTO gasto (fecha, data)
          VALUES ($1, $2)
          RETURNING id;
      `;
        const ingresoValues = [fechaReporte, JSON.stringify(reporteMensual)];
        const result = await client.query(insertIngresoQuery, ingresoValues);
        const ingresoId = result.rows[0].id;

        // 2. Insertar en la tabla 'sub_ingreso'
        for (let i = 0; i < reporteDiario.fechas.length; i++) {
            const insertSubIngresoQuery = `
              INSERT INTO sub_gasto (gasto_id, fecha, total)
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
          SELECT * FROM gasto 
          WHERE to_char(fecha, 'YYYY-MM') BETWEEN $1 AND $2
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

async function obtenerReportePorId(id) {
    const client = await pool.connect();

    try {
        const query = `
          SELECT * FROM gasto 
          WHERE id = $1
      `;
        const result = await client.query(query, [id]);

        return result.rows;
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
}

async function eliminarReportePorId(id) {
    const client = await pool.connect();

    try {
        const query = `
          DELETE FROM gasto 
          WHERE id = $1
          RETURNING *; 
      `;
        const result = await client.query(query, [id]);

        if (result.rows.length === 0) {
            throw new Error(`No se encontró el ingreso con el ID ${id} para eliminar.`);
        }

        return result.rows[0]; // Retorna el registro eliminado.

    } catch (error) {
        console.error("Error al eliminar el reporte por ID:", error);
        throw error;
    } finally {
        client.release();
    }
}

async function obtenerReporteDiarioPorRangoFechas(fechaInicio, fechaFin) {
    const client = await pool.connect();

    try {
        const query = `
          SELECT * FROM sub_gasto 
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

async function obtenerReporteDiarioPorId(id) {
    const client = await pool.connect();

    try {
        const query = `
          SELECT * FROM sub_gasto 
          WHERE id = $1
      `;
        const result = await client.query(query, [id]);

        return result.rows;
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
}

async function validarFecha(fecha) {
    const client = await pool.connect();

    try {
        const query = `
          SELECT EXISTS (
              SELECT 1 
              FROM gasto 
              WHERE EXTRACT(YEAR FROM fecha) = $1 AND EXTRACT(MONTH FROM fecha) = $2
          ) AS fecha_existe;
      `;

        const valores = [new Date(fecha).getFullYear(), new Date(fecha).getMonth() + 1]; // +1 porque getMonth() devuelve un índice 0-based.

        const result = await client.query(query, valores);

        return result.rows[0].fecha_existe;

    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
}

async function getSumaTotalMesGastos() {
    const client = await pool.connect();

    try {
        const query = `
          SELECT SUM((data->>'total_mes')::integer) AS suma_total_mes 
          FROM gasto
      `;
        const result = await client.query(query);

        // Retorna la suma
        return result.rows[0].suma_total_mes;
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
}

async function getSumaTotalMesIngresosPorMes(fechaInicio, fechaFin) {	
    const client = await pool.connect();
  
    try {
        const query = `
            SELECT SUM((data->>'total_mes')::integer) AS suma_total_mes 
            FROM ingreso
            WHERE to_char(fecha, 'YYYY-MM') BETWEEN $1 AND $2
        `;
        const result = await client.query(query, [fechaInicio, fechaFin]);
        
        // Retorna la suma
        return result.rows[0].suma_total_mes;
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
    obtenerReporteDiarioPorRangoFechas,
    obtenerReportePorId,
    obtenerReporteDiarioPorId,
    eliminarReportePorId,
    validarFecha,
    getSumaTotalMesGastos,
    getSumaTotalMesIngresosPorMes
};
