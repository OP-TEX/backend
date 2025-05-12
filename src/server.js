const express = require('express');
const connectDB = require('./lib/db');
const authmiddleware = require('./middleware/authMiddleware');
const fileUpload = require('express-fileupload');
const { exceptionHandler } = require('./middleware/errorHandlerMiddleware');
const path = require('path');
require('dotenv').config();
const cors = require('cors');

const http = require('http');
const setupSocketIO = require('./lib/socket');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const customerSupportRoutes = require('./routes/customerSupportRoutes');
const { getAIResponse } = require('./lib/ai');
const {
  authController,
  adminController,
  productController,
  orderController,
  userController,
  customerSupportController,
  customerSupportService
} = require('./lib/di');

const app = express();

// Create HTTP server
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: ['http://localhost:56703', 'http://localhost:3000'], // Allow Flutter web app and optionally other origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

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

// Add welcome page route at the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'welcome.html'));
});

// Set up API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes(productController));
app.use('/api/orders', orderRoutes(orderController));
app.use('/api/user', userRoutes);
app.use('/api/support', customerSupportRoutes(customerSupportController));

// app.post('/ai-trial', authmiddleware, async (req, res, next) => {
//   try {
//     console.log(req.user);
//     const { message, device } = req.body;
//     console.log(device);
//     let modifiedMessage = message + ` in ${device} \n if the question i asked you doesn't concern the device ${device} please answer with out of scope`;

//     const response = await getAIResponse(modifiedMessage);
//     console.log(response);
//     res.send({ message: response });
//   } catch (error) {
//     next(error);
//   }
// });


// Error handling middleware
app.use(exceptionHandler);

// Start the server
const PORT = process.env.PORT || 3000;

// Initialize MongoDB connection before starting the server
connectDB()
  .then(() => {
    console.log('MongoDB connected successfully');

    // Set up sockets with the customerSupportService
    const io = setupSocketIO(server, customerSupportService);

    // Start the server only after DB connection is established
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit with failure
  });

// For testing
module.exports = app;