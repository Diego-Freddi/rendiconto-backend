# 🏗️ Rendiconto Backend API

Backend Node.js + Express + MongoDB per l'applicazione web di compilazione rendiconti per amministratori di sostegno.

## 🚀 Tecnologie Utilizzate

- **Runtime**: Node.js
- **Framework**: Express.js 4.21.2
- **Database**: MongoDB con Mongoose 8.10.1
- **Autenticazione**: JWT (jsonwebtoken 9.0.2)
- **Password Hashing**: bcrypt 5.1.1
- **Validazione**: express-validator 7.0.1
- **CORS**: cors 2.8.5
- **File Upload**: multer 1.4.5-lts.1
- **Sessioni**: express-session 1.18.1
- **Email**: @sendgrid/mail 8.1.4
- **Cloud Storage**: cloudinary 1.41.3

## 🛠️ Setup Locale

### 1. Prerequisiti
```bash
node --version  # Node.js richiesto
npm --version   # npm richiesto
```

### 2. Installazione
```bash
cd backend
npm install
```

### 3. Configurazione
```bash
# Copia il file di esempio
cp env.example .env

# Configura le variabili d'ambiente
nano .env
```

### 4. Avvio
```bash
# Sviluppo (con nodemon)
npm run dev

# Produzione
npm start

# Inizializza categorie default
npm run init-categorie
```

Il server sarà disponibile su `http://localhost:5050`

## 🔧 Variabili d'Ambiente

Crea un file `.env` nella root del progetto:

