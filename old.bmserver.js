var server = require("express").createServer();
var io = require("socket.io").listen(server);

var state = 0;
//0 is waiting
//1 is starting
//2 is game
//3 is game in death mode

var winner = -1;

var players = [];
var timeoffset = 0;

var toch = {};
var changes = [];

var map = [
		{num:0x50,ast:0,cache:-1},{num:0x50,ast:0,cache:-1},{num:0x50,ast:0,cache:-1},{num:0x50,ast:0,cache:-1},{num:0x50,ast:0,cache:-1},
		{num:0x50,ast:0,cache:-1},{num:0x00,ast:0,cache:-1},{num:0x00,ast:0,cache:-1},{num:0x00,ast:0,cache:-1},{num:0x50,ast:0,cache:-1},
		{num:0x50,ast:0,cache:-1},{num:0x00,ast:0,cache:-1},{num:0x50,ast:0,cache:-1},{num:0x00,ast:0,cache:-1},{num:0x50,ast:0,cache:-1},
		{num:0x50,ast:0,cache:-1},{num:0x00,ast:0,cache:-1},{num:0x00,ast:0,cache:-1},{num:0x00,ast:0,cache:-1},{num:0x50,ast:0,cache:-1},
		{num:0x50,ast:0,cache:-1},{num:0x50,ast:0,cache:-1},{num:0x50,ast:0,cache:-1},{num:0x50,ast:0,cache:-1},{num:0x50,ast:0,cache:-1}
	];
	
map.width = 5;
map.height = 5;

server.listen(8080);

server.get("/bomberman*",function(req,res) {
	res.sendfile("/var/www" + req.url)
});


io.set('log level', 1);

io.sockets.on("connection", function(socket) {

	//////used for connecting before game
	
	socket.set("num",-1);
	
	if (state >= 2) {
		socket.emit("init",{
		    state:state,
			players:players,
			map:map,
			width:map.width,
			height:map.height,
			tick:new Date().getTime() - timeoffset
		});
	}

	socket.on("join",function(data) {
		socket.get("num",function(err,num) {
			if (state < 2) {
				if (err || num<0) {
					num = players.length++;
					socket.set("num",num);
				}
			
				socket.set("name",data.name);
				
				console.log("Player " + num + " has joined");
				socket.emit("welcome",{num:num});
				io.sockets.emit("msg","<span style=\"color:green\">+</span> " + data.name + " is <span style=\"color:green\">ready</span>");
			
				if (num >= 1 && state == 0) {
					state = 1;
					io.sockets.emit("starting",{time:20});
					setTimeout(gamestart,20000);
				}
			}
		});
	});
	
	//////use during game
	
	
	
	socket.on("input", function(data) {
		socket.get("num",function(err,num) {
			if (err || num==-1 || !players[num]) return;
		
			var pos = ~~data.posx + ~~data.posy*map.width;
			if (!map[pos] || map[pos].num&0x10) {
				console.log("Invalid pos " + pos + ": " + num);
				return;
			}
			
			if (map[pos].num&0x40) {
				players[num].isalive = false;
			} else if (map[pos].num&0xF0 == 0x60) {
				players[num].ups[map[pos].num&0x0F]++;
				map[pos] = {num:0x00,ast:0,cache:-1};
				changes.push({pos:pos,tile:map[pos]});
			}
			
			players[num].dir = data.dir;
			
			players[num].posx = data.posx;
			players[num].posy = data.posy;
			
			players[num].bomb = data.bomb;
			
			io.sockets.emit("tick",{num:num,player:players[num]});
		});
	});
	
	socket.on("change", function(data) {
		socket.get("num",function(err,num) {	
			if (err || num == -1) return;
		
			if (!toch[data.pos]) toch[data.pos] = {ch:{}};
			
			if (!toch[data.pos][num]) toch[data.pos][num] = data.tile.num;
			
			if (!toch[data.pos].ch[data.tile.num]) {
				toch[data.pos].ch[data.tile.num] = {
					count:1,
					tile: data.tile,
				};
			}
			else toch[data.pos].ch[data.tile.num].count++;	
		});
	});
});

