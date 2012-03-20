var collider = {

	speed : 1*60,
	
	
	step : function(player,dt) {
		var dist = this.speed*dt;
		
		var paths = this.getpaths(player);
		var dir = this.dircancel(player.dir);
		player.adir = 0x0;
		
		
		dist = this.stepfull(player.pdir & dir & paths,player,dist);
		dist = this.steparound(player.pdir & dir,player,dist);
		dist = this.stepfull(~player.pdir & dir & paths,player,dist);
		dist = this.steparound(~player.pdir & dir,player,dist);
	},

	stepothers : function(p1,p2,dt) {
		var dist = this.speed*dt;
		if (dist <= 0) return;
		
		if (p1.adir) p1.pdir = p1.adir;
		p1.adir = 0x0;		
		p1.dir = (p1.posy > p2.posy ? 0x8 : 0x0)|
			     (p1.posy < p2.posy ? 0x4 : 0x0)|
			     (p1.posx > p2.posx ? 0x2 : 0x0)|
			     (p1.posx < p2.posx ? 0x1 : 0x0);
		
		dist = this.stepexact(p1.pdir & p1.dir & this.getpaths(p1),p1,p2,dist);
		dist = this.stepexact(p1.dir & this.getpaths(p1),p1,p2,dist);
	},

	dircancel : function(dir) {
		return (dir & ~(dir<<1) & 0xA)|(dir & ~(dir>>1) & 0x5);
	},
	
	stepexact : function(dir,p1,p2,dist) {
		if (!dir || !dist) return dist;
		
		if (dir & 0x8) {
			dist = this.moveupfull(p1,dist);
			dist = this.correctup(p1,p2,dist);
			p1.adir = 0x8;
			if (!dist) return dist;
		} 	
		if (dir & 0x4) {
			dist = this.movednfull(p1,dist);
			dist = this.correctdn(p1,p2,dist);
			p1.adir = 0x4;
			if (!dist) return dist;
		}		
		if (dir & 0x2) {
			dist = this.movelffull(p1,dist);
			dist = this.correctlf(p1,p2,dist);
			p1.adir = 0x2;
			if (!dist) return dist;
		}	
		if (dir & 0x1) {
			dist = this.movertfull(p1,dist);
			dist = this.correctrt(p1,p2,dist);
			p1.adir = 0x1;
		}
		return dist;
	},
	
	stepfull : function(dir,player,dist) {
		if (!dir || !dist) return dist;
		
		if (dir & 0x8) {
			dist = this.moveupfull(player,dist);
			player.adir = 0x8;
			if (!dist) return dist;
		} 	
		if (dir & 0x4) {
			dist = this.movednfull(player,dist);
			player.adir = 0x4;
			if (!dist) return dist;
		}		
		if (dir & 0x2) {
			dist = this.movelffull(player,dist);
			player.adir = 0x2;
			if (!dist) return dist;
		}	
		if (dir & 0x1) {
			dist = this.movertfull(player,dist);
			player.adir = 0x1;
		}
		return dist;
	},
	
	steparound : function(dir,player,dist) {
		if (!dir || !dist) return dist;
		
		if (dir & 0x8) {
			dist = this.moveuparound(player,dist);
			player.adir = 0x8;
			if (!dist) return dist;
		} 
		if (dir & 0x4) {
			dist = this.movednaround(player,dist);
			player.adir = 0x4;
			if (!dist) return dist;
		}
		if (dir & 0x2) {
			dist = this.movelfaround(player,dist);
			player.adir = 0x2;
			if (!dist) return dist;
		}
		if (dir & 0x1) {
			dist = this.movertaround(player,dist);
			player.adir = 0x1;
		}
		return dist;
	},

	
	correctup : function(p1,p2,dist) {
		if (p1.posy < p2.posy) {
			dist += p2.posy-p1.posy;
			p1.posy = p2.posy;
		}
		return dist;
	},

	correctdn : function(p1,p2,dist) {
		if (p1.posy > p2.posy) {
			dist += p1.posy-p2.posy;
			p1.posy = p2.posy;
		}
		return dist;
	},
	
	correctlf : function(p1,p2,dist) {
		if (p1.posx < p2.posx) {
			dist += p2.posx-p1.posx;
			p1.posx = p2.posx;
		}
		return dist;
	},
	
	correctrt : function(p1,p2,dist) {
		if (p1.posx > p2.posx) {
			dist += p1.posx-p2.posx;
			p1.posx = p2.posx;
		}
		return dist;
	},
	

	moveuparound : function(player,dist) {
		if (player.posx%1 == 0.5) return dist;
		
		var p = (((player.posx-0.5)>>1)<<1)+1.5;
		if (this.mapget(p,player.posy,0,-1))
			return dist;
			
		if (p < player.posx)
			dist = this.movelf(player,dist);
		else
			dist = this.movert(player,dist);
			
		if (dist) 
			dist = this.moveupfull(player,dist);	
			
		return dist;
	},

	movednaround : function(player,dist) {
		if (player.posx%1 == 0.5) return dist;
		
		var p = (((player.posx-0.5)>>1)<<1)+1.5;
		if (this.mapget(p,player.posy,0,1))
			return dist;
			
		if (p < player.posx)
			dist = this.movelf(player,dist);
		else
			dist = this.movert(player,dist);
			
		if (dist) 
			dist = this.movednfull(player,dist);	
			
		return dist;
	},

	movelfaround : function(player,dist) {
		if (player.posy%1 == 0.5) return dist;
		
		var p = (((player.posy-0.5)>>1)<<1)+1.5;
		if (this.mapget(player.posx,p,-1,0))
			return dist;
			
		if (p < player.posy)
			dist = this.moveup(player,dist);
		else
			dist = this.movedn(player,dist);
			
		if (dist) 
			dist = this.movelffull(player,dist);	
			
		return dist;
	},

	movertaround : function(player,dist) {
		if (player.posy%1 == 0.5) return dist;
		
		var p = (((player.posy-0.5)>>1)<<1)+1.5;
		if (this.mapget(player.posx,p,1,0))
			return dist;
			
		if (p < player.posy)
			dist = this.moveup(player,dist);
		else
			dist = this.movedn(player,dist);
			
		if (dist) 
			dist = this.movertfull(player,dist);	
			
		return dist;
	},


	moveupfull : function(player,dist) {
		while (dist && !this.mapchup(player)) {
			dist = this.moveup(player,dist);
		}
		return dist;
	},

	movednfull : function(player,dist) {
		while (dist && !this.mapchdn(player)) {
			dist = this.movedn(player,dist);
		}
		return dist;
	},

	movelffull : function(player,dist) {
		while (dist && !this.mapchlf(player)) {
			dist = this.movelf(player,dist);
		}
		return dist;
	},

	movertfull : function(player,dist) {
		while (dist && !this.mapchrt(player)) {
			dist = this.movert(player,dist);
		}
		return dist;
	},


	moveup : function(player,dist) {
		var mov = ((player.posy+0.5)%1);
		mov = dist - (mov?mov:1);
		if (mov > 0) {
			player.posy = ~~(player.posy-0.5) + 0.5;
			return mov
		} else {
			player.posy -= dist;
			return 0;
		}
	},

	movedn : function(player,dist) {
		var mov = dist - (1-(player.posy+0.5)%1);
		if (mov > 0) {
			player.posy = ~~(player.posy+0.5) + 0.5;
			return mov
		} else {
			player.posy += dist;
			return 0;
		}
	},

	movelf : function(player,dist) {
		var mov = ((player.posx+0.5)%1);
		mov = dist - (mov?mov:1);
		if (mov > 0) {
			player.posx = ~~(player.posx-0.5) + 0.5;
			return mov
		} else {
			player.posx -= dist;
			return 0;
		}
	},

	movert : function(player,dist) {
		var mov = dist - (1-(player.posx+0.5)%1);
		if (mov > 0) {
			player.posx = ~~(player.posx+0.5) + 0.5;
			return mov
		} else {
			player.posx += dist;
			return 0;
		}
	},


	getpaths : function(player) {
		var paths = 0x0;
		
		if (player.posx%1 == 0.5) {
			if (!this.mapchup(player)) paths |= 0x8;
			if (!this.mapchdn(player)) paths |= 0x4;
		}
		
		if (player.posy%1 == 0.5) {
			if (!this.mapchlf(player)) paths |= 0x2;
			if (!this.mapchrt(player)) paths |= 0x1;
		}
		
		return paths;
	},


	mapchup : function(player) {
		var t = player.posy+0.5;
		return this.mapget(player.posx,t,0,(t%1?-1:-2));
	},

	mapchdn : function(player) {
		var t = player.posy-0.5;
		return this.mapget(player.posx,t,0,1);
	},

	mapchlf : function(player) {
		var t = player.posx+0.5;
		return this.mapget(t,player.posy,(t%1?-1:-2),0);
	},

	mapchrt : function(player) {
		var t = player.posx-0.5;
		return this.mapget(t,player.posy,1,0);
	},


	mapget : function(x,y,offx,offy) {
		return map[(~~x + offx) + (~~y + offy) * map.width];
	},
};