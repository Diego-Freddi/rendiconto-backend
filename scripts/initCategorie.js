const mongoose = require('mongoose');
const Categoria = require('../models/Categoria');
require('dotenv').config();

// Categorie default per USCITE
const CATEGORIE_USCITE_DEFAULT = [
  {
    nome: 'SALUTE',
    tipo: 'USCITE',
    descrizione: 'Spese mediche, farmaci, visite specialistiche',
    colore: '#dc3545',
    isDefault: true
  },
  {
    nome: 'CULTURA',
    tipo: 'USCITE',
    descrizione: 'Libri, corsi, eventi culturali',
    colore: '#6f42c1',
    isDefault: true
  },
  {
    nome: 'RISTORANTI',
    tipo: 'USCITE',
    descrizione: 'Pasti fuori casa, ristoranti, bar',
    colore: '#fd7e14',
    isDefault: true
  },
  {
    nome: 'VACANZE',
    tipo: 'USCITE',
    descrizione: 'Viaggi, soggiorni, attività ricreative',
    colore: '#20c997',
    isDefault: true
  },
  {
    nome: 'BANCA',
    tipo: 'USCITE',
    descrizione: 'Commissioni bancarie, spese finanziarie',
    colore: '#0d6efd',
    isDefault: true
  },
  {
    nome: 'UFFICIO',
    tipo: 'USCITE',
    descrizione: 'Spese amministrative, cancelleria, servizi',
    colore: '#6c757d',
    isDefault: true
  },
  {
    nome: 'PERSONA',
    tipo: 'USCITE',
    descrizione: 'Cura della persona, parrucchiere, estetica',
    colore: '#e83e8c',
    isDefault: true
  },
  {
    nome: 'ABBIGLIAMENTO',
    tipo: 'USCITE',
    descrizione: 'Vestiti, scarpe, accessori',
    colore: '#198754',
    isDefault: true
  },
  {
    nome: 'AUTO',
    tipo: 'USCITE',
    descrizione: 'Carburante, manutenzione, assicurazione auto',
    colore: '#ffc107',
    isDefault: true
  }
];

// Categorie default per ENTRATE
const CATEGORIE_ENTRATE_DEFAULT = [
  {
    nome: 'PENSIONE',
    tipo: 'ENTRATE',
    descrizione: 'Pensione di vecchiaia, invalidità, reversibilità',
    colore: '#198754',
    isDefault: true
  },
  {
    nome: 'STIPENDIO/SALARIO',
    tipo: 'ENTRATE',
    descrizione: 'Redditi da lavoro dipendente',
    colore: '#198754',
    isDefault: true
  },
  {
    nome: 'RENDITE IMMOBILIARI',
    tipo: 'ENTRATE',
    descrizione: 'Affitti e rendite da immobili',
    colore: '#fd7e14',
    isDefault: true
  },
  {
    nome: 'DIVIDENDI/INTERESSI',
    tipo: 'ENTRATE',
    descrizione: 'Rendimenti finanziari, interessi bancari',
    colore: '#0d6efd',
    isDefault: true
  },
  {
    nome: 'VENDITA BENI',
    tipo: 'ENTRATE',
    descrizione: 'Vendita di beni mobili e immobili',
    colore: '#ffc107',
    isDefault: true
  },
  {
    nome: 'RIMBORSI',
    tipo: 'ENTRATE',
    descrizione: 'Rimborsi spese, assicurazioni, vari',
    colore: '#20c997',
    isDefault: true
  },
  {
    nome: 'DONAZIONI RICEVUTE',
    tipo: 'ENTRATE',
    descrizione: 'Donazioni e lasciti ricevuti',
    colore: '#e83e8c',
    isDefault: true
  }
];

// Tutte le categorie default
const CATEGORIE_DEFAULT = [...CATEGORIE_USCITE_DEFAULT, ...CATEGORIE_ENTRATE_DEFAULT];

async function initCategorie() {
  try {
    // Connessione al database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rendiconto');

    console.log('✅ Connesso a MongoDB');

    // Verifica se le categorie default esistono già
    const categorieEsistenti = await Categoria.find({ isDefault: true });
    
    console.log(`ℹ️  Trovate ${categorieEsistenti.length} categorie default esistenti`);
    
    // Verifica se mancano alcune categorie (confronta nome + tipo)
    const categorieEsistentiKey = categorieEsistenti.map(c => `${c.nome}-${c.tipo}`);
    const categorieMancanti = CATEGORIE_DEFAULT.filter(c => !categorieEsistentiKey.includes(`${c.nome}-${c.tipo}`));
    
    if (categorieMancanti.length > 0) {
      console.log(`📝 Aggiunta di ${categorieMancanti.length} categorie mancanti...`);
      categorieMancanti.forEach(cat => {
        console.log(`   + ${cat.nome} (${cat.tipo})`);
      });
      await Categoria.insertMany(categorieMancanti);
      console.log('✅ Categorie mancanti aggiunte con successo');
    } else {
      console.log('✅ Tutte le categorie default sono già presenti');
    }

    // Mostra tutte le categorie default
    const tutteLeCategorie = await Categoria.find({ isDefault: true }).sort({ tipo: 1, nome: 1 });
    console.log('\n📋 Categorie default disponibili:');
    
    const categorieEntrate = tutteLeCategorie.filter(c => c.tipo === 'ENTRATE');
    const categorieUscite = tutteLeCategorie.filter(c => c.tipo === 'USCITE');
    
    console.log('\n💰 ENTRATE:');
    categorieEntrate.forEach((categoria, index) => {
      console.log(`${index + 1}. ${categoria.nome} (${categoria.colore}) - ${categoria.descrizione}`);
    });
    
    console.log('\n💸 USCITE:');
    categorieUscite.forEach((categoria, index) => {
      console.log(`${index + 1}. ${categoria.nome} (${categoria.colore}) - ${categoria.descrizione}`);
    });

    console.log(`\n🎉 Inizializzazione completata!`);
    console.log(`📊 Totale categorie: ${tutteLeCategorie.length} (${categorieEntrate.length} entrate + ${categorieUscite.length} uscite)`);

  } catch (error) {
    console.error('❌ Errore durante l\'inizializzazione:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connessione al database chiusa');
    process.exit(0);
  }
}

// Esegui lo script se chiamato direttamente
if (require.main === module) {
  initCategorie();
}

module.exports = { initCategorie, CATEGORIE_DEFAULT, CATEGORIE_ENTRATE_DEFAULT, CATEGORIE_USCITE_DEFAULT }; 