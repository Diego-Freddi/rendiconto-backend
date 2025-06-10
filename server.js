const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('passport');

// Importa le routes
const authRoutes = require('./routes/auth');
const rendicontoRoutes = require('./routes/rendiconto');
const categorieRoutes = require('./routes/categorie');

// Configurazione environment
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configurazione sessioni
app.use(session({
  secret: process.env.SESSION_SECRET || 'rendiconto-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 ore
  }
}));

// Configurazione Passport
app.use(passport.initialize());
app.use(passport.session());

// Connessione MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rendiconto')
.then(() => console.log('✅ Connesso a MongoDB'))
.catch(err => console.error('❌ Errore connessione MongoDB:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rendiconti', rendicontoRoutes);
app.use('/api/categorie', categorieRoutes);

// Route di test
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server Rendiconto funzionante',
    timestamp: new Date().toISOString()
  });
});

// Gestione errori globale
app.use((err, req, res, next) => {
  console.error('Errore server:', err.stack);
  res.status(500).json({ 
    error: 'Errore interno del server',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Qualcosa è andato storto'
  });
});

// Gestione route non trovate
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trovata' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server avviato su porta ${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
}); 