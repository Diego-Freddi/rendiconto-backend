const mongoose = require('mongoose');
const Categoria = require('../models/Categoria');
require('dotenv').config();

// Categorie default come richiesto
const CATEGORIE_DEFAULT = [
  {
    nome: 'SALUTE',
    descrizione: 'Spese mediche, farmaci, visite specialistiche',
    colore: '#dc3545',
    isDefault: true
  },
  {
    nome: 'CULTURA',
    descrizione: 'Libri, corsi, eventi culturali',
    colore: '#6f42c1',
    isDefault: true
  },
  {
    nome: 'RISTORANTI',
    descrizione: 'Pasti fuori casa, ristoranti, bar',
    colore: '#fd7e14',
    isDefault: true
  },
  {
    nome: 'VACANZE',
    descrizione: 'Viaggi, soggiorni, attività ricreative',
    colore: '#20c997',
    isDefault: true
  },
  {
    nome: 'BANCA',
    descrizione: 'Commissioni bancarie, spese finanziarie',
    colore: '#0d6efd',
    isDefault: true
  },
  {
    nome: 'UFFICIO',
    descrizione: 'Spese amministrative, cancelleria, servizi',
    colore: '#6c757d',
    isDefault: true
  },
  {
    nome: 'PERSONA',
    descrizione: 'Cura della persona, parrucchiere, estetica',
    colore: '#e83e8c',
    isDefault: true
  },
  {
    nome: 'ABBIGLIAMENTO',
    descrizione: 'Vestiti, scarpe, accessori',
    colore: '#198754',
    isDefault: true
  },
  {
    nome: 'AUTO',
    descrizione: 'Carburante, manutenzione, assicurazione auto',
    colore: '#ffc107',
    isDefault: true
  }
];

async function initCategorie() {
  try {
    // Connessione al database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rendiconto');

    console.log('✅ Connesso a MongoDB');

    // Verifica se le categorie default esistono già
    const categorieEsistenti = await Categoria.find({ isDefault: true });
    
    if (categorieEsistenti.length > 0) {
      console.log(`ℹ️  Trovate ${categorieEsistenti.length} categorie default esistenti`);
      
      // Verifica se mancano alcune categorie
      const nomiEsistenti = categorieEsistenti.map(c => c.nome);
      const categorieMancanti = CATEGORIE_DEFAULT.filter(c => !nomiEsistenti.includes(c.nome));
      
      if (categorieMancanti.length > 0) {
        console.log(`📝 Aggiunta di ${categorieMancanti.length} categorie mancanti...`);
        await Categoria.insertMany(categorieMancanti);
        console.log('✅ Categorie mancanti aggiunte con successo');
      } else {
        console.log('✅ Tutte le categorie default sono già presenti');
      }
    } else {
      // Inserisci tutte le categorie default
      console.log('📝 Inserimento categorie default...');
      await Categoria.insertMany(CATEGORIE_DEFAULT);
      console.log('✅ Categorie default inserite con successo');
    }

    // Mostra tutte le categorie default
    const tutteLeCategorie = await Categoria.find({ isDefault: true }).sort({ nome: 1 });
    console.log('\n📋 Categorie default disponibili:');
    tutteLeCategorie.forEach((categoria, index) => {
      console.log(`${index + 1}. ${categoria.nome} (${categoria.colore}) - ${categoria.descrizione}`);
    });

    console.log(`\n🎉 Inizializzazione completata! Totale categorie default: ${tutteLeCategorie.length}`);

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

module.exports = { initCategorie, CATEGORIE_DEFAULT }; 