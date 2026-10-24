
const pool = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ======================================
// INICIO DE SESIÓN
// ======================================

const login = async (correo, password) => {
  const resultado = await pool.query(
    `SELECT id_usuario, nombre, correo,
            password_hash, rol, activo
     FROM usuarios
     WHERE LOWER(correo) = LOWER($1)
     LIMIT 1`,
    [correo]
  );

  if (resultado.rows.length === 0) {
    return null;
  }

  const usuario = resultado.rows[0];

  // Verificar que la cuenta esté activa
  if (!usuario.activo) {
    return null;
  }

  // Verificar contraseña
  const passwordValida = await bcrypt.compare(
    password,
    usuario.password_hash
  );

  if (!passwordValida) {
    return null;
  }

  // Generar token JWT
  const token = jwt.sign(
    {
      id_usuario: usuario.id_usuario,
      rol: usuario.rol
    },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  return {
    mensaje: "Inicio de sesión exitoso",
    token,
    usuario: {
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol
    }
  };
};

// ======================================
// REGISTRO DE ESTUDIANTES
// ======================================

const registrarEstudiante = async ({
  nombre,
  correo,
  password,
  carrera,
  semestre
}) => {
  const client = await pool.connect();

  try {
    // Iniciar transacción
    await client.query("BEGIN");

    // Verificar si el correo ya existe
    const usuarioExistente = await client.query(
      `SELECT id_usuario
       FROM usuarios
       WHERE LOWER(correo) = LOWER($1)
       LIMIT 1`,
      [correo]
    );

    if (usuarioExistente.rows.length > 0) {
      const error = new Error(
        "El correo electrónico ya está registrado"
      );
      error.code = "23505";
      throw error;
    }

    // Cifrar contraseña
    const passwordHash = await bcrypt.hash(
      password,
      12
    );

    // Crear usuario
    const resultadoUsuario = await client.query(
      `INSERT INTO usuarios
       (nombre, correo, password_hash, rol)
       VALUES ($1, $2, $3, 'estudiante')
       RETURNING id_usuario, nombre, correo, rol`,
      [
        nombre,
        correo.toLowerCase(),
        passwordHash
      ]
    );

    const usuario = resultadoUsuario.rows[0];

    // Crear perfil de estudiante
    const resultadoEstudiante = await client.query(
      `INSERT INTO estudiantes
       (id_usuario, carrera, semestre)
       VALUES ($1, $2, $3)
       RETURNING id_estudiante, carrera, semestre`,
      [
        usuario.id_usuario,
        carrera,
        semestre
      ]
    );

    // Confirmar cambios
    await client.query("COMMIT");

    return {
      mensaje: "Estudiante registrado correctamente",
      usuario,
      estudiante: resultadoEstudiante.rows[0]
    };

  } catch (error) {
    // Revertir cambios si ocurre un error
    await client.query("ROLLBACK");
    throw error;

  } finally {
    // Liberar conexión
    client.release();
  }
};



const registrarEmpresa = async ({
  nombre,
  correo,
  password,
  nombre_empresa,
  telefono,
  sector
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Proteger la contraseña
    const passwordHash = await bcrypt.hash(password, 12);

    // Crear usuario con rol empresa
    const resultadoUsuario = await client.query(
      `INSERT INTO usuarios
       (nombre, correo, password_hash, rol)
       VALUES ($1, $2, $3, 'empresa')
       RETURNING id_usuario, nombre, correo, rol`,
      [
        nombre,
        correo.trim().toLowerCase(),
        passwordHash
      ]
    );

    const usuario = resultadoUsuario.rows[0];

    // Crear perfil empresarial
    const resultadoEmpresa = await client.query(
      `INSERT INTO empresas
       (id_usuario, nombre_empresa, telefono, sector)
       VALUES ($1, $2, $3, $4)
       RETURNING id_empresa, nombre_empresa,
                 telefono, sector, verificada`,
      [
        usuario.id_usuario,
        nombre_empresa,
        telefono,
        sector
      ]
    );

    await client.query("COMMIT");

    return {
      mensaje: "Empresa registrada correctamente",
      usuario,
      empresa: resultadoEmpresa.rows[0]
    };

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// ======================================
// EXPORTAR FUNCIONES
// ======================================

module.exports = {
  login,
  registrarEstudiante,
  registrarEmpresa
};