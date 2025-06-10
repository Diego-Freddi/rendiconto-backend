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
  body('datiGenerali.anno')
    .isInt({ min: 2000, max: new Date().getFullYear() + 1 })
    .withMessage('Anno non valido'),
  body('datiGenerali.mese')
    .isIn(['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
           'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'])
    .withMessage('Mese non valido'),
  body('datiGenerali.rg_numero')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Numero R.G. obbligatorio (max 50 caratteri)'),
  body('datiGenerali.beneficiario.nome')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Nome beneficiario obbligatorio (max 50 caratteri)'),
  body('datiGenerali.beneficiario.cognome')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Cognome beneficiario obbligatorio (max 50 caratteri)'),
  body('datiGenerali.beneficiario.codiceFiscale')
    .matches(/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/)
    .withMessage('Codice fiscale beneficiario non valido'),
  body('datiGenerali.amministratore.nome')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Nome amministratore obbligatorio (max 50 caratteri)'),
  body('datiGenerali.amministratore.cognome')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Cognome amministratore obbligatorio (max 50 caratteri)'),
  body('datiGenerali.amministratore.codiceFiscale')
    .matches(/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/)
    .withMessage('Codice fiscale amministratore non valido')
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

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filters.$or = [
        { 'datiGenerali.beneficiario.nome': searchRegex },
        { 'datiGenerali.beneficiario.cognome': searchRegex },
        { 'datiGenerali.rg_numero': searchRegex }
      ];
    }

    // Ottieni rendiconti con paginazione
    const rendiconti = await Rendiconto.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('datiGenerali stato situazionePatrimoniale contoEconomico createdAt updatedAt');

    // Conta totale per paginazione
    const total = await Rendiconto.countDocuments(filters);

    res.json({
      rendiconti,
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
    });

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
    // Verifica se esiste già un rendiconto per lo stesso anno/mese/beneficiario
    const existingRendiconto = await Rendiconto.findOne({
      userId: req.userId,
      'datiGenerali.anno': req.body.datiGenerali.anno,
      'datiGenerali.mese': req.body.datiGenerali.mese,
      'datiGenerali.beneficiario.codiceFiscale': req.body.datiGenerali.beneficiario.codiceFiscale.toUpperCase()
    });

    if (existingRendiconto) {
      return res.status(400).json({
        error: 'Rendiconto già esistente',
        message: `Esiste già un rendiconto per ${req.body.datiGenerali.mese} ${req.body.datiGenerali.anno} per questo beneficiario`
      });
    }

    // Prepara i dati con codici fiscali normalizzati
    const rendicontoData = {
      ...req.body,
      userId: req.userId
    };

    // Normalizza codici fiscali
    if (rendicontoData.datiGenerali?.beneficiario?.codiceFiscale) {
      rendicontoData.datiGenerali.beneficiario.codiceFiscale = 
        rendicontoData.datiGenerali.beneficiario.codiceFiscale.toUpperCase();
    }
    if (rendicontoData.datiGenerali?.amministratore?.codiceFiscale) {
      rendicontoData.datiGenerali.amministratore.codiceFiscale = 
        rendicontoData.datiGenerali.amministratore.codiceFiscale.toUpperCase();
    }

    // Crea nuovo rendiconto
    const rendiconto = new Rendiconto(rendicontoData);

    await rendiconto.save();

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

    // Aggiorna i campi
    Object.keys(req.body).forEach(key => {
      if (key !== 'userId') { // Non permettere modifica dell'userId
        rendiconto[key] = req.body[key];
      }
    });

    // Normalizza codici fiscali
    if (req.body.datiGenerali?.beneficiario?.codiceFiscale) {
      rendiconto.datiGenerali.beneficiario.codiceFiscale = req.body.datiGenerali.beneficiario.codiceFiscale.toUpperCase();
    }
    if (req.body.datiGenerali?.amministratore?.codiceFiscale) {
      rendiconto.datiGenerali.amministratore.codiceFiscale = req.body.datiGenerali.amministratore.codiceFiscale.toUpperCase();
    }

    await rendiconto.save();

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
    if (!rendiconto.datiGenerali?.anno) completezza.errori.push('Anno mancante');
    if (!rendiconto.datiGenerali?.mese) completezza.errori.push('Mese mancante');
    if (!rendiconto.datiGenerali?.rg_numero) completezza.errori.push('R.G. mancante');
    if (!rendiconto.datiGenerali?.beneficiario?.nome) completezza.errori.push('Nome beneficiario mancante');
    if (!rendiconto.datiGenerali?.beneficiario?.cognome) completezza.errori.push('Cognome beneficiario mancante');
    if (!rendiconto.datiGenerali?.beneficiario?.codiceFiscale) completezza.errori.push('Codice fiscale beneficiario mancante');

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