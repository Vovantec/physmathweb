var app, socket, devMode, Fingerprint,
	maps, mapFrames, mapNPCs, authData, playerSheet = [], ping;
var FightScene = {};
const cursor = "url('images/gui/resource/Textures/Cursors/Cursor_Normal.png'), default";
var boostFPS = false;
let sizeObj = window.innerWidth / 40;
let moveSpeed = sizeObj/20;
let map = new PIXI.Container();
let finder = new PF.AStarFinder();
let stats;
var version = getParams("mainScript")["v"];
var character = {}, inventory = {}, ALL_ITEMS;

const classessName = ['warrior', 'knight', 'archer', 'mage', 'priest'];
const classessNameRu = ['Воин', 'Рыцарь', 'Лучник', 'Маг', 'Жрец'];

// ===== Отключение мобильных устройств =====
/*if (navigator.userAgent.match(/Android|webOS|iPhone|iPod|Blackberry/i)) {
	alert('Игра доступна только для ПК');
	window.location = 'about:blank';
}*/

// ===== Названия ресурсов для игры =====

// NPC
const npcsData = [
	'Assassin_1', 'Assassin_2', 'Assassin_3', 
	'Dwarf_1', 'Dwarf_2', 'Dwarf_3', 'Druid_1',
	'Druid_2', 'Druid_3', 'Elemental_1',
	'Elemental_2', 'Elemental_3', 'Elf_1', 'Elf_2',
	'Elf_3', 'Ent_1', 'Ent_2', 'Ent_3', 'Gnoll_1',
	'Gnoll_2', 'Gnoll_3', 'Golem_1', 'Golem_2',
	'Golem_3', 'Magician_1', 'Magician_2', 'Magician_3',
	'Magician_4', 'Magician_5', 'Magician_6', 'Minotaur_1',
	'Minotaur_2', 'Minotaur_3', 'Shamans_1', 'Shamans_2',
	'Shamans_3', 'Skeleton_1', 'Skeleton_2', 'Skeleton_3',
	'Skeleton_Archer_1', 'Skeleton_Archer_2', 'Skeleton_Archer_3',
	'Vampire_1', 'Vampire_2', 'Vampire_3', 
	'Wraith_1', 'Wraith_2', 'Wraith_3'
];

FingerprintJS.load().then(fp => {
    fp.get().then(result => {
        Fingerprint = result.visitorId;
    });
});

function getParams(selector){
    var src = document.getElementById(selector).getAttribute("src").split("?");    
    var args = src[src.length-1]; // выбираем последнюю часть src после ?
    args = args.split("&"); // разбиваем параметры &
    var parameters = {};
    for(var i=args.length-1; i>=0; i--) // заносим параметры в результирующий объект
    {
        var parameter = args[i].split("=");
        parameters[parameter[0]] = parameter[1];
    }
    return parameters;
}

function ArrayToObject(arr) {
	var rv = {};
    for (let i = 0; i < arr.length; i++)
        rv[i] = arr[i];
    return rv;
}

var players = [], monsters = [], pathPlayer = [], pathTicker = false;

// Функция ошибки на тестирование
function errOnTest() {
	let container = document.createElement('div');
	container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;overflow-x:hidden;background-image:url(images/gui/resource/Textures/Background.png);background-size:100%;';
	
	let errOnTest = document.createElement('img');
	errOnTest.style.cssText = 'position:absolute;top:50%;left:50%;transform:translateX(-50%);width:30%;height:auto;';
	errOnTest.src = 'images/gui/resource/Textures/errOnTest.png';

	container.appendChild(errOnTest);
	document.body.appendChild(container);
}

