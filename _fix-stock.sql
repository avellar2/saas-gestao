DO $$
DECLARE
  os_id TEXT;
  memoria_id TEXT;
  ssd_id TEXT;
  memoria_qty DECIMAL;
  ssd_qty DECIMAL;
  company_id TEXT := 'cmqlsx5xc0000xosrtefpearx';
BEGIN
  SELECT id INTO os_id FROM service_orders WHERE number = 1 AND "companyId" = company_id LIMIT 1;
  SELECT id, quantity INTO memoria_id, memoria_qty FROM products WHERE name = 'Memória RAM Fury 4GB DDR4' AND "companyId" = company_id LIMIT 1;
  SELECT id, quantity INTO ssd_id, ssd_qty FROM products WHERE name = 'Kingston SSD 256GB' AND "companyId" = company_id LIMIT 1;

  RAISE NOTICE 'OS ID: %, Memória ID: % (qty: %), SSD ID: % (qty: %)', os_id, memoria_id, memoria_qty, ssd_id, ssd_qty;

  UPDATE products SET quantity = quantity - 2 WHERE id = memoria_id;
  UPDATE products SET quantity = quantity - 1 WHERE id = ssd_id;

  INSERT INTO stock_movements (id, "companyId", "productId", "serviceOrderId", type, reason, quantity, "previousQuantity", "newQuantity", description, "createdAt")
  VALUES (gen_random_uuid()::text, company_id, memoria_id, os_id, 'OUT', 'SALE', 2, memoria_qty, memoria_qty - 2, 'OS Nº 1 - Memória RAM Fury 4GB DDR4 (ajuste retroativo)', now());

  INSERT INTO stock_movements (id, "companyId", "productId", "serviceOrderId", type, reason, quantity, "previousQuantity", "newQuantity", description, "createdAt")
  VALUES (gen_random_uuid()::text, company_id, ssd_id, os_id, 'OUT', 'SALE', 1, ssd_qty, ssd_qty - 1, 'OS Nº 1 - Kingston SSD 256GB (ajuste retroativo)', now());
END $$;
