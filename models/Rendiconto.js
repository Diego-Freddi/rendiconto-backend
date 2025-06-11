const mongoose = require('mongoose');

// Schema per i beni (immobili, mobili, titoli/conti)
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

// Schema per le entrate
const entrataSchema = new mongoose.Schema({
  categoria: {
    type: String,
    required: [true, 'La categoria è obbligatoria'],
    trim: true
  },
  descrizione: {
    type: String,
    required: [true, 'La descrizione è obbligatoria'],
    trim: true,
    maxlength: [300, 'La descrizione non può superare i 300 caratteri']
  },
  importo: {
    type: Number,
    required: [true, 'L\'importo è obbligatorio'],
    min: [0, 'L\'importo non può essere negativo']
  }
}, { _id: true });

// Schema per le uscite
const uscitaSchema = new mongoose.Schema({
  categoria: {
    type: String,
    required: [true, 'La categoria è obbligatoria'],
    trim: true
  },
  descrizione: {
    type: String,
    trim: true,
    maxlength: [300, 'La descrizione non può superare i 300 caratteri']
  },
  importo: {
    type: Number,
    required: [true, 'L\'importo è obbligatorio'],
    min: [0, 'L\'importo non può essere negativo']
  }
}, { _id: true });

// Schema principale del rendiconto
const rendicontoSchema = new mongoose.Schema({
  // Riferimento all'utente (amministratore)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utente è obbligatorio']
  },
  
  // Riferimento al beneficiario
  beneficiarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiario',
    required: [true, 'Il beneficiario è obbligatorio']
  },
  
  // Dati generali
  datiGenerali: {
    dataInizio: {
      type: Date,
      required: [true, 'La data di inizio è obbligatoria']
    },
    dataFine: {
      type: Date,
      required: [true, 'La data di fine è obbligatoria']
    },
    anno: {
      type: Number,
      // Calcolato automaticamente dalla dataInizio
      min: [2000, 'Anno non valido'],
      max: [new Date().getFullYear() + 1, 'Anno non può essere futuro']
    },
    rg_numero: {
      type: String,
      required: [true, 'Il numero R.G. è obbligatorio'],
      trim: true,
      maxlength: [50, 'Il numero R.G. non può superare i 50 caratteri']
    }
  },
  
  // NOTA: condizioniPersonali e situazionePatrimoniale sono ora nel modello Beneficiario
  
  // Conto economico
  contoEconomico: {
    entrate: [entrataSchema],
    uscite: [uscitaSchema]
  },
  
  // Firma e data
  firma: {
    dichiarazioneVeridicita: {
      type: Boolean,
      default: false
    },
    consensoTrattamento: {
      type: Boolean,
      default: false
    },
    firmaAmministratore: {
      type: Boolean,
      default: false
    },
    luogo: {
      type: String,
      trim: true,
      maxlength: [100, 'Il luogo non può superare i 100 caratteri']
    },
    data: {
      type: Date
    },
    noteAggiuntive: {
      type: String,
      trim: true,
      maxlength: [1000, 'Le note non possono superare i 1000 caratteri']
    },
    firmaDigitale: {
      immagine: {
        type: String, // Path dell'immagine firma
        trim: true
      },
      dataApplicazione: {
        type: Date
      },
      amministratore: {
        type: String, // Nome completo dell'amministratore
        trim: true
      }
    },
    tipoSalvataggio: {
      type: String,
      enum: ['bozza', 'definitivo', 'pdf']
    }
  },
  
  // Stato del rendiconto
  stato: {
    type: String,
    enum: ['bozza', 'completato', 'inviato'],
    default: 'bozza'
  },
  
  // Metadati
  note: {
    type: String,
    trim: true,
    maxlength: [1000, 'Le note non possono superare i 1000 caratteri']
  }
}, {
  timestamps: true
});

// Indici per performance
rendicontoSchema.index({ userId: 1, beneficiarioId: 1, 'datiGenerali.anno': -1 });
rendicontoSchema.index({ beneficiarioId: 1, 'datiGenerali.dataInizio': -1 });
rendicontoSchema.index({ stato: 1 });
rendicontoSchema.index({ createdAt: -1 });

// Virtual per periodo formattato
rendicontoSchema.virtual('periodoFormattato').get(function() {
  if (!this.datiGenerali?.dataInizio || !this.datiGenerali?.dataFine) return '';
  
  const inizio = this.datiGenerali.dataInizio.toLocaleDateString('it-IT');
  const fine = this.datiGenerali.dataFine.toLocaleDateString('it-IT');
  return `${inizio} - ${fine}`;
});

// NOTA: totalePatrimonio ora è calcolato dal modello Beneficiario tramite populate

// Virtual per calcolo totale entrate
rendicontoSchema.virtual('totaleEntrate').get(function() {
  if (!this.contoEconomico || !this.contoEconomico.entrate) return 0;
  return this.contoEconomico.entrate.reduce((sum, entrata) => sum + (entrata.importo || 0), 0);
});

// Virtual per calcolo totale uscite
rendicontoSchema.virtual('totaleUscite').get(function() {
  if (!this.contoEconomico || !this.contoEconomico.uscite) return 0;
  return this.contoEconomico.uscite.reduce((sum, uscita) => sum + (uscita.importo || 0), 0);
});

// Virtual per calcolo differenza entrate/uscite
rendicontoSchema.virtual('differenzaEntrateUscite').get(function() {
  return this.totaleEntrate - this.totaleUscite;
});

// Middleware per calcolare automaticamente l'anno dalla data di inizio
rendicontoSchema.pre('save', function(next) {
  if (this.datiGenerali?.dataInizio) {
    this.datiGenerali.anno = this.datiGenerali.dataInizio.getFullYear();
  }
  next();
});

// Metodo per verificare completezza del rendiconto
rendicontoSchema.methods.isCompleto = function() {
  const errori = [];
  
  // Verifica dati obbligatori
  if (!this.datiGenerali?.dataInizio || !this.datiGenerali?.dataFine || !this.datiGenerali?.rg_numero) {
    errori.push('Dati generali incompleti');
  }
  
  if (!this.beneficiarioId) {
    errori.push('Beneficiario non selezionato');
  }
  
  if (!this.firma?.luogo || !this.firma?.data) {
    errori.push('Dati firma incompleti');
  }
  
  // Verifica che la data di fine sia successiva alla data di inizio
  if (this.datiGenerali?.dataInizio && this.datiGenerali?.dataFine) {
    if (this.datiGenerali.dataFine <= this.datiGenerali.dataInizio) {
      errori.push('La data di fine deve essere successiva alla data di inizio');
    }
  }
  
  return {
    completo: errori.length === 0,
    errori: errori
  };
};

// Middleware per aggiornare stato automaticamente (commentato per gestione manuale)
// rendicontoSchema.pre('save', function(next) {
//   const completezza = this.isCompleto();
//   if (completezza.completo && this.stato === 'bozza') {
//     this.stato = 'completato';
//   }
//   next();
// });

// Assicurati che i virtual siano inclusi nel JSON
rendicontoSchema.set('toJSON', { virtuals: true });
rendicontoSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Rendiconto', rendicontoSchema); 