function addSocketEvents() {
	socket.on("connect", () => {
		socket.emit("con", Fingerprint, map.children.length);
	});

	socket.on("connectSuccess", (data) => {
		// Главное меню
		createMainMenu(data);
	});

	socket.on("authSuccess", (data) => {
		character = data;

		// Если был перезапуск сервера, то перезагрузим карту
		if (map.children.length) {
			$.notify('Разрыв соединения. Переподключение...', 'info');

			// Перерисовка карты
			renderMap();

			// Отключение боевого интерфейса
			showWalkingGUI();

			// Отчистка списка группы
			var unitFrameChildrens = $("#unit-frame").children();
			for (let i = 1; i < unitFrameChildrens.length; i++) {
				unitFrameChildrens[i].remove();
			}

			$.notify('Соединение восстановлено!', 'success');
		} else {
			loadingResourcesGame();
		}
	});

	socket.on("pong", () => {
		var latency = Date.now() - ping;
		$("#ping").html("Ping: " + latency);
	});

	socket.on("consolelog", (data) => {
	  console.log(data);
	});

	socket.on("notif", (text, type) => {
		$.notify(text, type);
	});

	// Получение карты
	socket.on("map", (data) => {
	  	mapFrames = data;
	});

	// Получение инвентаря
	socket.on("getInventory", (data) => {
		inventory = data;
		addItemsInventory();
		$('#inventory').show();
	});

	// Получение NPC
	socket.on("npcs", (data) => {
		mapNPCs = data;
	});

	// Обновление NPC'ов
	socket.on("respawnAllNPCs", (data) => {
		// Защита, если в меню
		if (players.length === 0) return;

		// Защита, от боя
		if (map.children.length < 100) return;

		// Удаление старых
		for (let i = 0; i < map.children.length; i++) {
			if (map.children[i].constructor.name == 'NPC') {
				map.children[i].destroy();
				i = i - 1;
			}
		}

		// Создание новых
		for (let i = 0; i < data.length; i++) {
			new NPC(data[i]).addToMap();
		}
	});

	socket.on("newPlayer", (newPlayer) => {
		// Защита от двойника
		var findNewPlayer = map.children.find(o => o.name == newPlayer.name);

		if (player.name != newPlayer.name && findNewPlayer == undefined) {
			// Проверка, если в бою
			if (map.children.length > 100) {
				new Player(newPlayer).addToMap(newPlayer);
			}

			$.notify(newPlayer.name + ' зашел в игру', 'info');
		}
	});

	socket.on("pathPlayer", (name, pathPlayer) => {
		// Защита, если в меню
		if (players.length === 0) return;

		// Защита, от боя
		if (map.children.length < 100) return;

		// Защита от отправки себе
		if (players[0].name == name) return;

		// Если персонаж не найден в списке
		if (map.children.find(o => o.name == name)) {
			createPath(name, pathPlayer);
		} else {
			socket.emit('getAllPlayers');
		}
	});

	socket.on("showAdminMenuButton", () => {
		// Отображение админ-панели в меню взаимодействия
		let item = document.createElement('img');
		item.src = 'images/gui/resource/Textures/Buttons/gears_admin.png';
		item.classList.add('img-item-bar');
		item.addEventListener('click', function() {
			showAdminMenu();
		});
		document.getElementById('item-bar').appendChild(item);

		// Создание интерфейса админ-панели
		createAdminMenu();
	});

	socket.on("disconnectPlayer", (name) => {
		let player = players.find(o => o.name == name);
		if (player == undefined) return;
		map.removeChild(player);

		$.notify(name + ' вышел из игры', 'info');

		// Если был в группе
		if ($("#unit-frame-" + name).length) {
			$("#unit-frame-" + name).notify(name + ' вышел из игры', 'warn');
			$("#unit-frame-" + name).remove();
		}
	});

	socket.on("getAllPlayers", (playersList) => {
		for (let i = 0; i < playersList.length; i++) {
			if (map.children.find(o => o.name == playersList[i].name) == undefined) {
				players.push(new Player(playersList[i]).addToMap(playersList[i]));
				$.notify(playersList[i].name + " сейчас в сети", "success");
			} else {
				console.log(playersList[i].name + " уже на карте");
			}
		}
	});

	socket.on("getAbilities", (data) => {
		// Находим элемент на странице
		var divAbilitiesBookInside = $("#abilities-book > div")[1];
		divAbilitiesBookInside.innerHTML = ''; // Чистка
		$("#abilities-book").show(); // Отображаем элемент

		// Заполнение новыми элементами
		for (let i = 0; i < data.length; i++) {
			// Форма
			var divAbility = document.createElement('div');
			divAbility.classList.add('div-in-abilities-book');
			divAbilitiesBookInside.append(divAbility);

			// Иконка
			var imgAbilitity = document.createElement('img');
			imgAbilitity.id = data[i].id;
			imgAbilitity.src = 'images/' + data[i].img.bg;
			imgAbilitity.classList.add('img-in-abilities-book');
			imgAbilitity.addEventListener('click', function() {
				$("img[name='active-attack']").attr('id', this.id);
				$("img[name='active-attack']").attr('src', this.src);
				$("#abilities-book").remove();
			});
			divAbility.append(imgAbilitity);

			// Иконка маны
			var imgManaAbility = document.createElement('img');
			imgManaAbility.src = 'images/gui/resource/Textures/Action Bar/Globes/ActionBar_Globe_Fill_Blue.png';
			imgManaAbility.classList.add('img-mana-in-abilities-book');
			divAbility.append(imgManaAbility);

			// Мана
			var spanManaAbility = document.createElement('span');
			spanManaAbility.innerHTML = data[i].manacost;
			spanManaAbility.style.cssText = 'vertical-align:middle';
			divAbility.append(spanManaAbility);
		}
	});

	socket.on("getItemInfo", (data) => {
		// Отчистка
		$("#item-info").empty();

		// Если предмет не найден
		if (!data) {
			var span = document.createElement('span');
			span.innerHTML = 'Предмет не найден!';
			$("#item-info").append(span);
		}

		// Заполнение информацией
		for (key in data) {
			if (data[key] != '0' && data[key] != '' && itemInfo[key] != undefined && key != 'grade') {
				let spanItemInfo = document.createElement('span');

				if (key == 'name') {
					// Проверка заточки
					if (data['grade'] == undefined) data['grade'] = 0;

					spanItemInfo.innerHTML = data[key] + ' <font style="color: red">+' + data['grade']+'</font>';
					spanItemInfo.style.cssText = 'font-size: 1.5vw;';
				} else {
					spanItemInfo.innerHTML = itemInfo[key]+'<font style="color: green">'+data[key]+'</font>';
				}

				if (key == 'name' || key == 'buy' || key == 'sell') {
					spanItemInfo.style.cssText = 'flex-grow: 2;';
				} else {
					spanItemInfo.style.cssText = 'flex-grow: 1;';
				}

				$("#item-info").append(spanItemInfo);
			}

			// Разделение пунктов
			if (key == 'name' || key == 'type' || key == 'specialskill' || key == 'lvl') {
				$("#item-info").append('<br/>');
			}
		}
	});

	// ===== NPCs =====

	socket.on("dialog", (data) => {
		showDialogWindow(data);
	});

	socket.on("errDialog", (data) => {
		$.notify(data, 'error');
	})

	socket.on("getDialogTreeData", (data) => {
		createDialogTree(data[0]);
	});

	socket.on("getDialogsIdForAdminMenu", (data) => {
		let select = $("option[value='Обновление диалогов...']").parent();
		select.removeAttr('disabled');
		select.empty();

		if (select.attr("name") == 'admin-dialog-parent') {
			data.unshift({"id": 0});
		}

		for (let i = 0; i < data.length; i++) {
			let option = document.createElement('option');
			if (data[i].id == 0) {
				option.innerHTML = 'Новая ветка';
				option.value = data[i].id;
			} else {
				option.innerHTML = 'ID диалога: ' + data[i].id;
				option.value = data[i].id;
			}
			select.append(option);
		}

		// Если значение уже было задано
		if (select.attr('id')) {
			select.val(Number(select.attr('id')));
			select.removeAttr('id');
		}
	});

	socket.on("getQuestsIdForAdminMenu", (data) => {
		let select = $("option[value='Обновление заданий...']").parent();
		select.removeAttr('disabled');
		select.empty();

		for (let i = 0; i < data.length; i++) {
			let option = document.createElement('option');
			option.innerHTML = 'ID задания: ' + data[i].id;
			option.value = data[i].id;
			select.append(option);
		}
	});

	socket.on("getDialogDataById", (data) => {
		// Отчистка
		clearDialogInAdminMenu();

		// ID диалога
		$(".admin-dialog-div span").eq(0).html('ID: ' + data.id);
		$(".admin-dialog-div span").eq(0).val(data.id);
		$(".admin-dialog-div span").eq(0).show();

		// Родительский диалог
		$(".admin-dialog-div select").eq(0).attr('id', data.parent);

		// Описание
		let textareaText = $(".admin-dialog-div textarea").eq(0);
		textareaText.html(data.text);
		textareaText.css("height", "5px");
		textareaText.css("height", textareaText.prop('scrollHeight') + "px");

		// Ответ
		let textareaAnswer = $(".admin-dialog-div textarea").eq(1);
		textareaAnswer.html(data.title);
		textareaAnswer.css("height", "5px");
		textareaAnswer.css("height", textareaAnswer.prop('scrollHeight') + "px");

		// Условия
		for (let key in data.conditions) {
			createConditionInDialog(key, data.conditions[key]);
		}

		// Кнопки
		$(".admin-dialog-div button").eq(1).html('Изменить');
	});

	socket.on("editDialogSuccess", () => {
		$.notify('Вы успешно добавили новый диалог!', 'success');

		// Удаляем старое дерево
		$("#admin-dialogs").find('svg').remove();

		// Чистка редактора
		clearDialogInAdminMenu();

		// Запрашиваем новое дерево
		setTimeout(() => {
			socket.emit("getDialogTreeData");
		}, 2000);
	});

	socket.on("newQuest", (data) => {
		console.log(data);
	});

	socket.on("getAllQuestsForNPCForAdminMenu", (data) => {
		// Отчистка
		$("#admin-quests-menu").empty();

		for (let i = 0; i < data.items.length; i++) {
			let div = document.createElement('div');
			div.classList.add('admin-npc-drop-items-block');
			$("#admin-npc-drop-items").append(div);

			let img = document.createElement('img');
			img.id = data.items[i].id;
			img.src = data.items[i].img;
			img.classList.add('admin-npc-drop-img');
			img.addEventListener('mouseover', onMouseOverItem);
			img.addEventListener('mouseout', onMouseOutItem);
			div.appendChild(img);

			let spanCount = document.createElement('span');
			spanCount.innerHTML = 'Количество: ' + data.items[i].count;
			div.appendChild(spanCount);

			let spanPercent = document.createElement('span');
			spanPercent.innerHTML = 'Процент: ' + data.items[i].percent;
			div.appendChild(spanPercent);
		}
	});

	socket.on("getAllNPCsForAdminMenu", (data) => {
		// Отчистка списка NPC
		$("#admin-npc-sub-menu").empty();

		// Кнопка "Создать"
		let button = document.createElement('button');
		button.innerHTML = 'Создать';
		button.classList.add('admin-dialog-button');
		button.style.cssText = 'border-top:0';
		button.addEventListener('click', function() {
			socket.emit('getNPCForAdminMenu', this.id);
		});
		$("#admin-npc-sub-menu").append(button);

		// Заполнение списка
		for (let i = 0; i < data.length; i++) {
			// Создание внутреннего блока
			var div = document.createElement('div');
			div.id = data[i].id;
			div.classList.add('admin-npc-sub-menu-inner-div');
			div.addEventListener('click', function() {
				socket.emit('getNPCForAdminMenu', this.id);
			});

			// Иконка NPC
			var img = document.createElement('img');
			img.src = 'images/gui/resource/Textures/' + data[i].avatar;
			img.classList.add('admin-npc-sub-menu-img');
			div.appendChild(img);

			// Цвет текста в зависимости от дружелюбности
			var color = data[i].type ? 'red' : 'green';
			
			// Описание NPC
			var text = document.createElement('span');
			text.innerHTML = data[i].name + '</br>' +
				'ID: ' + data[i].id + '</br>' + 
				'Локация: ' + data[i].location + '</br>' + 
				'Координаты: ' + data[i].coords;
			text.style.cssText = 'color:' + color;
			div.appendChild(text);

			$("#admin-npc-sub-menu").append(div);
		}
	});

	socket.on("getInteractionForAdminMenu", (data) => {
		// Отчистка списка
		$("#admin-npc-interaction-sub").empty();

		// Заполнение данными
		for (let i = 0; i < data.length; i++) {
			let option = document.createElement('option');
			option.innerHTML = "ID " + data[i].id + ": " + data[i].text;
			option.value = data[i].id;
			document.getElementById('admin-npc-interaction-sub').appendChild(option);
		}
	});

	socket.on("getNPCForAdminMenu", (data, itemsSet, interaction) => {
		// Проверка открытого меню
		console.log(document.getElementById('admin-menu').style.display);
		if (document.getElementById('admin-menu').style.display == "none") {
			$("#admin-menu").show(); // Открытие Настроек Админа
			$("#admin-general").hide(); // Скрываем первый блок
			$(".admin-menu-div-content")
				.eq(3).show();
		}


		// Отчистка блока отображения скина
		try {
			viewApp.stage.removeChildren();
		} catch { }

		// Отчистка 
		$("#admin-npc-drop-main-select").empty()
		$("#admin-npc-drop-trash-select").empty()

		// Отображение меню редактора
		$("#admin-npc-main-menu").show();

		// Изменение кнопки и сохранение ID
		$("button[name='admin-npc-save']").html('Изменить');
		$("button[name='admin-npc-save']").attr('id', data.id);

		// Скин
		viewApp.stage.addChild(new SkinViewNPC(data.skin));
		$("select[class='admin-npc-skin-select']").val(data.skin);

		// Иконки
		$("#admin-npc-skin-icon").attr('src', 'images/gui/resource/Textures/' + data.avatar);
		$("select[class='admin-npc-avatar-select']").val(data.avatar);

		$("#admin-npc-type").val(data.type); // Тип
		$("#admin-npc-class").val(data.class); // Класс
		$("#admin-npc-name").val(data.name); // Имя
		$("#admin-npc-elite").val(data.elite); // Элитность
		$("#admin-npc-coords").html(data.coords); // Координаты
		$("#admin-npc-location").val(data.location); // Локация

		// Взаимодействие
		if (data.interaction.dialog) {
			$("#admin-npc-interaction").val('dialog');
			for (let i = 0; i < interaction.length; i++) {
				let option = document.createElement('option');
				option.innerHTML = "ID " + interaction[i].id + ": " + interaction[i].text;
				option.value = interaction[i].id;
				document.getElementById('admin-npc-interaction-sub').appendChild(option);
			}
			$("#admin-npc-interaction-sub").val(data.interaction.dialog);
		} else {
			$("#admin-npc-interaction-sub").empty();
		}

		$("#admin-npc-level").val(data.level); // Уровень
		$("#admin-npc-dodge").val(data.dodge); // Шанс уворота
		$("#admin-npc-respawn").val(data.respawn); // Время возрождения

		// Наборы дропов
		if (itemsSet) {
			for (let i = 0; i < itemsSet.length; i++) {
				let option = document.createElement('option');
				option.innerHTML = itemsSet[i].name;
				option.value = itemsSet[i].id;
				// Оружие/Броня или Остальное
				if (itemsSet[i].type) {
					// Остальное
					$("#admin-npc-drop-trash-select").append(option);

					if (data.drop_trash == itemsSet[i].id) {
						$("#admin-npc-drop-trash-select").val(data.drop_trash)
					}
				} else {
					// Оружие/Броня
					$("#admin-npc-drop-main-select").append(option);

					if (data.drop_main == itemsSet[i].id) {
						$("#admin-npc-drop-main-select").val(data.drop_main)
					}
				}
			}
		}


	});

	socket.on("getItemsSetForNPCForAdminMenu", (data) => {
		// Отчистка
		$("#admin-npc-drop-items").empty();

		for (let i = 0; i < data.items.length; i++) {
			let div = document.createElement('div');
			div.classList.add('admin-npc-drop-items-block');
			$("#admin-npc-drop-items").append(div);

			let img = document.createElement('img');
			img.id = data.items[i].id;
			img.src = data.items[i].img;
			img.classList.add('admin-npc-drop-img');
			img.addEventListener('mouseover', onMouseOverItem);
			img.addEventListener('mouseout', onMouseOutItem);
			div.appendChild(img);

			let spanCount = document.createElement('span');
			spanCount.innerHTML = 'Количество: ' + data.items[i].count;
			div.appendChild(spanCount);

			let spanPercent = document.createElement('span');
			spanPercent.innerHTML = 'Процент: ' + data.items[i].percent;
			div.appendChild(spanPercent);
		}
	});

	socket.on("getAllItemsForAdminMenu", (data) => {
		// Скрываем остальные и показываем нужное меню
		$("#admin-items-all").show();
		$("#admin-items-set-all").hide();
		$("#admin-edit-item").hide();
		$("#admin-edit-items-set").hide();

		// Отчистка
		$("#admin-items-all").empty();

		// Элемент "Добавить"
		data.unshift({name:'Добавить новый', 
			img:{
				without_bg:'images/items/new.png',
				bg:'images/items/new.png'
			}, 
		});

		// Элемент "Поиск"
		let find = document.createElement('input');
		find.placeholder = 'Введите название предмета';
		find.addEventListener('input', function() {
			$("#admin-items-all div").hide();
			$("#admin-items-all span:contains('"+this.value+"')").parents().show();
		});
		$("#admin-items-all").append(find);

		// Заполнение данными
		for (let i = 0; i < data.length; i++) {
			let block = document.createElement('div');
			block.id = data[i].id;
			block.classList.add('admin-items-block');
			block.addEventListener('click', function() {
				socket.emit("getItemForAdminMenu", this.id);
			});
			$("#admin-items-all").append(block);

			let img = document.createElement('img');
			img.id = data[i].id;
			try {
				img.src = data[i].img.without_bg;
			} catch {
				img.src = data[i].img;
			}
			img.classList.add('admin-items-block-img');
			img.addEventListener('mouseover', onMouseOverItem);
			img.addEventListener('mouseout', onMouseOutItem);
			block.appendChild(img);

			let spanName = document.createElement('span');
			spanName.innerHTML = data[i].name;
			spanName.style.cssText = getColorByRarity(data[i].rarity);
			spanName.classList.add('admin-items-block-name-span');
			block.appendChild(spanName);
		}
	});

	socket.on("getAllItemsForAdminInventory", (data) => {
		// Длина ячейки инвентаря
		var wItem = $("div[pos=0]").width();

		// Картинки предметов
		for (let i = 0; i < data.length; i++) {
			var imgAddItems = document.createElement('img');
			imgAddItems.id = (i+1); // Отсчет с id 1
			imgAddItems.src = data[i].img.without_bg;
			imgAddItems.style.cssText = 'width:'+wItem+'px;';
			imgAddItems.addEventListener('click', function() {
				// Проверка указания значения заточки
				var grade = document.getElementById('add-items-inventory-menu-grade').value;
				if (!grade) grade = 0;

				// Убираем информацию о предмете
				onMouseOutItem();

				// Отправка запроса на создание предмета
				socket.emit("addItemInInventory", this.id, grade);
				$("#add-items-inventory-menu").remove();
			});
			imgAddItems.addEventListener('mouseover', onMouseOverItem);
			imgAddItems.addEventListener('mouseout', onMouseOutItem);
			$("#add-items-inventory-menu").append(imgAddItems);
		}
	});

	socket.on("getAllItemsInItemsSetForAdminMenu", (data) => {
		// Длина ячейки инвентаря
		var wItem = 64;

		// Картинки предметов
		for (let i = 0; i < data.length; i++) {
			var imgAddItems = document.createElement('img');
			imgAddItems.id = (i+1); // Отсчет с id 1
			imgAddItems.src = data[i].img.without_bg;
			imgAddItems.style.cssText = 'width:'+wItem+'px;';
			imgAddItems.addEventListener('click', function() {
				// Изменение картинки
				$("img[name='item-edit']").attr('src', this.src);
				$("img[name='item-edit']").attr('id', this.id);
				$("img[name='item-edit']").attr('name', '');

				// Убираем информацию о предмете
				onMouseOutItem();

				// Удаление меню
				$("#add-items-inventory-menu").remove();
			});
			imgAddItems.addEventListener('mouseover', onMouseOverItem);
			imgAddItems.addEventListener('mouseout', onMouseOutItem);
			$("#add-items-inventory-menu").append(imgAddItems);
		}
	});

	socket.on("getItemForAdminMenu", (data) => {
		console.log(data);

		// Скрываем остальные и показываем нужное меню
		$("#admin-items-all").hide();
		$("#admin-items-set-all").hide();
		$("#admin-edit-item").show();
		$("#admin-edit-items-set").hide();

		// Меняем название кнопки
		if (data.id) {
			$("#admin-edit-item-save").html('Изменить');
		} else {
			$("#admin-edit-item-save").html('Создать');
		}

		// Заполнение формы редактора
		try {
			$("#admin-edit-item-png").attr('src', data.img.without_bg);
			$("#admin-edit-item-jpg").attr('src', data.img.bg);
			$("#admin-edit-item-img-select").attr("name", data.img.id);
		} catch { }
		$("#admin-edit-item-save").attr('name', data.id);
		for (var key in data) {
			if (key == 'img' || key == 'imgjpg') continue;
			$("#admin-edit-item-" + key).val(data[key]);
		}

		// Исключение комплекта и типа брони, если оружие
		if (data.itemtype) {
			$("#admin-edit-item-set").show();
			$("#admin-edit-item-itemtype").show();
		} else {
			$("#admin-edit-item-set").hide();
			$("#admin-edit-item-itemtype").hide();
		}
	});

	socket.on("getAllItemsSetForAdminMenu", (data) => {
		// Скрываем остальные и показываем нужное меню
		$("#admin-items-all").hide();
		$("#admin-items-set-all").show();
		$("#admin-edit-item").hide();
		$("#admin-edit-items-set").hide();

		// Отчистка
		$("#admin-items-set-all").empty();

		// Элемент "Добавить"
		data.unshift({name:'Добавить новый', 
			items: [ /*{img:'images/items/new.png'}*/ ], 
		});

		// Элемент "Поиск"
		let find = document.createElement('input');
		find.placeholder = 'Введите название предмета';
		find.addEventListener('input', function() {
			$("#admin-items-set-all div").hide();
			$("#admin-items-set-all span:contains('"+this.value+"')").parents().show();
		});
		$("#admin-items-set-all").append(find);

		// Заполнение данными
		for (let i = 0; i < data.length; i++) {
			let block = document.createElement('div');
			block.id = data[i].id;
			block.style.cssText = 'justify-content:space-around;';
			block.classList.add('admin-items-block');
			block.addEventListener('click', function() {
				socket.emit("getItemsSetForAdminMenu", this.id);
			});
			$("#admin-items-set-all").append(block);

			let spanName = document.createElement('span');
			spanName.innerHTML = data[i].name;
			spanName.style.cssText = getColorByRarity(data[i].rarity);
			spanName.classList.add('admin-items-block-name-span');
			block.appendChild(spanName);

			for (key in data[i].items) {
				let img = document.createElement('img');
				img.id = data[i].items[key].id;
				img.src = data[i].items[key].img;
				img.classList.add('admin-items-block-img');
				img.addEventListener('mouseover', onMouseOverItem);
				img.addEventListener('mouseout', onMouseOutItem);
				block.appendChild(img);
			}
		}
	});

	socket.on("getItemsSetForAdminMenu", (data) => {
		// Скрываем остальные и показываем нужное меню
		$("#admin-items-all").hide();
		$("#admin-items-set-all").hide();
		$("#admin-edit-item").hide();
		$("#admin-edit-items-set").show();

		// Отчистка
		$("#admin-edit-items-set").empty();

		// Название
		var block = document.createElement('div');
		block.classList.add('admin-set-items-block');
		$("#admin-edit-items-set").append(block);

		var innerBlockName = document.createElement('div');
		innerBlockName.style.cssText = 'width:50%';
		innerBlockName.classList.add('admin-set-items-inner-block');
		block.appendChild(innerBlockName);

		var spanName = document.createElement('input');
		spanName.value = data.name;
		spanName.style.cssText = 'font-size: 20px';
		innerBlockName.appendChild(spanName);

		var innerBlockType = document.createElement('div');
		innerBlockType.style.cssText = 'width:50%';
		innerBlockType.classList.add('admin-set-items-inner-block');
		block.appendChild(innerBlockType);

		var selectType = document.createElement('select');
		selectType.style.cssText = 'font-size: 20px';
		innerBlockType.appendChild(selectType);

		var optionMain = document.createElement('option');
		optionMain.innerHTML = 'Оружие/Броня';
		optionMain.value = 0;
		selectType.appendChild(optionMain);

		var optionTrash = document.createElement('option');
		optionTrash.innerHTML = 'Остальное';
		optionTrash.value = 1;
		selectType.appendChild(optionTrash);

		selectType.value = data.type;

		// Предметы
		for (let i = 0; i < data.items.length; i++) {
			addNewItemInItemsSetForAdminMenu(data.items[i]);
		}

		// Раздел кнопок
		var blockButtons = document.createElement('div');
		blockButtons.classList.add('admin-set-items-block');
		$("#admin-edit-items-set").append(blockButtons);

		var innerBlockButtons = document.createElement('div');
		innerBlockButtons.style.cssText = 'width:100%';
		innerBlockButtons.classList.add('admin-set-items-inner-block');
		blockButtons.appendChild(innerBlockButtons);

		// Добавить
		var buttonAdd = document.createElement('button');
		buttonAdd.innerHTML = 'Добавить';
		buttonAdd.style.cssText = 'margin-right:10px;';
		buttonAdd.classList.add('orange-button');
		buttonAdd.addEventListener('click', function() {
			addNewItemInItemsSetForAdminMenu({
				"id": "new-item",
				"img": "images/items/new.png",
				"count": 1,
				"percent": 0
			});
		});
		innerBlockButtons.appendChild(buttonAdd);

		// Сохранить
		var buttonSave = document.createElement('button');
		if (data.id) {
			buttonSave.id = data.id;
		} else {
			buttonSave.id = '';
		}
		buttonSave.innerHTML = 'Сохранить';
		buttonSave.classList.add('green-button');
		buttonSave.addEventListener('click', function() {
			// Создание переменной
			var data = {};
			data.items = [];

			// Сохранение id
			if (this.id) data.id = this.id;

			// Перебор данных
			var mainDiv = $("#admin-edit-items-set").children();

			// Название
			data.name = mainDiv[0].children[0].children[0].value;

			// Тип
			data.type = mainDiv[0].children[1].children[0].value;

			for (let i = 0; i < mainDiv.length; i++) {
				// Предмет
				if (mainDiv[i].children.length == 4 && mainDiv[i].children[0].children[0].id != 'new-item') {
					var item = {};
					item.id = mainDiv[i].children[0].children[0].id;
					item.percent = mainDiv[i].children[1].children[0].value;
					item.count = mainDiv[i].children[2].children[0].value;
					data.items.push(item);
				}
			}

			// Преобразование объекта в строку
			data.items = JSON.stringify(data.items);

			// Отправка запроса
			socket.emit("saveItemsSetForAdminMenu", data);
		});
		innerBlockButtons.appendChild(buttonSave);
	});

	socket.on("getAllArmorsSetForAdminMenu", (data) => {
		// Скрываем остальные и показываем нужное меню
		$("#admin-items-all").hide();
		$("#admin-edit-item").hide();
	});

	socket.on("getImagesForAdminMenu", (data) => {
		var div = document.createElement('div');
		div.classList.add('admin-items-change-image-div');
		document.body.appendChild(div);

		var close = document.createElement('button');
		close.innerHTML = 'Закрыть';
		close.classList.add('admin-items-change-image-close');
		close.addEventListener('click', function() {
			$(".admin-items-change-image-div").remove();
		});
		div.appendChild(close);

		var sections = {
			alchemy: 'Алхимия',
			armor: 'Броня',
			bags: 'Рюкзаки',
			blacksmith: 'Кузница',
			books: 'Книги',
			craft: 'Крафт',
			farming: 'Фермерство',
			fishing: 'Рыболовство',
			food: 'Еда',
			gems: 'Камни',
			halloween: 'Хэллоуин',
			hunting: 'Охота',
			icons: 'Иконки',
			jewerly: 'Украшения',
			loot: 'Добыча',
			magical: 'Магическое',
			magic_books: 'Маг. Книги',
			minerals: 'Минералы',
			mining: 'Шахтерство',
			mushrooms: 'Грибы',
			other: 'Остальное',
			paint: 'Краска',
			pirates: 'Пиратское',
			potions: 'Зелья',
			runes: 'Руны',
			scrolls: 'Свитки',
			shields: 'Щиты',
			sigil: 'Символика',
			treasures: 'Сундуки',
			weapons: 'Оружие'
		}

		for (key in sections) {
			var divBlock = document.createElement('div');
			divBlock.id = key;
			divBlock.classList.add('admin-items-change-image-div-block');
			div.appendChild(divBlock);

			var block = document.createElement('div');
			block.classList.add('admin-items-change-image-div-span');
			divBlock.appendChild(block);

			var span = document.createElement('span');
			span.innerHTML = sections[key];
			block.appendChild(span);
		}

		var msgErr = '';
		for (let i = 0; i < data.length; i++) {
			var type = $(".admin-items-change-image-div").find("#"+data[i].type).length;
			if (type == 0) {
				if (msgErr.indexOf(data[i].type) == -1) msgErr += data[i].type + '\n';
				continue;
			}

			var block = document.createElement('div');
			block.id = data[i].id;
			block.classList.add('admin-items-change-image-block');
			block.addEventListener('click', function() {
				$("#admin-edit-item-png").attr('src', this.children[0].src);
				$("#admin-edit-item-jpg").attr('src', this.children[1].src);
				$("#admin-edit-item-img-select").attr('name', this.id);

				$(".admin-items-change-image-div").remove();
			});
			$(".admin-items-change-image-div").find("#"+data[i].type).append(block);

			var png = document.createElement('img');
			png.src = data[i].without_bg;
			png.classList.add('admin-items-change-image-img');
			block.appendChild(png);

			var jpg = document.createElement('img');
			jpg.src = data[i].bg;
			jpg.classList.add('admin-items-change-image-img');
			block.appendChild(jpg);
		}

		if (msgErr) alert('Необходимо добавить новые разделы. Обратитесь к администратору.\n' + msgErr);
	});

	// ===== Боевая система =====

	socket.on("errFightScene", () => {
		renderMap('startMap');
		showWalkingGUI();
		$.notify("Обратитесь к Администратору проекту и подробно опишите проблему со всеми действиями.", "error");
		$.notify("К сожалению, мы не нашли текущий бой.", "error");
	});

	socket.on("FightStarted", (monsters, players, turns) => {
		FightScene = new FightGUI().create(monsters, players, turns);
	});

	socket.on("FightInteract", (name, id, hit) => {
		var playerInFight = FightScene.players.find(o => o.name == name);
		var monster = FightScene.monsters.find(o => o.id == id);

		playerInFight.attack(monster, 'skill', hit);
		FightScene.newTurn();
	});

	socket.on("FightMonsterAttackPlayer", (name, id, hit) => {
		var player = FightScene.players.find(o => o.name == name);
		var monster = FightScene.monsters.find(o => o.id == id);

		// Смена анимации
		monster.state.setAnimation(0, 'Attacking', true);
		monster.update(0);
		monster.state.addListener({
			complete: function(entry) {
				monster.state.setAnimation(0, 'Idle', true);
				monster.update(0);
				monster.state.removeListener({complete: function(entry) {}})
			}
		});

		// Установка ХП персонажа и смена хода
		player.setHpFight(hit);
		FightScene.newTurn();
	});

	socket.on("FightNotYourTurn", () => {
		$.notify("Сейчас ход противника", "warn");
	});

	socket.on("FightFinish", (winner) => {
		if (winner == player.name) {
			$.notify("Вы победили. Карта прогрузитья через 5 секунд", "success");
		} else {
			$.notify("Вы проиграли. Карта прогрузитья через 5 секунд", "warn");
		}

		setTimeout(() => {
			renderMap('startMap');
			showWalkingGUI();
		}, 5000);
	});

	socket.on("FightAlreadyInBattle", () => {
		$.notify("Этот монстр уже в бою", "warn");
	});

	// ===== Системы создания группы =====

	socket.on("PartyInvite", (playerName) => {
		new Notification({
			type: 'party',
			buttons: true,
			title: 'Приглашение в группу',
			text: 'Игрок ' + playerName + ' пригласил Вас в группу',
			playerName: playerName
		});
	});

	socket.on("PartyJoinRequest", (playerName) => {
		new Notification({
			type: 'party',
			buttons: true,
			title: 'Запрос на вступление',
			text: 'Игрок ' + playerName + ' хочет присоединиться к Вашей группе',
			playerName: playerName
		});
	});

	socket.on("PartyJoin", (playerData) => {
		// Визуальное отображение игрока
		for (let i = 0; i < playerData.length; i++) {
			addInUnitFrame(playerData[i]);
		}
	});

	socket.on('PartyLeave', (playerName) => {
		if (player.name == playerName) {
			var arrayOfUnitFrames = document.querySelectorAll('div[class=unit-frame-player-div]');
			for (let i = 1; i < arrayOfUnitFrames.length; i++) {
				arrayOfUnitFrames[i].remove();
			}
			$("#unit-frame-" + playerName).notify('Вы покинули группу', 'warn');
		} else {
			$("#unit-frame-" + playerName).notify(playerName + ' покинул группу', 'warn');
			$("#unit-frame-" + playerName).remove();
		}
	});
}