function gamestart() {
	state = 2;
	timeoffset = new Date().getTime();

	for (var t=0; t<players.length; t++) {
		players[t] = {
			dir:0,
			posx:1.5,
			posy:1.5,
			
			bomb:false,
			bcount:0,
			
			ups:[1,1,2,0,0,0],
			//bombs,power,speed,shoes,glove,virus
			
			isalive:true,
		};	
	}
	
	io.sockets.emit("init",{
		state:state,
		players:players,
		map:map,
		width:map.width,
		height:map.height,
		tick:new Date().getTime() - timeoffset
	});
	
	console.log("Game Started");
	tick();
}

function tick() {
	
	for (var x=0; x<map.width; x++) {
		for (var y=0; y<map.height; y++) {
			map[x+(y*map.width)] = updateTile(x,y,map[x+(y*map.width)],new Date().getTime() - timeoffset);
		}
	}

	var msg = {};
	
	for (var pos in toch) {		
		var max = {count:0};
		for (var n in toch[pos].ch) {
			if (toch[pos].ch[n].count > max.count) {
				max = toch[pos].ch[n];
			}
		}
		
		if (max.tile) {
			max.tile.ast = new Date().getTime() - timeoffset;
			map[pos] = max.tile;
			changes.push({pos:pos,tile:map[pos]});
		}
		
	}
	
	toch = {};

	if (changes.length > 0) msg.changes = changes;
	changes = [];
	io.sockets.emit("tickreq",msg);
		
	setTimeout(tick,1000/30);
}

////this is all copied from the client code
function asplode(x,y,bomb,time) {		
	for (var t=1; t<bomb; t++) {
		var pos = x-t+y*map.width;
		if (makeAsplode(x-t,y,map[pos],time)) {
			break;
		} else {
			if (t==bomb-1) {
				map[pos] = {num:9,ast:time}
			} else {
				map[pos] = {num:12,ast:time};
			}
		}
	}
	
	for (var t=1; t<bomb; t++) {
		var pos = x+t+y*map.width;
		if (makeAsplode(x+t,y,map[pos],time)) {
			break;
		} else {
			if (t==bomb-1) {
				map[pos] = {num:10,ast:time}
			} else {
				map[pos] = {num:12,ast:time};
			}
		}
	}
	
	for (var t=1; t<bomb; t++) {
		var pos = x+(y-t)*map.width;
		if (makeAsplode(x,y-t,map[pos],time)) {
			break;
		} else {
			if (t==bomb-1) {
				map[pos] = {num:7,ast:time}
			} else {
				map[pos] = {num:11,ast:time};
			}
		}
	}
	
	for (var t=1; t<bomb; t++) {
		var pos = x+(y+t)*map.width;
		if (makeAsplode(x,y+t,map[pos],time)) {
			break;
		} else {
			if (t==bomb-1) {
				map[pos] = {num:8,ast:time}
			} else {
				map[pos] = {num:11,ast:time};
			}
		}
	}
}

function makeAsplode(x,y,tile,time) {
	switch(tile.num&0xFF) {
		case 3:case 16:case 17:case 18:case 19:case 20:case 21:
			map[x+y*map.width] = {num:tile.num>>>8,ast:time};
			return true;
		case 0:
			return false;
		case 5:
			map[x+y*map.width] = {num:15,ast:time};
			return true;
		default:
			return true;
	}
}

function updateTile(x,y,tile,time) {
	var to;

	switch(tile.num&0xFF) {
		default:return tile;
		case 4: case 14: to = 15; break;
		case 5: to = 48; break;
		case 15: to = 2; break;
		
		case 6: case 7: case 8: case 9: case 10: 
		case 11: case 12: case 13: case 14: to=13; break;
	}
	
	if (~~((time-tile.ast)/50) >= to) {
		if (tile.num == 5 || tile.num == 15) {
			asplode(x,y,3,time);
			return {num:6,ast:time};
		} else {
			return {num:tile.num>>>8,ast:time};
		}
	}
	return tile;
}
////
