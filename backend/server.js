const express = require('express')
const cors = require('cors')
require('dotenv').config()
const pool = require('./src/config/database')

const app = express()

// Middlewares
app.use(cors())
app.use(express.json())

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    mensaje: 'API de BolsaTec funcionando correctamente'
  })
})

// Prueba de conexión con PostgreSQL / Supabase
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS fecha')

    res.json({
      conexion: true,
      mensaje: 'BolsaTec conectado correctamente a PostgreSQL',
      servidor: result.rows[0]
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      conexion: false,
      mensaje: 'Error al conectar con PostgreSQL'
    })
  }
})

// Puerto del servidor
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Servidor de BolsaTec ejecutándose en http://localhost:${PORT}`)
})