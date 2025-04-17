const express = require('express');
const connectDB = require('./lib/db');
const authmiddleware = require('./middleware/authMiddleware');
const fileUpload = require('express-fileupload');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { getAIResponse } = require('./lib/ai');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/',
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit for each file
    abortOnLimit: true,
    limitHandler: function (req, res) {
        return res.status(413).json({ error: 'File size limit exceeded (max 2MB)' });
    }
}));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.post('/ai-trial', authmiddleware, async(req, res) => {
  try {
    console.log(req.user);
    const { message, device } = req.body;
    console.log(device);
    let modifiedMessage = message + ` in ${device} \n if the question i asked you doesn't concern the device ${device} please answer with out of scope`;
    
    const response = await getAIResponse(modifiedMessage);
    console.log(response);
    res.send({ message: response });
  } catch (error) {
    console.error('AI Trial Error:', error);
    res.status(500).json({ error: 'Failed to process AI request' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await connectDB();
  console.log(`Server is running on port ${PORT}`);
});