
const pool = require("../config/database");

// ========================================
// OBTENER ESTUDIANTE AUTENTICADO
// ========================================

const buscarEstudiante = async (idUsuario) => {
  const resultado = await pool.query(
    `SELECT
       id_estudiante,
       id_usuario,
       carrera,
       semestre,
       descripcion,
       cv_url
     FROM estudiantes
     WHERE id_usuario = $1`,
    [idUsuario]
  );

  return resultado.rows[0] || null;
};

// ========================================
// ESTADÍSTICAS DEL ESTUDIANTE
// ========================================

const obtenerEstadisticas = async (req, res) => {
  try {
    const idUsuario = req.usuario.id_usuario;

    const estudiante = await buscarEstudiante(idUsuario);

    if (!estudiante) {
      return res.status(404).json({
        mensaje: "No se encontró el perfil del estudiante"
      });
    }

    const resultado = await pool.query(
      `SELECT
        (SELECT COUNT(*)
         FROM postulaciones
         WHERE id_estudiante = $1) AS postulaciones,

        (SELECT COUNT(*)
         FROM vacantes
         WHERE estado = 'activa') AS vacantes,

        (SELECT COUNT(*)
         FROM postulaciones
         WHERE id_estudiante = $1
           AND estado = 'entrevista') AS entrevistas,

        (SELECT COUNT(*)
         FROM notificaciones
         WHERE id_usuario = $2
           AND leida = FALSE) AS notificaciones`,
      [estudiante.id_estudiante, idUsuario]
    );

    const datos = resultado.rows[0];

    return res.json({
      estudiante,
      postulaciones: Number(datos.postulaciones),
      vacantes: Number(datos.vacantes),
      entrevistas: Number(datos.entrevistas),
      notificaciones: Number(datos.notificaciones)
    });

  } catch (error) {
    console.error("Error en estadísticas del estudiante:", error);

    return res.status(500).json({
      mensaje: "No se pudieron obtener las estadísticas"
    });
  }
};



const obtenerPerfil = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT
        e.id_estudiante,
        e.carrera,
        e.semestre,
        e.descripcion,
        e.cv_url,
        e.telefono,
        e.institucion,
        u.nombre,
        u.correo
       FROM estudiantes e
       INNER JOIN usuarios u
         ON u.id_usuario = e.id_usuario
       WHERE e.id_usuario = $1`,
      [req.usuario.id_usuario]
    );

    if (!resultado.rows.length) {
      return res.status(404).json({
        mensaje: "Perfil del estudiante no encontrado"
      });
    }

    return res.json({
      estudiante: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al obtener perfil:", error);

    return res.status(500).json({
      mensaje: "Error al consultar el perfil"
    });
  }
};

const actualizarPerfil = async (req, res) => {
  try {
    const {
      carrera,
      semestre,
      descripcion,
      telefono,
      institucion
    } = req.body;

    const camposTexto = {
      carrera,
      descripcion,
      telefono,
      institucion
    };

    if (
      Object.values(camposTexto).some(
        (valor) => valor != null && typeof valor !== "string"
      )
    ) {
      return res.status(400).json({
        mensaje: "Los campos del perfil deben contener texto"
      });
    }

    const semestreNumero =
      semestre === "" || semestre == null
        ? null
        : Number(semestre);

    if (
      semestreNumero !== null &&
      (!Number.isInteger(semestreNumero) ||
        semestreNumero < 1 ||
        semestreNumero > 15)
    ) {
      return res.status(400).json({
        mensaje: "El semestre debe estar entre 1 y 15"
      });
    }

    const resultado = await pool.query(
      `UPDATE estudiantes
       SET
         carrera = $1,
         semestre = $2,
         descripcion = $3,
         telefono = $4,
         institucion = $5
       WHERE id_usuario = $6
       RETURNING
         id_estudiante,
         carrera,
         semestre,
         descripcion,
         cv_url,
         telefono,
         institucion`,
      [
        carrera?.trim() || null,
        semestreNumero,
        descripcion?.trim() || null,
        telefono?.trim() || null,
        institucion?.trim() || null,
        req.usuario.id_usuario
      ]
    );

    if (!resultado.rows.length) {
      return res.status(404).json({
        mensaje: "Perfil del estudiante no encontrado"
      });
    }

    return res.json({
      mensaje: "Perfil actualizado correctamente",
      estudiante: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al actualizar perfil:", error);

    return res.status(500).json({
      mensaje: "Error al actualizar el perfil"
    });
  }
};




// ========================================
// CONSULTAR VACANTES ACTIVAS
// ========================================

const obtenerVacantes = async (req, res) => {
  try {
    const { busqueda = "", modalidad = "", tipo = "" } = req.query;

    const modalidades = ["presencial", "hibrida", "remota"];
    const tipos = [
      "practicas",
      "medio_tiempo",
      "tiempo_completo"
    ];

    if (modalidad && !modalidades.includes(modalidad)) {
      return res.status(400).json({
        mensaje: "Modalidad no válida"
      });
    }

    if (tipo && !tipos.includes(tipo)) {
      return res.status(400).json({
        mensaje: "Tipo de vacante no válido"
      });
    }

    const resultado = await pool.query(
      `SELECT
        v.id_vacante,
        v.titulo,
        v.descripcion,
        v.modalidad,
        v.tipo,
        v.ubicacion,
        v.direccion_calle,
        v.direccion_numero,
        v.direccion_colonia,
        v.direccion_cp,
        v.direccion_ciudad,
        v.direccion_estado,
        v.latitud::float AS latitud,
        v.longitud::float AS longitud,
        v.salario_min,
        v.salario_max,
        v.fecha_publicacion,
        e.nombre_empresa
       FROM vacantes v
       INNER JOIN empresas e
         ON e.id_empresa = v.id_empresa
       WHERE v.estado = 'activa'
         AND (
           $1 = ''
           OR v.titulo ILIKE '%' || $1 || '%'
           OR e.nombre_empresa ILIKE '%' || $1 || '%'
           OR COALESCE(v.ubicacion, '') ILIKE '%' || $1 || '%'
         )
         AND ($2 = '' OR v.modalidad = $2)
         AND ($3 = '' OR v.tipo = $3)
       ORDER BY v.fecha_publicacion DESC, v.id_vacante DESC`,
      [busqueda.trim(), modalidad, tipo]
    );

    return res.json({
      vacantes: resultado.rows,
      total: resultado.rowCount
    });

  } catch (error) {
    console.error("Error al consultar vacantes:", error);

    return res.status(500).json({
      mensaje: "No se pudieron consultar las vacantes"
    });
  }
};

module.exports = {
  obtenerEstadisticas,
  obtenerPerfil,
  actualizarPerfil,
  obtenerVacantes
};
