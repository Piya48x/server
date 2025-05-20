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
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Fetch all menu items with optional search query
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
  const { name, price, category } = req.body;
  const floatPrice = parseFloat(price);

  try {
    const newItem = await prisma.menuItem.create({
      data: {
        name,
        price: floatPrice,
        category,
        image: req.file.path,
      },
    });
    res.json(newItem);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Error creating menu item' });
  }
});

// Update a menu item
app.put('/menu-items/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { name, price, category } = req.body;
  const floatPrice = parseFloat(price);

  try {
    const existingItem = await prisma.menuItem.findUnique({ where: { id: Number(id) } });

    if (!existingItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    if (req.file && existingItem.image) {
      fs.unlink(existingItem.image, (err) => {
        if (err) console.error('Error deleting old image:', err);
      });
    }

    const updatedItem = await prisma.menuItem.update({
      where: { id: Number(id) },
      data: {
        name,
        price: floatPrice,
        category,
        image: req.file ? req.file.path : existingItem.image,
      },
    });
    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Error updating menu item' });
  }
});

// Delete a menu item
app.delete('/menu-items/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const existingItem = await prisma.menuItem.findUnique({ where: { id: Number(id) } });

    if (existingItem.image) {
      fs.unlink(existingItem.image, (err) => {
        if (err) console.error('Error deleting image:', err);
      });
    }

    await prisma.menuItem.delete({ where: { id: Number(id) } });
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Error deleting menu item' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
