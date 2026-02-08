const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'ak_dv_store',
  password: 'password123',
  port: 5432,
});

async function fillStore() {
  try {
    console.log('🔌 Наполняем базу клиентами и папками...');

    // === ОЧИСТКА ТОЛЬКО КЛИЕНТСКОЙ ЧАСТИ (Чтобы не ломать склад) ===
    await pool.query('DROP TABLE IF EXISTS clients CASCADE');
    await pool.query('DROP TABLE IF EXISTS client_categories CASCADE');

    // 1. Создаем таблицы
    await pool.query(`
      CREATE TABLE client_categories (
        id SERIAL PRIMARY KEY,
        parent_id INTEGER REFERENCES client_categories(id),
        name VARCHAR(100) NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE clients (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES client_categories(id),
        name VARCHAR(150) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(100),
        inn VARCHAR(20),
        address VARCHAR(200),
        type VARCHAR(50), -- Физ, ИП, ООО
        balance NUMERIC(10, 2) DEFAULT 0.00,
        discount INTEGER DEFAULT 0,
        comment TEXT
      );
    `);

    // 2. Функция создания папки
    async function mkCat(name, parentId = null) {
      const res = await pool.query('INSERT INTO client_categories (name, parent_id) VALUES ($1, $2) RETURNING id', [name, parentId]);
      return res.rows[0].id;
    }

    // === СОЗДАЕМ СТРУКТУРУ ПАПОК ===
    const catBezna = await mkCat('Безнал (Юр. лица)');
      const catIP = await mkCat('ИП (Доверенные)', catBezna);
      const catWash = await mkCat('Автомойки', catBezna);
      const catOrg = await mkCat('Организации (ООО)', catBezna);
    
    const catRegular = await mkCat('Постоянные клиенты');
      const catRegFiz = await mkCat('Частные мастера', catRegular);
      const catDetailing = await mkCat('Детейлинг студии', catRegular);
      const catChinese = await mkCat('Китайские сервисы', catRegular);

    const catOnline = await mkCat('Интернет-магазин');
    const catConsignee = await mkCat('Грузополучатели');

    // === СОЗДАЕМ КЛИЕНТОВ ===
    const clients = [
      // ИП
      { cat: catIP, name: 'ИП Иванов А.С. (Сервис "Форсаж")', type: 'ИП', phone: '+7 (914) 555-01-01', balance: -12500, inn: '2721000001', address: 'ул. Промышленная 12' },
      { cat: catIP, name: 'ИП Петрова Е.В.', type: 'ИП', phone: '+7 (924) 123-45-67', balance: 0, inn: '2721000002', address: 'ул. Ленина 5' },
      
      // Организации
      { cat: catOrg, name: 'ООО "Автотранс-ДВ"', type: 'ООО', phone: '42-55-66', balance: 50000, inn: '2724005000', address: 'Восточное шоссе 4' },
      { cat: catOrg, name: 'ООО "СтройМаш"', type: 'ООО', phone: '20-30-40', balance: 0, inn: '2724006000', address: 'ул. Карла Маркса 144' },
      { cat: catWash, name: 'Мойка "Чистюля" (ООО)', type: 'ООО', phone: '+7 (909) 888-77-66', balance: -4500, inn: '2724007000', address: 'ул. Большая 88' },

      // Детейлинг
      { cat: catDetailing, name: 'Black Star Detailing', type: 'Физ', phone: '+7 (999) 000-00-01', balance: 0, discount: 10, comment: 'Любят пасту Menzerna' },
      { cat: catDetailing, name: 'Студия "Блеск"', type: 'Физ', phone: '+7 (914) 777-11-22', balance: -2000, discount: 5 },

      // Китайцы
      { cat: catChinese, name: 'Ван Ли (Кузовка)', type: 'Физ', phone: '-', balance: 15000, comment: 'Всегда берет за наличку' },
      { cat: catChinese, name: 'Сервис "Дружба Народов"', type: 'Физ', phone: '+7 (900) 111-22-33', balance: 0 },

      // Частники
      { cat: catRegFiz, name: 'Дядя Вася (Гараж 54)', type: 'Физ', phone: '+7 (914) 222-33-44', balance: 0 },
      { cat: catRegFiz, name: 'Максим (Покраска)', type: 'Физ', phone: '+7 (924) 333-44-55', balance: -500 },

      // Интернет-магазин
      { cat: catOnline, name: 'Заказ #1024 (Смирнов)', type: 'Web', phone: 'smirnov@mail.ru', balance: 0, address: 'г. Владивосток, доставка СДЭК' },
      { cat: catOnline, name: 'Заказ #1025 (Новый)', type: 'Web', phone: '+7 (999) ...', balance: 0 }
    ];

    for (let c of clients) {
      await pool.query(
        'INSERT INTO clients (category_id, name, type, phone, email, inn, address, balance, discount, comment) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [c.cat, c.name, c.type, c.phone, c.email || '', c.inn || '', c.address || '', c.balance, c.discount || 0, c.comment || '']
      );
    }

    console.log('✅ База клиентов успешно наполнена!');
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  } finally {
    await pool.end();
  }
}

fillStore();