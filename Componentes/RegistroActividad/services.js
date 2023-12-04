const fs = require('fs');
const { pool } = require('../../index');


async function insertarDatos({ responsable, gmail, actividad }) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');


        // 1. Insertar en la tabla 'ingreso'
        const insertActivityLogQuery = `
          INSERT INTO activity_log (usuario_responsable,gmail, actividad)
          VALUES ($1, $2, $3)
          RETURNING id;
      `;
        const logValues = [responsable,gmail, actividad];
        await client.query(insertActivityLogQuery, logValues);
       

        console.log("Datos insertados con éxito.");

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function obtenerLogsPorRangoFechasMensual(fechaInicio, fechaFin) {
    const client = await pool.connect();

    try {
        const query = `
          SELECT * FROM activity_log 
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

async function obtenerLogsPorRangoFechasDias(fechaInicio, fechaFin) {
    const client = await pool.connect();

    try {
        const query = `
          SELECT * FROM activity_log
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

async function obtenerLogPorId(id) {
    const client = await pool.connect();

    try {
        const query = `
          SELECT * FROM activity_log 
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

module.exports = {
    insertarDatos,
    obtenerLogsPorRangoFechasMensual,
    obtenerLogsPorRangoFechasDias,
    obtenerLogPorId
};
