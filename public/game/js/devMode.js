var devModeConfig = [
	["1 | Для передвижения (лето)", 1, 19],
	["2 | Для передвижения (лето)", 107, 111],
	["1 | Для передвижения (песчаный)", 19, 37],
	["2 | Для передвижения (песчаный)", 91, 95],
	["1 | Для передвижения (тропический)", 37, 55],
	["2 | Для передвижения (тропический)", 95, 99],
	["1 | Для передвижения (зима)", 55, 73],
	["2 | Для передвижения (зима)", 102, 107],
	["1 | Для передвижения (осень)", 73, 91],
	["2 | Для передвижения (осень)", 99, 102],
	["1 | Для передвижения | Дороги (лето)", 2000, 2026],
	["2 | Для передвижения | Дороги (лето)", 2192, 2205],
	["1 | Для передвижения | Дороги (песчаный)", 2031, 2057],
	["2 | Для передвижения | Дороги (песчаный)", 2140, 2153],
	["1 | Для передвижения | Дороги (тропический)", 2058, 2084],
	["2 | Для передвижения | Дороги (тропический)", 2153, 2166],
	["1 | Для передвижения | Дороги (зима)", 2086, 2112],
	["2 | Для передвижения | Дороги (зима)", 2179, 2192],
	["2 | Для передвижения | Дороги (осень)", 2166, 2179],
	["Река/Озеро", 1950, 1957],
	["1 | Здания (лето)", 1000, 1006],
	["2 | Здания (лето)", 1101, 1119],
	["1 | Здания (песчаный)", 1006, 1011],
	["2 | Здания (песчаный)", 1029, 1047],
	["1 | Здания (тропический)", 1011, 1016],
	["2 | Здания (тропический)", 1047, 1065],
	["1 | Здания (зима)", 1016, 1022],
	["2 | Здания (зима)", 1083, 1101],
	["1 | Здания (осень)", 1022, 1029],
	["2 | Здания (осень)", 1065, 1083],
	["1 | Зелень/Камни/Деревья (лето)", 3000, 3032],
	["2 | Зелень/Камни/Деревья (лето)", 3222, 3238],
	["1 | Зелень/Камни/Деревья (песчаный)", 3032, 3066],
	["2 | Зелень/Камни/Деревья (песчаный)", 3161, 3178],
	["1 | Зелень/Камни/Деревья (тропический)", 3066, 3100],
	["2 | Зелень/Камни/Деревья (тропический)", 3178, 3190],
	["1 | Зелень/Камни/Деревья (зима)", 3100, 3131],
	["2 | Зелень/Камни/Деревья (зима)", 3208, 3222],
	["1 | Зелень/Камни/Деревья (осень)", 3131, 3161],
	["2 | Зелень/Камни/Деревья (осень)", 3190, 3208],
	["1 | Стены/Заборы (лето)", 4000, 4001],
	["1 | Стены/Заборы (зима)", 4001, 4002],
	["1 | Стены/Заборы (осень)", 4002, 4003],
	["Стены/Заборы", 4006, 4019],
	["1 | Декорации (лето)", 5000, 5013],
	["2 | Декорации (лето)", 5125, 5144],
	["1 | Декорации (песчаный)", 5013, 5021],
	["2 | Декорации (песчаный)", 5052, 5071],
	["1 | Декорации (тропический)", 5021, 5028],
	["2 | Декорации (тропический)", 5071, 5089],
	["1 | Декорации (зима)", 5028, 5040],
	["2 | Декорации (зима)", 5106, 5125],
	["1 | Декорации (осень)", 5040, 5052],
	["2 | Декорации (осень)", 5089, 5106]
];

var styleTitle = 'width:100%;height:5%;text-align:center;font-size:20px;color:black;font-weight:bold;';

var updateTexture = null;
var swapRightClick = false, swapTextureRightClick = 1;
var freeCamera = false, speedCamFree = 20;
var gridWalkable = false;

// Функция замены текстур
function swapTexture(id, obj) {
	let texture = PIXI.Texture.from(app.loader.resources[id].url);
	obj.texture = texture;

	let frame = getContainerFromObject(obj);
	frame.frame = Number(id);

	socket.emit("saveMap", JSON.stringify(mapFrames));
}

// Функция замены проходимости блока
function swapWalkable(obj) {
	obj.walkable = !obj.walkable;
	let frame = getContainerFromObject(obj);
	frame.walkable = !frame.walkable;

	if (gridWalkable) {
		if (obj.walkable) {
			obj.tint = 0x90EE90;
		} else {
			obj.tint = 0x808080;
		}
	}

	socket.emit("saveMap", JSON.stringify(mapFrames));
}

