require('dotenv').config();
const express = require("express");
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the cors middleware
require('dotenv').config();
const serverless = require("serverless-http");


const PORT = process.env.PORT || 5000;

// ROUTES for
const StudentsRoutes = require('./Routes/StudentsRoutes');
const TeachersRoutes = require('./Routes/TeachersRoutes');
const AcademicRoutes = require('./Routes/AcademicRoutes');
const AuthRoutes = require('./Routes/AuthRoutes');
const GradesRoutes = require('./Routes/GradesRoutes');
 

const connectDB = require('./Dbconnection');

connectDB();


// Use CORS middleware to allow requests from any origin
// You can configure it further if you need to restrict origins, methods, or headers
app.use(cors());
app.use(express.json()); 
app.use(express.json()); 

app.use('/api/students', StudentsRoutes);
app.use('/api/teachers', TeachersRoutes);
app.use('/api/academics', AcademicRoutes);
app.use('/api/auth', AuthRoutes);
app.use('/api/grades', GradesRoutes);



app.get('/', (req, res) => {
    res.send('Hey, Express server is up and running right now until you stop it!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server.');
});

module.exports.handler = serverless(app);