// Отключение браузерного контекстного меню
document.oncontextmenu = function (){return false};

// Режим разработчика
var devModeBool = true;

PIXI.utils.skipHello();

// Класс ототображения скина
class SkinViewNPC extends PIXI.spine.Spine {
	constructor(skin) {
		super(app.loader.resources[skin].spineData);

		this.skeleton.setToSetupPose();
		this.update(0);
		this.autoUpdate = true;
		this.state.timeScale = .5;
		this.state.setAnimation(0, 'Idle', true);

		this.width = viewApp.screen.height*0.8;
		this.height = viewApp.screen.height*0.8;
		this.x = viewApp.screen.width/2;
		this.y = this.height;

		console.log(viewApp.screen.width/2);
	}
}

// Класс игрока при создании персонажа
class PlayerCreate extends PIXI.AnimatedSprite {
	constructor(skin) {
		super(playerSheet[skin].auraSouth);

		viewApp.stage.addChild(this);
		this.anchor.set(0.5);
		this.animationSpeed = .1;
		this.width = sizeObj * 4;
		this.height = sizeObj * 4;
		this.x = viewApp.screen.width/2;
		this.y = viewApp.screen.height/2;
		this.play();
	}
};

// Класс игрока при авторизации
class PlayerAuth extends PIXI.AnimatedSprite {
	constructor(data, count, i) {
		if (i == undefined) {
			i = 0;
		}

		if (i < data.length) {
			let skin = classessNameRu.indexOf(data[i].class);
			super(playerSheet[skin].standSouth);
			this.name = data[i].name;
			this.level = data[i].level;
			this.skin = skin;

			this.interactive = true;
			this.buttonMode = true;
			this.on('pointerover', onObjOver)
				.on('pointerout', onObjOut)
				.on('tap', function() {
					for (let i = 0; i < viewApp.stage.children.length; i++) {
						if (viewApp.stage.children[i].active) {
							viewApp.stage.children[i].textures = playerSheet[viewApp.stage.children[i].skin].standSouth;
							viewApp.stage.children[i].active = false;
						}
					}

					this.textures = playerSheet[this.skin].auraSouth;
					this.active = true;
					this.play();

					document.getElementById('char-name').innerHTML = this.name;
					document.getElementById('lvl-class').innerHTML = 'Уровень: '+this.level+' | Класс: '+classessNameRu[this.skin];
				})
				.on('click', function() {
					for (let i = 0; i < viewApp.stage.children.length; i++) {
						if (viewApp.stage.children[i].active) {
							viewApp.stage.children[i].textures = playerSheet[viewApp.stage.children[i].skin].standSouth;
							viewApp.stage.children[i].active = false;
						}
					}

					this.textures = playerSheet[this.skin].auraSouth;
					this.active = true;
					this.play();

					document.getElementById('char-name').innerHTML = this.name;
					document.getElementById('lvl-class').innerHTML = 'Уровень: '+this.level+' | Класс: '+classessNameRu[this.skin];
				});
		} else {
			super(playerSheet[2].noneSouth);
			this.skin = 2;
		}

		viewApp.stage.addChild(this);
		this.anchor.set(0.5);
		this.animationSpeed = .1;
		this.width = sizeObj * 4;
		this.height = sizeObj * 4;
		this.x = viewApp.screen.width/(count+1)*(i+1);
		this.y = viewApp.screen.height/2;
		this.play();
		this.active = false;

		if (i < count - 1) {
			i += 1;
			new PlayerAuth(data, count, i);
		}
	}
};

