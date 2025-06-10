const mongoose = require('mongoose');
const Categoria = require('../models/Categoria');
const { CATEGORIE_DEFAULT } = require('./initCategorie');
require('dotenv').config();

async function resetCategorie() {
  try {
    // Connessione al database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rendiconto');

    console.log('✅ Connesso a MongoDB');

    // Rimuovi TUTTE le categorie default esistenti
    const deleteResult = await Categoria.deleteMany({ isDefault: true });
    console.log(`🗑️  Rimosse ${deleteResult.deletedCount} categorie default esistenti`);

    // Inserisci le categorie corrette
    console.log('📝 Inserimento categorie default corrette...');
    await Categoria.insertMany(CATEGORIE_DEFAULT);
    console.log('✅ Categorie default inserite con successo');

    // Mostra le categorie inserite
    const categorieInserite = await Categoria.find({ isDefault: true }).sort({ tipo: 1, nome: 1 });
    
    const categorieEntrate = categorieInserite.filter(c => c.tipo === 'ENTRATE');
    const categorieUscite = categorieInserite.filter(c => c.tipo === 'USCITE');
    
    console.log('\n📋 Categorie default inserite:');
    
    console.log('\n💰 ENTRATE:');
    categorieEntrate.forEach((categoria, index) => {
      console.log(`${index + 1}. ${categoria.nome} - ${categoria.descrizione}`);
    });
    
    console.log('\n💸 USCITE:');
    categorieUscite.forEach((categoria, index) => {
      console.log(`${index + 1}. ${categoria.nome} - ${categoria.descrizione}`);
    });

    console.log(`\n🎉 Reset completato!`);
    console.log(`📊 Totale categorie: ${categorieInserite.length} (${categorieEntrate.length} entrate + ${categorieUscite.length} uscite)`);

  } catch (error) {
    console.error('❌ Errore durante il reset:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connessione al database chiusa');
    process.exit(0);
  }
}

// Esegui lo script se chiamato direttamente
if (require.main === module) {
  resetCategorie();
}

module.exports = { resetCategorie }; 