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
  
  // Dati generali
  datiGenerali: {
    anno: {
      type: Number,
      required: [true, 'L\'anno è obbligatorio'],
      min: [2000, 'Anno non valido'],
      max: [new Date().getFullYear() + 1, 'Anno non può essere futuro']
    },
    mese: {
      type: String,
      required: [true, 'Il mese è obbligatorio'],
      enum: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
             'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
    },
    rg_numero: {
      type: String,
      required: [true, 'Il numero R.G. è obbligatorio'],
      trim: true,
      maxlength: [50, 'Il numero R.G. non può superare i 50 caratteri']
    },
    
    // Dati beneficiario/interdetto
    beneficiario: {
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
      indirizzo: {
        via: String,
        citta: String,
        cap: String,
        provincia: String
      }
    },
    
    // Dati amministratore di sostegno/tutore
    amministratore: {
      nome: {
        type: String,
        required: [true, 'Il nome dell\'amministratore è obbligatorio'],
        trim: true,
        maxlength: [50, 'Il nome non può superare i 50 caratteri']
      },
      cognome: {
        type: String,
        required: [true, 'Il cognome dell\'amministratore è obbligatorio'],
        trim: true,
        maxlength: [50, 'Il cognome non può superare i 50 caratteri']
      },
      codiceFiscale: {
        type: String,
        required: [true, 'Il codice fiscale dell\'amministratore è obbligatorio'],
        uppercase: true,
        trim: true,
        match: [/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/, 'Inserisci un codice fiscale valido']
      },
      indirizzo: {
        via: String,
        citta: String,
        cap: String,
        provincia: String
      }
    }
  },
  
  // Condizioni personali del beneficiario
  condizioniPersonali: {
    type: String,
    trim: true,
    maxlength: [5000, 'Le condizioni personali non possono superare i 5000 caratteri']
  },
  
  // Situazione patrimoniale
  situazionePatrimoniale: {
    beniImmobili: [beneSchema],
    beniMobili: [beneSchema],
    titoliConti: [beneSchema]
  },
  
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
rendicontoSchema.index({ userId: 1, 'datiGenerali.anno': -1, 'datiGenerali.mese': 1 });
rendicontoSchema.index({ 'datiGenerali.beneficiario.codiceFiscale': 1 });
rendicontoSchema.index({ stato: 1 });
rendicontoSchema.index({ createdAt: -1 });

// Virtual per nome completo beneficiario
rendicontoSchema.virtual('datiGenerali.beneficiario.nomeCompleto').get(function() {
  if (!this.datiGenerali?.beneficiario?.nome || !this.datiGenerali?.beneficiario?.cognome) return '';
  return `${this.datiGenerali.beneficiario.nome} ${this.datiGenerali.beneficiario.cognome}`;
});

// Virtual per nome completo amministratore
rendicontoSchema.virtual('datiGenerali.amministratore.nomeCompleto').get(function() {
  if (!this.datiGenerali?.amministratore?.nome || !this.datiGenerali?.amministratore?.cognome) return '';
  return `${this.datiGenerali.amministratore.nome} ${this.datiGenerali.amministratore.cognome}`;
});

// Virtual per calcolo totale patrimonio
rendicontoSchema.virtual('totalePatrimonio').get(function() {
  if (!this.situazionePatrimoniale) return 0;
  
  const totaleImmobili = (this.situazionePatrimoniale.beniImmobili || []).reduce((sum, bene) => sum + (bene.valore || 0), 0);
  const totaleMobili = (this.situazionePatrimoniale.beniMobili || []).reduce((sum, bene) => sum + (bene.valore || 0), 0);
  const totaleTitoli = (this.situazionePatrimoniale.titoliConti || []).reduce((sum, bene) => sum + (bene.valore || 0), 0);
  return totaleImmobili + totaleMobili + totaleTitoli;
});

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

// Metodo per verificare completezza del rendiconto
rendicontoSchema.methods.isCompleto = function() {
  const errori = [];
  
  // Verifica dati obbligatori
  if (!this.datiGenerali?.anno || !this.datiGenerali?.mese || !this.datiGenerali?.rg_numero) {
    errori.push('Dati generali incompleti');
  }
  
  if (!this.datiGenerali?.beneficiario?.nome || !this.datiGenerali?.beneficiario?.cognome || !this.datiGenerali?.beneficiario?.codiceFiscale) {
    errori.push('Dati beneficiario incompleti');
  }
  
  if (!this.datiGenerali?.amministratore?.nome || !this.datiGenerali?.amministratore?.cognome || !this.datiGenerali?.amministratore?.codiceFiscale) {
    errori.push('Dati amministratore incompleti');
  }
  
  if (!this.firma?.luogo || !this.firma?.data) {
    errori.push('Dati firma incompleti');
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