const express = require('express');
const { body, validationResult, param } = require('express-validator');
const Categoria = require('../models/Categoria');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Applica autenticazione a tutte le routes
router.use(authenticateToken);

// Middleware per validazione errori
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dati non validi',
      details: errors.array()
    });
  }
  next();
};

// @route   GET /api/categorie
// @desc    Ottieni tutte le categorie (default + personalizzate dell'utente)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const categorie = await Categoria.getCategorieUtente(req.userId);

    res.json({
      categorie,
      totale: categorie.length
    });

  } catch (error) {
    console.error('Errore recupero categorie:', error);
    res.status(500).json({
      error: 'Errore durante il recupero delle categorie',
      message: error.message
    });
  }
});

// @route   GET /api/categorie/default
// @desc    Ottieni solo le categorie default
// @access  Private
router.get('/default', async (req, res) => {
  try {
    const categorie = await Categoria.getCategorieDefault();

    res.json({
      categorie,
      totale: categorie.length
    });

  } catch (error) {
    console.error('Errore recupero categorie default:', error);
    res.status(500).json({
      error: 'Errore durante il recupero delle categorie default',
      message: error.message
    });
  }
});

// @route   GET /api/categorie/personalizzate
// @desc    Ottieni solo le categorie personalizzate dell'utente
// @access  Private
router.get('/personalizzate', async (req, res) => {
  try {
    const categorie = await Categoria.find({
      userId: req.userId,
      isActive: true
    }).sort({ nome: 1 });

    res.json({
      categorie,
      totale: categorie.length
    });

  } catch (error) {
    console.error('Errore recupero categorie personalizzate:', error);
    res.status(500).json({
      error: 'Errore durante il recupero delle categorie personalizzate',
      message: error.message
    });
  }
});

// @route   POST /api/categorie
// @desc    Crea nuova categoria personalizzata
// @access  Private
router.post('/', [
  body('nome')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Il nome della categoria è obbligatorio (max 50 caratteri)')
    .custom(value => {
      // Converti in maiuscolo per il controllo
      const upperValue = value.toUpperCase();
      // Lista delle categorie default che non possono essere duplicate
      const categorieDefault = [
        'SALUTE', 'CULTURA', 'RISTORANTI', 'VACANZE', 
        'BANCA', 'UFFICIO', 'PERSONA', 'ABBIGLIAMENTO', 'AUTO'
      ];
      
      if (categorieDefault.includes(upperValue)) {
        throw new Error('Non puoi creare una categoria con lo stesso nome di una categoria default');
      }
      return true;
    }),
  body('descrizione')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La descrizione non può superare i 200 caratteri'),
  body('colore')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Il colore deve essere un codice esadecimale valido (es: #FF0000)')
], handleValidationErrors, async (req, res) => {
  try {
    const { nome, descrizione, colore } = req.body;

    // Verifica se l'utente ha già una categoria con questo nome
    const existingCategoria = await Categoria.findOne({
      userId: req.userId,
      nome: nome.toUpperCase(),
      isActive: true
    });

    if (existingCategoria) {
      return res.status(400).json({
        error: 'Categoria già esistente',
        message: 'Hai già una categoria personalizzata con questo nome'
      });
    }

    // Crea nuova categoria
    const categoria = new Categoria({
      nome: nome.toUpperCase(),
      userId: req.userId,
      descrizione,
      colore: colore || '#6c757d',
      isDefault: false
    });

    await categoria.save();

    res.status(201).json({
      message: 'Categoria creata con successo',
      categoria
    });

  } catch (error) {
    console.error('Errore creazione categoria:', error);
    res.status(500).json({
      error: 'Errore durante la creazione della categoria',
      message: error.message
    });
  }
});

// @route   PUT /api/categorie/:id
// @desc    Aggiorna categoria personalizzata
// @access  Private
router.put('/:id', [
  param('id').isMongoId().withMessage('ID categoria non valido'),
  body('nome')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Il nome della categoria deve essere tra 1 e 50 caratteri'),
  body('descrizione')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La descrizione non può superare i 200 caratteri'),
  body('colore')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Il colore deve essere un codice esadecimale valido')
], handleValidationErrors, async (req, res) => {
  try {
    const categoria = await Categoria.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDefault: false // Solo categorie personalizzate possono essere modificate
    });

    if (!categoria) {
      return res.status(404).json({
        error: 'Categoria non trovata',
        message: 'La categoria richiesta non esiste o non hai i permessi per modificarla'
      });
    }

    // Se si sta modificando il nome, verifica che non esista già
    if (req.body.nome && req.body.nome.toUpperCase() !== categoria.nome) {
      const existingCategoria = await Categoria.findOne({
        userId: req.userId,
        nome: req.body.nome.toUpperCase(),
        isActive: true,
        _id: { $ne: req.params.id }
      });

      if (existingCategoria) {
        return res.status(400).json({
          error: 'Nome già utilizzato',
          message: 'Hai già una categoria con questo nome'
        });
      }
    }

    // Aggiorna i campi
    if (req.body.nome) categoria.nome = req.body.nome.toUpperCase();
    if (req.body.descrizione !== undefined) categoria.descrizione = req.body.descrizione;
    if (req.body.colore) categoria.colore = req.body.colore;

    await categoria.save();

    res.json({
      message: 'Categoria aggiornata con successo',
      categoria
    });

  } catch (error) {
    console.error('Errore aggiornamento categoria:', error);
    res.status(500).json({
      error: 'Errore durante l\'aggiornamento della categoria',
      message: error.message
    });
  }
});

