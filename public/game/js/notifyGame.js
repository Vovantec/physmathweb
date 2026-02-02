class Notification {
	constructor(data) {
		// Фон
		this.html = document.createElement('div');
		this.html.classList.add('notif-game-main-div');
		document.body.appendChild(this.html);

		// Название оповещения
		this.title = document.createElement('span');
		this.title.classList.add('notif-game-title');
		this.title.classList.add('span-selected');
		this.html.appendChild(this.title);

		// Картинка
		this.titleImg = document.createElement('img');
		this.titleImg.src = '/images/gui/resource/Textures/Notifications/Notification_Background.png'
		this.titleImg.classList.add('notif-game-title-img');
		this.html.appendChild(this.titleImg);

		// Создание блока для текста
		this.text = document.createElement('div');
		this.text.classList.add('notif-game-text-div');
		this.html.appendChild(this.text);

		// Запуск функции
		this[data.type](data);
	}

	party(data) {
		// Удаление лишних данных
		delete data.type;

		// Название оповещения
		this.title.innerHTML = data.title;

		// Сдвиг текста в центр
		this.text.style.cssText = "align-items: center;";

		// Сохранение имени
		this.playerName = data.playerName;

		// Текст
		var title = document.createElement('span');
		title.innerHTML = data.text;
		title.style.cssText = 'font-size: 18px';
		title.classList.add('span-selected');
		this.text.appendChild(title);

		// Если нужны кнопки
		if (data.buttons) {
			var divButtons = document.createElement('div');
			divButtons.classList.add('notif-game-buttons-div');
			this.text.appendChild(divButtons);

			var buttonAccept = document.createElement('button');
			buttonAccept.innerHTML = "Принять";
			buttonAccept.classList.add('notif-game-button');
			buttonAccept.classList.add('notif-game-button-accept');
			buttonAccept.addEventListener('click', function(name) {
				socket.emit("PartyAccept");

				// Удаляем оповещение
				$("div[class=notif-game-main-div]").remove();
				delete this;
			}, this.playerName);
			divButtons.appendChild(buttonAccept);

			var buttonDecline = document.createElement('button');
			buttonDecline.innerHTML = "Отклонить";
			buttonDecline.classList.add('notif-game-button');
			buttonDecline.classList.add('notif-game-button-decline');
			buttonDecline.addEventListener('click', function() {
				socket.emit("PartyDecline");

				// Удаляем оповещение
				$("div[class=notif-game-main-div]").remove();
				delete this;
			});
			divButtons.appendChild(buttonDecline);
		}

		// Звук
		app.loader.resources.notif.sound.play();
	}

	updates(data) {
		// Удаление лишних данных
		delete data.type;

		// Событие удаления
		this.html.addEventListener('click', function() {
			// Удаляем оповещение
			$("div[class=notif-game-main-div]").remove();
			delete this;
		});
		this.html.addEventListener('tap', function() {
			// Удаляем оповещение
			$("div[class=notif-game-main-div]").remove();
			delete this;
		});

		// Название оповещения
		this.title.innerHTML = 'ОБНОВЛЕНИЕ';

		// Текст
		var titles = ['add', 'remove', 'edit', 'fix'];
		var titlesRu = ['Добавлено:', 'Удалено:', 'Изменено:', 'Исправлено:'];
		for (let i = 0; i < titles.length; i++) {
			// Если блок отсутствует
			if (data[titles[i]] == undefined) continue;

			// Название блока
			var title = document.createElement('span');
			title.innerHTML = titlesRu[i];
			title.style.cssText = 'font-size: 18px';
			title.classList.add('span-selected');
			this.text.appendChild(title);

			// Текст блока
			for (let j = 0; j < data[titles[i]].length; j++) {
				var text = document.createElement('span');
				text.innerHTML = '* ' + data[titles[i]][j];
				this.text.appendChild(text);
			}
		};

		// Закрыть
		var closeTitle = document.createElement('span');
		closeTitle.innerHTML = 'Нажмите ЛКМ, чтобы закрыть оповещение...';
		closeTitle.classList.add('notif-game-title-close');
		this.html.appendChild(closeTitle);

		// Звук
		app.loader.resources.notif.sound.play();

		// Обновляем версию игры
		localStorage.setItem('version', version);
	}
}