// Класс игрока
class Player extends PIXI.AnimatedSprite {
	constructor(playerData) {
		super(playerSheet[playerData.skin].standSouth);

		map.addChild(this);
		this.id = playerData.id;
		this.avatar = 'images/gui/resource/Textures/Unit Frames/Main/Avatar/'+character.skin+'.png';
		this.skin = playerData.skin;
		this.name = playerData.name;
		this.admin = playerData.admin;
		this.anchor.set(0.5);
		this.animationSpeed = .3;
		this.loop = false;
		this.play();

		this.party = [];

		// ===== Характеристики =====

		this.hp = playerData.hp;
		this.maxHp = playerData.hp;
		this.level = playerData.level;
		this.exp = playerData.exp;
	}

	addToMap(playerData) {
		this.width = sizeObj*1.5;
		this.height = sizeObj*1.5;

		this.arrMap = playerData.arrMap.split('-');
		this.arrMap[0] = Number(this.arrMap[0]);
		this.arrMap[1] = Number(this.arrMap[1]);
		for (let i = 0; i < map.children.length; i++) {
			if (map.children[i].arrMap == undefined) { continue }

			if (map.children[i].arrMap[0] == this.arrMap[0] && 
				map.children[i].arrMap[1] == this.arrMap[1]) {
				this.x = map.children[i].x;
				this.y = map.children[i].y-sizeObj*.6;
				break;
			}
		}

		// Имя над персонажем
		let playerName = new PIXI.Text(playerData.name, {
			fontFamily: "Arial", 
			fontSize: sizeObj/2.5,
			fontStyle: "italic",
			fontWeight: "bold"
		});
		this.addChild(playerName);
		playerName.x -= playerName.width/2;
		playerName.y = this.getLocalBounds().y - sizeObj/2.5;
		playerName.zIndex = this.zIndex;

		// Окно взаимодействия
		this.interactive = true;
		this.buttonMode = true;
		this.on('pointerover', onObjOver)
			.on('pointerout', onObjOut)
			.on('rightclick', function(event) {
				socket.emit("PartyReq", event.target.id);
			});

		// Добавляем в список игркоов
		players.push(this);

		// Буст ФПС
		if (boostFPS && playerData.name == players[0].name) renderMapAroundPlayer();

		return this;
	}