// Фукция повышения FPS
function boostFPSfunc(obj) {
	boostFPS = !boostFPS;

	if (obj == null) {
		if (boostFPS) {
			renderMapAroundPlayer();
			return;
		} else {
			for (let i = 0; i < map.children.length; i++) {
				map.children[i].visible = true;
			}
			return;
		}
	}

	if (boostFPS) {
		obj.style.cssText = 'width:100%;height:auto;font-size:16px;background-color:green;margin-bottom:2%;';
		renderMapAroundPlayer();
	} else {
		obj.style.cssText = 'width:100%;height:auto;font-size:16px;background-color:red;margin-bottom:2%;';
		for (let i = 0; i < map.children.length; i++) {
			map.children[i].visible = true;
		}
	}
}

// Режим разработчика
var DeveloperMode = function () {
	if (!players[0].admin) return;

	var container = document.createElement('div');
	container.style.cssText = 'position:fixed;top:0;left:0;opacity:0.9;z-index:10000;width:20%;height:80%;overflow-x:hidden;overflow-y:scroll;background-color:rgba(245,255,250,0.8);';
	container.id = "devMode1";

	for (let j = 0; j < devModeConfig.length; j++) {
		// Надпись
		var title = document.createElement('p');
		title.style.cssText = styleTitle;
		title.innerHTML = devModeConfig[j][0];
		container.appendChild(title);

		// Почва
		for (let i = devModeConfig[j][1]; i < devModeConfig[j][2]; i++) {
			var img = document.createElement('img');
			img.id = i;
			img.src = '../images/map/'+i+'.png';
			img.style.cssText = 'width:15%;height:auto;padding:1px';

			if (devModeConfig[j][0].indexOf("Для передвижения") != -1) {
				img.addEventListener('click', function(event) {
					event.preventDefault();
					if (updateTexture != null) {
						swapTexture(this.id, updateTexture);
					} else {
						let tmp = document.getElementById('imgSwapTextureRightClick');
						tmp.src = 'images/map/'+this.id+'.png';
						swapTextureRightClick = this.id;
					}
				}, false);
			} else {
				img.addEventListener('click', function(event) {
					event.preventDefault();
					addObject(this.id, 1, null);
				}, false);
			}

			container.appendChild(img);
		}
	}

	// Кнопки добавления сетки
	
	let buttonsAdd = ["Добавить по X", "Добавить по Y", "От персонажа по X", "От персонажа по Y"];
	var buttons = document.createElement('div');
	buttons.style.cssText = 'position:fixed;bottom:0;left:0;cursor:pointer;opacity:0.9;z-index:10000;width:20%;height:20%;overflow:hidden;background-color:rgba(245,255,250,0.8);';
	container.appendChild(buttons);

	for (let i = 0; i < buttonsAdd.length; i++) {
		let btn = document.createElement('button');
		btn.style.cssText = 'width:40%;height:auto;text-align:center;font-size:16px;color:black;margin:2%;';
		btn.innerHTML = buttonsAdd[i];

		btn.addEventListener('click', function(event) {
			event.preventDefault();

			switch (this.innerHTML) {
				case "Добавить по X":
					let mapFramesLen = mapFrames[0].length;
					for (let i = 0; i < mapFrames.length; i++) {
						let newFrame = new Object();
						newFrame.frame = swapTextureRightClick;
						newFrame.walkable = true;
						mapFrames[i][mapFramesLen] = newFrame;
						addFrame(i, mapFramesLen);
					}
					socket.emit("saveMap", JSON.stringify(mapFrames));
					break;
				case "Добавить по Y":
					mapFrames[mapFrames.length] = mapFrames[mapFrames.length-1];
					for (let j = 0; j < mapFrames[0].length; j++) {
						addFrame(mapFrames.length-1, j);
					}
					socket.emit("saveMap", JSON.stringify(mapFrames));
					break;
				case "От персонажа по X":
					/*let result = confirm("Визуальная схема изменения. Вы уверены?\n0010\n0X->\n0010\n0010\n\n00010\n0X010\n00010\n00010");
					if (result) {
						let mapFramesLen = mapFrames[0].length;
						for (let i = 0; i < mapFrames.length; i++) {

						}
						socket.emit("saveMap", JSON.stringify(mapFrames));
					}*/
					break;
				case "От персонажа по Y":

					break;
				default:
					console.log("ERROR BUTTONS");
					break;
			}
		}, false);
		buttons.appendChild(btn);
	}

	// Правый блок редактора
	var container2 = document.createElement('div');
	container2.style.cssText = styleTitle + 'position:fixed;bottom:0;right:0;opacity:0.9;z-index:10000;width:20%;height:auto;background-color:rgba(245,255,250,0.8);';
	container2.className = "devMode2";

	//var hr2 = document.createElement('hr');
	//hr2.style.cssText = 'border:2px black;border-style:solid none solid none;text-align:center;';
	//container2.appendChild(hr2);

	var btnFreeCamera = document.createElement('button');
	container2.appendChild(btnFreeCamera);
	btnFreeCamera.style.cssText = 'width:80%;height:auto;font-size:16px;background-color:red;margin-bottom:2%;';
	btnFreeCamera.innerHTML = "Режим полета";
	btnFreeCamera.addEventListener('click', function(event) {
		event.preventDefault();

		freeCamera = !freeCamera;
		if (freeCamera) {
			this.style.cssText = 'width:80%;height:auto;font-size:16px;background-color:green;margin-bottom:2%;';
		} else {
			this.style.cssText = 'width:80%;height:auto;font-size:16px;background-color:red;margin-bottom:2%;';
			map.scale.x = 1;
			map.scale.y = 1;
			centerMap();
		}
	});

	var inputFreeCamera = document.createElement('input');
	container2.appendChild(inputFreeCamera);
	inputFreeCamera.style.cssText = 'width:17%;height:auto;font-size:16px;margin-bottom:2%;';
	inputFreeCamera.value = speedCamFree;
	inputFreeCamera.type = "number";
	inputFreeCamera.addEventListener('keyup', function() {
		if (this.value > 100) {
			this.value = 100;
		}
  		speedCamFree = Number(this.value);
	});

	var btnSwapTextureRightClick = document.createElement('button');
	container2.appendChild(btnSwapTextureRightClick);
	btnSwapTextureRightClick.style.cssText = 'width:100%;height:auto;font-size:16px;background-color:red;margin-bottom:1%;';
	btnSwapTextureRightClick.innerHTML = "Быстрая замена текстур (ПКМ)\nПроходимость (ЛКМ)";
	btnSwapTextureRightClick.addEventListener('click', function(event) {
		event.preventDefault();

		swapRightClick = !swapRightClick;
		if (swapRightClick) {
			this.style.cssText = 'width:100%;height:auto;font-size:16px;background-color:green;margin-bottom:1%;';
		} else {
			this.style.cssText = 'width:100%;height:auto;font-size:16px;background-color:red;margin-bottom:1%;';
		}
	});

	var imgSwapTextureRightClick = document.createElement('img');
	container2.appendChild(imgSwapTextureRightClick);
	imgSwapTextureRightClick.style.cssText = 'width:30%;height:auto;margin-bottom:2%;';
	imgSwapTextureRightClick.src = 'images/map/1.png';
	imgSwapTextureRightClick.id = "imgSwapTextureRightClick";

	var btnGridWalkable = document.createElement('button');
	container2.appendChild(btnGridWalkable);
	btnGridWalkable.style.cssText = 'width:100%;height:auto;font-size:16px;background-color:red;margin-bottom:2%;';
	btnGridWalkable.innerHTML = "Сетка проходимости";
	btnGridWalkable.addEventListener('click', function(event) {
		event.preventDefault();

		gridWalkable = !gridWalkable;
		if (gridWalkable) {
			this.style.cssText = 'width:100%;height:auto;font-size:16px;background-color:green;margin-bottom:2%;';
		} else {
			this.style.cssText = 'width:100%;height:auto;font-size:16px;background-color:red;margin-bottom:2%;';
		}

		for (let i = 0; i < map.children.length; i++) {
			if (!gridWalkable) {
				map.children[i].tint = 0xFFFFFF;
				continue
			}

			if (map.children[i].walkable) {
				map.children[i].tint = 0x90EE90;
			} else {
				map.children[i].tint = 0x808080;
			}
		}
	});

	var btnBoostFPS = document.createElement('button');
	container2.appendChild(btnBoostFPS);
	btnBoostFPS.style.cssText = 'width:100%;height:auto;font-size:16px;background-color:red;margin-bottom:2%;';
	btnBoostFPS.innerHTML = "Оптимизация";
	btnBoostFPS.addEventListener('click', function(event) {
		event.preventDefault();
		boostFPSfunc(this);
	});

	return [container, container2];
}

