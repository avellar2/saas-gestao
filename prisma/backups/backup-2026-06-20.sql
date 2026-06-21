--
-- PostgreSQL database dump
--

\restrict qHZSMHWYhMKl0DWqnDhU0CZQuV80E79jN1pOv0TZwivVywCHX3yeXsAea2ZPv1v

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: gestor
--

INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('0800ba5f-aff2-49c3-bf44-74e8a2ffe837', 'dfd94026f898eae0df4a6fec9fc70c2b7a6ed591228f1acfe643fdf1af3b5035', '2026-06-20 03:30:09.429427+00', '20260612183719_init', NULL, NULL, '2026-06-20 03:30:04.90974+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('3d4a85fc-576d-4a77-9768-c4e07a4574b3', '24a6d2b847e481cc67408f2b457d6dae149502b90a6ae97f31296d3731046cb3', '2026-06-20 03:30:16.735812+00', '20260615170000_os_premium', NULL, NULL, '2026-06-20 03:30:15.713195+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('990bbb37-5a62-4dd3-980b-1f101f894f8c', '833e83d9ca25ef93952fc77a6b6e981cf02155318e22592461085f0a9a2a6193', '2026-06-20 03:30:10.166+00', '20260612200000_rls', NULL, NULL, '2026-06-20 03:30:09.434602+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('3f3b10ec-787d-463a-8e73-44733d053470', 'b7506813695520e9e142173b9af47dfc9a0203076c5e69af4a1af841cbabfa5c', '2026-06-20 03:30:11.076517+00', '20260613015554_add_inventory_finance', NULL, NULL, '2026-06-20 03:30:10.171047+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('940c7bc3-2bd5-47b9-bf2b-5be248dc0383', '314dbcb4cf9d6997a6a547bf5593416678f0f20d7b9113881f8f7c34d4c1dd62', '2026-06-20 03:30:20.798324+00', '20260619160000_add_quote_financial_relation', NULL, NULL, '2026-06-20 03:30:20.616733+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('701f76c8-b201-4d35-b0b8-4f87ade67acc', 'e7cba728ba91a17d8a3cf1274268aa51132689ef2e8b0a90bd64eedf46bbbe09', '2026-06-20 03:30:11.406211+00', '20260613020000_rls_new_tables', NULL, NULL, '2026-06-20 03:30:11.082816+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('dfc53245-fb13-44dd-8a83-3a64ab245ff9', '3601c72baa7acc778f8e1bc3bd1f4cbc27048ae4c4e8631eaf86b755cb6defac', '2026-06-20 03:30:17.863999+00', '20260616131646_add_stock_movement_and_inventory_integration', NULL, NULL, '2026-06-20 03:30:16.741062+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('3e81c598-1a5d-4ec6-b169-f57cbac2e331', '03366d958e3bb7ed1fd371e18593c022718fd2867c8a3141188d3b675b599632', '2026-06-20 03:30:12.571178+00', '20260613021911_add_scheduling_catalog_menu', NULL, NULL, '2026-06-20 03:30:11.412552+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('febc58a1-e45e-44c1-aabf-f87246261a37', '5a49f07fda8405ae037fa1eff96c9e8420df1e93fbdc7f613f73e44667779f62', '2026-06-20 03:30:12.958885+00', '20260613022000_rls_new_tables_2', NULL, NULL, '2026-06-20 03:30:12.576236+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('36256bf4-2742-46c5-a3db-100bdb2580b4', '9bbe978801c3b1ca23fffd0152e99dc2094f44ca012a3c9b086d191d35ea1ee2', '2026-06-20 03:30:13.384609+00', '20260613024144_add_activity_log', NULL, NULL, '2026-06-20 03:30:12.964081+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('4af020b3-601d-4f0c-b333-5fdad2c366de', 'a514d7a7a0518cc04f0639c84579d1d8871dcc82d4927cd3885031a2840853d0', '2026-06-20 03:30:19.627347+00', '20260616140000_add_menu_orders_and_tables', NULL, NULL, '2026-06-20 03:30:17.86914+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('da735ab2-a557-4b6d-ae29-96a4d03f7faa', '192ee7f3c19799b4fd1cd64bf181b5192872a9bc86b62ea8e5e7d7dcd3480ec6', '2026-06-20 03:30:13.481205+00', '20260613024200_rls_activity_log', NULL, NULL, '2026-06-20 03:30:13.389655+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('34f11b6d-eba1-4603-8dea-db20b096bd19', '4e0d1f0bcb6b58e3e17b756a46297b8420b00bff95e4c31cab9c4d99cbe039a0', '2026-06-20 03:30:14.066443+00', '20260613192928_add_password_reset_tokens', NULL, NULL, '2026-06-20 03:30:13.486123+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('48b7b13f-3d47-4463-8c52-3acef0ef23d6', 'e368b9b4d20174a16cc0a9f6cbc08042c5d9e5cb8d502740f95cb68a6340c1fa', '2026-06-20 03:30:14.21511+00', '20260613193000_rls_set_session_variable', NULL, NULL, '2026-06-20 03:30:14.071272+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('04458ba7-3dfd-47a2-86e5-b8d229e5be3e', 'cdc83a81e2c95b689fa642b813c96a01a88e7ec625879fed0c3312bcbcc45b27', '2026-06-20 03:30:19.739987+00', '20260616150000_add_menu_order_finance_link', NULL, NULL, '2026-06-20 03:30:19.632194+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('52aa7577-0779-47ce-a977-d2b36c4eb2bd', '22aa42c9e3b18fbd196deed7e095b8790d9ed7f39fec087c1de97d7fed0ced3e', '2026-06-20 03:30:15.159063+00', '20260613193100_force_rls', NULL, NULL, '2026-06-20 03:30:14.219654+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('d6104b7e-b0c1-4b83-a4cd-cb50e06fd0b3', 'b9225b4829f1db5ac87f9c707db14a53a444cc8d68248019d97317a501dfe611', '2026-06-20 03:30:15.481611+00', '20260613193200_rls_app_role', NULL, NULL, '2026-06-20 03:30:15.164613+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('778bf272-30b6-4e43-9dde-45a44dd09923', '68a7d549089ce2e6d170db2bbd01f53c775c2361815f5d849fdf0e4523db8b9e', '2026-06-20 03:30:20.90696+00', '20260620000000_add_public_token', NULL, NULL, '2026-06-20 03:30:20.803701+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('8ebbdd76-43b5-4be4-8ec3-ca9104a8b45f', '83c25550d8229333d86d2eef0b3249660c651098b14b474d4138e8f82af9885e', '2026-06-20 03:30:15.70753+00', '20260614000000_add_stripe_fields', NULL, NULL, '2026-06-20 03:30:15.486512+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('c3c79e6c-f813-4b79-a120-1f7dae04d073', '91195f6ab033e836d84b582e0fd4f9db4565066f574843d7e75239d4d5edc3d6', '2026-06-20 03:30:19.842031+00', '20260616154612_add_menu_order_payment', NULL, NULL, '2026-06-20 03:30:19.744919+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('9845a7fb-67b2-4a99-a98f-8ee074233b8e', 'd0cd7b856f5673d7dc15906a1f2b1215e5cad4318d1b9ad27a618ac57a55a539', '2026-06-20 03:30:20.254673+00', '20260619120000_add_stripe_modular_fields', NULL, NULL, '2026-06-20 03:30:19.856458+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('e2361a56-8e03-460e-8ac7-12f9f8a93360', '739f27e27273de7259a738bc8f6cae14ff9185564b32f1532b4b6cb40857345c', '2026-06-20 03:30:20.281639+00', '20260619140000_add_webhook_event_status', NULL, NULL, '2026-06-20 03:30:20.259781+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('43d10ad5-032d-40fa-8898-07c97dafc912', '99b93531b9c19f3defd08774e1ba2258c448c5a9d5baae2e376c677a94cdd5ce', '2026-06-20 03:30:20.611522+00', '20260619150000_add_quote_send_approval_fields', NULL, NULL, '2026-06-20 03:30:20.378841+00', 1);


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: gestor
--

INSERT INTO public.companies (id, name, "tradeName", document, phone, whatsapp, email, address, status, "trialStartsAt", "trialEndsAt", "planName", "monthlyPrice", "createdAt", "updatedAt", "stripeCustomerId", slug) VALUES ('super-admin', 'Gestor Local Admin', NULL, NULL, NULL, NULL, NULL, NULL, 'ACTIVE', NULL, NULL, NULL, NULL, '2026-06-20 03:30:33.729', '2026-06-20 03:30:33.729', NULL, NULL);
INSERT INTO public.companies (id, name, "tradeName", document, phone, whatsapp, email, address, status, "trialStartsAt", "trialEndsAt", "planName", "monthlyPrice", "createdAt", "updatedAt", "stripeCustomerId", slug) VALUES ('cmqlsvdwk000b2osrscx2153w', 'Eletronica Silva', 'E-Silva', '12.345.678/0001-90', '(11) 99999-1111', '5511999991111', 'contato@esilva.com', 'Rua das Flores, 123 - Sao Paulo/SP', 'TRIAL', '2026-06-20 03:30:33.418', '2026-07-05 03:30:33.418', NULL, NULL, '2026-06-20 03:30:34.148', '2026-06-20 03:30:34.148', NULL, NULL);
INSERT INTO public.companies (id, name, "tradeName", document, phone, whatsapp, email, address, status, "trialStartsAt", "trialEndsAt", "planName", "monthlyPrice", "createdAt", "updatedAt", "stripeCustomerId", slug) VALUES ('cmqlsve0y000g2osrhj9j8nk6', 'Auto Mecanica Central', 'Mecanica Central', '98.765.432/0001-10', '(11) 98888-2222', '5511988882222', 'contato@mecanicacentral.com', 'Av. Brasil, 456 - Sao Paulo/SP', 'ACTIVE', NULL, NULL, 'Profissional', 154.00, '2026-06-20 03:30:34.306', '2026-06-20 03:30:34.306', NULL, NULL);
INSERT INTO public.companies (id, name, "tradeName", document, phone, whatsapp, email, address, status, "trialStartsAt", "trialEndsAt", "planName", "monthlyPrice", "createdAt", "updatedAt", "stripeCustomerId", slug) VALUES ('cmqlsx5xc0000xosrtefpearx', 'Vanderson Avellar', 'Avellar Digital', '17364075704', '21968410983', '21968410983', 'vandimavellar1997@gmail.com', 'Rua Marquesa de Santos - Pantanal, Duque de Caxias - RJ, Brasil, 25265-008', 'TRIAL', '2026-06-20 03:31:56.749', '2026-07-05 03:31:56.749', NULL, 214.00, '2026-06-20 03:31:57.12', '2026-06-20 03:36:46.949', NULL, NULL);


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: gestor
--

INSERT INTO public.activity_logs (id, "companyId", "userId", "userName", action, entity, "entityId", details, "createdAt") VALUES ('cmqlsx5y8000exosrn3w3fv09', 'cmqlsx5xc0000xosrtefpearx', 'cmqlhyuzr000aagsr3fn9orlr', 'Admin Gestor Local', 'CREATE', 'company', 'cmqlsx5xc0000xosrtefpearx', 'Empresa "Vanderson Avellar" criada com administrador Vanderson Avellar da Silva (vandimavellar1997@gmail.com)', '2026-06-20 03:31:57.152');
INSERT INTO public.activity_logs (id, "companyId", "userId", "userName", action, entity, "entityId", details, "createdAt") VALUES ('cmqlt8o7q000gxosr78kcqa4q', 'cmqlsx5xc0000xosrtefpearx', 'cmqlsx5y1000cxosr6w84dx15', 'Vanderson Avellar da Silva', 'CREATE', 'customer', 'cmqlt8o6o000fxosr2e58tzlp', 'Nome: Ana Carolina Avellar', '2026-06-20 03:40:54.038');
INSERT INTO public.activity_logs (id, "companyId", "userId", "userName", action, entity, "entityId", details, "createdAt") VALUES ('cmqltbvfk000ixosrq31ye3im', 'cmqlsx5xc0000xosrtefpearx', 'cmqlsx5y1000cxosr6w84dx15', 'Vanderson Avellar da Silva', 'CREATE', 'product', 'cmqltbvf8000hxosr7nzxznpr', 'Nome: Kingston SSD 256GB - SKU: 001', '2026-06-20 03:43:23.36');
INSERT INTO public.activity_logs (id, "companyId", "userId", "userName", action, entity, "entityId", details, "createdAt") VALUES ('cmqltdiyw000kxosrg5qbj06d', 'cmqlsx5xc0000xosrtefpearx', 'cmqlsx5y1000cxosr6w84dx15', 'Vanderson Avellar da Silva', 'CREATE', 'product', 'cmqltdiyo000jxosrrid5yvod', 'Nome: Memória RAM Fury 4GB DDR4 - SKU: 002', '2026-06-20 03:44:40.52');
INSERT INTO public.activity_logs (id, "companyId", "userId", "userName", action, entity, "entityId", details, "createdAt") VALUES ('cmqltfw5l000pxosrf70znfi1', 'cmqlsx5xc0000xosrtefpearx', 'cmqlsx5y1000cxosr6w84dx15', 'Vanderson Avellar da Silva', 'CREATE', 'quote', 'cmqltfw3w000lxosr7lp3j18f', 'Nº 1 - Cliente: Ana Carolina Avellar', '2026-06-20 03:46:30.921');
INSERT INTO public.activity_logs (id, "companyId", "userId", "userName", action, entity, "entityId", details, "createdAt") VALUES ('cmqltgilb000qxosrz344dlef', 'cmqlsx5xc0000xosrtefpearx', 'cmqlsx5y1000cxosr6w84dx15', 'Vanderson Avellar da Silva', 'UPDATE', 'quote', 'cmqltfw3w000lxosr7lp3j18f', 'Nº 1 - Fluxo WhatsApp aberto para 219878454578', '2026-06-20 03:46:59.999');
INSERT INTO public.activity_logs (id, "companyId", "userId", "userName", action, entity, "entityId", details, "createdAt") VALUES ('cmqltgsbm000rxosr5bflqpnt', 'cmqlsx5xc0000xosrtefpearx', 'cmqlsx5y1000cxosr6w84dx15', 'Vanderson Avellar da Silva', 'UPDATE', 'quote', 'cmqltfw3w000lxosr7lp3j18f', 'Nº 1 - Fluxo WhatsApp aberto para 219878454578', '2026-06-20 03:47:12.61');
INSERT INTO public.activity_logs (id, "companyId", "userId", "userName", action, entity, "entityId", details, "createdAt") VALUES ('cmqltgsyl000sxosrk1wfmiso', 'cmqlsx5xc0000xosrtefpearx', 'cmqlsx5y1000cxosr6w84dx15', 'Vanderson Avellar da Silva', 'UPDATE', 'quote', 'cmqltfw3w000lxosr7lp3j18f', 'Nº 1 - Fluxo WhatsApp aberto para 219878454578', '2026-06-20 03:47:13.437');
INSERT INTO public.activity_logs (id, "companyId", "userId", "userName", action, entity, "entityId", details, "createdAt") VALUES ('cmqltgtoj000txosr29gvi76a', 'cmqlsx5xc0000xosrtefpearx', 'cmqlsx5y1000cxosr6w84dx15', 'Vanderson Avellar da Silva', 'UPDATE', 'quote', 'cmqltfw3w000lxosr7lp3j18f', 'Nº 1 - Fluxo WhatsApp aberto para 219878454578', '2026-06-20 03:47:14.371');
INSERT INTO public.activity_logs (id, "companyId", "userId", "userName", action, entity, "entityId", details, "createdAt") VALUES ('cmqltgu12000uxosri76s8lnb', 'cmqlsx5xc0000xosrtefpearx', 'cmqlsx5y1000cxosr6w84dx15', 'Vanderson Avellar da Silva', 'UPDATE', 'quote', 'cmqltfw3w000lxosr7lp3j18f', 'Nº 1 - Fluxo WhatsApp aberto para 219878454578', '2026-06-20 03:47:14.822');
INSERT INTO public.activity_logs (id, "companyId", "userId", "userName", action, entity, "entityId", details, "createdAt") VALUES ('cmqltgymf000vxosriq9xbck9', 'cmqlsx5xc0000xosrtefpearx', 'cmqlsx5y1000cxosr6w84dx15', 'Vanderson Avellar da Silva', 'UPDATE', 'quote', 'cmqltfw3w000lxosr7lp3j18f', 'Nº 1 - Fluxo WhatsApp aberto para 219878454578', '2026-06-20 03:47:20.775');
INSERT INTO public.activity_logs (id, "companyId", "userId", "userName", action, entity, "entityId", details, "createdAt") VALUES ('cmqltgzbf000wxosrymy4m8f7', 'cmqlsx5xc0000xosrtefpearx', 'cmqlsx5y1000cxosr6w84dx15', 'Vanderson Avellar da Silva', 'UPDATE', 'quote', 'cmqltfw3w000lxosr7lp3j18f', 'Nº 1 - Fluxo WhatsApp aberto para 219878454578', '2026-06-20 03:47:21.675');
INSERT INTO public.activity_logs (id, "companyId", "userId", "userName", action, entity, "entityId", details, "createdAt") VALUES ('cmqltgzzz000xxosrvvv32eof', 'cmqlsx5xc0000xosrtefpearx', 'cmqlsx5y1000cxosr6w84dx15', 'Vanderson Avellar da Silva', 'UPDATE', 'quote', 'cmqltfw3w000lxosr7lp3j18f', 'Nº 1 - Fluxo WhatsApp aberto para 219878454578', '2026-06-20 03:47:22.559');
INSERT INTO public.activity_logs (id, "companyId", "userId", "userName", action, entity, "entityId", details, "createdAt") VALUES ('cmqltnjrc000yxosrxo6ay4yu', 'cmqlsx5xc0000xosrtefpearx', 'cmqlsx5y1000cxosr6w84dx15', 'Vanderson Avellar da Silva', 'UPDATE', 'customer', 'cmqlt8o6o000fxosr2e58tzlp', 'Nome: Ana Carolina Avellar', '2026-06-20 03:52:28.104');
INSERT INTO public.activity_logs (id, "companyId", "userId", "userName", action, entity, "entityId", details, "createdAt") VALUES ('cmqltoavg000zxosrkpr7ockv', 'cmqlsx5xc0000xosrtefpearx', 'cmqlsx5y1000cxosr6w84dx15', 'Vanderson Avellar da Silva', 'UPDATE', 'quote', 'cmqltfw3w000lxosr7lp3j18f', 'Nº 1 - Fluxo WhatsApp aberto para 21982489163', '2026-06-20 03:53:03.244');
INSERT INTO public.activity_logs (id, "companyId", "userId", "userName", action, entity, "entityId", details, "createdAt") VALUES ('cmqltpjc30010xosrxmsp8sha', 'cmqlsx5xc0000xosrtefpearx', 'cmqlsx5y1000cxosr6w84dx15', 'Vanderson Avellar da Silva', 'UPDATE', 'quote', 'cmqltfw3w000lxosr7lp3j18f', 'Nº 1 - Enviado por e-mail para vandersonavellar1997@gmail.com', '2026-06-20 03:54:00.867');


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: gestor
--

INSERT INTO public.customers (id, "companyId", name, phone, whatsapp, email, document, address, notes, "createdAt", "updatedAt") VALUES ('cmqlsve0p000f2osr6rcas5os', 'cmqlsvdwk000b2osrscx2153w', 'Ana Paula', '(11) 97777-3333', NULL, 'anapaula@email.com', NULL, NULL, NULL, '2026-06-20 03:30:34.297', '2026-06-20 03:30:34.297');
INSERT INTO public.customers (id, "companyId", name, phone, whatsapp, email, document, address, notes, "createdAt", "updatedAt") VALUES ('cmqlsvea5000u2osrx4e137uz', 'cmqlsve0y000g2osrhj9j8nk6', 'Carlos Santos', '(11) 91234-5678', NULL, 'carlos@email.com', '123.456.789-00', NULL, NULL, '2026-06-20 03:30:34.637', '2026-06-20 03:30:34.637');
INSERT INTO public.customers (id, "companyId", name, phone, whatsapp, email, document, address, notes, "createdAt", "updatedAt") VALUES ('cmqlsveaa000v2osrqbyqz0yb', 'cmqlsve0y000g2osrhj9j8nk6', 'Maria Souza', '(11) 92345-6789', NULL, 'maria@email.com', '234.567.890-00', NULL, NULL, '2026-06-20 03:30:34.642', '2026-06-20 03:30:34.642');
INSERT INTO public.customers (id, "companyId", name, phone, whatsapp, email, document, address, notes, "createdAt", "updatedAt") VALUES ('cmqlsvebc000w2osr9zbhutax', 'cmqlsve0y000g2osrhj9j8nk6', 'Pedro Lima', '(11) 93456-7890', NULL, 'pedro@email.com', '345.678.901-00', NULL, NULL, '2026-06-20 03:30:34.68', '2026-06-20 03:30:34.68');
INSERT INTO public.customers (id, "companyId", name, phone, whatsapp, email, document, address, notes, "createdAt", "updatedAt") VALUES ('cmqlsvebh000x2osr6y7ci2jx', 'cmqlsve0y000g2osrhj9j8nk6', 'Fernanda Rocha', '(11) 94567-8901', NULL, 'fernanda@email.com', '456.789.012-00', NULL, NULL, '2026-06-20 03:30:34.685', '2026-06-20 03:30:34.685');
INSERT INTO public.customers (id, "companyId", name, phone, whatsapp, email, document, address, notes, "createdAt", "updatedAt") VALUES ('cmqlsvebm000y2osrk3gjli2f', 'cmqlsve0y000g2osrhj9j8nk6', 'Ricardo Alves', '(11) 95678-9012', NULL, 'ricardo@email.com', '567.890.123-00', NULL, NULL, '2026-06-20 03:30:34.69', '2026-06-20 03:30:34.69');
INSERT INTO public.customers (id, "companyId", name, phone, whatsapp, email, document, address, notes, "createdAt", "updatedAt") VALUES ('cmqlt8o6o000fxosr2e58tzlp', 'cmqlsx5xc0000xosrtefpearx', 'Ana Carolina Avellar', '21987845457', '21982489163', 'vandersonavellar1997@gmail.com', NULL, 'Rua Marquesa de Santos - Pantanal, Duque de Caxias - RJ, Brasil, 25265-008', NULL, '2026-06-20 03:40:54', '2026-06-20 03:52:27.89');


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: gestor
--

INSERT INTO public.appointments (id, "companyId", "customerId", title, description, "dateTime", duration, status, notes, "createdAt", "updatedAt") VALUES ('cmqlsveh6001h2osrhphw2k8y', 'cmqlsve0y000g2osrhj9j8nk6', 'cmqlsvea5000u2osrx4e137uz', 'Revisao Gol', 'Revisao de 50.000km', '2026-06-21 12:00:00', 120, 'CONFIRMED', NULL, '2026-06-20 03:30:34.89', '2026-06-20 03:30:34.89');
INSERT INTO public.appointments (id, "companyId", "customerId", title, description, "dateTime", duration, status, notes, "createdAt", "updatedAt") VALUES ('cmqlsvehd001i2osrt7onzjxy', 'cmqlsve0y000g2osrhj9j8nk6', 'cmqlsveaa000v2osrqbyqz0yb', 'Troca Oleo', 'Troca de oleo e filtro', '2026-06-22 17:30:00', 60, 'SCHEDULED', NULL, '2026-06-20 03:30:34.897', '2026-06-20 03:30:34.897');


--
-- Data for Name: catalog_items; Type: TABLE DATA; Schema: public; Owner: gestor
--

INSERT INTO public.catalog_items (id, "companyId", name, description, price, category, "imageUrl", active, "createdAt", "updatedAt") VALUES ('cmqlsveig001j2osr1ppo2nwh', 'cmqlsve0y000g2osrhj9j8nk6', 'Troca de Oleo Completa', 'Troca de oleo sintetico 5W30 + filtro', 180.00, 'Servicos', NULL, true, '2026-06-20 03:30:34.936', '2026-06-20 03:30:34.936');
INSERT INTO public.catalog_items (id, "companyId", name, description, price, category, "imageUrl", active, "createdAt", "updatedAt") VALUES ('cmqlsveio001k2osr0l9f8wm0', 'cmqlsve0y000g2osrhj9j8nk6', 'Alinhamento e Balanceamento', 'Alinhamento 3D + balanceamento das 4 rodas', 120.00, 'Servicos', NULL, true, '2026-06-20 03:30:34.944', '2026-06-20 03:30:34.944');
INSERT INTO public.catalog_items (id, "companyId", name, description, price, category, "imageUrl", active, "createdAt", "updatedAt") VALUES ('cmqlsveit001l2osrzlu1gq1i', 'cmqlsve0y000g2osrhj9j8nk6', 'Pastilha de Freio Dianteira', 'Jogo de pastilhas de freio originais', 160.00, 'Pecas', NULL, true, '2026-06-20 03:30:34.949', '2026-06-20 03:30:34.949');


--
-- Data for Name: modules; Type: TABLE DATA; Schema: public; Owner: gestor
--

INSERT INTO public.modules (id, key, name, description, "basePrice", active, "sortOrder", "createdAt", "updatedAt") VALUES ('cmqlsvdga00002osrtl4npc62', 'customers', 'Clientes', 'Cadastro e gestão de clientes — base para todos os módulos', 0.00, true, 1, '2026-06-20 03:30:33.563', '2026-06-20 03:30:33.563');
INSERT INTO public.modules (id, key, name, description, "basePrice", active, "sortOrder", "createdAt", "updatedAt") VALUES ('cmqlsvdhq00012osrvj4e4j6l', 'quotes', 'Orçamentos', 'Crie e envie orçamentos profissionais', 30.00, true, 2, '2026-06-20 03:30:33.614', '2026-06-20 03:30:33.614');
INSERT INTO public.modules (id, key, name, description, "basePrice", active, "sortOrder", "createdAt", "updatedAt") VALUES ('cmqlsvdhz00022osrx0k3b1ce', 'service_orders', 'OS Premium', 'Ordens de serviço avançadas com portal do cliente, garantia e previsão de entrega', 35.00, true, 3, '2026-06-20 03:30:33.623', '2026-06-20 03:30:33.623');
INSERT INTO public.modules (id, key, name, description, "basePrice", active, "sortOrder", "createdAt", "updatedAt") VALUES ('cmqlsvdi700032osrm8soy7l8', 'scheduling', 'Agendamento', 'Agenda de compromissos e serviços', 20.00, true, 4, '2026-06-20 03:30:33.631', '2026-06-20 03:30:33.631');
INSERT INTO public.modules (id, key, name, description, "basePrice", active, "sortOrder", "createdAt", "updatedAt") VALUES ('cmqlsvdjc00042osrr3yp86l7', 'finance', 'Financeiro', 'Controle financeiro e fluxo de caixa', 20.00, true, 5, '2026-06-20 03:30:33.672', '2026-06-20 03:30:33.672');
INSERT INTO public.modules (id, key, name, description, "basePrice", active, "sortOrder", "createdAt", "updatedAt") VALUES ('cmqlsvdjj00052osryquywjrz', 'inventory', 'Estoque', 'Controle de produtos e materiais em estoque', 20.00, true, 6, '2026-06-20 03:30:33.679', '2026-06-20 03:30:33.679');
INSERT INTO public.modules (id, key, name, description, "basePrice", active, "sortOrder", "createdAt", "updatedAt") VALUES ('cmqlsvdjp00062osruvqh59ig', 'catalog', 'Vitrine WhatsApp', 'Vitrine de produtos integrada ao WhatsApp (legado)', 0.00, false, 7, '2026-06-20 03:30:33.685', '2026-06-20 03:30:33.685');
INSERT INTO public.modules (id, key, name, description, "basePrice", active, "sortOrder", "createdAt", "updatedAt") VALUES ('cmqlsvdjw00072osrnaotnbqm', 'menu', 'Cardápio Digital', 'Cardápio digital para restaurantes com QR Code e gestão de itens', 35.00, true, 8, '2026-06-20 03:30:33.692', '2026-06-20 03:30:33.692');
INSERT INTO public.modules (id, key, name, description, "basePrice", active, "sortOrder", "createdAt", "updatedAt") VALUES ('cmqlsvdk200082osrsqp16jks', 'reports', 'Relatórios Avançados', 'Dashboard executivo, gráficos, comparações e exportação', 20.00, true, 9, '2026-06-20 03:30:33.698', '2026-06-20 03:30:33.698');
INSERT INTO public.modules (id, key, name, description, "basePrice", active, "sortOrder", "createdAt", "updatedAt") VALUES ('cmqlsvdk900092osrewky8wtz', 'users_permissions', 'Usuários e Permissões', 'Gerencie acessos ao sistema', 20.00, true, 10, '2026-06-20 03:30:33.705', '2026-06-20 03:30:33.705');


--
-- Data for Name: company_modules; Type: TABLE DATA; Schema: public; Owner: gestor
--

INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsvdzd000d2osrfqxzjhtl', 'cmqlsvdwk000b2osrscx2153w', 'customers', true, 50.00, '2026-06-20 03:30:33.418', NULL, '2026-06-20 03:30:34.249', '2026-06-20 03:30:34.249', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsve7b000j2osrac4gndbt', 'cmqlsve0y000g2osrhj9j8nk6', 'customers', true, 50.00, '2026-06-20 03:30:33.418', NULL, '2026-06-20 03:30:34.535', '2026-06-20 03:30:34.535', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsve7j000k2osrb8823abu', 'cmqlsve0y000g2osrhj9j8nk6', 'quotes', true, 30.00, '2026-06-20 03:30:33.418', NULL, '2026-06-20 03:30:34.543', '2026-06-20 03:30:34.543', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsve7p000l2osrb74he1ql', 'cmqlsve0y000g2osrhj9j8nk6', 'service_orders', true, 25.00, '2026-06-20 03:30:33.418', NULL, '2026-06-20 03:30:34.549', '2026-06-20 03:30:34.549', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsve7w000m2osrgi3sxzsh', 'cmqlsve0y000g2osrhj9j8nk6', 'inventory', true, 20.00, '2026-06-20 03:30:33.418', NULL, '2026-06-20 03:30:34.556', '2026-06-20 03:30:34.556', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsve82000n2osrmrdn1qna', 'cmqlsve0y000g2osrhj9j8nk6', 'scheduling', true, 20.00, '2026-06-20 03:30:33.418', NULL, '2026-06-20 03:30:34.562', '2026-06-20 03:30:34.562', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsve88000o2osr1pnimbk6', 'cmqlsve0y000g2osrhj9j8nk6', 'catalog', true, 20.00, '2026-06-20 03:30:33.418', NULL, '2026-06-20 03:30:34.568', '2026-06-20 03:30:34.568', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsve9b000p2osrciams0xt', 'cmqlsve0y000g2osrhj9j8nk6', 'menu', true, 20.00, '2026-06-20 03:30:33.418', NULL, '2026-06-20 03:30:34.607', '2026-06-20 03:30:34.607', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsve9h000q2osrbl0kh6ai', 'cmqlsve0y000g2osrhj9j8nk6', 'finance', true, 20.00, '2026-06-20 03:30:33.418', NULL, '2026-06-20 03:30:34.613', '2026-06-20 03:30:34.613', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsve9m000r2osrm5pz16st', 'cmqlsve0y000g2osrhj9j8nk6', 'reports', true, 20.00, '2026-06-20 03:30:33.418', NULL, '2026-06-20 03:30:34.618', '2026-06-20 03:30:34.618', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsve9s000s2osrma92nlah', 'cmqlsve0y000g2osrhj9j8nk6', 'users_permissions', true, 20.00, '2026-06-20 03:30:33.418', NULL, '2026-06-20 03:30:34.624', '2026-06-20 03:30:34.624', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsx5xm0001xosraru1hr9j', 'cmqlsx5xc0000xosrtefpearx', 'customers', true, NULL, '2026-06-20 03:31:57.123', NULL, '2026-06-20 03:31:57.13', '2026-06-20 03:31:57.13', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsx5xn0007xosrfbjvsew7', 'cmqlsx5xc0000xosrtefpearx', 'catalog', false, NULL, NULL, NULL, '2026-06-20 03:31:57.13', '2026-06-20 03:31:57.13', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsx5xn0006xosr6ix18jxc', 'cmqlsx5xc0000xosrtefpearx', 'inventory', true, NULL, '2026-06-20 03:36:36.755', NULL, '2026-06-20 03:31:57.13', '2026-06-20 03:36:36.757', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsx5xn0009xosrxihwo7gz', 'cmqlsx5xc0000xosrtefpearx', 'reports', true, NULL, '2026-06-20 03:36:37.781', NULL, '2026-06-20 03:31:57.13', '2026-06-20 03:36:37.781', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsx5xn000axosrb1ydteil', 'cmqlsx5xc0000xosrtefpearx', 'users_permissions', true, NULL, '2026-06-20 03:36:39.609', NULL, '2026-06-20 03:31:57.13', '2026-06-20 03:36:39.61', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsx5xn0008xosrycegmiz5', 'cmqlsx5xc0000xosrtefpearx', 'menu', true, NULL, '2026-06-20 03:36:42.782', NULL, '2026-06-20 03:31:57.13', '2026-06-20 03:36:42.782', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsx5xn0004xosrdoa7qi9q', 'cmqlsx5xc0000xosrtefpearx', 'scheduling', true, NULL, '2026-06-20 03:36:43.493', NULL, '2026-06-20 03:31:57.13', '2026-06-20 03:36:43.494', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsx5xn0005xosrb86x1rcr', 'cmqlsx5xc0000xosrtefpearx', 'finance', true, NULL, '2026-06-20 03:36:44.758', NULL, '2026-06-20 03:31:57.13', '2026-06-20 03:36:44.758', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsx5xn0002xosrykc821eh', 'cmqlsx5xc0000xosrtefpearx', 'quotes', true, NULL, '2026-06-20 03:36:45.563', NULL, '2026-06-20 03:31:57.13', '2026-06-20 03:36:45.563', NULL);
INSERT INTO public.company_modules (id, "companyId", "moduleKey", active, price, "activatedAt", "deactivatedAt", "createdAt", "updatedAt", "stripeSubscriptionItemId") VALUES ('cmqlsx5xn0003xosr6vcvr9lb', 'cmqlsx5xc0000xosrtefpearx', 'service_orders', true, NULL, '2026-06-20 03:36:46.443', NULL, '2026-06-20 03:31:57.13', '2026-06-20 03:36:46.444', NULL);


--
-- Data for Name: restaurant_tables; Type: TABLE DATA; Schema: public; Owner: gestor
--



--
-- Data for Name: menu_orders; Type: TABLE DATA; Schema: public; Owner: gestor
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: gestor
--

INSERT INTO public.users (id, email, name, "passwordHash", role, "companyId", active, "createdAt", "updatedAt") VALUES ('cmqlsvdwb000a2osr1as4egu8', 'admin@gestorlocal.com', 'Admin Gestor Local', '$2b$12$yov1djPzicSevUcRA016rOgMTGvGUFvZAXejjw8S9Xrpj1IDtDewC', 'SUPER_ADMIN', 'super-admin', true, '2026-06-20 03:30:34.139', '2026-06-20 03:30:34.139');
INSERT INTO public.users (id, email, name, "passwordHash", role, "companyId", active, "createdAt", "updatedAt") VALUES ('cmqlsvdz6000c2osreupfh7kw', 'silva@esilva.com', 'Sr. Silva', '$2b$10$FUudIZ05ei2LqU0aiHbAH.gEZgl8A3GiQSZrGv.ENfPV7H7qD7eje', 'COMPANY_ADMIN', 'cmqlsvdwk000b2osrscx2153w', true, '2026-06-20 03:30:34.242', '2026-06-20 03:30:34.242');
INSERT INTO public.users (id, email, name, "passwordHash", role, "companyId", active, "createdAt", "updatedAt") VALUES ('cmqlsve5x000h2osr2ra1sevu', 'marcos@mecanicacentral.com', 'Marcos Oliveira', '$2b$10$GLO7FCtk8j1dcU8h5TyTs.V.p/e0J7V5nI6bsLlDeBmteILBbEqC2', 'COMPANY_ADMIN', 'cmqlsve0y000g2osrhj9j8nk6', true, '2026-06-20 03:30:34.485', '2026-06-20 03:30:34.485');
INSERT INTO public.users (id, email, name, "passwordHash", role, "companyId", active, "createdAt", "updatedAt") VALUES ('cmqlsve67000i2osraxy08kyq', 'ana@mecanicacentral.com', 'Ana Costa', '$2b$10$7FYYWzkTooW5ugd98ta39OUhgpMd9nAfQYADfIHvv5QouJpWopDVK', 'STAFF', 'cmqlsve0y000g2osrhj9j8nk6', true, '2026-06-20 03:30:34.495', '2026-06-20 03:30:34.495');
INSERT INTO public.users (id, email, name, "passwordHash", role, "companyId", active, "createdAt", "updatedAt") VALUES ('cmqlsx5y1000cxosr6w84dx15', 'vandimavellar1997@gmail.com', 'Vanderson Avellar da Silva', '$2b$12$PweKAFDEgpUbg.R4h8hXbOXGtIG5fXrV4Z5e4nQVcGsxLfjGGXFO2', 'COMPANY_ADMIN', 'cmqlsx5xc0000xosrtefpearx', true, '2026-06-20 03:31:57.145', '2026-06-20 03:33:52.867');


--
-- Data for Name: quotes; Type: TABLE DATA; Schema: public; Owner: gestor
--

INSERT INTO public.quotes (id, "companyId", "customerId", number, status, description, subtotal, discount, total, "validUntil", notes, "createdAt", "updatedAt", "sentAt", "sentVia", "approvedAt", "rejectedAt", "approvalSource", "approvedByUserId", "approvedByName", "rejectionReason", "publicToken") VALUES ('cmqlsvecb000z2osrkalb2hy7', 'cmqlsve0y000g2osrhj9j8nk6', 'cmqlsvea5000u2osrx4e137uz', 1, 'APPROVED', 'Manutencao preventiva', 250.00, 0.00, 250.00, '2026-07-20 03:30:33.418', NULL, '2026-06-20 03:30:34.715', '2026-06-20 03:30:34.715', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.quotes (id, "companyId", "customerId", number, status, description, subtotal, discount, total, "validUntil", notes, "createdAt", "updatedAt", "sentAt", "sentVia", "approvedAt", "rejectedAt", "approvalSource", "approvedByUserId", "approvedByName", "rejectionReason", "publicToken") VALUES ('cmqlsvecq00122osr9p0hzs1e', 'cmqlsve0y000g2osrhj9j8nk6', 'cmqlsveaa000v2osrqbyqz0yb', 2, 'DRAFT', 'Revisao completa', 500.00, 0.00, 500.00, NULL, NULL, '2026-06-20 03:30:34.73', '2026-06-20 03:30:34.73', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.quotes (id, "companyId", "customerId", number, status, description, subtotal, discount, total, "validUntil", notes, "createdAt", "updatedAt", "sentAt", "sentVia", "approvedAt", "rejectedAt", "approvalSource", "approvedByUserId", "approvedByName", "rejectionReason", "publicToken") VALUES ('cmqltfw3w000lxosr7lp3j18f', 'cmqlsx5xc0000xosrtefpearx', 'cmqlt8o6o000fxosr2e58tzlp', 1, 'SENT', 'Upgrade de memoria e ssd de um computador antigo.', 880.00, 0.00, 880.00, '2026-06-24 00:00:00', NULL, '2026-06-20 03:46:30.86', '2026-06-20 03:54:00.859', '2026-06-20 03:54:00.857', 'EMAIL', NULL, NULL, NULL, NULL, NULL, NULL, '0f4030af722dd20aec3e991baf9cd0384738b9abef0fee33a5b266839e37e69f');


--
-- Data for Name: service_orders; Type: TABLE DATA; Schema: public; Owner: gestor
--

INSERT INTO public.service_orders (id, "companyId", "customerId", "quoteId", number, status, "problemDescription", "serviceDescription", total, "paidAmount", "paymentStatus", "openedAt", "finishedAt", notes, "createdAt", "updatedAt", accessories, code, "completedAt", "customerNotes", "equipmentBrand", "equipmentModel", "equipmentName", "expectedDeliveryDate", "finalAmount", "internalNotes", "paymentMethod", priority, "publicToken", "receivedAt", "serialNumber", "technicianId", "warrantyEnabled", "warrantyEndDate", "warrantyStartDate", "warrantyTerms", "inventoryDeductedAt") VALUES ('cmqlsved200142osr9bkb88dq', 'cmqlsve0y000g2osrhj9j8nk6', 'cmqlsvea5000u2osrx4e137uz', 'cmqlsvecb000z2osrkalb2hy7', 1, 'IN_PROGRESS', 'Carro fazendo barulho no motor', NULL, 250.00, 0.00, 'PENDING', '2026-06-20 03:30:33.418', NULL, NULL, '2026-06-20 03:30:34.742', '2026-06-20 03:30:34.742', 'Chave reserva, manual do proprietario', 'OS-0001', NULL, NULL, 'Fiat', 'Uno 1.0', 'Fiat Uno', NULL, NULL, NULL, NULL, 'HIGH', NULL, '2026-06-20 03:30:33.418', '9BD27846T00123456', NULL, false, NULL, NULL, NULL, NULL);


--
-- Data for Name: financial_transactions; Type: TABLE DATA; Schema: public; Owner: gestor
--

INSERT INTO public.financial_transactions (id, "companyId", type, description, category, amount, "dueDate", "paidAt", status, "customerId", notes, "createdAt", "updatedAt", "serviceOrderId", "menuOrderId", "quoteId") VALUES ('cmqlsveg7001c2osru7iocfun', 'cmqlsve0y000g2osrhj9j8nk6', 'RECEIVABLE', 'Conserto Gol', 'Servicos', 850.00, '2026-06-25 03:30:33.418', NULL, 'PENDING', 'cmqlsvea5000u2osrx4e137uz', NULL, '2026-06-20 03:30:34.855', '2026-06-20 03:30:34.855', NULL, NULL, NULL);
INSERT INTO public.financial_transactions (id, "companyId", type, description, category, amount, "dueDate", "paidAt", status, "customerId", notes, "createdAt", "updatedAt", "serviceOrderId", "menuOrderId", "quoteId") VALUES ('cmqlsvegg001d2osryyf7z0kg', 'cmqlsve0y000g2osrhj9j8nk6', 'RECEIVABLE', 'Revisao Corolla', 'Servicos', 1200.00, '2026-07-05 03:30:33.418', NULL, 'PENDING', 'cmqlsveaa000v2osrqbyqz0yb', NULL, '2026-06-20 03:30:34.864', '2026-06-20 03:30:34.864', NULL, NULL, NULL);
INSERT INTO public.financial_transactions (id, "companyId", type, description, category, amount, "dueDate", "paidAt", status, "customerId", notes, "createdAt", "updatedAt", "serviceOrderId", "menuOrderId", "quoteId") VALUES ('cmqlsvegn001e2osr2xkvglze', 'cmqlsve0y000g2osrhj9j8nk6', 'PAYABLE', 'Aluguel Oficina', 'Fixas', 2000.00, '2026-06-30 03:30:33.418', NULL, 'PENDING', NULL, NULL, '2026-06-20 03:30:34.871', '2026-06-20 03:30:34.871', NULL, NULL, NULL);
INSERT INTO public.financial_transactions (id, "companyId", type, description, category, amount, "dueDate", "paidAt", status, "customerId", notes, "createdAt", "updatedAt", "serviceOrderId", "menuOrderId", "quoteId") VALUES ('cmqlsvegu001f2osroypmlzja', 'cmqlsve0y000g2osrhj9j8nk6', 'PAYABLE', 'Energia Eletrica', 'Fixas', 450.00, '2026-07-10 03:30:33.418', NULL, 'PENDING', NULL, NULL, '2026-06-20 03:30:34.878', '2026-06-20 03:30:34.878', NULL, NULL, NULL);
INSERT INTO public.financial_transactions (id, "companyId", type, description, category, amount, "dueDate", "paidAt", status, "customerId", notes, "createdAt", "updatedAt", "serviceOrderId", "menuOrderId", "quoteId") VALUES ('cmqlsveh0001g2osr2pei4pwf', 'cmqlsve0y000g2osrhj9j8nk6', 'RECEIVABLE', 'Troca Oleo Fiat', 'Servicos', 150.00, '2026-06-18 03:30:33.418', '2026-06-20 03:30:33.418', 'PAID', 'cmqlsvebc000w2osr9zbhutax', NULL, '2026-06-20 03:30:34.884', '2026-06-20 03:30:34.884', NULL, NULL, NULL);


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: gestor
--

INSERT INTO public.menu_items (id, "companyId", name, description, price, category, "imageUrl", active, "sortOrder", "createdAt", "updatedAt") VALUES ('cmqlsveiz001m2osr4bjwlxzy', 'cmqlsve0y000g2osrhj9j8nk6', 'Troca de Oleo', 'Servico completo de troca de oleo', 80.00, 'Servicos', NULL, true, 1, '2026-06-20 03:30:34.955', '2026-06-20 03:30:34.955');
INSERT INTO public.menu_items (id, "companyId", name, description, price, category, "imageUrl", active, "sortOrder", "createdAt", "updatedAt") VALUES ('cmqlsvej6001n2osr9fcj5v3a', 'cmqlsve0y000g2osrhj9j8nk6', 'Revisao Preventiva', 'Revisao completa de 30 itens', 350.00, 'Servicos', NULL, true, 2, '2026-06-20 03:30:34.962', '2026-06-20 03:30:34.962');
INSERT INTO public.menu_items (id, "companyId", name, description, price, category, "imageUrl", active, "sortOrder", "createdAt", "updatedAt") VALUES ('cmqlsvejc001o2osrl3m7f78v', 'cmqlsve0y000g2osrhj9j8nk6', 'Scanner Automotivo', 'Diagnostico eletronico completo', 60.00, 'Diagnostico', NULL, true, 3, '2026-06-20 03:30:34.968', '2026-06-20 03:30:34.968');


--
-- Data for Name: menu_order_items; Type: TABLE DATA; Schema: public; Owner: gestor
--



--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: gestor
--

INSERT INTO public.password_reset_tokens (id, email, token, "expiresAt", "usedAt", "createdAt") VALUES ('cmqlsx5y4000dxosr19qp9j6b', 'vandimavellar1997@gmail.com', '518c90720c4ea7de5809dd9b998930e815c938cb06e6589ff57cfeef169e5aa9', '2026-06-27 03:31:57.106', '2026-06-20 03:33:52.852', '2026-06-20 03:31:57.148');


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: gestor
--

INSERT INTO public.products (id, "companyId", name, description, sku, category, quantity, "minStock", "costPrice", "salePrice", active, "createdAt", "updatedAt") VALUES ('cmqlsveee00172osrroqgfqft', 'cmqlsve0y000g2osrhj9j8nk6', 'Oleo 5W30 Sintetico', 'Produto: Oleo 5W30 Sintetico', 'OLEO-001', 'Lubrificantes', 50.00, 10.00, 25.00, 45.00, true, '2026-06-20 03:30:34.79', '2026-06-20 03:30:34.79');
INSERT INTO public.products (id, "companyId", name, description, sku, category, quantity, "minStock", "costPrice", "salePrice", active, "createdAt", "updatedAt") VALUES ('cmqlsveel00182osr6gu8r76r', 'cmqlsve0y000g2osrhj9j8nk6', 'Filtro de Oleo', 'Produto: Filtro de Oleo', 'FIL-001', 'Filtros', 30.00, 5.00, 15.00, 35.00, true, '2026-06-20 03:30:34.797', '2026-06-20 03:30:34.797');
INSERT INTO public.products (id, "companyId", name, description, sku, category, quantity, "minStock", "costPrice", "salePrice", active, "createdAt", "updatedAt") VALUES ('cmqlsveer00192osrp0whkeb8', 'cmqlsve0y000g2osrhj9j8nk6', 'Pastilha de Freio', 'Produto: Pastilha de Freio', 'FREIO-001', 'Freios', 20.00, 5.00, 40.00, 80.00, true, '2026-06-20 03:30:34.803', '2026-06-20 03:30:34.803');
INSERT INTO public.products (id, "companyId", name, description, sku, category, quantity, "minStock", "costPrice", "salePrice", active, "createdAt", "updatedAt") VALUES ('cmqlsveey001a2osr7un02gnb', 'cmqlsve0y000g2osrhj9j8nk6', 'Amortecedor Dianteiro', 'Produto: Amortecedor Dianteiro', 'AMORT-001', 'Suspensao', 3.00, 5.00, 120.00, 220.00, true, '2026-06-20 03:30:34.81', '2026-06-20 03:30:34.81');
INSERT INTO public.products (id, "companyId", name, description, sku, category, quantity, "minStock", "costPrice", "salePrice", active, "createdAt", "updatedAt") VALUES ('cmqlsvef4001b2osrfcp7rwhp', 'cmqlsve0y000g2osrhj9j8nk6', 'Bateria 60AH', 'Produto: Bateria 60AH', 'BAT-001', 'Eletrica', 8.00, 3.00, 180.00, 320.00, true, '2026-06-20 03:30:34.816', '2026-06-20 03:30:34.816');
INSERT INTO public.products (id, "companyId", name, description, sku, category, quantity, "minStock", "costPrice", "salePrice", active, "createdAt", "updatedAt") VALUES ('cmqltbvf8000hxosr7nzxznpr', 'cmqlsx5xc0000xosrtefpearx', 'Kingston SSD 256GB', NULL, '001', 'Armazenamento', 150.00, 10.00, 100.00, 220.00, true, '2026-06-20 03:43:23.348', '2026-06-20 03:43:23.348');
INSERT INTO public.products (id, "companyId", name, description, sku, category, quantity, "minStock", "costPrice", "salePrice", active, "createdAt", "updatedAt") VALUES ('cmqltdiyo000jxosrrid5yvod', 'cmqlsx5xc0000xosrtefpearx', 'Memória RAM Fury 4GB DDR4', NULL, '002', 'Memória RAM', 350.00, 20.00, 90.00, 290.00, true, '2026-06-20 03:44:40.512', '2026-06-20 03:44:40.512');


--
-- Data for Name: quote_items; Type: TABLE DATA; Schema: public; Owner: gestor
--

INSERT INTO public.quote_items (id, "quoteId", description, quantity, "unitPrice", total, "createdAt", "updatedAt") VALUES ('cmqlsvece00102osrkqt83arx', 'cmqlsvecb000z2osrkalb2hy7', 'Troca de oleo', 1.00, 150.00, 150.00, '2026-06-20 03:30:34.715', '2026-06-20 03:30:34.715');
INSERT INTO public.quote_items (id, "quoteId", description, quantity, "unitPrice", total, "createdAt", "updatedAt") VALUES ('cmqlsvece00112osra1gauemm', 'cmqlsvecb000z2osrkalb2hy7', 'Filtro de ar', 1.00, 100.00, 100.00, '2026-06-20 03:30:34.715', '2026-06-20 03:30:34.715');
INSERT INTO public.quote_items (id, "quoteId", description, quantity, "unitPrice", total, "createdAt", "updatedAt") VALUES ('cmqlsvecs00132osr6oczyyon', 'cmqlsvecq00122osr9p0hzs1e', 'Revisao completa', 1.00, 500.00, 500.00, '2026-06-20 03:30:34.73', '2026-06-20 03:30:34.73');
INSERT INTO public.quote_items (id, "quoteId", description, quantity, "unitPrice", total, "createdAt", "updatedAt") VALUES ('cmqltfw40000mxosr58bifzjw', 'cmqltfw3w000lxosr7lp3j18f', 'Memória RAM Fury 4GB DDR4', 2.00, 290.00, 580.00, '2026-06-20 03:46:30.86', '2026-06-20 03:46:30.86');
INSERT INTO public.quote_items (id, "quoteId", description, quantity, "unitPrice", total, "createdAt", "updatedAt") VALUES ('cmqltfw40000nxosrljm2zol4', 'cmqltfw3w000lxosr7lp3j18f', 'Kingston SSD 256GB', 1.00, 220.00, 220.00, '2026-06-20 03:46:30.86', '2026-06-20 03:46:30.86');
INSERT INTO public.quote_items (id, "quoteId", description, quantity, "unitPrice", total, "createdAt", "updatedAt") VALUES ('cmqltfw40000oxosrv48ne1nl', 'cmqltfw3w000lxosr7lp3j18f', 'Mão de obra', 1.00, 80.00, 80.00, '2026-06-20 03:46:30.86', '2026-06-20 03:46:30.86');


--
-- Data for Name: service_order_items; Type: TABLE DATA; Schema: public; Owner: gestor
--

INSERT INTO public.service_order_items (id, "serviceOrderId", description, quantity, "unitPrice", total, "createdAt", "updatedAt", "productId") VALUES ('cmqlsved600152osrl0d3irun', 'cmqlsved200142osr9bkb88dq', 'Troca de oleo', 1.00, 150.00, 150.00, '2026-06-20 03:30:34.742', '2026-06-20 03:30:34.742', NULL);
INSERT INTO public.service_order_items (id, "serviceOrderId", description, quantity, "unitPrice", total, "createdAt", "updatedAt", "productId") VALUES ('cmqlsved600162osrq1fuqsqz', 'cmqlsved200142osr9bkb88dq', 'Filtro de ar', 1.00, 100.00, 100.00, '2026-06-20 03:30:34.742', '2026-06-20 03:30:34.742', NULL);


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: gestor
--



--
-- Data for Name: stripe_webhook_events; Type: TABLE DATA; Schema: public; Owner: gestor
--



--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: gestor
--

INSERT INTO public.subscriptions (id, "companyId", status, "planName", "basePrice", "modulesCount", "monthlyPrice", "trialEndsAt", "currentPeriodStartsAt", "currentPeriodEndsAt", "paymentMethod", notes, "createdAt", "updatedAt", "stripeSubscriptionId", "stripePriceId", "includedModuleKey") VALUES ('cmqlsvdzl000e2osro1efoxxm', 'cmqlsvdwk000b2osrscx2153w', 'TRIAL', NULL, 49.00, 1, 99.00, '2026-07-05 03:30:33.418', NULL, NULL, NULL, NULL, '2026-06-20 03:30:34.257', '2026-06-20 03:30:34.257', NULL, NULL, NULL);
INSERT INTO public.subscriptions (id, "companyId", status, "planName", "basePrice", "modulesCount", "monthlyPrice", "trialEndsAt", "currentPeriodStartsAt", "currentPeriodEndsAt", "paymentMethod", notes, "createdAt", "updatedAt", "stripeSubscriptionId", "stripePriceId", "includedModuleKey") VALUES ('cmqlsve9y000t2osr7h9z0fss', 'cmqlsve0y000g2osrhj9j8nk6', 'ACTIVE', 'Profissional', 49.00, 10, 294.00, NULL, NULL, NULL, 'pix', NULL, '2026-06-20 03:30:34.63', '2026-06-20 03:30:34.63', NULL, NULL, NULL);
INSERT INTO public.subscriptions (id, "companyId", status, "planName", "basePrice", "modulesCount", "monthlyPrice", "trialEndsAt", "currentPeriodStartsAt", "currentPeriodEndsAt", "paymentMethod", notes, "createdAt", "updatedAt", "stripeSubscriptionId", "stripePriceId", "includedModuleKey") VALUES ('cmqlsx5xx000bxosrxwst0gch', 'cmqlsx5xc0000xosrtefpearx', 'TRIAL', 'Inicial', 49.00, 9, 214.00, '2026-07-05 03:31:56.749', NULL, NULL, NULL, NULL, '2026-06-20 03:31:57.141', '2026-06-20 03:36:46.958', NULL, NULL, NULL);


--
-- PostgreSQL database dump complete
--

\unrestrict qHZSMHWYhMKl0DWqnDhU0CZQuV80E79jN1pOv0TZwivVywCHX3yeXsAea2ZPv1v

