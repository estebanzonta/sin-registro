import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ==========================================
// ADMIN API
// ==========================================

// --- Garment Models ---
app.get('/api/admin/garment-models', async (req, res) => {
  const models = await prisma.garmentModel.findMany({
    include: { category: true, sizes: true, colors: true }
  });
  res.json(models);
});

app.post('/api/admin/garment-models', async (req, res) => {
  const { categoryId, name, slug, description, basePrice, frontMockupUrl, backMockupUrl } = req.body;
  const model = await prisma.garmentModel.create({
    data: { categoryId, name, slug, description, basePrice, frontMockupUrl, backMockupUrl }
  });
  res.json(model);
});

// --- Designs ---
app.get('/api/admin/designs', async (req, res) => {
  const designs = await prisma.design.findMany({
    include: { collection: true, transferSizes: true }
  });
  res.json(designs);
});

app.post('/api/admin/designs', async (req, res) => {
  const { collectionId, name, slug, description, imageUrl, limited } = req.body;
  const design = await prisma.design.create({
    data: { collectionId, name, slug, description, imageUrl, limited }
  });
  res.json(design);
});

// --- Inventory ---
app.get('/api/admin/blank-stock', async (req, res) => {
  const stock = await prisma.blankStock.findMany({
    include: { garmentModel: true, color: true, size: true }
  });
  res.json(stock);
});

app.patch('/api/admin/blank-stock/:id', async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  const record = await prisma.blankStock.update({
    where: { id },
    data: { quantity }
  });
  res.json(record);
});

// ==========================================
// CATALOG API (Public)
// ==========================================

// Init catalog (returns categories, models, colors, sizes for initial load)
app.get('/api/catalog/init', async (req, res) => {
  const categories = await prisma.category.findMany({
    include: { garmentModels: { where: { active: true } } }
  });
  const colors = await prisma.color.findMany({ where: { active: true } });
  const sizes = await prisma.size.findMany();
  res.json({ categories, colors, sizes });
});

// Get designs by type/collection
app.get('/api/catalog/designs', async (req, res) => {
  const designs = await prisma.design.findMany({
    where: { active: true },
    include: { transferSizes: true }
  });
  res.json(designs);
});

// ==========================================
// CONFIGURATOR CORE API
// ==========================================

app.post('/api/configurator/resolve', async (req, res) => {
  const { category, garmentModelId, sizeId, colorId, designId, transferSize, mainPlacement } = req.body;

  try {
    // 1. Check blank stock
    const blankStock = await prisma.blankStock.findUnique({
      where: {
        garmentModelId_colorId_sizeId: {
          garmentModelId,
          colorId,
          sizeId
        }
      }
    });

    // 2. Check transfer stock (if a design is selected)
    let transferStock = null;
    let extraPrice = 0;
    if (designId && transferSize) {
      transferStock = await prisma.designTransferSize.findUnique({
        where: {
          designId_sizeCode: {
            designId,
            sizeCode: transferSize
          }
        }
      });
      if (transferStock) {
        extraPrice = transferStock.extraPrice;
      }
    }

    // 3. Logic: calculate logo placement automatically based on main design
    // e.g. if main placement is 'back', logo goes 'front'. Else if 'front', logo goes 'back'
    let logoPlacement = 'logo_back';
    if (mainPlacement === 'back' || mainPlacement === 'back_big') {
      logoPlacement = 'logo_front';
    }

    // 4. Calculate total price
    const model = await prisma.garmentModel.findUnique({ where: { id: garmentModelId } });
    const basePrice = model?.basePrice || 0;
    const totalPrice = basePrice + extraPrice;

    // Build boolean valid flags
    const hasBlank = blankStock ? blankStock.quantity > 0 : false;
    const hasTransfer = designId ? (transferStock ? transferStock.stock > 0 : false) : true;

    res.json({
      valid: hasBlank && hasTransfer,
      price: totalPrice,
      logoPlacement,
      stock: {
        blank: blankStock?.quantity || 0,
        transfer: transferStock?.stock || 0,
        // Assuming logo is unlimited for now
        logo: 999 
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to resolve configuration' });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
