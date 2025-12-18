const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const guestRoutes = require('./routes/guestRoutes');
const networkRoutes = require('./routes/networkRoutes');
const consolidarRoutes = require('./routes/consolidarRoutes');
const seminarRoutes = require('./routes/seminarRoutes');
const enviarRoutes = require('./routes/enviarRoutes');
const conventionRoutes = require('./routes/conventionRoutes');
const encuentroRoutes = require('./routes/encuentroRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const auditRoutes = require('./routes/auditRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/consolidar', consolidarRoutes);
app.use('/api/seminar', seminarRoutes);
app.use('/api/enviar', enviarRoutes);
app.use('/api/convenciones', conventionRoutes);
app.use('/api/encuentros', encuentroRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/audit', auditRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
