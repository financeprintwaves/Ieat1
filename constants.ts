import { MenuItem } from './types';

export const INITIAL_INVENTORY: MenuItem[] = [
  { 
    id: '1', 
    name: 'Truffle Burger', 
    description: 'Angus beef, truffle aioli, brioche bun',
    price: 18, 
    cost: 8.50,
    category: 'food',
    stock: 45,
    lowStockThreshold: 10,
    barcode: '1001',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=60',
    modifiers: [
        { id: 'm1', name: 'Extra Cheese', price: 2 },
        { id: 'm2', name: 'Bacon', price: 3 },
        { id: 'm3', name: 'Gluten Free Bun', price: 1.5 }
    ]
  },
  { 
    id: '2', 
    name: 'Spicy Rigatoni', 
    description: 'Vodka sauce, calabrian chili, basil',
    price: 22, 
    cost: 6.00,
    category: 'food',
    stock: 30,
    lowStockThreshold: 5,
    barcode: '1002',
    image: 'https://images.unsplash.com/photo-1626844131082-256783844137?auto=format&fit=crop&w=500&q=60',
    modifiers: [
        { id: 'm4', name: 'Add Chicken', price: 5 },
        { id: 'm5', name: 'Extra Spicy', price: 0 }
    ]
  },
  { 
    id: '3', 
    name: 'Caesar Salad', 
    description: 'Romaine, parmesan, croutons',
    price: 14, 
    cost: 4.00,
    category: 'food',
    stock: 50,
    lowStockThreshold: 15,
    barcode: '1003',
    image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=500&q=60',
    modifiers: [
        { id: 'm4', name: 'Add Chicken', price: 5 },
        { id: 'm6', name: 'Add Salmon', price: 8 }
    ]
  },
  { 
    id: '4', 
    name: 'Crispy Calamari', 
    description: 'Served with marinara and lemon',
    price: 16, 
    cost: 7.00,
    category: 'food',
    stock: 20,
    lowStockThreshold: 8,
    barcode: '1004',
    image: 'https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=500&q=60'
  },
  { 
    id: '5', 
    name: 'Coca Cola', 
    description: 'Classic glass bottle',
    price: 4, 
    cost: 0.80,
    category: 'drink',
    stock: 120,
    lowStockThreshold: 24,
    barcode: '2001',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=60'
  },
  { 
    id: '6', 
    name: 'Craft IPA', 
    description: 'Local brewery draft',
    price: 8, 
    cost: 2.50,
    category: 'drink',
    stock: 40, // Keg equivalent
    lowStockThreshold: 5,
    barcode: '2002',
    image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=500&q=60'
  },
  { 
    id: '7', 
    name: 'House Red Wine', 
    description: 'Cabernet Sauvignon, California',
    price: 12, 
    cost: 3.00,
    category: 'drink',
    stock: 24, // Bottles
    lowStockThreshold: 6,
    barcode: '2003',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=500&q=60'
  },
  { 
    id: '8', 
    name: 'Tiramisu', 
    description: 'Espresso soaked ladyfingers',
    price: 10, 
    cost: 3.50,
    category: 'dessert',
    stock: 15,
    lowStockThreshold: 5,
    barcode: '3001',
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=500&q=60'
  },
];

export const MOCK_TABLES = ['1', '2', '3', '4', '5', 'VIP-1', 'OUT-1', 'OUT-2'];