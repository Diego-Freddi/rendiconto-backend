const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

const router = express.Router();

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

// Genera JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'rendiconto-jwt-secret',
    { expiresIn: '7d' }
  );
};

// @route   POST /api/auth/register
// @desc    Registrazione nuovo utente
// @access  Public
router.post('/register', [
  body('nome')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Il nome deve essere tra 2 e 50 caratteri'),
  body('cognome')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Il cognome deve essere tra 2 e 50 caratteri'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Inserisci un\'email valida'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La password deve essere di almeno 6 caratteri'),
  body('codiceFiscale')
    .matches(/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/)
    .withMessage('Inserisci un codice fiscale valido'),
  body('telefono')
    .optional()
    .matches(/^[\+]?[0-9\s\-\(\)]{8,15}$/)
    .withMessage('Inserisci un numero di telefono valido')
], handleValidationErrors, async (req, res) => {
  try {
    const { nome, cognome, email, password, codiceFiscale, telefono, indirizzo, ruolo } = req.body;

    // Verifica se l'utente esiste già
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { codiceFiscale: codiceFiscale.toUpperCase() }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Utente già esistente',
        message: 'Email o codice fiscale già registrati'
      });
    }

    // Crea nuovo utente
    const user = new User({
      nome,
      cognome,
      email: email.toLowerCase(),
      password,
      codiceFiscale: codiceFiscale.toUpperCase(),
      telefono,
      indirizzo,
      ruolo: ruolo || 'amministratore'
    });

    await user.save();

    // Genera token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Utente registrato con successo',
      token,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Errore registrazione:', error);
    res.status(500).json({
      error: 'Errore durante la registrazione',
      message: error.message
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login utente
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Inserisci un\'email valida'),
  body('password')
    .notEmpty()
    .withMessage('La password è obbligatoria')
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Trova utente per email
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    });

    if (!user) {
      return res.status(401).json({
        error: 'Credenziali non valide',
        message: 'Email o password errati'
      });
    }

    // Verifica password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Credenziali non valide',
        message: 'Email o password errati'
      });
    }

    // Aggiorna ultimo login
    user.lastLogin = new Date();
    await user.save();

    // Genera token
    const token = generateToken(user._id);

    res.json({
      message: 'Login effettuato con successo',
      token,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Errore login:', error);
    res.status(500).json({
      error: 'Errore durante il login',
      message: error.message
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout utente
// @access  Private
router.post('/logout', (req, res) => {
  // Con JWT stateless, il logout è gestito lato client
  // rimuovendo il token dal localStorage
  res.json({
    message: 'Logout effettuato con successo'
  });
});

// @route   GET /api/auth/me
// @desc    Ottieni dati utente corrente
// @access  Private
router.get('/me', async (req, res) => {
  try {
    // Il middleware di autenticazione dovrebbe aver già verificato il token
    // e aggiunto req.user
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'Token non fornito',
        message: 'Accesso negato'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rendiconto-jwt-secret');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Utente non trovato',
        message: 'Token non valido'
      });
    }

    res.json({
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Errore verifica token:', error);
    res.status(401).json({
      error: 'Token non valido',
      message: 'Accesso negato'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Aggiorna profilo utente
// @access  Private
router.put('/profile', [
  body('nome')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Il nome deve essere tra 2 e 50 caratteri'),
  body('cognome')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Il cognome deve essere tra 2 e 50 caratteri'),
  body('telefono')
    .optional()
    .matches(/^[\+]?[0-9\s\-\(\)]{8,15}$/)
    .withMessage('Inserisci un numero di telefono valido')
], handleValidationErrors, async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rendiconto-jwt-secret');
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        error: 'Utente non trovato'
      });
    }

    // Aggiorna solo i campi forniti
    const allowedUpdates = ['nome', 'cognome', 'telefono', 'indirizzo'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    res.json({
      message: 'Profilo aggiornato con successo',
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Errore aggiornamento profilo:', error);
    res.status(500).json({
      error: 'Errore durante l\'aggiornamento del profilo',
      message: error.message
    });
  }
});

module.exports = router; 