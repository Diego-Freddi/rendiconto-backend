const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurazione storage per le firme
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/firme');
    
    // Crea la cartella se non esiste
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Nome file: user_{userId}_firma.{ext}
    const ext = path.extname(file.originalname).toLowerCase();
    // Usa un timestamp se non c'è userId disponibile
    const userId = req.userId || Date.now();
    const filename = `user_${userId}_firma${ext}`;
    cb(null, filename);
  }
});

// Filtro per validare i file
const fileFilter = (req, file, cb) => {
  // Accetta solo immagini PNG, JPG, JPEG
  const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato file non supportato. Usa PNG, JPG o JPEG.'), false);
  }
};

// Configurazione multer
const uploadFirma = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max
    files: 1 // Solo un file alla volta
  }
});

// Middleware per gestire errori di upload
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File troppo grande. Dimensione massima: 2MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Puoi caricare solo un file alla volta'
      });
    }
  }
  
  if (error.message.includes('Formato file non supportato')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

module.exports = {
  uploadFirma: uploadFirma.single('firma'),
  handleUploadError
}; 