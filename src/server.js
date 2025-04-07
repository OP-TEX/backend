const express = require('express');
const connectDB = require('./lib/db');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
// const { getAIResponse } = require('./lib/ai');
const app = express();

app.use(express.json());

app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Hello, MongoDB is connected!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await connectDB();
//   await  getAIResponse("would the laptop lenovo legion 5 be good for coding and gaming and tell me the laptop specs")

  console.log(`Server is running on port ${PORT}`);
});