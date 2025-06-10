const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Il nome è obbligatorio'],
    trim: true,
    maxlength: [50, 'Il nome non può superare i 50 caratteri']
  },
  cognome: {
    type: String,
    required: [true, 'Il cognome è obbligatorio'],
    trim: true,
    maxlength: [50, 'Il cognome non può superare i 50 caratteri']
  },
  email: {
    type: String,
    required: [true, 'L\'email è obbligatoria'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Inserisci un\'email valida']
  },
  password: {
    type: String,
    required: [true, 'La password è obbligatoria'],
    minlength: [6, 'La password deve essere di almeno 6 caratteri']
  },
  codiceFiscale: {
    type: String,
    required: [true, 'Il codice fiscale è obbligatorio'],
    uppercase: true,
    trim: true,
    match: [/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/, 'Inserisci un codice fiscale valido']
  },
  telefono: {
    type: String,
    trim: true,
    match: [/^[\+]?[0-9\s\-\(\)]{8,15}$/, 'Inserisci un numero di telefono valido']
  },
  indirizzo: {
    via: String,
    citta: String,
    cap: String,
    provincia: String
  },
  ruolo: {
    type: String,
    enum: ['amministratore', 'tutore'],
    default: 'amministratore'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

// Indici per performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ codiceFiscale: 1 }, { unique: true });

// Hash password prima del salvataggio
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Metodo per confrontare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Metodo per ottenere nome completo
userSchema.virtual('nomeCompleto').get(function() {
  return `${this.nome} ${this.cognome}`;
});

// Rimuovi password dal JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpires;
  return userObject;
};

module.exports = mongoose.model('User', userSchema); 