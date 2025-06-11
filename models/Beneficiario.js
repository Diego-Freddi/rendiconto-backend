const mongoose = require('mongoose');

// Schema per i beni (immobili, mobili, titoli/conti) - copiato da Rendiconto
const beneSchema = new mongoose.Schema({
  descrizione: {
    type: String,
    required: [true, 'La descrizione è obbligatoria'],
    trim: true,
    maxlength: [500, 'La descrizione non può superare i 500 caratteri']
  },
  valore: {
    type: Number,
    required: [true, 'Il valore è obbligatorio'],
    min: [0, 'Il valore non può essere negativo']
  }
}, { _id: true });

const beneficiarioSchema = new mongoose.Schema({
  // Riferimento all'amministratore che gestisce questo beneficiario
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'amministratore è obbligatorio']
  },
  
  // Dati anagrafici del beneficiario
  nome: {
    type: String,
    required: [true, 'Il nome del beneficiario è obbligatorio'],
    trim: true,
    maxlength: [50, 'Il nome non può superare i 50 caratteri']
  },
  cognome: {
    type: String,
    required: [true, 'Il cognome del beneficiario è obbligatorio'],
    trim: true,
    maxlength: [50, 'Il cognome non può superare i 50 caratteri']
  },
  codiceFiscale: {
    type: String,
    required: [true, 'Il codice fiscale del beneficiario è obbligatorio'],
    uppercase: true,
    trim: true,
    match: [/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/, 'Inserisci un codice fiscale valido']
  },
  dataNascita: {
    type: Date,
    required: [true, 'La data di nascita è obbligatoria']
  },
  luogoNascita: {
    type: String,
    trim: true,
    maxlength: [100, 'Il luogo di nascita non può superare i 100 caratteri']
  },
  
  // Indirizzo di residenza
  indirizzo: {
    via: {
      type: String,
      trim: true,
      maxlength: [200, 'La via non può superare i 200 caratteri']
    },
    citta: {
      type: String,
      trim: true,
      maxlength: [100, 'La città non può superare i 100 caratteri']
    },
    cap: {
      type: String,
      trim: true,
      match: [/^[0-9]{5}$/, 'Inserisci un CAP valido (5 cifre)']
    },
    provincia: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [2, 'La provincia deve essere di 2 caratteri'],
      minlength: [2, 'La provincia deve essere di 2 caratteri']
    }
  },
  
  // Note specifiche del beneficiario
  note: {
    type: String,
    trim: true,
    maxlength: [1000, 'Le note non possono superare i 1000 caratteri']
  },
  
  // Condizioni personali del beneficiario (spostato da Rendiconto)
  condizioniPersonali: {
    type: String,
    trim: true,
    maxlength: [5000, 'Le condizioni personali non possono superare i 5000 caratteri']
  },
  
  // Situazione patrimoniale (spostata da Rendiconto)
  situazionePatrimoniale: {
    beniImmobili: [beneSchema],
    beniMobili: [beneSchema],
    titoliConti: [beneSchema]
  },
  
  // Stato attivo/inattivo per soft delete
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indici per performance e unicità
beneficiarioSchema.index({ userId: 1, codiceFiscale: 1 }, { unique: true });
beneficiarioSchema.index({ userId: 1, isActive: 1 });
beneficiarioSchema.index({ codiceFiscale: 1 });

// Virtual per nome completo
beneficiarioSchema.virtual('nomeCompleto').get(function() {
  return `${this.nome} ${this.cognome}`;
});

// Virtual per indirizzo completo
beneficiarioSchema.virtual('indirizzoCompleto').get(function() {
  if (!this.indirizzo) return '';
  
  const parti = [];
  if (this.indirizzo.via) parti.push(this.indirizzo.via);
  if (this.indirizzo.cap && this.indirizzo.citta) {
    parti.push(`${this.indirizzo.cap} ${this.indirizzo.citta}`);
  } else if (this.indirizzo.citta) {
    parti.push(this.indirizzo.citta);
  }
  if (this.indirizzo.provincia) parti.push(`(${this.indirizzo.provincia})`);
  
  return parti.join(', ');
});

// Metodo per formattare data di nascita
beneficiarioSchema.methods.getDataNascitaFormatted = function() {
  if (!this.dataNascita) return '';
  return this.dataNascita.toLocaleDateString('it-IT');
};

// Metodo per calcolare età
beneficiarioSchema.methods.getEta = function() {
  if (!this.dataNascita) return null;
  
  const oggi = new Date();
  const nascita = new Date(this.dataNascita);
  let eta = oggi.getFullYear() - nascita.getFullYear();
  
  const meseDiff = oggi.getMonth() - nascita.getMonth();
  if (meseDiff < 0 || (meseDiff === 0 && oggi.getDate() < nascita.getDate())) {
    eta--;
  }
  
  return eta;
};

// Virtual per calcolo totale patrimonio
beneficiarioSchema.virtual('totalePatrimonio').get(function() {
  if (!this.situazionePatrimoniale) return 0;
  
  const totaleImmobili = (this.situazionePatrimoniale.beniImmobili || []).reduce((sum, bene) => sum + (bene.valore || 0), 0);
  const totaleMobili = (this.situazionePatrimoniale.beniMobili || []).reduce((sum, bene) => sum + (bene.valore || 0), 0);
  const totaleTitoli = (this.situazionePatrimoniale.titoliConti || []).reduce((sum, bene) => sum + (bene.valore || 0), 0);
  return totaleImmobili + totaleMobili + totaleTitoli;
});

// Virtual per totali per categoria
beneficiarioSchema.virtual('totaleImmobili').get(function() {
  if (!this.situazionePatrimoniale?.beniImmobili) return 0;
  return this.situazionePatrimoniale.beniImmobili.reduce((sum, bene) => sum + (bene.valore || 0), 0);
});

beneficiarioSchema.virtual('totaleMobili').get(function() {
  if (!this.situazionePatrimoniale?.beniMobili) return 0;
  return this.situazionePatrimoniale.beniMobili.reduce((sum, bene) => sum + (bene.valore || 0), 0);
});

beneficiarioSchema.virtual('totaleTitoli').get(function() {
  if (!this.situazionePatrimoniale?.titoliConti) return 0;
  return this.situazionePatrimoniale.titoliConti.reduce((sum, bene) => sum + (bene.valore || 0), 0);
});

// Middleware per validazione codice fiscale unico per amministratore
beneficiarioSchema.pre('save', async function(next) {
  if (!this.isModified('codiceFiscale') && !this.isNew) return next();
  
  try {
    const esistente = await this.constructor.findOne({
      userId: this.userId,
      codiceFiscale: this.codiceFiscale,
      _id: { $ne: this._id },
      isActive: true
    });
    
    if (esistente) {
      const error = new Error('Esiste già un beneficiario attivo con questo codice fiscale');
      error.name = 'ValidationError';
      return next(error);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Assicurati che i virtual siano inclusi nel JSON
beneficiarioSchema.set('toJSON', { virtuals: true });
beneficiarioSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Beneficiario', beneficiarioSchema); 