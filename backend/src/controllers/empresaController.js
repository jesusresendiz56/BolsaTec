
const pool = require("../config/database");

// ========================================
// OBTENER EMPRESA AUTENTICADA
// ========================================

const buscarEmpresa = async (idUsuario) => {
  const resultado = await pool.query(
    `SELECT id_empresa, nombre_empresa
     FROM empresas
     WHERE id_usuario = $1`,
    [idUsuario]
  );

  return resultado.rows[0] || null;
};

// ========================================
// ESTADÍSTICAS DE EMPRESA
// ========================================

const obtenerEstadisticas = async (req, res) => {
  try {
    const idUsuario = req.usuario.id_usuario;

    const empresa = await buscarEmpresa(idUsuario);

    if (!empresa) {
      return res.status(404).json({
        mensaje: "No se encontró el perfil empresarial"
      });
    }

    const resultado = await pool.query(
      `SELECT
        (SELECT COUNT(*)
         FROM vacantes
         WHERE id_empresa = $1) AS vacantes,

        (SELECT COUNT(DISTINCT p.id_estudiante)
         FROM postulaciones p
         INNER JOIN vacantes v
           ON v.id_vacante = p.id_vacante
         WHERE v.id_empresa = $1) AS candidatos,

        (SELECT COUNT(*)
         FROM postulaciones p
         INNER JOIN vacantes v
           ON v.id_vacante = p.id_vacante
         WHERE v.id_empresa = $1) AS postulaciones,

        (SELECT COUNT(*)
         FROM notificaciones
         WHERE id_usuario = $2
           AND leida = FALSE) AS notificaciones`,
      [empresa.id_empresa, idUsuario]
    );

    const datos = resultado.rows[0];

    return res.json({
      empresa,
      vacantes: Number(datos.vacantes),
      candidatos: Number(datos.candidatos),
      postulaciones: Number(datos.postulaciones),
      notificaciones: Number(datos.notificaciones)
    });

  } catch (error) {
    console.error("Error en estadísticas:", error);

    return res.status(500).json({
      mensaje: "No se pudieron obtener las estadísticas"
    });
  }
};

// ========================================
// CONSULTAR VACANTES
// ========================================

const obtenerVacantes = async (req, res) => {
  try {
    const empresa = await buscarEmpresa(req.usuario.id_usuario);

    if (!empresa) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada"
      });
    }

    const resultado = await pool.query(
      `SELECT
        v.*,
        (SELECT COUNT(*)
         FROM postulaciones p
         WHERE p.id_vacante = v.id_vacante
        ) AS total_postulaciones
       FROM vacantes v
       WHERE v.id_empresa = $1
       ORDER BY v.fecha_publicacion DESC, v.id_vacante DESC`,
      [empresa.id_empresa]
    );

    return res.json({
      vacantes: resultado.rows.map((vacante) => ({
        ...vacante,
        total_postulaciones: Number(vacante.total_postulaciones)
      }))
    });

  } catch (error) {
    console.error("Error al consultar vacantes:", error);

    return res.status(500).json({
      mensaje: "Error al consultar las vacantes"
    });
  }
};

// ========================================
// CREAR VACANTE
// ========================================

const crearVacante = async (req, res) => {
  try {
    const empresa = await buscarEmpresa(req.usuario.id_usuario);

    if (!empresa) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada"
      });
    }

    const {
      titulo,
      descripcion,
      modalidad,
      tipo,
      ubicacion,
      salario_min,
      salario_max
    } = req.body;

    if (!titulo?.trim() || !descripcion?.trim()) {
      return res.status(400).json({
        mensaje: "El título y la descripción son obligatorios"
      });
    }

    if (!["presencial", "hibrida", "remota"].includes(modalidad)) {
      return res.status(400).json({
        mensaje: "Modalidad no válida"
      });
    }

    if (!["practicas", "medio_tiempo", "tiempo_completo"].includes(tipo)) {
      return res.status(400).json({
        mensaje: "Tipo de vacante no válido"
      });
    }

    const minimo = salario_min === "" || salario_min == null
      ? null
      : Number(salario_min);

    const maximo = salario_max === "" || salario_max == null
      ? null
      : Number(salario_max);

    if (
      (minimo !== null && (!Number.isFinite(minimo) || minimo < 0)) ||
      (maximo !== null && (!Number.isFinite(maximo) || maximo < 0)) ||
      (minimo !== null && maximo !== null && minimo > maximo)
    ) {
      return res.status(400).json({
        mensaje: "El rango salarial no es válido"
      });
    }

    const resultado = await pool.query(
      `INSERT INTO vacantes (
        id_empresa,
        titulo,
        descripcion,
        modalidad,
        tipo,
        ubicacion,
        salario_min,
        salario_max,
        estado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'activa')
      RETURNING *`,
      [
        empresa.id_empresa,
        titulo.trim(),
        descripcion.trim(),
        modalidad,
        tipo,
        ubicacion?.trim() || null,
        minimo,
        maximo
      ]
    );

    return res.status(201).json({
      mensaje: "Vacante publicada correctamente",
      vacante: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al crear vacante:", error);

    return res.status(500).json({
      mensaje: "Error al crear la vacante"
    });
  }
};

