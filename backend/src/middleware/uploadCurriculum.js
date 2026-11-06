
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(
        new Error("Solo se permiten archivos PDF")
      );
    }

    cb(null, true);
  }
});

const subirPDF = (req, res, next) => {
  upload.single("curriculum")(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        return res.status(400).json({
          mensaje:
            error.code === "LIMIT_FILE_SIZE"
              ? "El archivo no debe superar los 5 MB"
              : "No se pudo procesar el archivo"
        });
      }

      return res.status(400).json({
        mensaje: error.message || "Archivo no válido"
      });
    }

    next();
  });
};

module.exports = subirPDF;
