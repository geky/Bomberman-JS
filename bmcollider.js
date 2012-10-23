
function runin(x,y) {
    return map.data[~~x + ~~y*map.width].num
}

function collide(player, dir, dist) {
    
    switch (player.dir) {
        case 0: //up
            var off = (player.posx-1.5) % 2

            if (off == 0) {
                off = player.posy % 1
                if (off == 0) off = 1
                
                if (off > 0.5) {
                    player.posy -= (off-0.5)
                    collide(player, 0, dist - (off-0.5))
                } else if (!runin(player.posx,player.posy-1)) {
                    player.posy -= off
                    collide(player, 0, dist - off)
                }
            } else if (!runin(player.posx-1,player.posy-1) && off < 1) {
                collide(player, 2, off)
                collide(player, 0, dist - off)
            } else if (!runin(player.posx+1,player.posy-1) && off > 1) {
                collide(player, 3, 1-off)
                collide(player, 0, dist - (1-off))
            }

            break

        case 1: //down
            var off = (player.posx-1.5) % 2

            if (off == 0) {
                off = player.posy % 1
                
                if (off < 0.5) {
                    player.posy += (0.5-off)
                    collide(player, 1, dist - (0.5-off))
                } else if (!runin(player.posx,player.posy+1)) {
                    player.posy += (1-off)
                    collide(player, 1, dist - (1-off))
                }
            } else if (!runin(player.posx-1,player.posy+1) && off < 1) {
                collide(player, 2, off)
                collide(player, 1, dist - off)
            } else if (!runin(player.posx+1,player.posy+1) && off > 1) {
                collide(player, 3, 1-off)
                collide(player, 1, dist - (1-off))
            }

            break

        case 2: //left
            var off = (player.posy-1.5) % 2

            if (off == 0) {
                off = player.posx % 1
                if (off == 0) off = 1
                
                if (off > 0.5) {
                    player.posx -= (off-0.5)
                    collide(player, 2, dist - (off-0.5))
                } else if (!runin(player.posx-1,player.posy)) {
                    player.posx -= off
                    collide(player, 0, dist - off)
                }
            } else if (!runin(player.posx-1,player.posy-1) && off < 1) {
                collide(player, 0, off)
                collide(player, 2, dist - off)
            } else if (!runin(player.posx-1,player.posy+1) && off > 1) {
                collide(player, 1, 1-off)
                collide(player, 2, dist - (1-off))
            }

            break

        case 3: //right
            var off = (player.posy-1.5) % 2

            if (off == 0) {
                off = player.posx % 1
                
                if (off < 0.5) {
                    player.posx += (0.5-off)
                    collide(player, 3, dist - (0.5-off))
                } else if (!runin(player.posx+1,player.posy)) {
                    player.posx += (1-off)
                    collide(player, 3, dist - (1-off))
                }
            } else if (!runin(player.posx+1,player.posy-1) && off < 1) {
                collide(player, 0, off)
                collide(player, 3, dist - off)
            } else if (!runin(player.posx+1,player.posy+1) && off > 1) {
                collide(player, 1, 1-off)
                collide(player, 3, dist - (1-off))
            }

            break
    }
}

