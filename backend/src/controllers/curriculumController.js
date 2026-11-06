
const pool = require("../config/database");
const supabase = require("../config/supabase");

const BUCKET = "curriculums";

// Obtener la información del estudiante autenticado
const buscarEstudiante = async (idUsuario) => {
  const resultado = await pool.query(
    `SELECT id_estudiante, cv_url
     FROM estudiantes
     WHERE id_usuario = $1`,
    [idUsuario]
  );

  return resultado.rows[0] || null;
};

// ========================================
// SUBIR O REEMPLAZAR CURRÍCULUM
// ========================================

const subirCurriculum = async (req, res) => {
  try {
    const estudiante = await buscarEstudiante(
      req.usuario.id_usuario
    );

    if (!estudiante) {
      return res.status(404).json({
        mensaje: "Estudiante no encontrado"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        mensaje: "Debes seleccionar un archivo PDF"
      });
    }

    const archivo = req.file;

    if (
      archivo.mimetype !== "application/pdf" ||
      archivo.buffer.subarray(0, 5).toString() !== "%PDF-"
    ) {
      return res.status(400).json({
        mensaje: "El archivo debe ser un PDF válido"
      });
    }

    const rutaArchivo =
      `estudiantes/${estudiante.id_estudiante}/curriculum.pdf`;

    const { error: errorSubida } = await supabase.storage
      .from(BUCKET)
      .upload(rutaArchivo, archivo.buffer, {
        contentType: "application/pdf",
        upsert: true,
        cacheControl: "0"
      });

    if (errorSubida) {
      console.error("Error de Supabase Storage:", errorSubida);

      return res.status(500).json({
        mensaje: "No se pudo subir el currículum"
      });
    }

    const resultado = await pool.query(
      `UPDATE estudiantes
       SET cv_url = $1
       WHERE id_estudiante = $2
       RETURNING cv_url`,
      [rutaArchivo, estudiante.id_estudiante]
    );

    return res.json({
      mensaje: "Currículum guardado correctamente",
      cv_url: resultado.rows[0].cv_url
    });

  } catch (error) {
    console.error("Error al subir currículum:", error);

    return res.status(500).json({
      mensaje: "Error al guardar el currículum"
    });
  }
};

// ========================================
// CONSULTAR CURRÍCULUM
// ========================================

const obtenerCurriculum = async (req, res) => {
  try {
    const estudiante = await buscarEstudiante(
      req.usuario.id_usuario
    );

    if (!estudiante) {
      return res.status(404).json({
        mensaje: "Estudiante no encontrado"
      });
    }

    if (!estudiante.cv_url) {
      return res.status(404).json({
        mensaje: "Todavía no tienes un currículum registrado"
      });
    }

    const rutaEsperada =
      `estudiantes/${estudiante.id_estudiante}/curriculum.pdf`;

    if (estudiante.cv_url !== rutaEsperada) {
      return res.status(409).json({
        mensaje: "La referencia del currículum no es válida"
      });
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(rutaEsperada);

    if (error || !data) {
      console.error("Error al descargar currículum:", error);

      return res.status(500).json({
        mensaje: "No se pudo consultar el currículum"
      });
    }

    const buffer = Buffer.from(await data.arrayBuffer());

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="curriculum.pdf"'
    );
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.send(buffer);

  } catch (error) {
    console.error("Error al consultar currículum:", error);

    return res.status(500).json({
      mensaje: "Error al consultar el currículum"
    });
  }
};

module.exports = {
  subirCurriculum,
  obtenerCurriculum
};