	addToFight(pos) {
		this.textures = playerSheet[this.skin].standWest

		this.width = sizeObj*3;
		this.height = sizeObj*3;

		this.x = app.screen.width/3 * 2;
		this.y = app.screen.height/(pos+1);

		// Окно взаимодействия
		this.interactive = true;
		this.buttonMode = true;
		this.on('pointerover', onObjOver)
			.on('pointerout', onObjOut);

		return this;
	}

	getName() {
		console.log(this.name);
	}

	move(frame) {
		if (this.admin && swapRightClick) {
			swapWalkable(frame);
		} else {
			if (!frame.walkable) return

			let gridMapFrames = new PF.Grid(300, 300);
			for (let i = 0; i < mapFrames.length; i++) {
				for (let j = 0; j < mapFrames[0].length; j++) {
					if (!mapFrames[i][j].walkable) {
						gridMapFrames.setWalkableAt(i, j, false);
					}
				}
			}

			createPath(
				this.name, 
				finder.findPath(
					this.arrMap[0], 
					this.arrMap[1], 
					frame.arrMap[0], 
					frame.arrMap[1], 
					gridMapFrames
				)
			);
		}

		return this;
	}

	bindCamera() {
		if (freeCamera) return;

		map.x += window.innerWidth/2 - this.getGlobalPosition().x;
		map.y += window.innerHeight/2 - this.getGlobalPosition().y;

		return this;
	}

	createHpBarFight() {
		let data = this.getLocalBounds();

		// Фон для HP бара
		let bgHpBar = new PIXI.Graphics();
		this.addChild(bgHpBar);
		bgHpBar.beginFill(0x696969);
		bgHpBar.drawRoundedRect(data.x, data.y, data.width, sizeObj/5, 2);
		bgHpBar.endFill();

		// HP бар
		let hpBar = new PIXI.Graphics();
		this.hpBar = this.addChild(hpBar);
		hpBar.beginFill(0xB22222);
		hpBar.drawRoundedRect(data.x, data.y, data.width, sizeObj/5, 2);
		hpBar.endFill();

		return this;
	}

	// Нанесение урона в бою
	setHpFight(hit) {
		let data = this.getLocalBounds();
		var hpBar = this.hpBar;

		// Если смертельный удар
		if (this.hp - hit < 0) {
			this.hp = 0;
			//this.setDeath();
		} else {
			this.hp = this.hp - hit;
		}

		// Обновление информационного окна о монстре
		let hpPercent = this.hp * 100 / this.maxHp;
		let divInfo = document.querySelector('#member-'+this.turn+' > div');
		divInfo.style.setProperty('--hp', hpPercent + '%');
		// Изменения здоровья числом
		document.querySelector('#member-'+this.turn+' > div > span').innerHTML = this.hp;

		// Обновление здоровья над персонажем
		hpBar.clear();
		hpBar.beginFill(0xB22222);
		hpBar.drawRoundedRect(data.x, data.y, data.width*(hpPercent*0.01), sizeObj/5, 2);
		hpBar.endFill();

		return this;
	}

	attack(target, type = 'none', hit) {
		// Если способность
		if (type != 'none') {
			createAbility({
				"ability": type, 
				"player": this, 
				"target": target, 
				"hit": hit
			});
		}

		// Анимация атаки
		//this.textures = 
	}
}

// Класс NPC
class NPC extends PIXI.spine.Spine {
	constructor(data) {
		super(app.loader.resources[data.skin].spineData);

		this.skeleton.setToSetupPose();
		this.update(0);
		this.autoUpdate = true;
		this.state.timeScale = .5;
		this.state.setAnimation(0, 'Idle', true);

		map.addChild(this);
		this.coords = data.coords;
		this.skin = data.skin;
		this.avatar = 'images/gui/resource/Textures/Unit Frames/Main/Avatar/5.png';
		this.name = data.name;
		this.id = data.id;

		// ===== Характеристики =====

		this.armor = data.armor;
		this.attack = data.attack;
		this.hp = data.hp;
		this.maxHp = data.hp;
	}

