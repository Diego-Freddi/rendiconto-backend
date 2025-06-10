const mongoose = require('mongoose');

const categoriaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Il nome della categoria è obbligatorio'],
    trim: true,
    uppercase: true,
    maxlength: [50, 'Il nome della categoria non può superare i 50 caratteri']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return !this.isDefault;
    }
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  descrizione: {
    type: String,
    trim: true,
    maxlength: [200, 'La descrizione non può superare i 200 caratteri']
  },
  colore: {
    type: String,
    trim: true,
    match: [/^#[0-9A-F]{6}$/i, 'Inserisci un colore esadecimale valido'],
    default: '#6c757d'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indici per performance
categoriaSchema.index({ userId: 1, nome: 1 }, { unique: true });
categoriaSchema.index({ isDefault: 1 });
categoriaSchema.index({ isActive: 1 });

// Indice composto per evitare duplicati di categorie default
categoriaSchema.index({ nome: 1, isDefault: 1 }, { 
  unique: true,
  partialFilterExpression: { isDefault: true }
});

// Metodo statico per ottenere categorie default
categoriaSchema.statics.getCategorieDefault = function() {
  return this.find({ isDefault: true, isActive: true }).sort({ nome: 1 });
};

// Metodo statico per ottenere categorie di un utente (default + personalizzate)
categoriaSchema.statics.getCategorieUtente = function(userId) {
  return this.find({
    $or: [
      { isDefault: true, isActive: true },
      { userId: userId, isActive: true }
    ]
  }).sort({ isDefault: -1, nome: 1 });
};

// Metodo per verificare se la categoria può essere eliminata
categoriaSchema.methods.canDelete = function() {
  return !this.isDefault;
};

// Middleware per validazione
categoriaSchema.pre('save', function(next) {
  // Se è una categoria default, non deve avere userId
  if (this.isDefault && this.userId) {
    this.userId = undefined;
  }
  
  // Se non è default, deve avere userId
  if (!this.isDefault && !this.userId) {
    return next(new Error('Le categorie personalizzate devono avere un userId'));
  }
  
  next();
});

// Rimuovi userId dal JSON output per categorie default
categoriaSchema.methods.toJSON = function() {
  const categoriaObject = this.toObject();
  if (this.isDefault) {
    delete categoriaObject.userId;
  }
  return categoriaObject;
};

module.exports = mongoose.model('Categoria', categoriaSchema); 