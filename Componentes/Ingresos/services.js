const XLSX = require('xlsx');
const fs = require('fs');
async function procesarArchivoExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Puedes acceder a las celdas específicas o a rangos de celdas aquí
  const Inscripciones_total_mes = sheet['C18'].v; 
  const titulos_total_mes = sheet['C19'].v;
  const Subvenciones_total_mes = sheet['C20'].v;
  const Otros_total_mes = sheet['C21'].v;
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
    Inscripciones_total_mes,
    titulos_total_mes,
    Subvenciones_total_mes,
    Otros_total_mes,
    auxiliares_total_mes
    },
    Diario:{datosDelRangoDias,datosDelRangoTotalDia}
  };
}

module.exports = {
  procesarArchivoExcel,
};
