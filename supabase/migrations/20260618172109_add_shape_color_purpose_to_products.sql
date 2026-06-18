ALTER TABLE products ADD COLUMN IF NOT EXISTS shape TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS purpose TEXT;

-- Infer shape from product names
UPDATE products SET shape = 'Новый город' WHERE name ILIKE '%новый%город%';
UPDATE products SET shape = 'Старый город' WHERE name ILIKE '%старый%город%';

-- Infer color from product names
UPDATE products SET color = 'Туман' WHERE name ILIKE '%туман%';
UPDATE products SET color = 'Вегас' WHERE name ILIKE '%вегас%';
UPDATE products SET color = 'Тирамису' WHERE name ILIKE '%тирамису%';

-- Infer purpose: 40mm → pedestrian, 60mm → automotive
UPDATE products SET purpose = 'Пешеходные зоны'
  WHERE category = 'Брусчатка' AND name ILIKE '%40мм%';
UPDATE products SET purpose = 'Автомобильная зона'
  WHERE category = 'Брусчатка' AND name ILIKE '%60мм%';
