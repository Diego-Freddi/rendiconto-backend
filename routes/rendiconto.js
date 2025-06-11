const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const Rendiconto = require('../models/Rendiconto');
const { authenticateToken, requireOwnership } = require('../middleware/auth');

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

// Validazioni comuni
const rendicontoValidation = [
  body('beneficiarioId')
    .isMongoId()
    .withMessage('ID beneficiario non valido'),
  body('datiGenerali.dataInizio')
    .isISO8601()
    .withMessage('Data di inizio non valida'),
  body('datiGenerali.dataFine')
    .isISO8601()
    .withMessage('Data di fine non valida')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.datiGenerali.dataInizio)) {
        throw new Error('La data di fine deve essere successiva alla data di inizio');
      }
      return true;
    }),
  body('datiGenerali.rg_numero')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Numero R.G. obbligatorio (max 50 caratteri)')
];

// @route   GET /api/rendiconti
// @desc    Ottieni tutti i rendiconti dell'utente
// @access  Private
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Pagina non valida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite non valido'),
  query('stato').optional().isIn(['bozza', 'completato', 'inviato']).withMessage('Stato non valido'),
  query('anno').optional().isInt({ min: 2000 }).withMessage('Anno non valido')
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Costruisci filtri
    const filters = { userId: req.userId };
    
    if (req.query.stato) {
      filters.stato = req.query.stato;
    }
    
    if (req.query.anno) {
      filters['datiGenerali.anno'] = parseInt(req.query.anno);
    }

    // Ottieni rendiconti con paginazione e populate beneficiario
    const rendiconti = await Rendiconto.find(filters)
      .populate('beneficiarioId', 'nome cognome codiceFiscale situazionePatrimoniale')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('datiGenerali stato contoEconomico beneficiarioId createdAt updatedAt');

    // Se c'è una ricerca, filtra dopo il populate
    let filteredRendiconti = rendiconti;
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filteredRendiconti = rendiconti.filter(r => 
        searchRegex.test(r.beneficiarioId?.nome) ||
        searchRegex.test(r.beneficiarioId?.cognome) ||
        searchRegex.test(r.datiGenerali?.rg_numero)
      );
    }

    // Conta totale per paginazione
    const total = await Rendiconto.countDocuments(filters);

    res.json({
      rendiconti: filteredRendiconti,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Errore recupero rendiconti:', error);
    res.status(500).json({
      error: 'Errore durante il recupero dei rendiconti',
      message: error.message
    });
  }
});

// @route   GET /api/rendiconti/:id
// @desc    Ottieni un rendiconto specifico
// @access  Private
router.get('/:id', [
  param('id').isMongoId().withMessage('ID rendiconto non valido')
], handleValidationErrors, async (req, res) => {
  try {
    const rendiconto = await Rendiconto.findOne({
      _id: req.params.id,
      userId: req.userId
    }).populate('beneficiarioId');

    if (!rendiconto) {
      return res.status(404).json({
        error: 'Rendiconto non trovato',
        message: 'Il rendiconto richiesto non esiste o non hai i permessi per visualizzarlo'
      });
    }

    res.json({ rendiconto });

  } catch (error) {
    console.error('Errore recupero rendiconto:', error);
    res.status(500).json({
      error: 'Errore durante il recupero del rendiconto',
      message: error.message
    });
  }
});

