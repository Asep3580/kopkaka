const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

// --- Main API Router ---
const apiRouter = require('./src/routes/index.js');
const partnerRoutes = require('./src/routes/partner.routes.js'); // Tambahkan ini

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors()); // Allows requests from different origins
app.use(express.json()); // Parses incoming JSON requests

// Serves uploaded files (e.g., KTP photos, logos) statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- API Routes ---
app.get('/', (req, res) => res.send('KOPKAKA API is running!'));

// Mount the main API router
app.use('/api', apiRouter);
app.use('/api', partnerRoutes); // Tambahkan ini
// --- Server Startup ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});