```env
# Database MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rendiconto

# JWT Secret (deve essere sicuro)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Server
PORT=5050
NODE_ENV=production

# CORS - URL del frontend
FRONTEND_URL=https://your-frontend-domain.vercel.app

# Sessioni
SESSION_SECRET=your-session-secret-key

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key

# Cloudinary (per upload file)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 📡 API Endpoints

### Autenticazione (`/api/auth`)
```
POST   /register              # Registrazione nuovo utente
POST   /login                 # Login utente
GET    /me                    # Profilo utente corrente
PUT    /profile-completo      # Aggiorna profilo completo
POST   /upload-firma          # Carica firma digitale (Base64)
DELETE /delete-firma          # Elimina firma digitale
POST   /verify-password       # Verifica password per operazioni sensibili
```

### Beneficiari (`/api/beneficiari`)
```
GET    /                      # Lista beneficiari con paginazione
GET    /:id                   # Dettaglio beneficiario
POST   /                      # Crea nuovo beneficiario
PUT    /:id                   # Aggiorna beneficiario
DELETE /:id                   # Elimina beneficiario (soft delete)
PUT    /:id/attiva            # Riattiva beneficiario
GET    /:id/rendiconti        # Rendiconti del beneficiario
```

### Rendiconti (`/api/rendiconti`)
```
GET    /                      # Lista rendiconti con filtri
GET    /:id                   # Dettaglio rendiconto
POST   /                      # Crea nuovo rendiconto
PUT    /:id                   # Aggiorna rendiconto
DELETE /:id                   # Elimina rendiconto
```

### Categorie (`/api/categorie`)
```
GET    /                      # Lista categorie (default + personalizzate)
POST   /                      # Crea categoria personalizzata
PUT    /:id                   # Aggiorna categoria personalizzata
DELETE /:id                   # Elimina categoria personalizzata
```

### Utilità
```
GET    /api/health            # Health check del server
```

## 🗄️ Modelli Database

### User (Amministratore)
```javascript
{
  nome: String,
  cognome: String,
  email: String (unique),
  password: String (hashed con bcrypt),
  codiceFiscale: String,
  telefono: String,
  indirizzo: {
    via: String,
    cap: String,
    citta: String,
    provincia: String
  },
  dataNascita: Date,
  luogoNascita: String,
  professione: String,
  numeroAlbo: String,
  pec: String,
  firmaImmagine: String (Base64),
  createdAt: Date,
  updatedAt: Date
}
```

### Beneficiario
```javascript
{
  amministratoreId: ObjectId (ref: User),
  nome: String (required),
  cognome: String (required),
  codiceFiscale: String (required, unique per amministratore),
  dataNascita: Date,
  luogoNascita: String,
  indirizzo: {
    via: String,
    cap: String,
    citta: String,
    provincia: String
  },
  condizioniPersonali: String,
  situazionePatrimoniale: {
    beniImmobili: [{ descrizione: String, valore: Number }],
    beniMobili: [{ descrizione: String, valore: Number }],
    titoliConti: [{ descrizione: String, valore: Number }]
  },
  note: String,
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### Rendiconto
```javascript
{
  amministratoreId: ObjectId (ref: User),
  beneficiarioId: ObjectId (ref: Beneficiario),
  datiGenerali: {
    rg_numero: String,
    dataInizio: Date,
    dataFine: Date
  },
  contoEconomico: {
    entrate: [{ categoria: String, descrizione: String, importo: Number }],
    uscite: [{ categoria: String, descrizione: String, importo: Number }]
  },
  firma: {
    luogo: String,
    data: Date,
    noteAggiuntive: String,
    firmaDigitale: {
      immagine: String (Base64),
      amministratore: String,
      dataApplicazione: Date
    }
  },
  stato: String (enum: ['bozza', 'completato', 'inviato']),
  createdAt: Date,
  updatedAt: Date
}
```

### Categoria
```javascript
{
  nome: String (required),
  tipo: String (enum: ['entrata', 'uscita']),
  isDefault: Boolean (default: false),
  amministratoreId: ObjectId (ref: User, null per categorie default),
  createdAt: Date,
  updatedAt: Date
}
```

## 🚀 Deploy su Render

### 1. Preparazione
- Account su [Render.com](https://render.com)
- Repository GitHub con il codice
- Database MongoDB Atlas configurato

### 2. Configurazione Render
1. **Crea nuovo Web Service**
2. **Connetti repository GitHub**
3. **Configurazioni**:
   - **Name**: `rendiconto-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Node Version**: `18`

### 3. Variabili d'Ambiente su Render
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
PORT=10000
SESSION_SECRET=your-session-secret
```

## 📁 Struttura Progetto

```
backend/
├── models/                 # Modelli Mongoose
│   ├── User.js            # Amministratore
│   ├── Beneficiario.js    # Beneficiario
│   ├── Rendiconto.js      # Rendiconto
│   └── Categoria.js       # Categorie
├── routes/                 # Routes API
│   ├── auth.js            # Autenticazione e profilo
│   ├── beneficiari.js     # CRUD beneficiari
│   ├── rendiconto.js      # CRUD rendiconti
│   └── categorie.js       # CRUD categorie
├── middleware/             # Middleware personalizzati
│   └── auth.js            # Autenticazione JWT
├── scripts/               # Script utilità
│   └── initCategorie.js   # Inizializza categorie default
├── uploads/               # File temporanei upload
├── server.js              # Entry point applicazione
├── package.json           # Dipendenze e script
├── .env.example          # Template variabili d'ambiente
└── README.md             # Questa documentazione
```

## 🔒 Sicurezza

- **Password**: Hash con bcrypt (salt rounds: 12)
- **JWT**: Token sicuri con scadenza
- **CORS**: Configurato per frontend specifico
- **Validazione**: Input sanitizzati con express-validator
- **Firma Digitale**: Verifica password per upload/delete
- **Soft Delete**: Beneficiari non vengono eliminati fisicamente

## 📝 Script Disponibili

```bash
npm run dev          # Avvia server in modalità sviluppo
npm start            # Avvia server in produzione
npm run init-categorie  # Inizializza categorie default
npm test             # Placeholder per test
```

## 🆘 Troubleshooting

### Errore connessione MongoDB
```bash
# Verifica URI nel .env
echo $MONGODB_URI
```

### Errore JWT
```bash
# Verifica secret key
echo $JWT_SECRET
```

### Errore CORS
```bash
# Verifica FRONTEND_URL
echo $FRONTEND_URL
```

### Test Health Check
```bash
curl http://localhost:5050/api/health
```

---

**Versione**: 2.0.0  
**Ultimo aggiornamento**: Giugno 2025  
**Autore**: Diego Freddi 