// @route   POST /api/rendiconti
// @desc    Crea nuovo rendiconto
// @access  Private
router.post('/', rendicontoValidation, handleValidationErrors, async (req, res) => {
  try {
    const Beneficiario = require('../models/Beneficiario');
    
    // Verifica che il beneficiario esista e appartenga all'utente
    const beneficiario = await Beneficiario.findOne({
      _id: req.body.beneficiarioId,
      userId: req.userId,
      isActive: true
    });

    if (!beneficiario) {
      return res.status(404).json({
        error: 'Beneficiario non trovato',
        message: 'Il beneficiario selezionato non esiste o non è attivo'
      });
    }

    // Calcola anno dalla data di inizio
    const dataInizio = new Date(req.body.datiGenerali.dataInizio);
    const anno = dataInizio.getFullYear();

    // Verifica se esiste già un rendiconto per lo stesso periodo/beneficiario
    const existingRendiconto = await Rendiconto.findOne({
      userId: req.userId,
      beneficiarioId: req.body.beneficiarioId,
      $or: [
        {
          'datiGenerali.dataInizio': { $lte: new Date(req.body.datiGenerali.dataFine) },
          'datiGenerali.dataFine': { $gte: new Date(req.body.datiGenerali.dataInizio) }
        }
      ]
    });

    if (existingRendiconto) {
      return res.status(400).json({
        error: 'Rendiconto già esistente',
        message: `Esiste già un rendiconto per questo beneficiario nel periodo specificato`
      });
    }

    // Prepara i dati del rendiconto
    const rendicontoData = {
      userId: req.userId,
      beneficiarioId: req.body.beneficiarioId,
      datiGenerali: {
        ...req.body.datiGenerali,
        anno: anno // Calcolato automaticamente
      },
      contoEconomico: req.body.contoEconomico || { entrate: [], uscite: [] },
      firma: req.body.firma || {},
      stato: 'bozza'
    };

    // Crea nuovo rendiconto
    const rendiconto = new Rendiconto(rendicontoData);
    await rendiconto.save();

    // Popola il beneficiario per la risposta
    await rendiconto.populate('beneficiarioId');

    res.status(201).json({
      message: 'Rendiconto creato con successo',
      rendiconto
    });

  } catch (error) {
    console.error('Errore creazione rendiconto:', error);
    res.status(500).json({
      error: 'Errore durante la creazione del rendiconto',
      message: error.message
    });
  }
});

// @route   PUT /api/rendiconti/:id
// @desc    Aggiorna rendiconto
// @access  Private
router.put('/:id', [
  param('id').isMongoId().withMessage('ID rendiconto non valido'),
  ...rendicontoValidation
], handleValidationErrors, async (req, res) => {
  try {
    const rendiconto = await Rendiconto.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!rendiconto) {
      return res.status(404).json({
        error: 'Rendiconto non trovato',
        message: 'Il rendiconto richiesto non esiste o non hai i permessi per modificarlo'
      });
    }

    // Non permettere modifiche se il rendiconto è già stato inviato
    if (rendiconto.stato === 'inviato') {
      return res.status(400).json({
        error: 'Modifica non consentita',
        message: 'Non è possibile modificare un rendiconto già inviato'
      });
    }

    // Aggiorna i campi (esclusi userId e beneficiarioId che non devono cambiare)
    Object.keys(req.body).forEach(key => {
      if (key !== 'userId' && key !== 'beneficiarioId') {
        rendiconto[key] = req.body[key];
      }
    });

    // Ricalcola anno se cambia la data di inizio
    if (req.body.datiGenerali?.dataInizio) {
      const dataInizio = new Date(req.body.datiGenerali.dataInizio);
      rendiconto.datiGenerali.anno = dataInizio.getFullYear();
    }

    await rendiconto.save();
    
    // Popola il beneficiario per la risposta
    await rendiconto.populate('beneficiarioId');

    res.json({
      message: 'Rendiconto aggiornato con successo',
      rendiconto
    });

  } catch (error) {
    console.error('Errore aggiornamento rendiconto:', error);
    res.status(500).json({
      error: 'Errore durante l\'aggiornamento del rendiconto',
      message: error.message
    });
  }
});

// @route   PATCH /api/rendiconti/:id/stato
// @desc    Aggiorna solo lo stato del rendiconto
// @access  Private
router.patch('/:id/stato', [
  param('id').isMongoId().withMessage('ID rendiconto non valido'),
  body('stato').isIn(['bozza', 'completato', 'inviato']).withMessage('Stato non valido')
], handleValidationErrors, async (req, res) => {
  try {
    const rendiconto = await Rendiconto.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!rendiconto) {
      return res.status(404).json({
        error: 'Rendiconto non trovato'
      });
    }

    // Verifica transizioni di stato valide
    const { stato } = req.body;
    
    if (stato === 'completato' || stato === 'inviato') {
      const completezza = rendiconto.isCompleto();
      if (!completezza.completo) {
        return res.status(400).json({
          error: 'Rendiconto incompleto',
          message: 'Il rendiconto deve essere completo prima di poter essere marcato come tale',
          errori: completezza.errori
        });
      }
    }

    rendiconto.stato = stato;
    await rendiconto.save();

    res.json({
      message: 'Stato aggiornato con successo',
      rendiconto: {
        _id: rendiconto._id,
        stato: rendiconto.stato
      }
    });

  } catch (error) {
    console.error('Errore aggiornamento stato:', error);
    res.status(500).json({
      error: 'Errore durante l\'aggiornamento dello stato',
      message: error.message
    });
  }
});

