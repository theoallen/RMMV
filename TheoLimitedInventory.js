/*:
@plugindesc Limits carrying capacity like in many popular games.
@author TheoAllen
@help
This script allow you to limit your inventory by overall possesed 
items instead of individual items.
	
Notetags :
write down these notetags to the notebox in your database
	  
<inv size: n>
Use this notetag where the n is a numeric value which is determine 
the size of item. Use 0 for unlimited item. Only works for item 
and equipment such as weapon or armor.

<inv plus: n>
Use this notetag to determine the additional avalaible free 
inventory slot. This notetag avalaible for Actor, Class, Equip, 
and States. If it's for actor, avalaible inventory slot will 
increase when a new actor entered party. If it's for equip, the 
avalaible slot will be increase if the certain equip is equipped. 
And so do states.

This value can be changed by script call during the game. Just 
check the script call instruction.

<inv minus: n>
Inverse of <inv plus>. It will decrease the avalaible inventory 
slot. Should be self explanatory
	
@param Preferences
	
@param dynamic
@parent Preferences
@text Dynamic Slot
@type boolean
@default true
@desc If set to true, then total avalaible inventory slot depends on actor, states, total party members, etc ...
 
@param displayItem
@parent Preferences
@text Display Item Size
@type boolean
@default true
@desc Diplay item size in item menu
 
@param includeEquip
@parent Preferences
@text Include Equip
@type boolean
@default false
@desc Total used inventory slot will also include actor equipment.

@param drawTotalSize
@parent Preferences
@text Draw Total Size
@type boolean
@default true
@desc If true, item size window will show total weight of specified item. 10 potions with 3 weight each = show 30 instead of 3

@param forceGain
@parent Preferences
@text Force Gain Item
@type boolean
@default false
@desc Force gain item even if inventory full. (Recommended to set some penalties if inventory is full)

@param fullDisableDas
@parent Preferences
@text Disable Dash at Full
@type boolean
@default false
@desc When the inventory is at full, disable dashing

@param fullSlowDown
@parent Preferences
@text Slowdowns at full
@type boolean
@default false
@desc When the inventory is at full, slow down the movement

@param Numeric Setting

@param defaultFree
@parent Numeric Setting
@text Default Free Slot
@type number
@default 20
@desc Default free slot provided by each actor. If Dynamic slot set to false. It will be use this setting for the free slot

@param nearMaxPercent
@parent Numeric Setting
@text Near Maximum Percentage
@type number
@default 25
@desc Remain avalaible slot percentage to determine if the inventory is almost maxed out or not.

@param nearMaxColor
@parent Numeric Setting
@text Near Maximum Color ID
@type number
@default 21
@desc Color ID to draw the number

@param commandSize
@parent Numeric Setting
@text Use Command Size
@type number
@default 300
@desc The width of use item command window

@param Vocab Settings

@param invSlotVocab
@parent Vocab Settings
@text Inventory Slot
@default "Inventory:"
@desc Vocab for inventory

@param invSizeVocab
@parent Vocab Settings
@text Size Vocab
@default "Size:"
@desc Vocab for Size

@param slotShort
@parent Vocab Settings
@text Inventory Slot (Short)
@default "Inv:"
@desc Vocab for inventory (short)

@param useVocab
@parent Vocab Settings
@text Use Vocab
@default "Use Item"
@desc Vocab for using an item

@param discardVocab
@parent Vocab Settings
@text Discard Vocab
@default "Discard"
@desc Vocab for discarding an item

@param cancelVocab
@parent Vocab Settings
@text Cancel Vocab
@default "Cancel"
@desc Vocab for canceling

 */ 
var Theo = Theo || {};
Theo.LINV = {};
Theo.LINV.Params = PluginManager.parameters('TheoLimitedInventory');

Theo.LINV.invSizeREGX = /<inv[\s_]+size\s*:\s*(\d+)>/i
Theo.LINV.invPlusREGX = /<inv[\s_]+plus\s*:\s*(\d+)>/i
Theo.LINV.invMinsREGX = /<inv[\s_]+minus\s*:\s*(\d+)/i;

//===================================================================
// ** DataManager
//===================================================================
Theo.LINV.dbLoaded = DataManager.isDatabaseLoaded;
DataManager.isDatabaseLoaded = function(){
	if (!Theo.LINV.dbLoaded.call(this)) {return false};
	if (!Theo.LINV.invLoaded) {
		Theo.LINV.loadActorDefault($dataActors);
		let database =  [$dataActors, $dataClasses, $dataWeapons, $dataArmors, $dataStates, $dataItems];
		database.forEach(function(data){
			data.forEach(function(db){
				if(db === null){return};
				Theo.LINV.loadData(db);
			})
		})
		$dataActors.forEach(function(a){if(a===null){return};console.log(a.invMod)});
		Theo.LINV.invLoaded = true;
	}
    return true;
}

Theo.LINV.loadActorDefault = function(actors){
	actors.forEach(function(actor){
		if(actor === null){return};
		actor.invMod = Theo.LINV.Params['defaultFree'];
	})
}

