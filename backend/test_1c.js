const axios = require('axios');

const testData = [
    {
        code: "MIPA-CC8-1L",
        name: "Лак Mipa CC8 (ОБНОВЛЕНО)",
        brand: "Mipa",
        price: 2990.00,
        stock: 20
    },
    {
        code: "NEW-TAPE",
        name: "Скотч малярный 3M",
        brand: "3M",
        price: 350.00,
        stock: 50
    }
];

axios.post('http://localhost:3000/sync-1c', testData)
    .then(res => console.log('1С передала данные успешно!'))
    .catch(err => console.log('Ошибка связи:', err.message));