// ========================================
// EDITAR VACANTE
// ========================================

const editarVacante = async (req, res) => {
  try {
    const empresa = await buscarEmpresa(req.usuario.id_usuario);

    if (!empresa) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada"
      });
    }

    const idVacante = Number(req.params.id);

    if (!Number.isSafeInteger(idVacante) || idVacante <= 0) {
      return res.status(400).json({
        mensaje: "Identificador de vacante no válido"
      });
    }

    const {
      titulo,
      descripcion,
      modalidad,
      tipo,
      ubicacion,
      salario_min,
      salario_max
    } = req.body;

    if (
      typeof titulo !== "string" ||
      !titulo.trim() ||
      typeof descripcion !== "string" ||
      !descripcion.trim()
    ) {
      return res.status(400).json({
        mensaje: "El título y la descripción son obligatorios"
      });
    }

    if (!["presencial", "hibrida", "remota"].includes(modalidad)) {
      return res.status(400).json({
        mensaje: "Modalidad no válida"
      });
    }

    if (!["practicas", "medio_tiempo", "tiempo_completo"].includes(tipo)) {
      return res.status(400).json({
        mensaje: "Tipo de vacante no válido"
      });
    }

    const minimo = salario_min === "" || salario_min == null
      ? null
      : Number(salario_min);

    const maximo = salario_max === "" || salario_max == null
      ? null
      : Number(salario_max);

    if (
      (minimo !== null && (!Number.isFinite(minimo) || minimo < 0)) ||
      (maximo !== null && (!Number.isFinite(maximo) || maximo < 0)) ||
      (minimo !== null && maximo !== null && minimo > maximo)
    ) {
      return res.status(400).json({
        mensaje: "El rango salarial no es válido"
      });
    }

    const resultado = await pool.query(
      `UPDATE vacantes
       SET
         titulo = $1,
         descripcion = $2,
         modalidad = $3,
         tipo = $4,
         ubicacion = $5,
         salario_min = $6,
         salario_max = $7
       WHERE id_vacante = $8
         AND id_empresa = $9
       RETURNING *`,
      [
        titulo.trim(),
        descripcion.trim(),
        modalidad,
        tipo,
        ubicacion?.trim() || null,
        minimo,
        maximo,
        idVacante,
        empresa.id_empresa
      ]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Vacante no encontrada"
      });
    }

    return res.json({
      mensaje: "Vacante actualizada correctamente",
      vacante: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al editar vacante:", error);

    return res.status(500).json({
      mensaje: "Error al editar la vacante"
    });
  }
};

// ========================================
// CAMBIAR ESTADO DE VACANTE
// ========================================

const cambiarEstadoVacante = async (req, res) => {
  try {
    const empresa = await buscarEmpresa(req.usuario.id_usuario);

    if (!empresa) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada"
      });
    }

    const idVacante = Number(req.params.id);
    const { estado } = req.body;

    if (!Number.isSafeInteger(idVacante) || idVacante <= 0) {
      return res.status(400).json({
        mensaje: "Identificador de vacante no válido"
      });
    }

    if (!["activa", "pausada", "cerrada"].includes(estado)) {
      return res.status(400).json({
        mensaje: "Estado de vacante no válido"
      });
    }

    const resultado = await pool.query(
      `UPDATE vacantes
       SET estado = $1
       WHERE id_vacante = $2
         AND id_empresa = $3
       RETURNING *`,
      [estado, idVacante, empresa.id_empresa]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Vacante no encontrada"
      });
    }

    return res.json({
      mensaje: "Estado actualizado correctamente",
      vacante: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al cambiar estado:", error);

    return res.status(500).json({
      mensaje: "Error al cambiar el estado"
    });
  }
};

// ========================================
// ELIMINAR VACANTE
// ========================================

