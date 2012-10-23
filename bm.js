
//0x08 -> bomb
//0x10 -> walkable
//0x20 -> breakable
//0x40 -> explodable
//0x80 -> volatile

var tilemap = {
/*  0x00:    nothing       */
    0x51: /* crusher       */ [1],
    0x50: /* wall          */ [2],
    0x70: /* brick         */ [3],
    
    0x60: /* bombup        */ [ 5, 5, 6, 6],
    0x61: /* powerup       */ [ 7, 7, 8, 8],
    0x62: /* speedup       */ [ 9, 9,10,10],
    0x63: /* kickup        */ [11,11,12,12],
    0x64: /* gloveup       */ [13,13,14,14],
    0x65: /* virus         */ [15,15,16,16],
    
    0x78: /* bomb          */ [0,0,0,0,13,13,13,13,26,26,26,26,26,26,26,26,13,13,13,13,0,0,0,0,0,0,0,0,13,13,13,13,26,26,26,26,26,26,26,26,13,13,13,13,0,0,0,0],

    0x80: /* fire mid      */ [32,33,34,35,36,35,36,35,36,35,34,33,32],
    0x81: /* fire up       */ [ 1, 2, 3, 4, 5, 4, 5, 4, 5, 4, 3, 2, 1],
    0x82: /* fire down     */ [14,15,16,17,18,17,18,17,18,17,16,15,14],
    0x83: /* fire left     */ [27,28,29,30,31,30,31,30,31,30,29,28,27],
    0x84: /* fire right    */ [40,41,42,43,44,43,44,43,44,43,42,41,40],
    0x85: /* fire vert     */ [ 6, 7, 8, 9,10, 9,10, 9,10, 9, 8, 7, 6],
    0x86: /* fire horz     */ [19,20,21,22,23,22,23,22,23,22,21,20,19],

    0xd0: /* explode brick */ [11,24,37,50,12,11,24,37,50,12,11,24,37,50,12],
    0xc0: /* explode pwrup */ [45,46,47,48,49,45,46,47,48,49,45,46,47,48,49],
    0xd8: /* temp bomb     */ [13,13],
}


var Map = (function() {
    function Map(w, h) {
        this.width = w
        this.height = h
        this.tiles = new Array(w*h)
    
    }

    Map.prototype.set = function(x,y,num,pl,tick) {
        var tile = {num: num}
        if (tilemap[num] && tilemap[num].length > 1)
            tile.time = tick
        if (num & 0x08)
            tile.player = pl

        this.tiles[x+y*this.width] = tile
    }

    Map.prototype.get = function(x,y) {
        return this.tiles[~~x + ~~y*this.width]
    }
    
    Map.prototype.runin = function(x,y) {
        return this.get(x,y).num
    }


    Map.prototype.cache = function() {
        this.cache = raster(pixmap.tiles,[
            '#202020','#585858','#C0C0C0','#989898','#484848',
            '#707070','#383838','#606060','#000000','#F82800',
            '#50B8F0','#000001','#405058','#687898','#F87800',
            '#F8F8F8','#1860F8','#700000','#F8C800','#F81000',
            '#30A058','#D8B090','#0060F8' ],pixel,16)
    }

    Map.prototype.draw = function(ctx, tick) {
        var tsize = pixel * 16

        for (var i=0; i<this.tiles.length; i++) {
            var tdata = map.tiles[i]
            var tile = tilemap[tdata.num & 0xff]
            if (tile) {
                ctx.drawImage(
                    tdata.num&0x08 ? tdata.player.bombcache : this.cache,
                    0, tile[~~((tick-(tdata.time||0)) % tile.length)]*tsize,
                    tsize, tsize,
                    tsize *   (i % this.width),
                    tsize * ~~(i / this.width),
                    tsize, tsize
                )
            }
        }
    }

    return Map
})()


var Player = (function() {
    function Player(data) {
        this.name = data.name.replace(/</g,'&lt;')
                             .replace(/>/g,'&gt;')

        this.color = data.color
        this.id = data.id
        this.game = data.game
    }

    Player.prototype.string = function() {
        return '<span' + (this.game?' style="color:'+hue(this.color)+'">':'>') +
               this.name +
               '</span>'
    }

    Player.prototype.rank = function() {
        var temp = $('<div>')
        if (this.game) 
            temp.append(raster(pixmap.face,['#000000',hue2(this.color,0.75),hue(this.color),'#f8b028'],1,16,$('<canvas class=face>')[0]))
        temp.append(' ' + this.string())
        return temp
    }


    return Player
})()


