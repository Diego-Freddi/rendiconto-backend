const mongoose = require('mongoose');
const Categoria = require('../models/Categoria');
require('dotenv').config();

// Categorie ridondanti da rimuovere
const CATEGORIE_DA_RIMUOVERE = [
  'SPESE MEDICHE', // Ridondante con SALUTE
  'FARMACI', // Ridondante con SALUTE
  'ALIMENTARI', // Non necessaria come default
  'CASA E UTENZE', // Non necessaria come default
  'TRASPORTI', // Non necessaria come default
  'ASSICURAZIONI', // Non necessaria come default
  'TASSE E IMPOSTE', // Non necessaria come default
  'SPESE LEGALI', // Non necessaria come default
  'CULTURA E SVAGO', // Ridondante con CULTURA
  'DONAZIONI EROGATE' // Non necessaria come default
];

async function cleanCategorie() {
  try {
    // Connessione al database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rendiconto');

    console.log('✅ Connesso a MongoDB');

    // Trova le categorie da rimuovere
    const categorieEsistenti = await Categoria.find({
      nome: { $in: CATEGORIE_DA_RIMUOVERE },
      isDefault: true
    });

    console.log(`🔍 Trovate ${categorieEsistenti.length} categorie ridondanti da rimuovere:`);
    categorieEsistenti.forEach(cat => {
      console.log(`   - ${cat.nome} (${cat.tipo})`);
    });

    if (categorieEsistenti.length > 0) {
      // Rimuovi le categorie ridondanti
      const result = await Categoria.deleteMany({
        nome: { $in: CATEGORIE_DA_RIMUOVERE },
        isDefault: true
      });

      console.log(`🗑️  Rimosse ${result.deletedCount} categorie ridondanti`);
    } else {
      console.log('✅ Nessuna categoria ridondante trovata');
    }

    // Mostra le categorie rimanenti
    const categorieRimanenti = await Categoria.find({ isDefault: true }).sort({ tipo: 1, nome: 1 });
    
    const categorieEntrate = categorieRimanenti.filter(c => c.tipo === 'ENTRATE');
    const categorieUscite = categorieRimanenti.filter(c => c.tipo === 'USCITE');
    
    console.log('\n📋 Categorie default rimanenti:');
    
    console.log('\n💰 ENTRATE:');
    categorieEntrate.forEach((categoria, index) => {
      console.log(`${index + 1}. ${categoria.nome} - ${categoria.descrizione}`);
    });
    
    console.log('\n💸 USCITE:');
    categorieUscite.forEach((categoria, index) => {
      console.log(`${index + 1}. ${categoria.nome} - ${categoria.descrizione}`);
    });

    console.log(`\n🎉 Pulizia completata!`);
    console.log(`📊 Totale categorie: ${categorieRimanenti.length} (${categorieEntrate.length} entrate + ${categorieUscite.length} uscite)`);

  } catch (error) {
    console.error('❌ Errore durante la pulizia:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connessione al database chiusa');
    process.exit(0);
  }
}

// Esegui lo script se chiamato direttamente
if (require.main === module) {
  cleanCategorie();
}

module.exports = { cleanCategorie }; 