
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./src/config/database");
const authRoutes = require("./src/routes/authRoutes");

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

// Ruta principal
app.get("/", (req, res) => {
  res.json({
    mensaje: "API de BolsaTec funcionando correctamente"
  });
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
