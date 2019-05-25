/*:
@plugindesc Generate the shortest path from starting position to target.
@author TheoAllen
@help 
Version 1.0

This script simply to generate the shortest path started from a character 
position to target coodrinate.

This scripts EXTENDS move route. Means it will only work in move route 
script call.

To use this plugin, use this script call in move route
this.find_path(x,y)

Example:
this.find_path(2,2)

If the path isn't found, the character will not move.

*/
//===========================================================================
// ** The beginning of the plugin
//---------------------------------------------------------------------------
var Theo = Theo || {}
// Why the heck JS doesn't have built-in array shuffle anyway?
Theo.shuffle = Theo.shuffle || function(array){
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

// Deep copy
Theo.copy = function(obj){
    return JSON.parse(JSON.stringify(obj));
}

Theo.Pathfind = {}
//===========================================================================
// ** Queue object
// Initialize
//---------------------------------------------------------------------------
Theo.Pathfind.Queue = function(tx, ty, first_node){
    this.tx = tx
    this.ty = ty
    this.front_queue = []
    this.back_queue = []
    this.front_queue.push(first_node)
};

//---------------------------------------------------------------------------
// Functions
//---------------------------------------------------------------------------
(function(q){
    q.range = function(node){
        let range_x = node.x - this.tx;
        let range_y = node.y - this.ty;
        return Math.sqrt(Math.pow(range_x, 2) + Math.pow(range_y, 2));
    };

    q.push = function(new_node, parent_node){
        if (this.range(new_node) < this.range(parent_node)){
            var queue = this;
            this.front_queue.push(new_node);
            this.front_queue.sort((a,b)=> queue.range(a) - queue.range(b));
        }else{
            this.back_queue.push(new_node);
        }
    };

    q.shift = function(){
        var result = this.front_queue.shift();
        if(result){
            return result;
        }else{
            return this.back_queue.shift();
        }
    };

    q.is_empty = function(){
        return this.front_queue.length == 0 && this.back_queue.length == 0
    }

    q.clear = function(){
        this.front_queue = []
        this.back_queue = []
    };
})(Theo.Pathfind.Queue.prototype);
//===========================================================================
// ** Node object
// Initialize
//---------------------------------------------------------------------------
Theo.Pathfind.Node = function(x,y){
    this.x = x
    this.y = y
    this.visited = false
    this.expanded = false
    this.nodes = new Theo.Pathfind.Nodes();
    this.parent = null;
};

// No, you don't need to alias these functions
Theo.Pathfind.Nodes = function(){
    this.insert = function(dir, node){
        this["dir"+dir] = node;
    }
    this.lookup = function(node){
        var result;
        var this_node = this;
        [2,4,6,8].forEach(d => {
            if(this_node["dir"+d] === node){result = d}
        });
        return result;
    }
};
//---------------------------------------------------------------------------
// Functions
//---------------------------------------------------------------------------
(function(n){
    n.expand_node = function(mapnodes, char){
        this_node = this;
        var directions = [2,4,6,8];
        for(let dir of directions){
            if(!char.is_pathfinding_passable(this_node.x, this_node.y, dir)){
                continue;
            };
            var xpos = $gameMap.roundXWithDirection(this_node.x, dir);
            var ypos = $gameMap.roundYWithDirection(this_node.y, dir);
            var key = ""+xpos+"-"+ypos;
            var next_node = mapnodes[key];
            if(!next_node){
                next_node = new Theo.Pathfind.Node(xpos, ypos);
                mapnodes[key] = next_node;
            }else if(next_node.visited){
                continue;
            };
            next_node.parent = this_node;
            this_node.nodes.insert(dir, next_node);
        }
    };

    n.get_parent_dir = function(){
        return this.parent.nodes.lookup(this);
    }
})(Theo.Pathfind.Node.prototype);
//=====================================================================================
// ** Game_Character
//-------------------------------------------------------------------------------------
(function(c){
    c.find_path = function(tx,ty){
        if(this.x ===  tx && this.y === ty){return};
        this_char = this;
        if(![2,4,6,8].some(d => this_char.canPass(tx, ty, d))){return};

        this.move_code = null;
        this.mapnodes = {};
        this.target_x = tx;
        this.target_y = ty;

        var first_node = new Theo.Pathfind.Node(this.x, this.y);
        first_node.expand_node(this.mapnodes, this);
        first_node.visited = true;
        this.mapnodes[""+this.x+"-"+this.y] = first_node;
        this.queue = new Theo.Pathfind.Queue(tx, ty, first_node);
        while(!this.queue.is_empty()){
            this.bfsearch(this.queue.shift());
        }
        
        // Stops here if the path not found
        if(!this.move_code){return};

        var mv_list = Theo.copy(this._moveRoute.list);
        var insert_index = this._moveRouteIndex;

        this.move_code.forEach(li => {
            mv_list.splice(insert_index, 0, li);
            insert_index += 1;
        });
        this._moveRoute = Theo.copy(this._moveRoute);
        this._moveRoute.list = mv_list;
        this._moveRouteIndex -= 1;
        // Clear shit so it wont get bloated
        this.target_x = undefined;
        this.target_y = undefined;
        this.mapnodes = undefined;
        this.move_code = undefined;
    }

    c.bfsearch = function(node){
        for (let d of Theo.shuffle([2,4,6,8])){
            var next_node = node.nodes["dir"+d];
            if(!next_node || next_node.visited){continue};
            if(next_node.x == this.target_x && next_node.y == this.target_y){
                this.move_code = this.generate_route(next_node);
                this.queue.clear();
                return;
            }
            if(!next_node.expanded){
                next_node.expand_node(this.mapnodes, this);
            }
            next_node.visited = true;
            this.queue.push(next_node, node);
        }
    }

    c.generate_route = function(node){
        var list = []
        while(node.parent){
            var cmd = {code: node.get_parent_dir()/2}
            list.unshift(cmd);
            node = node.parent;
        }
        return list;
    }

    c.goto_char = function(char){
        if(char){
            this.find_path(char.x, char.y)
        }
    }

    c.goto_player = function(){
        this.goto_char($gamePlayer)
    }

    c.goto_event = function(id){
        this.goto_char($gameMap.events[id])
    }

    c.is_target_point = function(x, y){
        this.target_x == x && this.target_y == y
    }

    c.is_pathfinding_passable = function(x, y, dir){
        x2 = $gameMap.roundXWithDirection(x, y, dir)
        y2 = $gameMap.roundYWithDirection(x, y, dir)
        if (this.is_target_point(x2, y2)){
            if(this.isThrough()){
                return true;
            }
            return this.isMapPassable(x,y,dir) && this.isMapPassable(x2, y2, this.reverseDir(dir));
        }
        return this.canPass(x,y,dir);
    }
})(Game_Character.prototype);
