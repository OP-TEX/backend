const express = require('express');
const connectDB = require('./lib/db');
const authmiddleware = require('./middleware/authMiddleware');
const fileUpload = require('express-fileupload');
const { exceptionHandler } = require('./middleware/errorHandlerMiddleware');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const { getAIResponse } = require('./lib/ai');
const { authController, adminController, productController, orderController } = require('./lib/di');
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

// Add welcome page route at the root URL
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Optex Store</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          text-align: center;
        }
        h1 {
          color: #2d3748;
          margin-bottom: 10px;
        }
        .logo {
          font-size: 3rem;
          font-weight: bold;
          color: #3182ce;
          margin-bottom: 1rem;
        }
        .card {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          margin-top: 20px;
        }
        .endpoints {
          text-align: left;
          margin-top: 30px;
        }
        .endpoint {
          background-color: #edf2f7;
          border-radius: 4px;
          padding: 10px;
          margin-bottom: 10px;
        }
        code {
          background-color: #e2e8f0;
          padding: 2px 4px;
          border-radius: 4px;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <div class="logo">OPTEX</div>
      <h1>Welcome to Optex Store API</h1>
      <div class="card">
        <p>This is the backend API for Optex Store, your one-stop solution for optical products.</p>
        <p>The API is up and running! 🚀</p>
        
        <div class="endpoints">
          <h2>Available API Endpoints:</h2>
          <div class="endpoint"><code>/api/auth</code> - Authentication services</div>
          <div class="endpoint"><code>/api/products</code> - Product catalog</div>
          <div class="endpoint"><code>/api/user</code> - User management</div>
          <div class="endpoint"><code>/api/orders</code> - Order processing</div>
          <div class="endpoint"><code>/api/admin</code> - Admin panel (restricted access)</div>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes(productController));
app.use('/api/orders', orderRoutes(orderController));
app.use('/api/user', userRoutes);

app.post('/ai-trial', authmiddleware, async (req, res, next) => {
  try {
    console.log(req.user);
    const { message, device } = req.body;
    console.log(device);
    let modifiedMessage = message + ` in ${device} \n if the question i asked you doesn't concern the device ${device} please answer with out of scope`;

    const response = await getAIResponse(modifiedMessage);
    console.log(response);
    res.send({ message: response });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware - should be after all routes
app.use(exceptionHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await connectDB();
  console.log(`Server is running on port ${PORT}`);
});