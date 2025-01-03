const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const app = express();
const prisma = new PrismaClient();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads';
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Use the original filename for simplicity
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve static files from uploads directory

app.get('/menu-items', async (req, res) => {
  const { category, search } = req.query;
  const where = {};
  if (category) where.category = category;
  if (search) where.name = { contains: search, mode: 'insensitive' };

  try {
    const menuItems = await prisma.menuItem.findMany({ where });
    res.json(menuItems);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Error fetching menu items' });
  }
});


// Add a new menu item
app.post('/menu-items', upload.single('image'), async (req, res) => {
  const { name, price, category } = req.body; // Include category in the request body
  const floatPrice = parseFloat(price);

  try {
    const newItem = await prisma.menuItem.create({
      data: {
        name: name,
        price: floatPrice,
        image: req.file.path, // Save the path of the uploaded image
        category: category, // Save the category
      },
    });
    res.json(newItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating menu item' });
  }
});

// Update a menu item
app.put('/menu-items/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { name, price, category } = req.body; // Include category in the request body
  const floatPrice = parseFloat(price);

  const updateData = {
    name: name,
    price: floatPrice,
    category: category, // Update the category
  };

  // If a new image is uploaded, update the image field
  if (req.file) {
    updateData.image = req.file.path; // Use the new image path
  }

  try {
    const updatedItem = await prisma.menuItem.update({
      where: { id: Number(id) },
      data: updateData,
    });
    res.json(updatedItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating menu item' });
  }
});



// Delete a menu item
app.delete('/menu-items/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.menuItem.delete({
      where: { id: Number(id) },
    });
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting menu item' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
