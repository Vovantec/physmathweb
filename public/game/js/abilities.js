var abilities = [];

class Ability extends PIXI.spine.Spine {
	constructor(data) {
		super(app.loader.resources[data.ability.replace('_reflected', '')].spineData);

		this.skeleton.setToSetupPose();
		this.update(0);
		this.autoUpdate = false;
		this.state.setAnimation(0, 'animation', true);

		// Имя
		this.name = data.ability;

		// Размер
		var percent = (data.target.height*100/this.height*0.01);
		this.width = this.width * percent * 2;
		this.height = this.height * percent * 2;

		// Добавляем способность
		this[data.ability](data);
	}

	ability_1(data) {
		// Расположение
		this.coords = [data.player.x, data.player.y];

		// Расчет движения до цели
		this.toX = data.target.x;
		this.toY = data.target.y;
		this.stepX = (data.player.x - this.toX)/30;
		this.stepY = (data.player.y - this.toY)/30;
	}

	ability_1_reflected(data) {
		// Расположение
		this.coords = [data.target.x, data.target.y];

		// Расчет движения до цели
		this.toX = data.target.x + (data.player.x - data.target.x)/2;
		this.toY = data.target.y;
		this.stepX = (data.target.x - this.toX)/30;
		this.stepY = (data.target.y - this.toY)/30;

		// Изменяем угол в обратную сторону
		this.rotation = 3.15;
	}

	ability_2(data) {
		// Расположение
		this.coords = [data.target.x, data.target.y];

		// Событие удаления
		this.state.addListener({
			complete: function(entry) {
		    	map.removeChild(abilities[0]);
		    	abilities.shift();
		    }
		});
	}

	ability_2_reflected(data) {
		// Расположение
		this.coords = ['latest_to_x', 'latest_to_y'];

		// Событие удаления
		this.state.addListener({
			complete: function(entry) {
		    	map.removeChild(abilities[0]);
		    	abilities.shift();
		    }
		});
	}

	ability_3(data) {
		// Расположение
		this.coords = [data.target.x, data.target.y];

		// Событие удаления
		this.state.addListener({
			complete: function(entry) {
		    	map.removeChild(abilities[0]);
		    	abilities.shift();
		    }
		});
	}
}

const ABILITIES = [
	{
		"name": "skill",
		"type": "target",
		"list": ["ability_1", "ability_2"]
	},
	{
		"name": "skill-reflected",
		"type": "target",
		"list": ["ability_1", "ability_3", "ability_1_reflected", "ability_2_reflected"]
	}
];

// Функция определения способности
function createAbility(data) {
	// Вероятность отражения способности
	if (data.hit == 'fail') {
		var abil = ABILITIES.find(o => o.name == data.ability + "-reflected");
	} else {
		var abil = ABILITIES.find(o => o.name == data.ability);
	}

	// Сбор способности
	for (let i = 0; i < abil.list.length; i++) {
		data.ability = abil.list[i];
		abilities.push(new Ability(data));
	}

	// Наносим урон или нет
	if (!abil.name.includes('-reflected')) {
		abilities.push({"target": data.target, "hit": data.hit});
	}
}

