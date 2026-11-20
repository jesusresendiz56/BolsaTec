
const express = require("express");
const { execSync } = require("child_process");
const { version } = require("./package.json");
const cors = require("cors");
require("dotenv").config();

const pool = require("./src/config/database");
const authRoutes = require("./src/routes/authRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const empresaRoutes = require("./src/routes/empresaRoutes");
const estudianteRoutes = require("./src/routes/estudianteRoutes");

const app = express();

// CORS: permitir desarrollo local y Vercel
const origenesPermitidos = [
  "http://localhost:5173",
  "https://bolsa-tec.vercel.app"
];

app.use(cors({
  origin: origenesPermitidos,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Rutas de autenticación
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/empresa", empresaRoutes);
app.use("/api/estudiante", estudianteRoutes);

// Ruta principal
app.get("/", (req, res) => {
  res.json({
    mensaje: "API de BolsaTec funcionando correctamente"
  });
});

// Versión desplegada (para identificar la versión en las pruebas)
const obtenerCommit = () => {
  const desdeEntorno =
    process.env.RENDER_GIT_COMMIT ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT;

  if (desdeEntorno) {
    return desdeEntorno.slice(0, 7);
  }

  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: __dirname,
      stdio: ["ignore", "pipe", "ignore"]
    }).toString().trim();
  } catch {
    return "desconocido";
  }
};

const informacionVersion = {
  aplicacion: "BolsaTec API",
  version,
  commit: obtenerCommit(),
  iniciado: new Date().toISOString()
};

app.get("/api/version", (req, res) => {
  res.json(informacionVersion);
});

// Prueba de conexión con Supabase
app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT NOW() AS fecha"
    );

    res.json({
      conexion: true,
      mensaje: "BolsaTec conectado correctamente a PostgreSQL",
      servidor: result.rows[0]
    });

  } catch (error) {
    console.error("Error de PostgreSQL:", error);

    res.status(500).json({
      conexion: false,
      mensaje: "Error al conectar con PostgreSQL"
    });
  }
});

// Puerto del servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Servidor de BolsaTec ejecutándose en puerto ${PORT}`
  );
});
