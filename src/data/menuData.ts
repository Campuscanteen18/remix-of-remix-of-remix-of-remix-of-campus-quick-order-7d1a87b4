import { MenuItem, TimePeriod, Category } from '@/types/canteen';

export const categories: Category[] = [
  { id: 'all', name: 'All Items', icon: '🍽️' },
  { id: 'main-course', name: 'Main Course', icon: '🍛' },
  { id: 'breakfast', name: 'Breakfast', icon: '🍳' },
  { id: 'lunch', name: 'Lunch', icon: '🍱' },
  { id: 'snacks', name: 'Snacks', icon: '🍪' },
  { id: 'beverages', name: 'Beverages', icon: '☕' },
];

export const timePeriods: TimePeriod[] = [
  { id: 'breakfast', name: 'Breakfast', startHour: 7, endHour: 11, icon: '🌅' },
  { id: 'lunch', name: 'Lunch', startHour: 11, endHour: 15, icon: '☀️' },
  { id: 'snacks', name: 'Evening Snacks', startHour: 15, endHour: 18, icon: '🌤️' },
  { id: 'dinner', name: 'Dinner', startHour: 18, endHour: 22, icon: '🌙' },
];

export const menuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Chicken Biryani',
    description: 'Aromatic basmati rice with tender chicken and spices',
    price: 120,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400',
    category: 'main-course',
    isVeg: false,
    isPopular: true,
    isAvailable: true,
    availableTimePeriods: ['lunch', 'dinner'],
  },
  {
    id: '2',
    name: 'Veg Biryani',
    description: 'Fragrant rice with mixed vegetables and herbs',
    price: 90,
    image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400',
    category: 'main-course',
    isVeg: true,
    isPopular: true,
    isAvailable: true,
    availableTimePeriods: ['lunch', 'dinner'],
  },
  {
    id: '3',
    name: 'Parota',
    description: 'Soft layered South Indian flatbread',
    price: 15,
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400',
    category: 'main-course',
    isVeg: true,
    isAvailable: true,
    availableTimePeriods: ['breakfast', 'lunch', 'dinner'],
  },
  {
    id: '4',
    name: 'Samosa (2 pcs)',
    description: 'Crispy fried pastry with spiced potato filling',
    price: 20,
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400',
    category: 'snacks',
    isVeg: true,
    isPopular: true,
    isAvailable: true,
    availableTimePeriods: ['breakfast', 'lunch', 'snacks', 'dinner'],
  },
  {
    id: '5',
    name: 'Masala Dosa',
    description: 'Crispy rice crepe with spiced potato filling',
    price: 50,
    image: 'https://images.unsplash.com/photo-1668236543090-82eb5eaf701b?w=400',
    category: 'breakfast',
    isVeg: true,
    isPopular: true,
    isAvailable: true,
    availableTimePeriods: ['breakfast', 'snacks'],
  },
  {
    id: '6',
    name: 'Masala Chai',
    description: 'Hot spiced Indian tea with milk',
    price: 15,
    image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400',
    category: 'beverages',
    isVeg: true,
    isPopular: true,
    isAvailable: true,
    availableTimePeriods: ['breakfast', 'lunch', 'snacks', 'dinner'],
  },
  {
    id: '7',
    name: 'Sweet Lassi',
    description: 'Refreshing yogurt drink with a hint of cardamom',
    price: 30,
    image: 'https://images.unsplash.com/photo-1626201850386-e77fbdb68a59?w=400',
    category: 'beverages',
    isVeg: true,
    isAvailable: true,
    availableTimePeriods: ['lunch', 'snacks', 'dinner'],
  },
  {
    id: '8',
    name: 'Idli (3 pcs)',
    description: 'Steamed rice cakes served with chutney and sambar',
    price: 25,
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400',
    category: 'breakfast',
    isVeg: true,
    isAvailable: true,
    availableTimePeriods: ['breakfast'],
  },
  {
    id: '9',
    name: 'Puff',
    description: 'Flaky pastry with vegetable filling',
    price: 15,
    image: 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=400',
    category: 'snacks',
    isVeg: true,
    isAvailable: true,
    availableTimePeriods: ['breakfast', 'snacks'],
  },
  {
    id: '10',
    name: 'Cold Coffee',
    description: 'Chilled coffee with cream and ice',
    price: 40,
    image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400',
    category: 'beverages',
    isVeg: true,
    isAvailable: true,
    availableTimePeriods: ['breakfast', 'lunch', 'snacks'],
  },
];

export function getCurrentTimePeriod(): TimePeriod | null {
  const hour = new Date().getHours();
  return timePeriods.find(period => hour >= period.startHour && hour < period.endHour) || null;
}

export function getPopularItemsNow(): MenuItem[] {
  const currentPeriod = getCurrentTimePeriod();
  if (!currentPeriod) return menuItems.filter(item => item.isPopular);
  
  return menuItems.filter(
    item => item.isPopular && item.availableTimePeriods.includes(currentPeriod.id)
  );
}