// Функция тикера
function abilitiesTicker() {
	if (abilities.length == 0) return;

	// Проверка на урон
	if (abilities[0].target != undefined && abilities[0].hit != undefined) {
		abilities[0].target.setHpFight(abilities[0].hit);
		abilities.shift();
		return;
	}

	// Проверка наличия на карте
	if (map.getChildByName(abilities[0].name) == undefined) {
		// Устанавливаем координаты (баг в Spine)
		abilities[0].x = abilities[0].coords[0];
		abilities[0].y = abilities[0].coords[1];

		// Добавление на карту
		map.addChild(abilities[0]);

		// Звук
		app.loader.resources[abilities[0].name.replace('_reflected', '') + ".wav"].sound.play();
	}

	// Проверка на движение к цели
	if (abilities[0].toX != undefined && abilities[0].toY != undefined) {
		// Проверка, если достигнула цели
		if (abilities[0].x - 10 <= abilities[0].toX && abilities[0].toX <= abilities[0].x + 10) {
			// Проверка следующей способности на координаты
			if (abilities[1].coords[0] == 'latest_to_x') {
				abilities[1].coords[0] = abilities[0].toX;
				abilities[1].coords[1] = abilities[0].toY;
			}

			// Удаление с карты и с массива
			map.removeChild(abilities[0]);
			abilities.shift();
		}

		// Движение по координатам
		abilities[0].x -= abilities[0].stepX;
		abilities[0].y -= abilities[0].stepY;
	}

	// Обновление анимации
	abilities[0].update(0.02);
}

// ===== Дерево навыков =====

const ABILITIES_TREE = {"name" : "A", "info" : "tst", "children" : [
    {"name" : "A1", "children" : [
            {"name" : "A12" },
            {"name" : "A13" },
            {"name" : "A14" },
            {"name" : "A15" },
            {"name" : "A16" }
        ] },
    {"name" : "A2", "children" : [
            {"name" : "A21" },
            {"name" : "A22", "children" : [
            {"name" : "A221" },
            {"name" : "A222" },
            {"name" : "A223" },
            {"name" : "A224" }
        ]},
            {"name" : "A23" },
            {"name" : "A24" },
            {"name" : "A25" }] },
    {"name" : "A3", "children": [
            {"name" : "A31", "children" :[
                    {"name" : "A311" },
                    {"name" : "A312" },
                    {"name" : "A313" },
                    {"name" : "A314" },
                    {"name" : "A315" }
                ]}] }
]};

let createRadialTree = function () {
    let height = window.innerHeight;
    let width = window.innerWidth;

    let svg = d3.select('body')
        .append('svg')
        .attr("text-anchor", "middle")
        .call(d3.zoom().on("zoom", function (e) {
       		svg.attr("transform", e.transform)
    	}))
  		.append("g");

    let diameter = height * 0.75;
    let radius = diameter / 2;

    let tree = d3.tree()
        .size([2*Math.PI, radius])
        .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

    let data = d3.hierarchy(ABILITIES_TREE)

    let treeData = tree(data);
   
    let nodes = treeData.descendants();
    let links = treeData.links();
    
    let graphGroup = svg.append('g')
        .attr('transform', "translate("+(width/2)+","+(height/2)+")");

    graphGroup.selectAll(".link")
        .data(links)
        .join("path")
        .attr("class", "link")
        .attr("d", d3.linkRadial()
            .angle(d => d.x)
            .radius(d => d.y));
 
    let node = graphGroup
        .selectAll(".node")
        .data(nodes)
        .join("g")
        .attr("class", "node")
        .attr("transform", function(d){
            return `rotate(${d.x * 180 / Math.PI - 90})` + `translate(${d.y}, 0)`;
        });

    node.append("image")
    	.attr("x", -12)
    	.attr("y", -12)
    	.attr("width", 24)
    	.attr("height", 24)
    	.attr("r", 5)
        .attr("xlink:href", "images/abilities_img/archer/2/active_2.jpg");

    /*node.append("circle").attr("r", 1);

    node.append("text")
        .attr("font-size", 12)
        .attr("color", "white")
        .attr("dx", function(d) { return d.x < Math.PI ? 8 : -8; })
        .attr("dy", ".31em")
        .attr("text-anchor", function(d) { return d.x < Math.PI ? "start" : "end"; })
        .attr("transform", function(d) { return d.x < Math.PI ? null : "rotate(180)"; })
        .text(function(d) { return d.data.name; });*/
};

function redraw() {
  //console.log("here", d3.event.translate, d3.event.scale);
  svg.attr("transform",
      "translate(" + d3.event.translate + ")"
      + " scale(" + d3.event.scale + ")");
}