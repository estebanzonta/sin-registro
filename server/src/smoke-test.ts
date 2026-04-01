import 'dotenv/config';
import type { AddressInfo } from 'net';
import { prisma } from './db.js';
import { createApp } from './app.js';
import { createAdminUser } from './create-admin.js';
import { seedDatabase } from './seed.js';

type ApiHeaders = Record<string, string>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function api<T>(baseUrl: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${init.method || 'GET'} ${path} failed with ${response.status}: ${text}`);
  }

  return payload as T;
}

async function main() {
  await seedDatabase({ disconnect: false });
  await createAdminUser({ disconnect: false });

  const app = createApp();
  const server = await new Promise<import('http').Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const address = server.address() as AddressInfo | null;
  assert(address, 'Could not resolve local smoke test address');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  let stockReset: { id: string; quantity: number } | null = null;

  try {
    const health = await api<{ status: string }>(baseUrl, '/health');
    assert(health.status === 'ok', 'Health endpoint did not return ok');

    const customerEmail = `smoke+${Date.now()}@example.com`;
    const customerPassword = 'secret123';

    const register = await api<{ token: string; user: { role: string } }>(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: customerEmail, password: customerPassword }),
    });
    assert(register.user.role === 'customer', 'Registered user should have customer role');

    const customerHeaders: ApiHeaders = { Authorization: `Bearer ${register.token}` };
    const me = await api<{ email: string; role: string }>(baseUrl, '/api/auth/me', {
      headers: customerHeaders,
    });
    assert(me.email === customerEmail, 'Auth /me returned the wrong user');

    const adminLogin = await api<{ token: string; user: { role: string } }>(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@example.com', password: 'admin123456' }),
    });
    assert(adminLogin.user.role === 'admin', 'Admin login should return admin role');

    const adminHeaders: ApiHeaders = { Authorization: `Bearer ${adminLogin.token}` };
    const catalog = await api<{
      categories: Array<{
        garmentModels?: Array<{
          id: string;
          colors?: Array<{ colorId: string }>;
          sizes?: Array<{ sizeId: string }>;
          printAreas?: Array<{ placement: { code: string } }>;
        }>;
      }>;
      designCategories: Array<{ id: string }>;
      collections: Array<{ designs?: Array<{ id: string; transferSizes?: Array<{ sizeCode: string }> }> }>;
      uploadTemplates: Array<{ id: string; sizeOptions?: Array<{ sizeCode: string }> }>;
    }>(baseUrl, '/api/catalog/init');
    const seededGarment = catalog.categories
      .flatMap((category) => category.garmentModels || [])
      .find((garment) => (garment.printAreas || []).some((area) => area.placement.code === 'FRONT'));
    assert(seededGarment, 'Expected at least one garment with configured print areas');
    const seededDesign = catalog.collections.flatMap((collection) => collection.designs || [])[0];
    assert(seededDesign, 'Expected at least one seeded design in catalog');

    const blankStock = await api<Array<{ id: string; garmentModelId: string; colorId: string; sizeId: string; quantity: number }>>(baseUrl, '/api/admin/blank-stock', {
      headers: adminHeaders,
    });
    const seededStock = blankStock.find((item) => item.garmentModelId === seededGarment.id);
    assert(seededStock, 'Expected blank stock for the seeded configurable garment');
    stockReset = { id: seededStock.id, quantity: seededStock.quantity };

    const cart = await api<{ totalItems: number; totalPrice: number; items: Array<{ configurationCode: string; unitPrice: number }> }>(baseUrl, '/api/cart/items', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        customizationMode: 'brand_design',
        garmentModelId: seededGarment.id,
        colorId: seededStock.colorId,
        sizeId: seededStock.sizeId,
        designId: seededDesign.id,
        printPlacementCode: 'FRONT',
        logoPlacementCode: 'LC',
        transferSizeCode: seededDesign.transferSizes?.[0]?.sizeCode || 'mediano',
        quantity: 1,
        layoutSnapshotJson: JSON.stringify({ xPct: 50, yPct: 50 }),
      }),
    });
    assert(cart.totalItems === 1, 'Cart should contain exactly one item after add');
    assert(cart.totalPrice > 0, 'Cart total should be calculated by backend');
    assert(cart.items[0]?.configurationCode?.length > 0, 'Cart item should include configuration code');

    const fetchedCart = await api<{ totalItems: number; items: Array<{ unitPrice: number }> }>(baseUrl, '/api/cart', {
      headers: customerHeaders,
    });
    assert(fetchedCart.totalItems === 1, 'Fetching cart should return the created item');
    assert(fetchedCart.items[0]?.unitPrice === cart.items[0]?.unitPrice, 'Cart fetch should preserve server-side price');

    const order = await api<{ id: string; status: string; totalPrice: number }>(baseUrl, '/api/orders', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        customerName: 'Smoke Test',
        customerEmail,
        items: [
          {
            customizationMode: 'brand_design',
            garmentModelId: seededGarment.id,
            colorId: seededStock.colorId,
            sizeId: seededStock.sizeId,
            designId: seededDesign.id,
            printPlacementCode: 'FRONT',
            logoPlacementCode: 'LC',
            transferSizeCode: seededDesign.transferSizes?.[0]?.sizeCode || 'mediano',
            quantity: 2,
            configurationSnapshotJson: JSON.stringify({ source: 'smoke-test' }),
          },
        ],
      }),
    });
    assert(order.status === 'pending', 'Order should start as pending');
    assert(order.totalPrice > 0, 'Order total should be calculated by backend');

    const myOrders = await api<{ total: number; orders: Array<{ id: string }> }>(baseUrl, '/api/orders/my-orders', {
      headers: customerHeaders,
    });
    assert(myOrders.orders.some((item) => item.id === order.id), 'Created order missing from my-orders');

    const orderDetail = await api<{ id: string; items: unknown[] }>(baseUrl, `/api/orders/${order.id}`, {
      headers: customerHeaders,
    });
    assert(orderDetail.id === order.id, 'Order detail returned the wrong id');
    assert(orderDetail.items.length === 1, 'Expected one item in created order');

    const allOrders = await api<{ total: number }>(baseUrl, '/api/orders/admin/all', {
      headers: adminHeaders,
    });
    assert(allOrders.total >= 1, 'Admin all-orders endpoint should return data');

    const updatedOrder = await api<{ status: string }>(baseUrl, `/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'confirmed' }),
    });
    assert(updatedOrder.status === 'confirmed', 'Failed to update order status');

    const collectionName = `Smoke Collection ${Date.now()}`;
    const collection = await api<{ id: string; name: string }>(baseUrl, '/api/admin/collections', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: collectionName,
        type: 'capsule',
        description: 'Created by automated smoke test',
      }),
    });
    assert(collection.name === collectionName, 'Collection payload mismatch');

    const stockUpdate = await api<{ id: string; quantity: number }>(baseUrl, `/api/admin/blank-stock/${seededStock.id}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ quantity: seededStock.quantity + 1 }),
    });
    assert(stockUpdate.quantity === seededStock.quantity + 1, 'Stock update did not persist');

    console.log(JSON.stringify({
      ok: true,
      customerEmail,
      orderId: order.id,
      collectionId: collection.id,
      stockUpdated: stockUpdate.id,
    }, null, 2));
  } finally {
    if (stockReset) {
      await prisma.blankStock.update({
        where: { id: stockReset.id },
        data: { quantity: stockReset.quantity },
      });
    }

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
