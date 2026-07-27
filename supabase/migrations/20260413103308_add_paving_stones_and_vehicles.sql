/*
  # Add Paving Stones and Vehicles

  1. New Data
    - Insert 4 types of paving stones (брусчатка) with different specifications
    - Insert 4 types of vehicles (манипулятор 5т, 8т, 10т и фура)

  2. Products
    - Новый Город "Туман" 40мм
    - Новый Город "Туман" 60мм
    - Старый Город "Туман" 40мм
    - Старый Город "Туман" 60мм

  3. Vehicles
    - Манипулятор 5т (capacity: 5.5т, палlets: 5)
    - Манипулятор 8т (capacity: 8т, pallets: 7)
    - Манипулятор 10т (capacity: 11т, pallets: 10)
    - Фура (capacity: 20т, pallets: 33)
*/

DO $$
BEGIN
  -- Insert paving stones if they don't exist
  INSERT INTO products (name, category, price_per_sqm, stock_quantity, description)
  VALUES
    ('Новый Город "Туман" 40мм', 'Брусчатка', 450, 100, 'Современная брусчатка размером 40мм'),
    ('Новый Город "Туман" 60мм', 'Брусчатка', 550, 80, 'Современная брусчатка размером 60мм'),
    ('Старый Город "Туман" 40мм', 'Брусчатка', 480, 90, 'Классическая брусчатка размером 40мм'),
    ('Старый Город "Туман" 60мм', 'Брусчатка', 580, 75, 'Классическая брусчатка размером 60мм')
  ON CONFLICT DO NOTHING;

  -- Insert vehicles if they don't exist
  INSERT INTO vehicles (name, type, capacity, license_plate, is_active)
  VALUES
    ('Манипулятор 5т', 'Манипулятор', 5.5, 'МОС-001', true),
    ('Манипулятор 8т', 'Манипулятор', 8, 'МОС-002', true),
    ('Манипулятор 10т', 'Манипулятор', 11, 'МОС-003', true),
    ('Фура', 'Фура', 20, 'ФУР-001', true)
  ON CONFLICT DO NOTHING;
END $$;