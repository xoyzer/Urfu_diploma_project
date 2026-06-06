ALTER TABLE products ADD COLUMN subcategory TEXT;

-- Обновим существующие товары брусчатки на основе их названий
UPDATE products 
SET subcategory = 'Старый город' 
WHERE category = 'Брусчатка' AND name ILIKE '%Старый Город%';

UPDATE products 
SET subcategory = 'Новый город' 
WHERE category = 'Брусчатка' AND name ILIKE '%Новый Город%';

-- Остальную брусчатку можно отнести к "Кирпич" если в названии есть "кирпич" или оставить null
UPDATE products 
SET subcategory = 'Кирпич' 
WHERE category = 'Брусчатка' AND name ILIKE '%кирпич%';