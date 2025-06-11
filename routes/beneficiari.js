const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Beneficiario = require('../models/Beneficiario');
const Rendiconto = require('../models/Rendiconto');
const { authenticateToken: auth } = require('../middleware/auth');

// Middleware di validazione per beneficiario
const validateBeneficiario = [
  body('nome')
    .trim()
    .notEmpty()
    .withMessage('Il nome è obbligatorio')
    .isLength({ max: 50 })
    .withMessage('Il nome non può superare i 50 caratteri'),
  
  body('cognome')
    .trim()
    .notEmpty()
    .withMessage('Il cognome è obbligatorio')
    .isLength({ max: 50 })
    .withMessage('Il cognome non può superare i 50 caratteri'),
  
  body('codiceFiscale')
    .trim()
    .notEmpty()
    .withMessage('Il codice fiscale è obbligatorio')
    .matches(/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/)
    .withMessage('Formato codice fiscale non valido'),
  
  body('dataNascita')
    .isISO8601()
    .withMessage('Data di nascita non valida'),
  
  body('luogoNascita')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Il luogo di nascita non può superare i 100 caratteri'),
  
  body('indirizzo.via')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La via non può superare i 200 caratteri'),
  
  body('indirizzo.citta')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La città non può superare i 100 caratteri'),
  
  body('indirizzo.cap')
    .optional()
    .trim()
    .matches(/^[0-9]{5}$/)
    .withMessage('Il CAP deve essere di 5 cifre'),
  
  body('indirizzo.provincia')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('La provincia deve essere di 2 caratteri'),
  
  body('note')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Le note non possono superare i 1000 caratteri'),
  
  // Validazioni per i nuovi campi
  body('condizioniPersonali')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Le condizioni personali non possono superare i 5000 caratteri'),
  
  // Validazioni per situazione patrimoniale
  body('situazionePatrimoniale.beniImmobili')
    .optional()
    .isArray()
    .withMessage('I beni immobili devono essere un array'),
  
  body('situazionePatrimoniale.beniImmobili.*.descrizione')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La descrizione del bene non può superare i 500 caratteri'),
  
  body('situazionePatrimoniale.beniImmobili.*.valore')
    .optional()
    .isNumeric({ min: 0 })
    .withMessage('Il valore deve essere un numero positivo'),
  
  body('situazionePatrimoniale.beniMobili')
    .optional()
    .isArray()
    .withMessage('I beni mobili devono essere un array'),
  
  body('situazionePatrimoniale.beniMobili.*.descrizione')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La descrizione del bene non può superare i 500 caratteri'),
  
  body('situazionePatrimoniale.beniMobili.*.valore')
    .optional()
    .isNumeric({ min: 0 })
    .withMessage('Il valore deve essere un numero positivo'),
  
  body('situazionePatrimoniale.titoliConti')
    .optional()
    .isArray()
    .withMessage('I titoli/conti devono essere un array'),
  
  body('situazionePatrimoniale.titoliConti.*.descrizione')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La descrizione del titolo/conto non può superare i 500 caratteri'),
  
  body('situazionePatrimoniale.titoliConti.*.valore')
    .optional()
    .isNumeric({ min: 0 })
    .withMessage('Il valore deve essere un numero positivo')
];

// GET /api/beneficiari - Lista beneficiari dell'amministratore
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', attivi = 'true' } = req.query;
    
    // Costruisci filtri
    const filtri = { 
      userId: req.user.id,
      isActive: attivi === 'true'
    };
    
    // Aggiungi ricerca per nome, cognome o codice fiscale
    if (search) {
      filtri.$or = [
        { nome: { $regex: search, $options: 'i' } },
        { cognome: { $regex: search, $options: 'i' } },
        { codiceFiscale: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calcola skip per paginazione
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Query con paginazione
    const beneficiari = await Beneficiario.find(filtri)
      .sort({ cognome: 1, nome: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Conta totale per paginazione
    const totale = await Beneficiario.countDocuments(filtri);
    
    res.json({
      success: true,
      data: beneficiari,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totale / parseInt(limit)),
        totalItems: totale,
        itemsPerPage: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Errore nel recupero beneficiari:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
    });
  }
});

// GET /api/beneficiari/:id - Dettaglio beneficiario
router.get('/:id', auth, async (req, res) => {
  try {
    const beneficiario = await Beneficiario.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!beneficiario) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiario non trovato'
      });
    }
    
    res.json({
      success: true,
      data: beneficiario
    });
    
  } catch (error) {
    console.error('Errore nel recupero beneficiario:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
    });
  }
});

