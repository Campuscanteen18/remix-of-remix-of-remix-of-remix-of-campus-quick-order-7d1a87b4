import { z } from 'zod';

// Order validation schema
export const orderSchema = z.object({
  total: z.number().positive({ message: 'Total must be positive' }).max(999999, { message: 'Total exceeds maximum' }),
  customerName: z.string().min(1).max(100).trim().optional(),
  customerEmail: z.string().email().max(255).optional().or(z.literal('')),
  paymentMethod: z.string().min(1).max(50),
  items: z.array(z.object({
    id: z.string().uuid({ message: 'Invalid item ID' }),
    name: z.string().min(1).max(200),
    price: z.number().nonnegative(),
    quantity: z.number().int().positive().max(100, { message: 'Maximum 100 items per product' }),
  })).min(1, { message: 'Order must have at least one item' }),
});

// Menu item validation schema
export const menuItemSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }).max(200, { message: 'Name too long' }).trim(),
  price: z.number().positive({ message: 'Price must be positive' }).max(999999, { message: 'Price exceeds maximum' }),
  description: z.string().max(1000, { message: 'Description too long' }).optional().nullable(),
  quantity: z.number().int().nonnegative().max(9999, { message: 'Quantity exceeds maximum' }).optional(),
  is_veg: z.boolean().optional(),
  is_popular: z.boolean().optional(),
  is_available: z.boolean().optional(),
  available_time_periods: z.array(z.enum(['breakfast', 'lunch', 'snacks', 'dinner'])).optional(),
  image: z.string().url().max(2048).optional().nullable().or(z.literal('')),
  category: z.string().max(100).optional(),
});

// Menu item update schema (all fields optional except id)
export const menuItemUpdateSchema = z.object({
  id: z.string().uuid({ message: 'Invalid item ID' }),
  name: z.string().min(1).max(200).trim().optional(),
  price: z.number().positive().max(999999).optional(),
  description: z.string().max(1000).optional().nullable(),
  quantity: z.number().int().nonnegative().max(9999).optional(),
  is_veg: z.boolean().optional(),
  is_popular: z.boolean().optional(),
  is_available: z.boolean().optional(),
  available_time_periods: z.array(z.enum(['breakfast', 'lunch', 'snacks', 'dinner'])).optional(),
  image: z.string().url().max(2048).optional().nullable().or(z.literal('')),
  category: z.string().max(100).optional(),
});

// Admin PIN validation schema
export const pinSchema = z.string()
  .min(4, { message: 'PIN must be at least 4 digits' })
  .max(8, { message: 'PIN must be at most 8 digits' })
  .regex(/^\d+$/, { message: 'PIN must contain only digits' });

// Order status validation (simplified token system - no preparing/ready states)
export const orderStatusSchema = z.enum(['pending', 'confirmed', 'collected', 'cancelled']);

// Type exports
export type OrderInput = z.infer<typeof orderSchema>;
export type MenuItemInput = z.infer<typeof menuItemSchema>;
export type MenuItemUpdate = z.infer<typeof menuItemUpdateSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// Validation helper functions
export function validateOrder(data: unknown): { success: true; data: OrderInput } | { success: false; error: string } {
  const result = orderSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.errors[0]?.message || 'Invalid order data' };
}

export function validateMenuItem(data: unknown): { success: true; data: MenuItemInput } | { success: false; error: string } {
  const result = menuItemSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.errors[0]?.message || 'Invalid menu item data' };
}

export function validateMenuItemUpdate(data: unknown): { success: true; data: MenuItemUpdate } | { success: false; error: string } {
  const result = menuItemUpdateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.errors[0]?.message || 'Invalid menu item update' };
}

export function validatePin(pin: unknown): { success: true; data: string } | { success: false; error: string } {
  const result = pinSchema.safeParse(pin);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.errors[0]?.message || 'Invalid PIN' };
}