	getName() {
		console.log(this.name);
	}

	addToMap() {
		this.width = sizeObj*1.5;
		this.height = sizeObj*1.5;

		this.arrMap = this.coords.split('-');
		this.arrMap[0] = Number(this.arrMap[0]);
		this.arrMap[1] = Number(this.arrMap[1]);
		for (let i = 0; i < map.children.length; i++) {
			if (map.children[i].arrMap == undefined) { continue }

			if (map.children[i].arrMap[0] == this.arrMap[0] && 
				map.children[i].arrMap[1] == this.arrMap[1]) {
				this.x = map.children[i].x;
				this.y = map.children[i].y;
				break;
			}
		}

		this.interactive = true;
		this.buttonMode = true;
		this.on('pointerover', onObjOver)
			.on('pointerout', onObjOut)
			.on('tap', function(e) {
				socket.emit("interactNPC", this.id);
			})
			.on('click', function(e) {
				socket.emit("interactNPC", this.id);
			})
			.on('rightclick', function(e) {
				if (players[0].admin) {
					socket.emit("getNPCForAdminMenu", this.id);
				}
			});

		// Имя над персонажем
		let npcName = new PIXI.Text(this.name, {
			fontFamily: "Arial", 
			fontSize: 72,
			fontStyle: "italic",
			fontWeight: "bold"
		});
		this.addChild(npcName);
		npcName.x -= npcName.width/2;
		npcName.y = this.getLocalBounds().y - 72;
		npcName.zIndex = this.zIndex;

		// Добавляем в список игркоов
		monsters.push(this);

		return this;
	}

	addToFight() {
		this.width = sizeObj*3;
		this.height = sizeObj*3;

		this.x = app.screen.width/3;
		this.y = app.screen.height/2;

		this.pivot.set(0, -this.height);

		this.interactive = true;
		this.buttonMode = true;
		this.on('pointerover', onObjOver)
			.on('pointerout', onObjOut)
			.on('tap', function() {
				socket.emit("FightInteract", this.id);
				/*socket.emit("FightInteract", this.id, $("img[name='active-attack']").attr('id'));
				$("img[name='active-attack']").attr('id', '');
				$("img[name='active-attack']").attr('src', 'images/gui/resource/Textures/Icons 128x128/Icon_Sword_128.png');
				*/
			})
			.on('click', function() {
				socket.emit("FightInteract", this.id);
				/*socket.emit("FightInteract", this.id, $("img[name='active-attack']").attr('id'));
				$("img[name='active-attack']").attr('id', '');
				$("img[name='active-attack']").attr('src', 'images/gui/resource/Textures/Icons 128x128/Icon_Sword_128.png');
				*/
			});

		return this;
	}

	// Создание хп бара в бою
	createHpBarFight() {
		let data = this.getLocalBounds();

		// Фон для HP бара
		let bgHpBar = new PIXI.Graphics();
		bgHpBar.beginFill(0x696969);
		bgHpBar.drawRoundedRect(data.x, data.y, data.width, sizeObj, 8);
		bgHpBar.endFill();
		this.addChild(bgHpBar);

		// HP бар
		let hpBar = new PIXI.Graphics();
		hpBar.beginFill(0xB22222);
		hpBar.drawRoundedRect(data.x, data.y, data.width, sizeObj, 8);
		hpBar.endFill();
		this.hpBar = this.addChild(hpBar);

		// Данные для перерисовки
		this.hpBarData = [data.x, data.y, data.width];

		return this;
	}

	// Нанесение урона в бою
	setHpFight(hit) {
		// Если смертельный удар
		if (this.hp - hit < 0) {
			this.hp = 0;
			this.setDeath();
		} else {
			this.hp = this.hp - hit;
		}

		// Обновление информационного окна о монстре
		let hpPercent = this.hp * 100 / this.maxHp;
		let divInfo = document.querySelector('#member-'+this.turn+' > div');
		divInfo.style.setProperty('--hp', hpPercent + '%');
		// Изменения здоровья числом
		document.querySelector('#member-'+this.turn+' > div > span').innerHTML = this.hp;

		// Обновление здоровья над персонажем
		this.hpBar.clear();
		this.hpBar.beginFill(0xB22222);
		this.hpBar.drawRoundedRect(this.hpBarData[0], this.hpBarData[1], this.hpBarData[2]*(hpPercent*0.01), sizeObj, 8);
		this.hpBar.endFill();

		return this;
	}

	setDeath() {
		this.state.setAnimation(0, 'Hurt', true);
	}
}

window.onload = function() {
	app = new PIXI.Application(
		{
			width: window.innerWidth,
			height: window.innerHeight,
			backgroundAlpha: 0,
			antialias: true,
			sharedTicker: true
		}
	);

	document.body.appendChild(app.view); // Добавление игры на экран
	app.stage.interative = true; // Интерактивный режим с объектами

	// Курсор
	app.renderer.plugins.interaction.cursorStyles["pointer"] = "inherit";

	// Фон
	let background = document.createElement('img');
	background.id = 'bg';
	background.src = 'images/gui/resource/Textures/Background.png';
	background.classList.add('background-image');
	document.body.appendChild(background);

	let container = document.createElement('div');
	container.classList.add('auth-div');
	container.classList.add('main-menu');
	container.id = "authMenu";
	container.addEventListener('click', function() {
		try {
			if (document.getElementById('ready').innerHTML.indexOf('Нажмите') != -1) {
				connectSocket();
				document.getElementById('ready').innerHTML = 'Подключение к серверу...';
			}
		} catch {
			return;
		}
	});
	document.body.appendChild(container);

	// ===== Подгрузка файлов =====
	// Персонажи
	for (let i = 0; i < 5; i++) {
		app.loader.add(classessName[i], "images/character_sprite/" + classessName[i] + ".png");
	} 
	// Музыка заставки
	app.loader.add('auth', 'sounds/bg/auth2.mp3'); 
	app.loader.add('notif', 'sounds/gui/notification.mp3'); 

	// Загрузка игры
	app.loader.onProgress.add((loader, resource) => gameLoadingProgress(loader.progress));
	app.loader.onComplete.add(function() {
		for (let i = 0; i < 5; i++) {
			createPlayerSheet(classessName[i]);
		}
		document.getElementById('loadingProgress').remove();
		document.getElementById('ready').innerHTML = 'ВНИМАНИЕ!<br/><br/>В игре присутствует <br/>звуковое сопровождение!<br/><br/>Нажмите ЛКМ для продолжения...';
	});

	// Загрузка
	gameLoadingCreate();

	// Управление мышью
	//app.stage.on("pointermove", movePlayer);

	//Управление клавиатурой
	window.addEventListener("keydown", keysDown)
	window.addEventListener("keyup", keysUp)

	// Создание карты
	app.stage.addChild(map);
	map.sortableChildren = true;
}

function loadingResourcesGame() {
	// Загрузка текстур карты
	for (let i = 0; i < devModeConfig.length; i++) {
		for (let j = devModeConfig[i][1]; j < devModeConfig[i][2]; j++) {
			app.loader.add(j.toString(), 'images/map/'+j+'.png');
		}
	}

	// NPCs
	for (let i = 0; i < npcsData.length; i++) {
		app.loader.add(npcsData[i], 'images/npcs/'+npcsData[i]+'/'+npcsData[i]+'.json');
	}

	// Способности
	for (let i = 1; i < 4; i++) {
		app.loader.add('ability_'+i, 'images/abilities/ability_'+i+'/ability_'+i+'.json');
		app.loader.add('ability_'+i+'.wav', 'images/abilities/ability_'+i+'/ability_'+i+'.wav');
	}

	// Звуки


	// Запуск игры
	app.loader.onComplete.add(() => doneLoading());
	gameLoadingCreate();
}