// Закрытие контекстного меню
document.addEventListener('click', function(event) {
	if (event.target.className == "" && document.getElementById("contextMenu") != null) {
		document.getElementById("contextMenu").remove();
	}
});

var contextMenu = function(obj) {
	if (!players[0].admin) return;

	// Удаление предыдущего меню
	if (document.getElementById("contextMenu") != null) {
		document.getElementById("contextMenu").remove();
	}

	var container = document.createElement('div');
	container.id = 'contextMenu';
	container.style.cssText = 'position:fixed;top:'+obj.getGlobalPosition().y+'px;left:'+obj.getGlobalPosition().x+'px;cursor:pointer;opacity:0.9;z-index:10000;width:6%;height:auto;overflow: hidden';

	var buttonsFrame = ["Изменить текстуру", "Ходьба", "Закрыть"]
	var buttonsObj = ["Увеличить", "Уменьшить", "Ближе", "Дальше", "Удалить", "Закрыть"]

	if (obj.arrMap != undefined) {
		var buttons = buttonsFrame;
	} else {
		var buttons = buttonsObj;
	}

	for (let i = 0; i < buttons.length; i++) {
		var btn = document.createElement('button');
		btn.style.cssText = 'width:100%;height:20%;text-align:center;font-size:16px;color:black';
		if (buttons[i] == "Ходьба") {
			if (obj.walkable == true) {
				btn.innerHTML = buttons[i] + " -";
				btn.style.cssText += "color: green;"
			} else {
				btn.innerHTML = buttons[i] + " +";
				btn.style.cssText += "color: red;"
			}
		} else {
			btn.innerHTML = buttons[i];
		}
		btn.className = 'blubtn';

		btn.addEventListener('click', function(event) {
			event.preventDefault();

			let frame = getContainerFromObject(obj);
			switch (this.innerHTML) {
				case "Увеличить":
					frame.objects.size += 1;
					obj.size += 1;
					updateObject(obj);
					socket.emit("saveMap", JSON.stringify(mapFrames));
					break;
				case "Уменьшить":
					if (frame.objects.size == 1) return console.log("Более не уменьшается!");
					frame.objects.size -= 1;
					obj.size -= 1;
					updateObject(obj);
					socket.emit("saveMap", JSON.stringify(mapFrames));
					break;
				case "Изменить текстуру":
					document.getElementById("contextMenu").remove();
					updateTexture = obj;
					break;
				case "Ближе":
					obj.zIndex += 1;
					frame.objects.zIndex += 1;
					socket.emit("saveMap", JSON.stringify(mapFrames));
					break;
				case "Дальше":
					obj.zIndex -= 1;
					frame.objects.zIndex -= 1;
					socket.emit("saveMap", JSON.stringify(mapFrames));
					break;
				case "Ходьба +":
					obj.walkable = true;
					frame.walkable = true;
					socket.emit("saveMap", JSON.stringify(mapFrames));
					document.getElementById("contextMenu").remove();
					break;
				case "Ходьба -":
					obj.walkable = false;
					frame.walkable = false;
					socket.emit("saveMap", JSON.stringify(mapFrames));
					document.getElementById("contextMenu").remove();
					break;
				case "Удалить":
					delete frame.objects;
					map.removeChild(obj);
					socket.emit("saveMap", JSON.stringify(mapFrames));
					document.getElementById("contextMenu").remove();
					break;
				case "Закрыть":
					document.getElementById("contextMenu").remove();
					break; 
				default:
					console.log("ERROR");
					break;
			}

		}, false);

		container.appendChild(btn);
	}

	return container;
}