var Gamer = (function() {
    function Gamer(id, data) {
        this.id = id
        this.dir = 1
        this.mov = false

        this.sync(data)
    }
        

    Gamer.prototype.sync = function(data) {
        this.posx = data.posx
        this.posy = data.posy
    }

    Gamer.prototype.netcopy = function() {
        return {
            posx: this.posx,
            posy: this.posy,
        }
    }

    
    Gamer.prototype.cache = function() {
        var color = players[this.id].color

        this.bcache = raster(pixmap.bombs, [
            "#F8F8F8","#383838","#707070","#989898","#B8A860",
            "#B8B8B8","#808081","#D0D0D0","#F0F0F0","#808080" ], pixel , 16)
        this.pcache = raster(pixmap.players, [
            "#B0B0B0","#E0E0E0","#606060","#F8F8F8","#C84088",
            "#C8C8C8","#000000","#0000B8","#0070F8","#E04088",
            "#F8B890","#C04080","#606080","#FFFFFF" ], pixel, 16)
    }

    Gamer.prototype.draw = function(ctx, tick) {
        var tsize = pixel*16
        var anim = 3 * this.dir

        if (this.mov)
            anim += [0,1,0,2][~~(tick/3) % 4]


        ctx.drawImage(
            this.pcache, 
            0, (anim*2+1)*tsize, 
            tsize, tsize,
            ~~(tsize * (this.posx-0.5)),
            ~~(tsize * (this.posy-0.5)),
            tsize, tsize
        )

        ctx.drawImage(
            this.pcache, 
            0, (anim*2)*tsize, 
            tsize, tsize,
            ~~(tsize * (this.posx-0.5)),
            ~~(tsize * (this.posy-1.5)),
            tsize, tsize
        )
    }

    Gamer.prototype.step = function(dt) {
        if (this.mov)
            this.collide(this.dir, 0.00625*60*dt)
    }

    Gamer.prototype.collide = function(dir, dist) {
        var off

        switch (dir) {
        case 0: // up
            off = (this.posx-1.5) % 2

            if (off == 0) {
                off = this.posy % 1
                if (off == 0) off = 1

                if (off > 0.5) {
                    if (dist > (off-0.5)) {
                        this.posy -= (off-0.5)
                        this.collide(0, dist - (off-0.5))
                    } else {
                        this.posy -= dist
                    }
                } else if (!map.runin(this.posx, this.posy-1)) {
                    if (dist > off) {
                        this.posy -= off
                        this.collide(0, dist - off)
                    } else {
                        this.posy -= dist
                    }
                }
            } else if (!map.runin(this.posx-0.5, this.posy-1) && off < 1) {
                if (dist > off) {
                    this.collide(2, off)
                    this.collide(0, dist - off)
                } else {
                    this.collide(2, dist)
                }
            } else if (!map.runin(this.posx+0.5, this.posy-1) && off > 1) {
                if (dist > (2-off)) {
                    this.collide(3, (2-off))
                    this.collide(0, dist - (2-off))
                } else {
                    this.collide(3, dist)
                }
            }

        break

        case 1: // down
            off = (this.posx-1.5) % 2

            if (off == 0) {
                off = this.posy % 1
                
                if (off < 0.5) {
                    if (dist > (0.5-off)) {
                        this.posy += (0.5-off)
                        this.collide(1, dist - (0.5-off))
                    } else {
                        this.posy += dist
                    }
                } else if (!map.runin(this.posx,this.posy+1)) {
                    if (dist > (1-off)) {
                        this.posy += (1-off)
                        this.collide(1, dist - (1-off))
                    } else {
                        this.posy += dist
                    }
                }
            } else if (!map.runin(this.posx-0.5,this.posy+1) && off < 1) {
                if (dist > off) {
                    this.collide(2, off)
                    this.collide(1, dist - off)
                } else {
                    this.collide(2, dist)
                }
            } else if (!map.runin(this.posx+0.5,this.posy+1) && off > 1) {
                if (dist > (2-off)) {
                    this.collide(3, (2-off))
                    this.collide(1, dist - (2-off))
                } else {
                    this.collide(3, dist)
                }
            }

        break

        case 2: // left
            off = (this.posy-1.5) % 2

            if (off == 0) {
                off = this.posx % 1
                if (off == 0) off = 1
                
                if (off > 0.5) {
                    if (dist > (off-0.5)) {
                        this.posx -= (off-0.5)
                        this.collide(2, dist - (off-0.5))
                    } else {
                        this.posx -= dist
                    }
                } else if (!map.runin(this.posx-1,this.posy)) {
                    if (dist > off) {
                        this.posx -= off
                        this.collide(2, dist - off)
                    } else {
                        this.posx -= dist
                    }
                }
            } else if (!map.runin(this.posx-1,this.posy-0.5) && off < 1) {
                if (dist > off) {
                    this.collide(0, off)
                    this.collide(2, dist - off)
                } else {
                    this.collide(0, dist)
                }
            } else if (!map.runin(this.posx-1,this.posy+0.5) && off > 1) {
                if (dist > (2-off)) {
                    this.collide(1, (2-off))
                    this.collide(2, dist - (2-off))
                } else {
                    this.collide(1, dist)
                }
            }

        break

        case 3: // right
            off = (this.posy-1.5) % 2

            if (off == 0) {
                off = this.posx % 1
                
                if (off < 0.5) {
                    if (dist > (0.5-off)) {
                        this.posx += (0.5-off)
                        this.collide(3, dist - (0.5-off))
                    } else {
                        this.posx += dist
                    }
                } else if (!map.runin(this.posx+1,this.posy)) {
                    if (dist > (1-off)) {
                        this.posx += (1-off)
                        this.collide(3, dist - (1-off))
                    } else {
                        this.posx += dist
                    }
                }
            } else if (!map.runin(this.posx+1,this.posy-0.5) && off < 1) {
                if (dist > off) {
                    this.collide(0, off)
                    this.collide(3, dist - off)
                } else {
                    this.collide(0, dist)
                }
            } else if (!map.runin(this.posx+1,this.posy+0.5) && off > 1) {
                if (dist > (2-off)) {
                    this.collide(1, (2-off))
                    this.collide(3, dist - (2-off))
                } else {
                    this.collide(1, dist)
                }
            }

        break
        }
    }

    return Gamer
})()

