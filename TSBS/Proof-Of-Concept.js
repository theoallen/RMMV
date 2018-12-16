//================================================================
// Proof of concept of TSBS in MV
//----------------------------------------------------------------
// Display idle
//================================================================

TSBS = function(){throw new Error("TSBS is a static class")};
var debug = function(){console.log("Line is executed")}

//===================================================================
// Theo.MoveObject
//===================================================================
var Theo = Theo || {};
Theo.MoveObject = function(obj){
	this.obj = obj;
	this.initialize();
};

Theo.MoveObject.prototype.initialize = function(){
	this.toX = null;
	this.toY = null;
	this.realX = 0.0;
	this.realY = 0.0;
	this.xSpeed = 0.0;
	this.ySpeed = 0.0;
	this.jump = 0.0;
	this.jumpInterval = 0.0;
	this.offset = 0.0;
	this.duration = 0.0;
}

Theo.MoveObject.prototype.moveto = function(x, y, jump = 0, duration=60){
	this.toX = x;
	this.toY = y;
	this.onMove();
	this.determineSpeed(duration,jump);
}

Theo.MoveObject.prototype.onMove = function(){
	this.realX = this.obj.x;
	this.realY = this.obj.y;
}

Theo.MoveObject.prototype.determineSpeed = function(duration, jump){
	this.xSpeed = (this.toX - this.obj.x) / duration;
	this.ySpeed = (this.toY - this.obj.y) / duration;
	this.jump = jump;
	this.jumpInterval = jump/(duration/2.0);
	this.duration = duration;
}

Theo.MoveObject.prototype.isMoving = function(){
	if (this.toX === null && this.toY === null) {return false};
	var result = this.obj.x !== this.toX || this.obj.y !== this.toY;
	return result && this.duration > 0;
}

Theo.MoveObject.prototype.updateMove = function(){
	if (!this.isMoving()) {return};
	this.duration -= 1;
	this.realX += this.xSpeed;
	this.realY += this.ySpeed;
	this.onUpdate();
        this.jump -= this.jumpInterval;
    	this.offset -= this.jump;
    	if (!this.isMoving()) {
		this.onFinish();
		this.initialize();
	};
}

Theo.MoveObject.prototype.onFinish = function(){
	this.obj.x = this.toX;
	this.obj.y = this.toY;
}

Theo.MoveObject.prototype.onUpdate = function(){
	this.obj.x = Math.round(this.realX);
	this.obj.y = Math.round(this.realY) + Math.round(this.offset);
}

TSBS.ConvertIndexMV = function(frame, index){
    let x = Math.floor(frame / 6);
    let y = frame % 6;
    x = x * 3 + index;
    let row = (y - 1) * 9
    return row + x;
}

TSBS.ConvertIndexXY = function(x, y){
    return 0;
}

TSBS.point = function(){
	this.x = 0;
	this.y = 0;
	this._moveObj = new Theo.MoveObject(this);
}

TSBS.point.prototype.update = function(){
	this._moveObj.updateMove();
}
//===================================================================
// TSBS SVData
//===================================================================
TSBS.SVData = function(battler){
	TSBS.point.call(this);
	this._battler = battler;
	this._opacity = 0;
	this._scheduler = new Scheduler();
	this._itemInUse = null;
    this._animCell = 0;
    this._nameIndex = 1;
	this.initOripos();
}

TSBS.SVData.prototype.update = function(){
	TSBS.point.call(this);
	this._scheduler.resume();
}

TSBS.SVData.prototype.initOripos = function(){
	this.oriX = 0;
	this.oriY = 0;
}

TSBS.SVData.prototype.inject = function(command){
    this._scheduler.clear();    
    command.forEach(function(cmd){
        this._scheduler.add(cmd);
    }.bind(this));
}
//===================================================================
// Scheduler. Ruby Fiber substitute
//===================================================================
Scheduler = function(){
	this.clear();
};

Scheduler.prototype.add = function(f){
    if (typeof f !== 'function') {throw new Error("Argument is not function")};
	this._schedule.push(f);
	this._maxIndex += 1;
}

Scheduler.prototype.resume = function(){
    if (!this.hasSchedule()){return};
	if (this._wait > 0){
		this._wait -= 1;
		// console.log("Wait");
	}else{
		while(this._wait === 0){
			let method = this._schedule[this._index];
			method(this);
			this._index += 1;
			if (!this.hasSchedule()){
				this.onScheduleEnd();
				break;
			}
		}
	}
}

Scheduler.prototype.hasSchedule = function(){
	return this._index < this._maxIndex;
}

Scheduler.prototype.onScheduleEnd = function(){
}

Scheduler.prototype.clear = function(){
	this._schedule = [];
	this._wait = 0;
	this._index = 0;
	this._maxIndex = 0;
}

TSBS.aliasTest = Game_Battler.prototype.initialize;
Game_Battler.prototype.initialize = function(){
    TSBS.aliasTest.call(this);
    this.initTSBS();
}

Game_Battler.prototype.initTSBS = function(){
    if (!this.isActor()){return};
    this._svdata = new TSBS.SVData();
    var actionSequence = Sequencer.list['idle'];
    if (!actionSequence){throw new Error("Action sequence not defined")};
    var actionFunc = this.convertAction(actionSequence);
    this._svdata.inject(actionFunc);
    if (actionSequence.repeat){
        this._svdata._scheduler.onScheduleEnd = function(){
            this._svdata._scheduler._index = 0;
        }.bind(this);
    }
}

Game_Battler.prototype.update = function(){
    this._svdata.update();
}

Game_Battler.prototype.convertAction = function(actionSequence){
    var sequence = [];
    actionSequence.sequence.forEach(function(command){
        var battler = this;
		let seq = function(scheduler){
            var args = [scheduler].concat(command.param);
			battler[command.cmd].apply(battler, args);
        };
        sequence.push(seq);
    }.bind(this))
	return sequence;
}

Game_Battler.prototype['posemv'] = function(scheduler, frame, index, wait){
    this._svdata._animCell = TSBS.ConvertIndexMV(frame, index);
    scheduler._wait = wait;
}

//========================================================================
// Sprite Actor modification
//========================================================================
Sprite_Actor.prototype.updateMotion = function() {
};

Sprite_Actor.prototype.updateFrame = function() {
    Sprite_Battler.prototype.updateFrame.call(this);
    var bitmap = this._mainSprite.bitmap;
    if (bitmap) {
        var animCell = this._battler._svdata._animCell;
        var cw = bitmap.width / 9;
        var ch = bitmap.height / 6;
        var cy = Math.floor(animCell / 6) * ch
        var cx = (animCell % 9) * cw
        console.log(cx);
        this._mainSprite.setFrame(cx, cy, cw, ch);
    }
};

TSBS.aliasTest2 = Scene_Battle.prototype.update;
Scene_Battle.prototype.update = function() {
    TSBS.aliasTest2.call(this);
    $gameActors.actor(1).update();
    // $gameParty.update();
};

Game_Party.prototype.update = function(){
    for(member in this.members()){
        console.log(member);
        // member.update();
    }
}