function doneLoading() {
	// FPS счетчик
	let divFPS = document.createElement('div');
	divFPS.classList.add('fps-div');
	document.body.appendChild(divFPS);

	let spanFPS = document.createElement('span');
	spanFPS.id = 'fps';
	spanFPS.classList.add('fps-span');
	divFPS.appendChild(spanFPS);

	let spanPing = document.createElement('span');
	spanPing.id = 'ping';
	spanPing.classList.add('fps-span');
	divFPS.appendChild(spanPing);

	// Отрисовка карты
	renderMap("startMap");

	// ===== Настройка тикера =====

	/*app.ticker.minFPS = 1;
	app.ticker.maxFPS = 60;*/

	// Добавление тикеров
	app.ticker.add(freeCameraLoop); // Управление клавишами
	//app.ticker.add(checkFPS); // FPS
	app.ticker.add(pixiCheckFPS); // Pixi FPS
	app.ticker.add(playerMove); // Передвижение персонажа
	app.ticker.add(abilitiesTicker); // Использование способностей в бою

	// Создание GUI
	createGUI();

	// FPS
	stats = new Stats();
	stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
	document.body.appendChild(stats.dom);

	// Пинг
	setInterval(function() {
		ping = Date.now();
		socket.emit('ping');
	}, 1000);

	// Буст FPS
	boostFPSfunc(null);

	// Режим разработчика
	/*if (devModeBool && players[0].admin) {
		devMode = new DeveloperMode();
		for (let i = 0; i < devMode.length; i++) {
			document.body.appendChild(devMode[i]);
		}
	}*/

	// Удаление загрузочного экрана
	document.getElementById("authMenu").remove();
	document.getElementById("bg").remove();
	app.loader.resources.auth.sound.stop();

	// Отрисовка персонажа у всех после подключения
	socket.emit("renderPlayerForAll");

	// Отчистка полученных данных
	//authData = "";

	// Проверка версии игры
	/*setTimeout(() => { // Версия 0.0.2
		if (localStorage.getItem('version') != version) {
			new Notification({
				type: 'updates',
				add: [
					'Система оповещений', 
					'Анимация атаки для монстра в бою', 
					'Автоматическое обновление игры (без Ctrl+Shift+R)'
				]
			});
		}
	}, 2000);*/
	/*setTimeout(() => { // Версия 0.0.3
		if (localStorage.getItem('version') != version) {
			new Notification({
				type: 'updates',
				add: [
					'Система создания группы.',
					'Бой в группе с игроками. (pre-alpha)'
				],
				edit: [
					'Новое отображение рамки персонажа на главном экране.',
					'Рамка персонажа также отображает участников группы игрока.',
					'Новый вид уведомлений.'
				],
				fix: [
					'Синхронизация игроков при одновременном подключении. Ранее: игрок не появлялся на карте.',
					'Местоположение игрока на карте сохраняется.',
					'Игрок появляется на карте после загрузочного экрана. Ранее: игрок появлялся сразу во время загрузки.',
					'Появление двойника игрока. Ранее: при рассинхроне могли появляться двойники.'
				]
			});
		}
	}, 2000);*/
	setTimeout(() => { // Версия 0.0.4
		if (localStorage.getItem('version') != version) {
			new Notification({
				type: 'updates',
				add: [
					'Система диалогов'
				],
				edit: [
					'Теперь автоматическая авторизация доступна по желанию. Ранее: принудительная.',
					'Анимации неигровых персонажей (NPC) переведены в новый формат (Spine).',
					'Новый дизайн для игровых меню.'
				],
				fix: [
					'Улучшена безопасность при авторизации. Ранее была возможна авторизация без логина/пароля при помощи подмены данных.',
					'Оптимизация. Переписаны блоки меню. Теперь создаются один раз при подключении. Ранее: создавались заново каждое нажатие.',
					'Приглашение в группу нельзя отправить самому себе.',
					'Теперь курсор не изменяется на стандартный.',
					'Отображение здоровья в бою.',
					'Переподключение работает исправно. Ранее: требовалось перезапускать игру.'
				]
			});
		}
	}, 2000);
	/*setTimeout(() => { // Версия 0.0.5
		if (localStorage.getItem('version') != version) {
			new Notification({
				type: 'updates',
				add: [
					'В инвентарь добавлена кнопка для выдачи предметов (На время тестирования)',
					''
				],
				edit: [
					
				],
				fix: [
					'Расположение предметов в ячейках теперь корректное. Ранее: находились за границами ячейки.',
					'При перемещении предмет находится на курсоре. Ранее: сдвигался вниз.',
					'При перемещении предмет нельзя навести на картинку персонажа. Ранее: показывало, как слот для перемещения.',
					'Вещи, которые можно одеть, располагаются по своим слотам. Ранее: можно было одеть любую вещь в любой слот',
					'Одетые вещи в инвентаре добавляют аттрибуты персонажу.'
				]
			});
		}
	}, 2000);*/

	// test
	/*map.convertTo3d();
	map.position3d.set(0, 0, 1);
	var camera = new PIXI.projection.Camera3d();
	camera.setPlanes(400, 10, 10000, false);
	camera.position.set(app.screen.width / 2, app.screen.height / 2);*/
}

