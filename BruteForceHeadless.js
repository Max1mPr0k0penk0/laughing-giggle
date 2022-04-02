const puppeteer = require('puppeteer');

// !Данный скрипт перебирает все станции метро и проверяет их отображение на экране "Статус заказа". Данный скрипт работает только в безголовом режиме

let notDisplayed = [] // сюда запишутся станции которые не отобразились

const URL_TEST = 'https://f4949b01-fc82-4d9d-869b-a7863de77965.serverhub.praktikum-services.ru/'; // сюда вставляем URL сервера

async function testScooterResult() {
    console.log('Запуск браузера');
    const browser = await puppeteer.launch({ args: ['--window-size=1920,1080'], defaultViewport: null}); // запускаем браузер в безголовом режиме, чтобы не крутить лишний раз выпадающий список со станциями. Если этого не сделать, кукольник не сможет выбирать станции вне поля видимости экрана.

    console.log('Создание новой вкладки в браузере');
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.119 YaBrowser/22.3.0.2430 Yowser/2.5 Safari/537.36'); // чтобы система позволяла нам создавать заказ, мы меняем User-Agent под Я.браузер ^_^
    await page.setDefaultNavigationTimeout(0); // если интернет медленный, кукольник может не дождаться загрузки страницы. Поэтому прменяем метод .setDefaultNavigationTimeout с параметром 0, чтобы отключить ошибку

    console.log('Переход по ссылке');
    await page.goto(URL_TEST);

    for (let i = 1; true; i++) {
        console.log('Итерация '+ i);
        console.log('Клик в кнопку "Заказать".');
        const orderButton = await page.$('.Button_Button__ra12g');
        await orderButton.click(); // открываем экран "Для кого самокат"

        await page.waitForSelector('input[placeholder="* Имя"]'); // дожидаемся загрузки поля Имя
        
        console.log('Заполнение поля Имя');
        const nameField = await page.$('input[placeholder="* Имя"]'); // обращаемся к селектору путем указания тега input и атрибута placeholder
        await nameField.type('Максим');

        console.log('Заполнение поля Фамилия');
        const secondNameField = await page.$('input[placeholder="* Фамилия"]'); 
        await secondNameField.type('Прокопенко');

        console.log('Заполнение поля Адрес');
        const adressField = await page.$('input[placeholder="* Адрес: куда привезти заказ"]');
        await adressField.type('ул. Льва Толстого, 16');

        console.log('Выбор станции метро');
        const metroField = await page.$('input.select-search__input'); // находим поле со станциями метро и кликаем по нему, чтобы раскрыть выпадающий список со станциями
        await metroField.click();
        await page.waitForTimeout(1000); // ожидаем подгрузки выпадающего списка
        const nextMetroField = await page.$x('//*[@id="root"]/div/div[2]/div[2]/div[4]/div/div[2]/ul/li['+i+']/button'); //тут хитрость. Чтобы корректно выбрать станцию, мы обращаемся к ней через xpath локатор. в каждом последующем локаторе атрибут "value" увеличивается на 1, ровно как переменная-счетчик!
        await nextMetroField[0].click(); // кликаем на станцию

        // тут следует сложный момент, который я подглядел на stackowerflow. page.$$ возвращает все элементы по селектору в массиве. Массив мы перебираем в цикле и достаем значение атрибута value
        let nameOfStation = []; 
        const inputElements = await page.$$('input.select-search__input');

        for (element of inputElements) {
                let inputValue;

                inputValue = await element.getProperty('value');
                inputValue = await inputValue.jsonValue();

            nameOfStation.push(inputValue);
        }
        nameOfStation = String(nameOfStation);
        console.log('Выбрана станция: ' + nameOfStation);

        console.log('Заполнение поля Номер');
        const numberField = await page.$('input[placeholder="* Телефон: на него позвонит курьер"]');
        await numberField.type('89999999999');

        console.log('Клик в кнопку "Далее"');
        const nextButton = await page.$x('//*[@id="root"]/div/div[2]/div[3]/button'); // обращаемся к элементу через xpath локатор
        await nextButton[0].click();

        console.log('Клик в поле даты');
        const dateField = await page.$('input[placeholder="* Когда привезти самокат"]');
        await dateField.click();

        console.log('Выбор даты');
        const calendarButton = await page.$('.react-datepicker__day.react-datepicker__day--001.react-datepicker__day--outside-month');
        await calendarButton.click();

        console.log('Клик в поле Срок аренды');
        const rentalField = await page.$('.Dropdown-control');
        await rentalField.click();

        console.log('Выбор срока аренды на сутки');
        const rentalPeriodButton = await page.$('.Dropdown-option');
        await rentalPeriodButton.click();

        console.log('Клик в кнопку "Заказать"');
        const doneButton = await page.$x('//*[@id="root"]/div/div[2]/div[3]/button[2]');
        await doneButton[0].click();
       
        console.log('Клик в по кнопке "Да"');
        const yesButton = await page.$x('//*[@id="root"]/div/div[2]/div[5]/div[2]/button[2]');
        await yesButton[0].click();

        await page.waitForTimeout(600); // ждем подгрузку поп-апа "Заказ оформлен"

        let orderNumber = await page.evaluate(() => 
            document.querySelector('div.Order_Text__2broi').innerText); //возвращает первый элемент, соответствующий данному CSS-селектору и тут же получаем текстовое содержимое
        orderNumber = orderNumber.slice(orderNumber.indexOf(':')+2,orderNumber.indexOf('.')); // отсекаем через строковые методы лишнюю информацию (лучше не придумал)
        // инода номер заказа не успевает отобразится. На этот случай существует костыль проверяющий, что длина номера заказа равна 0. Если номер не вывелся, мы прогоняем итерацию повторно
        if (orderNumber.length == 0) {
            i -= 1;
            const statusButton = await page.$x('//*[@id="root"]/div/div[2]/div[5]/div[2]/button');
            await statusButton[0].click();
            console.log('Номер не вывелся!')
            continue;
        } else {
            console.log("Номер заказа: "+ orderNumber)
        }  

        // переход на экран Стутс заказа
        console.log('Клик в по кнопке "Посмотреть статус"');
        const statusButton = await page.$x('//*[@id="root"]/div/div[2]/div[5]/div[2]/button');
        await statusButton[0].click();

        // ждем появления данных заказа
        await page.waitForSelector('span.Track_Circle__3rizg'); 

        // получаем название отображаемой станции также как и номер заказа
        let result = await page.evaluate(() => 
          document.querySelector('div.Track_OrderInfo__2fpDL').innerText);
        result = result.slice(result.indexOf('метро')+6,result.indexOf('Телефон')-1);
        console.log('Метро в данных заказа: '+ result);
        
        await page.waitForTimeout(600);
        // у отображаемых станций в коде присудствует атрибут style. его наличие как раз и проверем следующей функцией
        const elemOnDisplay = await page.$eval("span.Track_Circle__3rizg",
                element=> !!element.getAttribute("style")) // !! позвоеляет получить булевое значение
        if (elemOnDisplay) { 
            console.log('Станция метро '+ nameOfStation +' отображается');
        } else {
            console.log("Станция метро "+ nameOfStation +" не отображается");
            await page.screenshot({path: `Итерация-${i}_номер_заказа-${orderNumber}_название_станции-${nameOfStation}.png`}); // если станция не отображается делаем скриншот
            await notDisplayed.push(nameOfStation); // дополнительно пишем в массив станции которые не отобразились 
        }
        // условием выхода из цикла являяется проверка последней станции
        if (nameOfStation == 'Лихоборы') {
            break;
        }
    }
    console.log('Не отображаются следующие станции: ' + notDisplayed);
    console.log('Закрытие браузера');
    await browser.close();

}

testScooterResult();