// @route   DELETE /api/categorie/:id
// @desc    Elimina categoria personalizzata
// @access  Private
router.delete('/:id', [
  param('id').isMongoId().withMessage('ID categoria non valido')
], handleValidationErrors, async (req, res) => {
  try {
    const categoria = await Categoria.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDefault: false // Solo categorie personalizzate possono essere eliminate
    });

    if (!categoria) {
      return res.status(404).json({
        error: 'Categoria non trovata',
        message: 'La categoria richiesta non esiste o non può essere eliminata'
      });
    }

    // Verifica se la categoria è utilizzata in qualche rendiconto
    const Rendiconto = require('../models/Rendiconto');
    const rendicontiConCategoria = await Rendiconto.countDocuments({
      userId: req.userId,
      'contoEconomico.uscite.categoria': categoria.nome
    });

    if (rendicontiConCategoria > 0) {
      // Invece di eliminare, disattiva la categoria
      categoria.isActive = false;
      await categoria.save();

      return res.json({
        message: 'Categoria disattivata con successo',
        info: `La categoria è stata disattivata perché utilizzata in ${rendicontiConCategoria} rendiconto/i`
      });
    }

    // Se non è utilizzata, elimina definitivamente
    await Categoria.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Categoria eliminata con successo'
    });

  } catch (error) {
    console.error('Errore eliminazione categoria:', error);
    res.status(500).json({
      error: 'Errore durante l\'eliminazione della categoria',
      message: error.message
    });
  }
});

// @route   PATCH /api/categorie/:id/attiva
// @desc    Riattiva categoria personalizzata disattivata
// @access  Private
router.patch('/:id/attiva', [
  param('id').isMongoId().withMessage('ID categoria non valido')
], handleValidationErrors, async (req, res) => {
  try {
    const categoria = await Categoria.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDefault: false
    });

    if (!categoria) {
      return res.status(404).json({
        error: 'Categoria non trovata'
      });
    }

    categoria.isActive = true;
    await categoria.save();

    res.json({
      message: 'Categoria riattivata con successo',
      categoria
    });

  } catch (error) {
    console.error('Errore riattivazione categoria:', error);
    res.status(500).json({
      error: 'Errore durante la riattivazione della categoria',
      message: error.message
    });
  }
});

module.exports = router; 