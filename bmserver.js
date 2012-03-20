var server = require("express").createServer();
var io = require("socket.io").listen(server);

var players = [];
var timeoffset = new Date().getTime();

var map = [
		1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
		1,0,0,0,0,0,0,0,2,0,0,0,0,0,1,
		1,0,1,0,1,0,1,0,1,2,1,0,1,0,1,
		1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
		1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,
		1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
		1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,
		1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
		1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,
		1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
		1,0,1,0,1,0,1,2,1,0,1,0,1,0,1,
		1,0,0,0,0,0,0,2,2,0,0,0,0,0,1,
		1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
	];
	
map.width = 15;
map.height = 13;

server.listen(8080);

server.get("/bomberman*",function(req,res) {
	res.sendfile("/var/www" + req.url)
});


io.set('log level', 1);

io.sockets.on("connection", function(socket) {
	socket.set("num",players.length);
	
	socket.emit("init",{
		num:players.length,
		map:map,
		width:map.width,
		height:map.height,
		tick:new Date().getTime() - timeoffset
	});
	
	players.push({
		dir:0,
		posx:1.5,
		posy:1.5,
	});
	
	socket.on("input", function(data) {
		socket.get("num",function(err,num) {
			players[num].dir = data.dir;
			
			if (isLegal(players[num],data.posx,data.posy)) {
				players[num].posx = data.posx;
				players[num].posy = data.posy;
			} else {
				console.log("illegal move: <"+data.posx+","+data.posy+">");
			}
		});
	});
});

function isLegal(player,nposx,nposy) {
	return (~~(player.posx) == ~~(nposx) && ~~(player.posy) == ~~(nposy))
		|| (!map[~~(nposx) + (~~(nposy) * map.width)]);
}

function tick() {
	io.sockets.emit("tick",{players:players});
}

setInterval(tick,1000/20);