function createPlayerSheet(name) {
	let ssheet = new PIXI.BaseTexture.from(app.loader.resources[name].url);
	let p = 64;
	let playersh = {};

	playersh["noneSouth"] = [
		new PIXI.Texture(ssheet, new PIXI.Rectangle(7*p,2*p,p,p))
	];
	playersh["standSouth"] = [
		new PIXI.Texture(ssheet, new PIXI.Rectangle(0,10*p,p,p))
	];
	playersh["standWest"] = [
		new PIXI.Texture(ssheet, new PIXI.Rectangle(0,9*p,p,p))
	];
	playersh["standNorth"] = [
		new PIXI.Texture(ssheet, new PIXI.Rectangle(0,8*p,p,p))
	];
	playersh["standEast"] = [
		new PIXI.Texture(ssheet, new PIXI.Rectangle(0,11*p,p,p))
	];
	playersh["walkSouth"] = [
		new PIXI.Texture(ssheet, new PIXI.Rectangle(1*p,10*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(2*p,10*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(3*p,10*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(4*p,10*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(5*p,10*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(6*p,10*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(7*p,10*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(8*p,10*p,p,p))
	];
	playersh["walkWest"] = [
		new PIXI.Texture(ssheet, new PIXI.Rectangle(1*p,9*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(2*p,9*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(3*p,9*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(4*p,9*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(5*p,9*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(6*p,9*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(7*p,9*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(8*p,9*p,p,p))
	];
	playersh["walkNorth"] = [
		new PIXI.Texture(ssheet, new PIXI.Rectangle(1*p,8*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(2*p,8*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(3*p,8*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(4*p,8*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(5*p,8*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(6*p,8*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(7*p,8*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(8*p,8*p,p,p))
	];
	playersh["walkEast"] = [
		new PIXI.Texture(ssheet, new PIXI.Rectangle(1*p,11*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(2*p,11*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(3*p,11*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(4*p,11*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(5*p,11*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(6*p,11*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(7*p,11*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(8*p,11*p,p,p))
	];
	playersh["auraSouth"] = [
		new PIXI.Texture(ssheet, new PIXI.Rectangle(1*p,2*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(2*p,2*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(3*p,2*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(4*p,2*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(5*p,2*p,p,p)),
		new PIXI.Texture(ssheet, new PIXI.Rectangle(6*p,2*p,p,p))
	];

	playersh["class"] = name;
	playerSheet.push(playersh);
}

function getRandomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function updateObject(obj) {
	if (obj.width == obj.height) {
		obj.width = sizeObj*obj.size;
		obj.height = sizeObj*obj.size;
	} else {
		let percent = (sizeObj*obj.size)*100/obj.width*0.01;
		obj.width = sizeObj*obj.size;
		obj.height *= percent;
	}

	if (obj.size%2 == 0) {
		obj.anchor.set(.3, .9);
	} else {
		obj.anchor.set(.5, .9);
	}
}

function addObject(num, size, frame) {
	if (frame == null) {
		frame = new Object();
		frame.x = players[0].x;
		frame.y = players[0].y;
		frame.arrMap = [1, 1];
	}

	let obj = new PIXI.Sprite.from(app.loader.resources[num].url);
	map.addChild(obj);

	obj.x = frame.x;
	obj.y = frame.y;

	//obj.filters = [new PIXI.filters.DropShadowFilter()];

	obj.obj = num;
	obj.zIndex = frame.arrMap[0];
	obj.size = size;
	obj.interactive = true;
	obj.buttonMode = true;
	obj
		.on('pointerover', onObjOver)
		.on('pointerout', onObjOut);

	/*
	if (devModeBool) {
		obj
			.on('mousedown', onDragStart)
        	.on('mouseup', onDragEnd)
        	.on('mouseupoutside', onDragEnd)
        	.on('mousemove', onDragMove)
        	.on('rightdown', function(event) {
				if (players[0].admin) {
					document.body.appendChild(contextMenu(this));
				}
			});
	}
	*/

	updateObject(obj);
}

function addFrame(i, j) {
	let frame = new PIXI.Sprite.from(app.loader.resources[mapFrames[i][j].frame].url);
	frame.anchor.set(0.5);
	frame.zIndex = 0;
	frame.x = sizeObj * j;
	frame.y = sizeObj * i;
	frame.width = sizeObj;
	frame.height = sizeObj;
	frame.arrMap = [i, j];
	frame.walkable = mapFrames[i][j].walkable;

	frame.interactive = true;
	frame.buttonMode = true;

	frame
		//.on('pointerdown', movePlayerTP)
		.on('tap', function() {
			players[0].move(this);
		})
		.on('click', function() {
			// Для админки. Указание координат при создании NPC
			if (boolSelectCoordsNPC) {
				resetSelectCoordsNPC(this);
				return;
			}

			players[0].move(this);
		})
		.on('rightclick', function(event) {
			if (players[0].admin) {
				if (swapRightClick) {
					swapTexture(swapTextureRightClick, this);
				} else {
					document.body.appendChild(contextMenu(this));
				}
			}
		})
		.on('pointerover', onFrameOver)
		.on('pointerout', onFrameOut);
	map.addChild(frame);

	// Добавление объекта на карту
	if (mapFrames[i][j].objects != undefined) {
		addObject(mapFrames[i][j].objects.obj, mapFrames[i][j].objects.size, frame);
	}
}

// Из координат в объекты
function createPath(name, e) {
	if (e.length < 2) return;

	let obj = new Object();
	obj.name = name;
	obj.pathPlayer = [];

	for (let i = 1; i < e.length; i++) {
		for (let j = 0; j < map.children.length; j++) {
			if (map.children[j].arrMap == undefined) continue;

			if (map.children[j].arrMap[0] == e[i][0] && map.children[j].arrMap[1] == e[i][1]) {
				obj.pathPlayer.push(map.children[j]);
			}
		}
	}

	if (player.name == name) socket.emit("path", name, e);

	repeatPath = pathPlayer.findIndex(o => o.name == name)
	if (repeatPath != -1) pathPlayer.splice(repeatPath, 1);

	pathPlayer.push(obj);
	pathTicker = true;
}

function renderMap() {
	// Отчистка карты и игроков
	map.removeChildren();
	players = [];

	// Генерация карты
	for (let i = 0; i < mapFrames.length; i++) {
		for (let j = 0; j < mapFrames[i].length; j++) {
			addFrame(i, j);
		}
	}

	// Генерация игроков
	player = new Player(character).addToMap(character).bindCamera();
	socket.emit('getAllPlayers');

	// Генерация NPC
	for (let i = 0; i < mapNPCs.length; i++) {
		new NPC(mapNPCs[i]).addToMap();
	}
}

function getArrFrameFromContainer(frame) {
	for (let i = 0; i < mapFrames.length; i++) {
		for (let j = 0; j < mapFrames[0].length; j++) {
			if (i == frame.arrMap[0] && j == frame.arrMap[1]) {
				return [i, j];
			}
		}
	}
}

function getFrameFromObject(obj) {
	for (let i = 0; i < map.children.length; i++) {
		if (obj.x == map.children[i].x && obj.y == map.children[i].y) {
			return map.children[i];
		}
	}
}

function getContainerFromObject(obj) {
	for (let i = 0; i < map.children.length; i++) {
		if (obj.x == map.children[i].x && obj.y == map.children[i].y) {
			return mapFrames[map.children[i].arrMap[0]][map.children[i].arrMap[1]];
		}
	}
}

function keysDown(e) {
	keys[e.keyCode] = true;
}

function keysUp (e) {
	keys[e.keyCode] = false;
}

function movePlayerTP() {
	players[0].x = this.x - this.width*0.28;
	players[0].y = this.y - this.height*0.55;
}

////////////////////////////
////////// EVENTS //////////
////////////////////////////

function onFrameOver() {
	if (!this.walkable) {
		//this.tint = 0x808080;
		return
	}
	this.filters = [new PIXI.filters.OutlineFilter(2, 0x99ff99)];
}

function onFrameOut() {
	this.width = sizeObj;
	this.height = sizeObj;
	this.filters = [];
}

function onObjOver() {
	this.filters = [new PIXI.filters.OutlineFilter(2, 0x99ff99)];
}

function onObjOut() {
	this.filters = [];
}

function onDragStart(event) {
	if (!players[0].admin) return;

	this.data = event.data;
    this.alpha = 0.5;
    this.dragging = true;
    this.originalXY = [this.x, this.y];

    let frame = getContainerFromObject(this);
    delete frame.objects;
}

function onDragEnd() {
	if (!players[0].admin) return;

    this.alpha = 1;
    this.dragging = false;
    // set the interaction data to null
    this.data = null;

    // Поиск ближайжего блока для соединения
    for (let i = 0; i < map.children.length; i++) {
    	if (map.children[i].x < this.x+sizeObj/2 && map.children[i].x > this.x-sizeObj/2) {
    		if (map.children[i].y < this.y+sizeObj/2 && map.children[i].y > this.y-sizeObj/2) {
    			let arr;
    			try {
    				arr = getArrFrameFromContainer(map.children[i]);
    			} catch {
    				this.x = this.originalXY[0];
    				this.y = this.originalXY[1];
    				delete this.originalXY;
    				new Notify ({
    					title: 'Ошибка!',
    					text: 'Неправильная позиция',
    					status: 'error',
    					autoclose: true,
    					autotimeout: 3000
					});
    				return
    			}
    			this.x = map.children[i].x;
    			this.y = map.children[i].y;
    			this.zIndex = arr[0];
    			let tmp = new Object();
    			tmp.obj = this.obj;
    			tmp.size = this.size;
    			//tmp.zIndex = arr[0];
    			mapFrames[arr[0]][arr[1]].objects = tmp;
    			socket.emit("saveMap", JSON.stringify(mapFrames));
    			return
    		}
    	}
	}
}

function onDragMove() {
	if (!players[0].admin) return;

    if (this.dragging) {
        const newPosition = this.data.getLocalPosition(this.parent);
        this.x = newPosition.x;
        this.y = newPosition.y;

        /*for (let i = 0; i < map.children.length; i++) {
	    	if (map.children[i].x < this.x+20 && map.children[i].x > this.x-20) {
	    		if (map.children[i].y < this.y+20 && map.children[i].y > this.y-20) {
	    			map.children[i].alpha = .5;
	    			return
	    		}
	    	}
		}*/
    }
}

// FPS Boost
function renderMapAroundPlayer() {
	let render = [
		players[0].getGlobalPosition().x - window.innerWidth/2 - 100,
		players[0].getGlobalPosition().x + window.innerWidth/2 + 100,
		players[0].getGlobalPosition().y - window.innerHeight/2 - 100,
		players[0].getGlobalPosition().y + window.innerHeight/2 + 100
	];

	for (let i = 0; i < map.children.length; i++) {
		if (render[0] < map.children[i].getGlobalPosition().x &&
			map.children[i].getGlobalPosition().x < render[1] &&
			render[2] < map.children[i].getGlobalPosition().y &&
			map.children[i].getGlobalPosition().y < render[3]) {

			map.children[i].visible = true;
		} else {
			map.children[i].visible = false;
		}
	}
}

//////////////////////////////
////////// APP TICK //////////
//////////////////////////////

function checkFPS() {
	stats.begin();
	stats.end();
}

var pixiFPSCount = 0;
function pixiCheckFPS() {
	if (pixiFPSCount == 10) {
		document.getElementById('fps').innerHTML = 'FPS: ' + Math.trunc(app.ticker.FPS);
		pixiFPSCount = 0;
	} else {
		pixiFPSCount++;
	}
}

function playerMove() {
	//document.getElementById('fps').innerHTML = Math.trunc(app.ticker.FPS);

	if (!pathTicker) {
		return
	}

	for (let i = 0; i < pathPlayer.length; i++) {
		// Поиск игрока
		let playerTicker = players.find(o => o.name == pathPlayer[i].name);

		// Вправо - Влево
		if (playerTicker.arrMap[1] > pathPlayer[i].pathPlayer[0].arrMap[1]) {
			playerTicker.x -= moveSpeed;
			if (!playerTicker.playing) {
				playerTicker.textures = playerSheet[playerTicker.skin].walkWest;
				playerTicker.play();
			}

			if (playerTicker.x < pathPlayer[i].pathPlayer[0].x) {
				playerTicker.arrMap = pathPlayer[i].pathPlayer[0].arrMap;
				playerTicker.zIndex = pathPlayer[i].pathPlayer[0].arrMap[0];
				pathPlayer[i].pathPlayer.shift();
				playerTicker.stop();
				if (boostFPS) renderMapAroundPlayer();
			}
		} else if (playerTicker.arrMap[1] < pathPlayer[i].pathPlayer[0].arrMap[1]) {
			playerTicker.x += moveSpeed;
			if (!playerTicker.playing) {
				playerTicker.textures = playerSheet[playerTicker.skin].walkEast;
				playerTicker.play();
			}

			if (playerTicker.x > pathPlayer[i].pathPlayer[0].x) {
				playerTicker.arrMap = pathPlayer[i].pathPlayer[0].arrMap;
				playerTicker.zIndex = pathPlayer[i].pathPlayer[0].arrMap[0];
				pathPlayer[i].pathPlayer.shift();
				playerTicker.stop();
				if (boostFPS) renderMapAroundPlayer();
			}
		} else if (playerTicker.arrMap[0] > pathPlayer[i].pathPlayer[0].arrMap[0]) {
			playerTicker.y -= moveSpeed;
			if (!playerTicker.playing) {
				playerTicker.textures = playerSheet[playerTicker.skin].walkNorth;
				playerTicker.play();
			}

			if (playerTicker.y < pathPlayer[i].pathPlayer[0].y-sizeObj*.6) {
				playerTicker.arrMap = pathPlayer[i].pathPlayer[0].arrMap;
				playerTicker.zIndex = pathPlayer[i].pathPlayer[0].arrMap[0];
				pathPlayer[i].pathPlayer.shift();
				playerTicker.stop();
				if (boostFPS) renderMapAroundPlayer();
			}
		} else if (playerTicker.arrMap[0] < pathPlayer[i].pathPlayer[0].arrMap[0]) {
			playerTicker.y += moveSpeed;
			if (!playerTicker.playing) {
				playerTicker.textures = playerSheet[playerTicker.skin].walkSouth;
				playerTicker.play();
			}

			if (playerTicker.y > pathPlayer[i].pathPlayer[0].y-sizeObj*.6) {
				playerTicker.arrMap = pathPlayer[i].pathPlayer[0].arrMap;
				playerTicker.zIndex = pathPlayer[i].pathPlayer[0].arrMap[0];
				pathPlayer[i].pathPlayer.shift();
				playerTicker.stop();
				if (boostFPS) renderMapAroundPlayer();
			}
		}

		// Точные координаты
		/*if (path.length == 0) {
			player.x = path[0].x;
			player.y = path[0].y-sizeObj*.6;
		}*/

		if (playerTicker == player) player.bindCamera();

		if (pathPlayer[i].pathPlayer.length == 0) {
			pathPlayer.splice(i, 1);
			playerTicker.stop();
			pathTicker = false;
		}
	}
};

// Проверка режима разработчика
window.addEventListener('devtoolschange', event => {
	console.log('Режим разработчика: ', event.detail.isOpen);
	console.log(event.detail.orientation);
});

/*if (window.devtools.isOpen) {
	window.location = 'about:blank';
}*/

//disableDevtool();