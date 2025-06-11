const mongoose = require('mongoose');

const categoriaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Il nome della categoria è obbligatorio'],
    trim: true,
    uppercase: true,
    maxlength: [50, 'Il nome della categoria non può superare i 50 caratteri']
  },
  tipo: {
    type: String,
    required: [true, 'Il tipo della categoria è obbligatorio'],
    enum: ['ENTRATE', 'USCITE'],
    uppercase: true
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
categoriaSchema.index({ userId: 1, nome: 1, tipo: 1 }, { unique: true });
categoriaSchema.index({ isDefault: 1, tipo: 1 });
categoriaSchema.index({ isActive: 1 });
categoriaSchema.index({ tipo: 1 });

// Indice composto per evitare duplicati di categorie default
categoriaSchema.index({ nome: 1, tipo: 1, isDefault: 1 }, { 
  unique: true,
  partialFilterExpression: { isDefault: true }
});

// Categorie default semplici
const CATEGORIE_DEFAULT = [
  // ENTRATE
  { nome: 'PENSIONE', tipo: 'ENTRATE', descrizione: 'Pensione di vecchiaia, invalidità, reversibilità', colore: '#198754' },
  { nome: 'STIPENDIO/SALARIO', tipo: 'ENTRATE', descrizione: 'Redditi da lavoro dipendente', colore: '#198754' },
  { nome: 'RENDITE IMMOBILIARI', tipo: 'ENTRATE', descrizione: 'Affitti e rendite da immobili', colore: '#fd7e14' },
  { nome: 'DIVIDENDI/INTERESSI', tipo: 'ENTRATE', descrizione: 'Rendimenti finanziari, interessi bancari', colore: '#0d6efd' },
  { nome: 'VENDITA BENI', tipo: 'ENTRATE', descrizione: 'Vendita di beni mobili e immobili', colore: '#ffc107' },
  { nome: 'RIMBORSI', tipo: 'ENTRATE', descrizione: 'Rimborsi spese, assicurazioni, vari', colore: '#20c997' },
  { nome: 'DONAZIONI RICEVUTE', tipo: 'ENTRATE', descrizione: 'Donazioni e lasciti ricevuti', colore: '#e83e8c' },
  
  // USCITE
  { nome: 'SALUTE', tipo: 'USCITE', descrizione: 'Spese mediche, farmaci, visite specialistiche', colore: '#dc3545' },
  { nome: 'CULTURA E TEMPO LIBERO', tipo: 'USCITE', descrizione: 'Libri, corsi, eventi culturali', colore: '#6f42c1' },
  { nome: 'RISTORANTI E LOCALI', tipo: 'USCITE', descrizione: 'Pasti fuori casa, ristoranti, bar', colore: '#fd7e14' },
  { nome: 'VACANZE E SVAGO', tipo: 'USCITE', descrizione: 'Viaggi, soggiorni, attività ricreative', colore: '#20c997' },
  { nome: 'BANCA', tipo: 'USCITE', descrizione: 'Commissioni bancarie, spese finanziarie', colore: '#0d6efd' },
  { nome: 'UFFICIO', tipo: 'USCITE', descrizione: 'Cancelleria, servizi', colore: '#6c757d' },
  { nome: 'CURA DELLA PERSONA', tipo: 'USCITE', descrizione: 'Parrucchiere, estetica', colore: '#e83e8c' },
  { nome: 'ABBIGLIAMENTO', tipo: 'USCITE', descrizione: 'Vestiti, scarpe, accessori', colore: '#198754' },
  { nome: 'AUTO', tipo: 'USCITE', descrizione: 'Carburante, manutenzione, assicurazione auto', colore: '#ffc107' }
];

// Metodo statico per ottenere categorie default per tipo
categoriaSchema.statics.getCategorieDefault = function(tipo = null) {
  const query = { isDefault: true, isActive: true };
  if (tipo) {
    query.tipo = tipo.toUpperCase();
  }
  return this.find(query).sort({ tipo: 1, nome: 1 });
};

// Metodo statico per ottenere categorie di un utente per tipo (default + personalizzate)
categoriaSchema.statics.getCategorieUtente = function(userId, tipo = null) {
  const query = {
    $or: [
      { isDefault: true, isActive: true },
      { userId: userId, isActive: true }
    ]
  };
  
  if (tipo) {
    // Applica il filtro tipo a entrambe le condizioni dell'OR
    query.$or[0].tipo = tipo.toUpperCase();
    query.$or[1].tipo = tipo.toUpperCase();
  }
  
  return this.find(query).sort({ isDefault: -1, tipo: 1, nome: 1 });
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

// Metodo statico per inizializzare categorie default (chiamato all'avvio del server)
categoriaSchema.statics.initializeDefaults = async function() {
  try {
    const count = await this.countDocuments({ isDefault: true });
    
    if (count === 0) {
      console.log('🔄 Inizializzazione categorie default...');
      const categorieDefault = CATEGORIE_DEFAULT.map(cat => ({ ...cat, isDefault: true }));
      await this.insertMany(categorieDefault);
      console.log(`✅ ${categorieDefault.length} categorie default create`);
    }
  } catch (error) {
    console.error('❌ Errore inizializzazione categorie default:', error);
  }
};

module.exports = mongoose.model('Categoria', categoriaSchema); 