document.addEventListener('wheel', function(e) {
	if (!freeCamera) { return }

	if (e.deltaY < 0) {
		map.scale.x += speedCamFree/100;
		map.scale.y += speedCamFree/100;
	}

	if (e.deltaY > 0) {
		map.scale.x -= speedCamFree/100;
		map.scale.y -= speedCamFree/100;
	}
});

function freeCameraLoop() {
	// W - 87
	// A - 65
	// S - 83
	// D - 68

	if (!freeCamera) return

	if (keys["87"] && keys["65"]) {
		// ^
		//	\
		player.x -= speedCamFree;
		player.y -= speedCamFree;
	} else if (keys["87"] && keys["68"]) {
		//  ^
		// /
		player.x += speedCamFree;
		player.y -= speedCamFree;
	} else if (keys["83"] && keys["68"]) {
		// \
		//  v
		player.x += speedCamFree;
		player.y += speedCamFree;
	} else if (keys["83"] && keys["65"]) {
		//  /
		// v
		player.x -= speedCamFree;
		player.y += speedCamFree;
	} else if (keys["65"]) {
		// <-
		player.x -= speedCamFree;
	} else if (keys["87"]) {
		// ^
		player.y -= speedCamFree;
	} else if (keys["68"]) {
		// ->
		player.x += speedCamFree;
	} else if (keys["83"]) {
		// v
		player.y += speedCamFree;
	}

	renderMapAroundPlayer();
	map.x += window.innerWidth/2 - player.getGlobalPosition().x;
	map.y += window.innerHeight/2 - player.getGlobalPosition().y;
}