Theo.LINV.loadData = function(db){
	if (!db.invMod){db.invMod = 0};
	db.invSize = 1;
	let notedata = db.note.split(/[\r\n]+/);
	notedata.forEach(function(line){
		if(line.match(Theo.LINV.invSizeREGX)){
			db.invSize = Number(RegExp.$1);
		}else if(line.match(Theo.LINV.invPlusREGX)){
			db.invMod = Number(RegExp.$1);
		}else if(line.match(Theo.LINV.invMinsREGX)){
			db.invMod = Number(RegExp.$1) * -1;
		}
	});
}

//===================================================================
// ** Game_Actor
//===================================================================
Theo.LINV.actorSetup = Game_Actor.prototype.setup;
Game_Actor.prototype.setup = function(actorId) {
	Theo.LINV.actorSetup.call(this, actorId);
    var actor = $dataActors[actorId];
	this._baseInv = actor.invMod;
};

Game_Actor.prototype.getBaseInv = function(){
	return this._baseInv;
}

Game_Actor.prototype.setBaseInv = function(num){
	return this._baseInv = num;
}

Game_Actor.prototype.equipSize = function(){
	if (!Theo.LINV.Params['includeEquip']){return 0};
	return this.equips().reduce(function(total, eq){
		if(eq === null){return total + 0};
		return total + eq.invSize;
	},0);
}

// TO DO = Add Eval
Game_Actor.prototype.invMax = function(){
	var size = this.getBaseInv();
	size += $dataClasses[this._classId];
	size += this.states().reduce(function(total, state){total + state.invMod}, 0);
	size += this.equips().reduce(function(total, eq){
		if(eq === null){return total + 0};
		return total + eq.invMod;
	},0)
	return size;
}

// Overwrite
Game_Actor.prototype.tradeItemWithParty = function(newItem, oldItem) {
    if (newItem && !$gameParty.hasItem(newItem)) {
        return false;
    } else {
        $gameParty.forceGainItem(oldItem, 1);
        $gameParty.forceGainItem(newItem, -1);
        return true;
    }
};
//===================================================================
// ** Game_Party
//===================================================================
Theo.LINV.partyInit = Game_Party.prototype.initialize;
Game_Party.prototype.initialize = function(){
	this._baseInv = (Theo.LINV.Params['dynamic'] ? 0 : Theo.LINV.Params['defaultFree'])
	Theo.LINV.partyInit.call(this);
}

Game_Party.prototype.getBaseInv = function(){
	return this._baseInv;
}

Game_Party.prototype.setBaseInv = function(num){
	return this._baseInv = num;
}

Game_Party.prototype.invMax = function(){
	if(!Theo.LINV.Params['dynamic']){return this._baseInv};
	return this.members().reduce(function(total, member){
		return total + member.invMax();
	}, 0) + this._baseInv;
}

Game_Party.prototype.isInvMaxed = function(){
	return this.invMax() <= this.totalInvSize();
}

Game_Party.prototype.totalInvSize = function(){
	var size = this.allItems().reduce(function(total, item){
		if(item === null){return total + 0};
		return total + item.invSize;
	},0);
	size += this.members().reduce(function(total, member){
		return total + member.equipSize();
	}, 0);
	return size
}

// Overwrite
Theo.LINV.partyMaxItem = Game_Party.prototype.maxItems;
Game_Party.prototype.maxItems = function(item) {
    if (DataManager.isBattleTest()){
		return Theo.LINV.partyMaxItem.call(this, item)
	}else{
		return this.invMaxItem(item) + this.numItems(item);
	};
};

Game_Party.prototype.invMaxItem = function(item){
	if(!item || item === null || item.invSize === 0){return 999999};
	return Math.floor(this.freeSlot() / item.invSize);
}

Game_Party.prototype.freeSlot = function(){
	return this.invMax() - this.totalInvSize();
}

// Overwrite
Theo.LINV.partyHasMaxItem = Game_Party.prototype.hasMaxItems;
Game_Party.prototype.hasMaxItems = function(item) {
    if (DataManager.isBattleTest()){
		return Theo.LINV.partyHasMaxItem.call(this, item)
	}else{
		return this.isInvMaxed();
	};
};

Game_Party.prototype.isNearingMax = function(){
	return this.freeSlot() / this.invMax() <= Theo.LINV.Params['nearMaxPercent']/100
}

Game_Party.prototype.itemSize = function(item){
	if(!item || item === null){return 0};
	return item.invSize * this.numItems(item);
}

Game_Party.prototype.forceGainItem = function(item, amount, includeEquip){
	var container = this.itemContainer(item);
    if (container) {
        var lastNumber = this.numItems(item);
        var newNumber = lastNumber + amount;
        container[item.id] = Math.max(newNumber, 0);
        if (container[item.id] === 0) {
            delete container[item.id];
        }
        if (includeEquip && newNumber < 0) {
            this.discardMembersEquip(item, -newNumber);
        }
        $gameMap.requestRefresh();
    }
}

// Overwrite
Game_Party.prototype.loseItem = function(item, amount, includeEquip) {
    this.forceGainItem(item, -amount, includeEquip);
};

// Overwrite
Theo.LINV.partyGainItem = Game_Party.prototype.gainItem;
Game_Party.prototype.gainItem = function(item, amount, includeEquip) {
    if(Theo.LINV.Params['forceGain']){
		Theo.LINV.partyGainItem.call(this, item, amount, includeEquip);
	}else{
		this.forceGainItem(item, amount, includeEquip);
	}
};