const eliminarVacante = async (req, res) => {
  try {
    const empresa = await buscarEmpresa(req.usuario.id_usuario);

    if (!empresa) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada"
      });
    }

    const idVacante = Number(req.params.id);

    if (!Number.isSafeInteger(idVacante) || idVacante <= 0) {
      return res.status(400).json({
        mensaje: "Identificador de vacante no válido"
      });
    }

    // Evitar eliminar vacantes con postulaciones.
    const resultado = await pool.query(
      `DELETE FROM vacantes v
       WHERE v.id_vacante = $1
         AND v.id_empresa = $2
         AND NOT EXISTS (
           SELECT 1
           FROM postulaciones p
           WHERE p.id_vacante = v.id_vacante
         )
       RETURNING v.id_vacante`,
      [idVacante, empresa.id_empresa]
    );

    if (resultado.rowCount === 0) {
      const consulta = await pool.query(
        `SELECT
          v.id_vacante,
          EXISTS (
            SELECT 1
            FROM postulaciones p
            WHERE p.id_vacante = v.id_vacante
          ) AS tiene_postulaciones
         FROM vacantes v
         WHERE v.id_vacante = $1
           AND v.id_empresa = $2`,
        [idVacante, empresa.id_empresa]
      );

      if (consulta.rows.length === 0) {
        return res.status(404).json({
          mensaje: "Vacante no encontrada"
        });
      }

      if (consulta.rows[0].tiene_postulaciones) {
        return res.status(409).json({
          mensaje: "No puedes eliminar una vacante con postulaciones. Puedes cerrarla."
        });
      }

      return res.status(409).json({
        mensaje: "No se pudo eliminar la vacante"
      });
    }

    return res.json({
      mensaje: "Vacante eliminada correctamente"
    });

  } catch (error) {
    console.error("Error al eliminar vacante:", error);

    return res.status(500).json({
      mensaje: "Error al eliminar la vacante"
    });
  }
};




// ========================================
// OBTENER PERFIL EMPRESARIAL
// ========================================

const obtenerPerfil = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT
        e.id_empresa,
        e.nombre_empresa,
        e.descripcion,
        e.ubicacion,
        e.telefono,
        e.sector,
        e.verificada,
        u.nombre AS representante,
        u.correo
       FROM empresas e
       INNER JOIN usuarios u
         ON u.id_usuario = e.id_usuario
       WHERE e.id_usuario = $1`,
      [req.usuario.id_usuario]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Perfil empresarial no encontrado"
      });
    }

    return res.json({
      empresa: resultado.rows[0]
    });
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    return res.status(500).json({
      mensaje: "Error al consultar el perfil empresarial"
    });
  }
};

// ========================================
// ACTUALIZAR PERFIL EMPRESARIAL
// ========================================

const actualizarPerfil = async (req, res) => {
  try {
    const {
      nombre_empresa,
      descripcion,
      ubicacion,
      telefono,
      sector
    } = req.body;

    if (
      typeof nombre_empresa !== "string" ||
      !nombre_empresa.trim()
    ) {
      return res.status(400).json({
        mensaje: "El nombre de la empresa es obligatorio"
      });
    }

    const opcionales = { descripcion, ubicacion, telefono, sector };

    if (
      Object.values(opcionales).some(
        (valor) => valor != null && typeof valor !== "string"
      )
    ) {
      return res.status(400).json({
        mensaje: "Los campos del perfil deben contener texto"
      });
    }

    const resultado = await pool.query(
      `UPDATE empresas
       SET nombre_empresa = $1,
           descripcion = $2,
           ubicacion = $3,
           telefono = $4,
           sector = $5
       WHERE id_usuario = $6
       RETURNING
         id_empresa,
         nombre_empresa,
         descripcion,
         ubicacion,
         telefono,
         sector,
         verificada`,
      [
        nombre_empresa.trim(),
        descripcion?.trim() || null,
        ubicacion?.trim() || null,
        telefono?.trim() || null,
        sector?.trim() || null,
        req.usuario.id_usuario
      ]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Perfil empresarial no encontrado"
      });
    }

    return res.json({
      mensaje: "Perfil empresarial actualizado correctamente",
      empresa: resultado.rows[0]
    });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    return res.status(500).json({
      mensaje: "Error al actualizar el perfil empresarial"
    });
  }
};

// ========================================
// EXPORTAR FUNCIONES
// ========================================

module.exports = {
  obtenerEstadisticas,
  obtenerVacantes,
  crearVacante,
  editarVacante,
  cambiarEstadoVacante,
  eliminarVacante,
  obtenerPerfil,
  actualizarPerfil
};