// @route   GET /api/rendiconti/:id/completezza
// @desc    Verifica completezza rendiconto
// @access  Private
router.get('/:id/completezza', [
  param('id').isMongoId().withMessage('ID rendiconto non valido')
], handleValidationErrors, async (req, res) => {
  try {
    const rendiconto = await Rendiconto.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!rendiconto) {
      return res.status(404).json({
        error: 'Rendiconto non trovato'
      });
    }

    // Verifica completezza
    const completezza = {
      completo: true,
      errori: []
    };

    // Verifica dati generali
    if (!rendiconto.datiGenerali?.dataInizio) completezza.errori.push('Data inizio mancante');
    if (!rendiconto.datiGenerali?.dataFine) completezza.errori.push('Data fine mancante');
    if (!rendiconto.datiGenerali?.rg_numero) completezza.errori.push('R.G. mancante');
    if (!rendiconto.beneficiarioId) completezza.errori.push('Beneficiario non selezionato');

    // Verifica condizioni personali
    if (!rendiconto.condizioniPersonali || rendiconto.condizioniPersonali.trim().length === 0) {
      completezza.errori.push('Condizioni personali mancanti');
    }

    // Verifica firma
    if (!rendiconto.firma?.dichiarazioneVeridicita) completezza.errori.push('Dichiarazione di veridicità mancante');
    if (!rendiconto.firma?.consensoTrattamento) completezza.errori.push('Consenso trattamento dati mancante');
    if (!rendiconto.firma?.firmaAmministratore) completezza.errori.push('Firma amministratore mancante');
    if (!rendiconto.firma?.luogo) completezza.errori.push('Luogo firma mancante');
    if (!rendiconto.firma?.data) completezza.errori.push('Data firma mancante');

    completezza.completo = completezza.errori.length === 0;

    res.json(completezza);

  } catch (error) {
    console.error('Errore verifica completezza:', error);
    res.status(500).json({
      error: 'Errore durante la verifica della completezza',
      message: error.message
    });
  }
});

// @route   DELETE /api/rendiconti/:id
// @desc    Elimina rendiconto
// @access  Private
router.delete('/:id', [
  param('id').isMongoId().withMessage('ID rendiconto non valido')
], handleValidationErrors, async (req, res) => {
  try {
    const rendiconto = await Rendiconto.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!rendiconto) {
      return res.status(404).json({
        error: 'Rendiconto non trovato',
        message: 'Il rendiconto richiesto non esiste o non hai i permessi per eliminarlo'
      });
    }

    // Non permettere eliminazione se il rendiconto è già stato inviato
    if (rendiconto.stato === 'inviato') {
      return res.status(400).json({
        error: 'Eliminazione non consentita',
        message: 'Non è possibile eliminare un rendiconto già inviato'
      });
    }

    await Rendiconto.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Rendiconto eliminato con successo'
    });

  } catch (error) {
    console.error('Errore eliminazione rendiconto:', error);
    res.status(500).json({
      error: 'Errore durante l\'eliminazione del rendiconto',
      message: error.message
    });
  }
});

// @route   GET /api/rendiconti/:id/completezza
// @desc    Verifica completezza rendiconto
// @access  Private
router.get('/:id/completezza', [
  param('id').isMongoId().withMessage('ID rendiconto non valido')
], handleValidationErrors, async (req, res) => {
  try {
    const rendiconto = await Rendiconto.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!rendiconto) {
      return res.status(404).json({
        error: 'Rendiconto non trovato'
      });
    }

    const completezza = rendiconto.isCompleto();

    res.json({
      completezza: completezza.completo,
      errori: completezza.errori,
      totali: {
        patrimonio: rendiconto.totalePatrimonio,
        entrate: rendiconto.totaleEntrate,
        uscite: rendiconto.totaleUscite,
        differenza: rendiconto.differenzaEntrateUscite
      }
    });

  } catch (error) {
    console.error('Errore verifica completezza:', error);
    res.status(500).json({
      error: 'Errore durante la verifica della completezza',
      message: error.message
    });
  }
});

module.exports = router; 