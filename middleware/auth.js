const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware per verificare il token JWT
const authenticateToken = async (req, res, next) => {
  try {
    // Ottieni token dall'header Authorization
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : null;

    if (!token) {
      return res.status(401).json({
        error: 'Token non fornito',
        message: 'Accesso negato. Token di autenticazione richiesto.'
      });
    }

    // Verifica token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rendiconto-jwt-secret');
    
    // Trova utente
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Utente non valido',
        message: 'Token non valido o utente disattivato.'
      });
    }

    // Aggiungi utente alla request
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    console.error('Errore autenticazione:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token non valido',
        message: 'Token malformato o non valido.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token scaduto',
        message: 'Il token è scaduto. Effettua nuovamente il login.'
      });
    }

    res.status(500).json({
      error: 'Errore server',
      message: 'Errore durante la verifica del token.'
    });
  }
};

// Middleware per verificare ruoli specifici
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Utente non autenticato',
        message: 'Effettua il login per accedere a questa risorsa.'
      });
    }

    const userRole = req.user.ruolo;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Accesso negato',
        message: `Ruolo '${userRole}' non autorizzato. Ruoli richiesti: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

// Middleware per verificare che l'utente possa accedere solo alle proprie risorse
const requireOwnership = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Utente non autenticato',
        message: 'Effettua il login per accedere a questa risorsa.'
      });
    }

    // Se è presente un parametro userId nell'URL, verifica che corrisponda
    if (req.params.userId && req.params.userId !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Accesso negato',
        message: 'Non puoi accedere alle risorse di altri utenti.'
      });
    }

    // Aggiungi il controllo di ownership che verrà verificato nel controller
    req.ownershipField = resourceUserIdField;
    
    next();
  };
};

// Middleware opzionale per autenticazione (non blocca se non autenticato)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : null;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rendiconto-jwt-secret');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id;
      }
    }
    
    next();
  } catch (error) {
    // In caso di errore, continua senza autenticazione
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireOwnership,
  optionalAuth
}; 