// POST /api/beneficiari - Crea nuovo beneficiario
router.post('/', auth, validateBeneficiario, async (req, res) => {
  try {
    // Verifica errori di validazione
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dati non validi',
        errors: errors.array()
      });
    }
    
    // Crea nuovo beneficiario
    const beneficiario = new Beneficiario({
      ...req.body,
      userId: req.user.id
    });
    
    await beneficiario.save();
    
    res.status(201).json({
      success: true,
      message: 'Beneficiario creato con successo',
      data: beneficiario
    });
    
  } catch (error) {
    console.error('Errore nella creazione beneficiario:', error);
    
    // Gestisci errore di duplicato codice fiscale
    if (error.message.includes('codice fiscale')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
    });
  }
});

// PUT /api/beneficiari/:id - Aggiorna beneficiario
router.put('/:id', auth, validateBeneficiario, async (req, res) => {
  try {
    // Verifica errori di validazione
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dati non validi',
        errors: errors.array()
      });
    }
    
    const beneficiario = await Beneficiario.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!beneficiario) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiario non trovato'
      });
    }
    
    res.json({
      success: true,
      message: 'Beneficiario aggiornato con successo',
      data: beneficiario
    });
    
  } catch (error) {
    console.error('Errore nell\'aggiornamento beneficiario:', error);
    
    // Gestisci errore di duplicato codice fiscale
    if (error.message.includes('codice fiscale')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
    });
  }
});

// DELETE /api/beneficiari/:id - Elimina beneficiario (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const beneficiario = await Beneficiario.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!beneficiario) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiario non trovato'
      });
    }
    
    // Verifica se ci sono rendiconti associati
    const rendicontiAssociati = await Rendiconto.countDocuments({
      beneficiarioId: req.params.id
    });
    
    if (rendicontiAssociati > 0) {
      // Soft delete se ci sono rendiconti associati
      beneficiario.isActive = false;
      await beneficiario.save();
      
      return res.json({
        success: true,
        message: 'Beneficiario disattivato con successo (ha rendiconti associati)'
      });
    } else {
      // Hard delete se non ci sono rendiconti associati
      await Beneficiario.findByIdAndDelete(req.params.id);
      
      return res.json({
        success: true,
        message: 'Beneficiario eliminato con successo'
      });
    }
    
  } catch (error) {
    console.error('Errore nell\'eliminazione beneficiario:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
    });
  }
});

// GET /api/beneficiari/:id/rendiconti - Lista rendiconti del beneficiario
router.get('/:id/rendiconti', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    // Verifica che il beneficiario appartenga all'amministratore
    const beneficiario = await Beneficiario.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!beneficiario) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiario non trovato'
      });
    }
    
    // Calcola skip per paginazione
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Query rendiconti
    const rendiconti = await Rendiconto.find({
      beneficiarioId: req.params.id,
      userId: req.user.id
    })
      .sort({ 'datiGenerali.dataInizio': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('beneficiarioId', 'nome cognome codiceFiscale');
    
    // Conta totale
    const totale = await Rendiconto.countDocuments({
      beneficiarioId: req.params.id,
      userId: req.user.id
    });
    
    res.json({
      success: true,
      data: rendiconti,
      beneficiario: beneficiario,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totale / parseInt(limit)),
        totalItems: totale,
        itemsPerPage: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Errore nel recupero rendiconti beneficiario:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
    });
  }
});

// PUT /api/beneficiari/:id/attiva - Riattiva beneficiario
router.put('/:id/attiva', auth, async (req, res) => {
  try {
    const beneficiario = await Beneficiario.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isActive: true },
      { new: true }
    );
    
    if (!beneficiario) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiario non trovato'
      });
    }
    
    res.json({
      success: true,
      message: 'Beneficiario riattivato con successo',
      data: beneficiario
    });
    
  } catch (error) {
    console.error('Errore nella riattivazione beneficiario:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
    });
  }
});

module.exports = router; 