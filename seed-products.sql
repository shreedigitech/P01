-- Starter catalogue. Prices are editable and intentionally conservative placeholders/benchmarks,
-- not a promise of today's local market price. Replace with your supplier's actual purchase and shop prices.

insert into public.products
(sku,barcode,name,category_id,brand_id,size,color,unit_code,gst_rate,purchase_price,mrp,selling_price,wholesale_price,minimum_selling_price,minimum_stock,current_stock)
select * from (
  values
  ('EL-WIRE-POLY-075','890000000001','Polycab House Wire 0.75 sq.mm', (select id from categories where name='Wires & Cables'),(select id from brands where name='Polycab'),'0.75 sq.mm','Red','MTR',18,18,25,23,21,18,100,0),
  ('EL-WIRE-POLY-15R','890000000002','Polycab House Wire 1.5 sq.mm', (select id from categories where name='Wires & Cables'),(select id from brands where name='Polycab'),'1.5 sq.mm','Red','MTR',18,31,42,39,36,31,100,0),
  ('EL-WIRE-POLY-25R','890000000003','Polycab House Wire 2.5 sq.mm', (select id from categories where name='Wires & Cables'),(select id from brands where name='Polycab'),'2.5 sq.mm','Red','MTR',18,48,65,60,55,48,100,0),
  ('EL-WIRE-POLY-4R','890000000004','Polycab House Wire 4 sq.mm', (select id from categories where name='Wires & Cables'),(select id from brands where name='Polycab'),'4 sq.mm','Red','MTR',18,72,95,88,82,72,50,0),
  ('EL-WIRE-POLY-6R','890000000005','Polycab House Wire 6 sq.mm', (select id from categories where name='Wires & Cables'),(select id from brands where name='Polycab'),'6 sq.mm','Red','MTR',18,105,140,130,120,105,50,0),
  ('EL-SW-6A-GM','890000000006','GM 6A Modular Switch', (select id from categories where name='Switches & Sockets'),(select id from brands where name='GM'),'6A','','PCS',18,38,55,50,46,38,20,0),
  ('EL-SW-16A-GM','890000000007','GM 16A Modular Switch', (select id from categories where name='Switches & Sockets'),(select id from brands where name='GM'),'16A','','PCS',18,55,80,72,66,55,20,0),
  ('EL-SOC-6A-GM','890000000008','GM 6A Socket', (select id from categories where name='Switches & Sockets'),(select id from brands where name='GM'),'6A','','PCS',18,48,70,64,58,48,20,0),
  ('EL-SOC-16A-GM','890000000009','GM 16A Socket', (select id from categories where name='Switches & Sockets'),(select id from brands where name='GM'),'16A','','PCS',18,70,100,90,82,70,20,0),
  ('EL-MCB-1P-16','890000000010','1P MCB 16A', (select id from categories where name='MCB & Protection'),(select id from brands where name='Schneider'),'16A','','PCS',18,110,160,145,132,110,10,0),
  ('EL-MCB-2P-32','890000000011','2P MCB 32A', (select id from categories where name='MCB & Protection'),(select id from brands where name='Schneider'),'32A','','PCS',18,260,380,345,315,260,10,0),
  ('EL-RCCB-2P-40','890000000012','2P RCCB 40A 30mA', (select id from categories where name='MCB & Protection'),(select id from brands where name='Schneider'),'40A','','PCS',18,900,1250,1150,1050,900,5,0),
  ('EL-LED-9W','890000000013','LED Bulb 9W', (select id from categories where name='LED & Lighting'),(select id from brands where name='Havells'),'9W','','PCS',18,75,110,99,90,75,20,0),
  ('EL-LED-12W','890000000014','LED Bulb 12W', (select id from categories where name='LED & Lighting'),(select id from brands where name='Havells'),'12W','','PCS',18,95,140,125,115,95,20,0),
  ('EL-LED-20W','890000000015','LED Bulb 20W', (select id from categories where name='LED & Lighting'),(select id from brands where name='Havells'),'20W','','PCS',18,150,220,199,180,150,10,0),
  ('EL-TAPE-PVC','890000000016','PVC Insulation Tape', (select id from categories where name='Electrical Accessories'),(select id from brands where name='Generic'),'','','PCS',18,8,15,12,10,8,50,0),
  ('EL-CABLE-TIE-100','890000000017','Cable Tie 100mm Pack', (select id from categories where name='Electrical Accessories'),(select id from brands where name='Generic'),'100mm','','PACK',18,22,35,30,27,22,20,0),
  ('EL-CONDUIT-20','890000000018','PVC Conduit 20mm', (select id from categories where name='Conduit & Fittings'),(select id from brands where name='Generic'),'20mm','','MTR',18,18,28,25,22,18,50,0),
  ('PL-CPVC-20','890000000019','CPVC Pipe 20mm', (select id from categories where name='CPVC Pipes'),(select id from brands where name='Astral'),'20mm','','MTR',18,75,105,95,87,75,30,0),
  ('PL-CPVC-25','890000000020','CPVC Pipe 25mm', (select id from categories where name='CPVC Pipes'),(select id from brands where name='Astral'),'25mm','','MTR',18,105,145,132,120,105,30,0),
  ('PL-UPVC-25','890000000021','uPVC Pipe 25mm', (select id from categories where name='PVC / uPVC Pipes'),(select id from brands where name='Supreme'),'25mm','','MTR',18,55,80,72,65,55,30,0),
  ('PL-UPVC-32','890000000022','uPVC Pipe 32mm', (select id from categories where name='PVC / uPVC Pipes'),(select id from brands where name='Supreme'),'32mm','','MTR',18,78,110,99,90,78,30,0),
  ('PL-SWR-75','890000000023','SWR Pipe 75mm', (select id from categories where name='SWR Pipes'),(select id from brands where name='Supreme'),'75mm','','MTR',18,95,135,122,110,95,20,0),
  ('PL-SWR-110','890000000024','SWR Pipe 110mm', (select id from categories where name='SWR Pipes'),(select id from brands where name='Supreme'),'110mm','','MTR',18,145,205,185,168,145,20,0),
  ('PL-ELB-CPVC-20','890000000025','CPVC Elbow 20mm', (select id from categories where name='Pipe Fittings'),(select id from brands where name='Astral'),'20mm','','PCS',18,18,28,25,22,18,50,0),
  ('PL-TEE-CPVC-20','890000000026','CPVC Tee 20mm', (select id from categories where name='Pipe Fittings'),(select id from brands where name='Astral'),'20mm','','PCS',18,28,42,38,34,28,30,0),
  ('PL-SOCKET-CPVC-20','890000000027','CPVC Coupler 20mm', (select id from categories where name='Pipe Fittings'),(select id from brands where name='Astral'),'20mm','','PCS',18,20,30,27,24,20,50,0),
  ('PL-ELB-CPVC-25','890000000028','CPVC Elbow 25mm', (select id from categories where name='Pipe Fittings'),(select id from brands where name='Astral'),'25mm','','PCS',18,30,45,40,36,30,30,0),
  ('PL-VALVE-20','890000000029','Brass Ball Valve 20mm', (select id from categories where name='Valves'),(select id from brands where name='Generic'),'20mm','','PCS',18,170,250,225,205,170,10,0),
  ('PL-VALVE-25','890000000030','Brass Ball Valve 25mm', (select id from categories where name='Valves'),(select id from brands where name='Generic'),'25mm','','PCS',18,240,350,315,287,240,10,0),
  ('PL-TAP-BIB','890000000031','Bib Cock', (select id from categories where name='Taps & Faucets'),(select id from brands where name='Jaquar'),'15mm','','PCS',18,300,450,405,370,300,5,0),
  ('PL-TAP-PILLAR','890000000032','Pillar Cock', (select id from categories where name='Taps & Faucets'),(select id from brands where name='Jaquar'),'15mm','','PCS',18,380,550,495,450,380,5,0),
  ('PL-HF','890000000033','Health Faucet Set', (select id from categories where name='Bathroom & Sanitary'),(select id from brands where name='Cera'),'','','SET',18,280,420,380,345,280,5,0),
  ('PL-FLEX-60','890000000034','Flexible Connector 60cm', (select id from categories where name='Bathroom & Sanitary'),(select id from brands where name='Generic'),'60cm','','PCS',18,65,95,85,77,65,20,0),
  ('PL-PTFE','890000000035','PTFE Teflon Tape', (select id from categories where name='Adhesives & Consumables'),(select id from brands where name='Generic'),'12mm','','PCS',18,8,15,12,10,8,50,0),
  ('PL-PVC-SOLVENT','890000000036','PVC Solvent Cement 100ml', (select id from categories where name='Adhesives & Consumables'),(select id from brands where name='Generic'),'100ml','','PCS',18,55,80,72,65,55,10,0),
  ('PL-CPVC-SOLVENT','890000000037','CPVC Solvent Cement 100ml', (select id from categories where name='Adhesives & Consumables'),(select id from brands where name='Generic'),'100ml','','PCS',18,65,95,85,77,65,10,0),
  ('PL-TANK-500','890000000038','Plastic Water Tank 500L', (select id from categories where name='Water Tank & Hose'),(select id from brands where name='Generic'),'500L','','PCS',18,5200,7000,6300,5800,5200,2,0),
  ('PL-HOSE-1','890000000039','PVC Flexible Hose 1 inch', (select id from categories where name='Water Tank & Hose'),(select id from brands where name='Generic'),'1 inch','','MTR',18,45,65,59,54,45,30,0),
  ('PL-PUMP-1HP','890000000040','1 HP Water Pump', (select id from categories where name='Pumps'),(select id from brands where name='V-Guard'),'1 HP','','PCS',18,5200,7000,6300,5800,5200,2,0)
) as s(sku,barcode,name,category_id,brand_id,size,color,unit_code,gst_rate,purchase_price,mrp,selling_price,wholesale_price,minimum_selling_price,minimum_stock,current_stock)
on conflict(sku) do nothing;
