const express = require('express');
const dotenv = require('dotenv');
const pool = require('./db'); 

dotenv.config();
const app = express();

app.use(express.json());


// Haversine formula to calculate distance between two lat/lon points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in KM

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in KM
}


app.get('/', (req, res) => {
  res.send('School API running!');
});

// POST /addSchool
app.post('/addSchool', async (req, res) => {
  const { name, address, latitude, longitude } = req.body;

  // 1. Validate input
  if (!name || !address || typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ error: 'All fields are required and must be valid.' });
  }

  try {
    // 2. Insert into DB
    const [result] = await pool.query(
      'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)',
      [name, address, latitude, longitude]
    );

    // 3. Return response
    res.status(201).json({ message: 'School added successfully!', schoolId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});


// GET /listSchools
app.get('/listSchools', async (req, res) => {
  const userLat = parseFloat(req.query.latitude);
  const userLon = parseFloat(req.query.longitude);

  // 1. Validate input
  if (isNaN(userLat) || isNaN(userLon)) {
    return res.status(400).json({ error: 'Valid latitude and longitude are required as query params.' });
  }

  try {
    // 2. Fetch all schools from DB (ensure 'id' is included)
    const [schools] = await pool.query('SELECT * FROM schools');

    // 3. Calculate distance and sort
    const schoolsWithDistance = schools.map((school) => {
      const distance = calculateDistance(userLat, userLon, school.latitude, school.longitude);
      return { ...school, distance };
    });

    // 4. Sort by distance
    schoolsWithDistance.sort((a, b) => a.distance - b.distance);

    // 5. Respond with sorted list
    res.json(schoolsWithDistance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
