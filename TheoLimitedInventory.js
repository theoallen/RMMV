/*:
@plugindesc Limits carrying capacity like in many popular games.
Version 0.9
@author TheoAllen
@help
This script allow you to limit your inventory by overall possesed 
items instead of individual items.

IMPORTANT NOTE:
Name the file of this plugin literally as
"TheoLimitedInventory.js"
	
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

TO DO LIST
> Make it more touch input friendly
> Add inventory slot eval formula
> Maybe, some compatibility patch

Terms of use :
Credit me, TheoAllen. You are free to edit this script by your own. 
As long as you don't claim it yours. For commercial purpose, don't 
forget to give me a free copy of the game.

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

@param fullDisableDash
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
@default 340
@desc The width of use item command window

@param Vocab Settings

@param invSlotVocab
@parent Vocab Settings
@text Inventory Slot
@default Inventory:
@desc Vocab for inventory

@param invSizeVocab
@parent Vocab Settings
@text Size Vocab
@default Size:
@desc Vocab for Size

@param slotShort
@parent Vocab Settings
@text Inventory Slot (Short)
@default Inv:
@desc Vocab for inventory (short)

@param useVocab
@parent Vocab Settings
@text Use Vocab
@default Use Item
@desc Vocab for using an item

@param discardVocab
@parent Vocab Settings
@text Discard Vocab
@default Discard
@desc Vocab for discarding an item

@param cancelVocab
@parent Vocab Settings
@text Cancel Vocab
@default Cancel
@desc Vocab for canceling

 */ 
var Theo = Theo || function(){ throw new Error('This is a static class')}
Theo.LINV = {}
Theo.LINV.Params = PluginManager.parameters('TheoLimitedInventory')

Theo.LINV.invSizeREGX = /<inv[\s_]+size\s*:\s*(\d+)>/i
Theo.LINV.invPlusREGX = /<inv[\s_]+plus\s*:\s*(\d+)>/i
Theo.LINV.invMinsREGX = /<inv[\s_]+minus\s*:\s*(\d+)/i

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
		Theo.LINV.invLoaded = true;
	}
    return true;
}

Theo.LINV.loadActorDefault = function(actors){
	actors.forEach(function(actor){
		if(!actor){return};
		actor.invMod = Number(Theo.LINV.Params['defaultFree']);
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
	if (Theo.LINV.Params['includeEquip'] === 'false'){return 0};
	return this.equips().reduce(function(total, eq){
		if(eq === null){return total + 0};
		return total + eq.invSize;
	},0);
}

// TO DO = Add Eval
Game_Actor.prototype.invMax = function(){
	var size = this.getBaseInv();
	size += $dataClasses[this._classId].invMod;
	size += this.states().reduce(function(total, state){total + state.invMod}, 0);
	size += this.equips().reduce(function(total, eq){
		if(!eq){return total + 0};
		return total + eq.invMod;
	},0);
	return Number(size);
}

// Overwrite
Game_Actor.prototype.tradeItemWithParty = function(newItem, oldItem) {
  	if (newItem && !$gameParty.hasItem(newItem)) {
     		return false;
  	}else{
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
	this._baseInv = (Theo.LINV.Params['dynamic'] === 'true' ? 0 : Number(Theo.LINV.Params['defaultFree']))
	Theo.LINV.partyInit.call(this);
}

Game_Party.prototype.getBaseInv = function(){
	return this._baseInv;
}

Game_Party.prototype.setBaseInv = function(num){
	return this._baseInv = num;
}

Game_Party.prototype.invMax = function(){
	if(Theo.LINV.Params['dynamic'] === 'false'){return this._baseInv};
	return this.members().reduce(function(total, member){
		return total + member.invMax();
	}, 0) + this._baseInv;
}

Game_Party.prototype.isInvMaxed = function(){
	return this.invMax() <= this.totalInvSize();
}

Game_Party.prototype.totalInvSize = function(){
	var numitem = this.numItems.bind(this);
	var size = this.allItems().reduce(function(total, item){
	if(!item){return total + 0};
		return total + item.invSize * numitem(item);
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
	return this.freeSlot() / this.invMax() <= Number(Theo.LINV.Params['nearMaxPercent'])/100
}

Game_Party.prototype.itemSize = function(item){
	if(!item){return 0};
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
	if(Theo.LINV.Params['forceGain'] === 'true'){
		Theo.LINV.partyGainItem.call(this, item, amount, includeEquip);
	}else{
		this.forceGainItem(item, amount, includeEquip);
	}
};

//===================================================================
// ** Game_Player
//===================================================================
Theo.LINV.playerIsDashing = Game_Player.prototype.isDashing;
Game_Player.prototype.isDashing = function() {
	if(Theo.LINV.Params['fullDisableDash'] === 'true' && $gameParty.isInvMaxed()){return false};
  return Theo.LINV.playerIsDashing.call(this);
};

// This need confirmation if it's okay
Theo.LINV.playerRealSpeed = Game_CharacterBase.prototype.realMoveSpeed;
Game_Player.prototype.realMoveSpeed = function() {
  return Theo.LINV.playerRealSpeed.call(this) - this.movePenalty();
};

Game_Player.prototype.movePenalty = function(){
	return (Theo.LINV.Params['fullSlowDown'] === 'true' && $gameParty.isInvMaxed() ? 1 : 0);
}
//===================================================================
// ** Window_Base
//===================================================================
Window_Base.prototype.drawInvSlot = function(x, y, width, align = 'right'){
	let total = String($gameParty.totalInvSize());
	let invmax = String($gameParty.invMax());
	let txt = total + "/" + invmax;
	console.log(invmax);
	let colorId = Number(Theo.LINV.Params['nearMaxColor']);
	if ($gameParty.isNearingMax()){
		this.changeTextColor(this.textColor(colorId));
	}else{
		this.changeTextColor(this.normalColor());
	}
	this.drawText(txt,x,y,width,align)
  this.changeTextColor(this.normalColor())
}

Window_Base.prototype.drawInvInfo = function(x,y,width){
	this.changeTextColor(this.systemColor());
	this.drawText(Theo.LINV.Params['invSlotVocab'],x,y,width,0);
	this.changeTextColor(this.normalColor());
	this.drawInvSlot(x, y, width);
}

Window_Base.prototype.drawItemSize = function(item, x, y, width){
	this.changeTextColor(this.systemColor());
	this.drawText(Theo.LINV.Params['invSizeVocab'], x, y, width);
	this.changeTextColor(this.normalColor());
	// console.log($gameParty.itemSize(item));
	// console.log(item.invSize);
	let num = (Theo.LINV.Params['drawTotalSize'] === 'true') ? $gameParty.itemSize(item) : (!item ? 0 : item.invSize);
	// console.log(num);
	this.drawText(num, x, y, width, 'right');
}
//===================================================================
// ** Limited Inventory - Window_MainMenu
//===================================================================
Theo.LINV.Window_MainMenu = function(){
	this.initialize.apply(this, arguments);
}

Theo.LINV.Window_MainMenu.prototype = Object.create(Window_Base.prototype);
Theo.LINV.Window_MainMenu.prototype.constructor = Theo.LINV.Window_MainMenu;

Theo.LINV.Window_MainMenu.prototype.initialize = function(width) {
  Window_Base.prototype.initialize.call(this,0,0,width,this.fittingHeight(1));
};

Theo.LINV.Window_MainMenu.prototype.refresh = function(){
	this.contents.clear();
	this.changeTextColor(this.systemColor());
	let txt = Theo.LINV.Params['slotShort'];
	this.drawText(txt, 0, 0, this.contents.width);
	this.drawInvSlot(0, 0, this.contents.width);
}
//===================================================================
// ** Limited Inventory - Window_ItemSize
//===================================================================
Theo.LINV.Window_ItemSize = function(){
	this.initialize.apply(this, arguments);
}

Theo.LINV.Window_ItemSize.prototype = Object.create(Window_Base.prototype);
Theo.LINV.Window_ItemSize.prototype.constructor = Theo.LINV.Window_ItemSize;

Theo.LINV.Window_ItemSize.prototype.initialize = function(x,y,width) {
  Window_Base.prototype.initialize.call(this,x,y,width,this.fittingHeight(1));
};

Theo.LINV.Window_ItemSize.prototype.setItem = function(item) {
	this.item = item;
	this.refresh();
}

Theo.LINV.Window_ItemSize.prototype.refresh = function(){
	this.contents.clear();
	this.drawItemSize(this.item,0,0,this.contents.width);
}
//===================================================================
// ** Limited Inventory - Window_FreeSlot
//===================================================================
Theo.LINV.Window_FreeSlot = function(){
	this.initialize.apply(this, arguments);
}

Theo.LINV.Window_FreeSlot.prototype = Object.create(Window_Base.prototype);
Theo.LINV.Window_FreeSlot.prototype.constructor = Theo.LINV.Window_FreeSlot;

Theo.LINV.Window_FreeSlot.prototype.initialize = function(x,y,width) {
  Window_Base.prototype.initialize.call(this,x,y,width,this.fittingHeight(1));
	this.refresh();
};

Theo.LINV.Window_FreeSlot.prototype.refresh = function(){
	this.contents.clear();
	this.drawInvInfo(0,0,this.contents.width);
}
//===================================================================
// ** Limited Inventory - Window_ItemUse
//===================================================================
Theo.LINV.Window_ItemUse = function(){
	this.initialize.apply(this, arguments);
}

Theo.LINV.Window_ItemUse.prototype = Object.create(Window_Command.prototype);
Theo.LINV.Window_ItemUse.prototype.constructor = Theo.LINV.Window_ItemUse;

Theo.LINV.Window_ItemUse.prototype.initialize = function(){
	Window_Command.prototype.initialize.call(this, 0, 0);
	this._openness = 0;
	this.deactivate();
}

Theo.LINV.Window_ItemUse.prototype.setItem = function(item){
	this._item = item;
	this.refresh();
}

Theo.LINV.Window_ItemUse.prototype.windowWidth = function() {
	return Number(Theo.LINV.Params[`commandSize`]);
};

Theo.LINV.Window_ItemUse.prototype.makeCommandList = function(){
	this.addCommand(Theo.LINV.Params['useVocab'], 'use', $gameParty.canUse(this._item));
	this.addCommand(Theo.LINV.Params['discardVocab'], 'discard', this.discardAble(this._item));
	this.addCommand(Theo.LINV.Params['cancelVocab'], 'cancel');
}

Theo.LINV.Window_ItemUse.prototype.toCenter = function(){
	this.x = Graphics.width/2 - this.width/2;
	this.y = Graphics.height/2 - this.height/2 - 20;
}

Theo.LINV.Window_ItemUse.prototype.discardAble = function(item){
	if(!item) {return false};
	if(item.itypeId) {return item.itypeId !== 2}
	else{return true};
}
//===================================================================
// ** Limited Inventory - Window_Discard
//===================================================================
Theo.LINV.Window_Discard = function(){
	this.initialize.apply(this, arguments);
}

Theo.LINV.Window_Discard.prototype = Object.create(Window_Base.prototype);
Theo.LINV.Window_Discard.prototype.constructor = Theo.LINV.Window_Discard;

Theo.LINV.Window_Discard.prototype.initialize = function(x,y,width){
	Window_Base.prototype.initialize.call(this,x,y,width,this.fittingHeight(1));
	this._openness = 0;
	this._amount = 0;
	this.setCursorRect(0, 0, this.contents.width, this.contents.height);
	this.active = true;
}

Theo.LINV.Window_Discard.prototype.setItem = function(item){
	this._item = item;
	this._amount = 0;
	this.refresh();
}

Theo.LINV.Window_Discard.prototype.refresh = function(){
	this.contents.clear();
	if(!this._item){return};
	this.drawItemName(this._item, 2, 2, this.contents.width);
	let txt = String(this._amount)+"/"+String($gameParty.numItems(this._item));
	this.drawText(txt,0,1,this.contents.width-2,'right')
}

Theo.LINV.Window_Discard.prototype.drawItemName = function(item, x, y, width){
	if(!item){return};
	this.drawIcon(item.iconIndex, x, y);
	this.drawText(item.name + ":",x + 36, y, width);
}

Theo.LINV.Window_Discard.prototype.update = function(){
	Window_Base.prototype.update.call(this);
	if (!this.isOpen()){return};
	if (Input.isRepeated('right')) {this.changeAmount(1)};
	if (Input.isRepeated('left')) {this.changeAmount(-1)};
	if (Input.isRepeated('up')) {this.changeAmount(10)};
	if (Input.isRepeated('down')) {this.changeAmount(-10)};
	if (Input.isTriggered('ok')){this.loseItem()};
	if (Input.isTriggered('cancel')){this.closeWindow()};
}

Theo.LINV.Window_Discard.prototype.changeAmount = function(amount){
	this._amount = (this._amount + amount).clamp(0,$gameParty.numItems(this._item));
	SoundManager.playCursor();
	this.refresh();
}

Theo.LINV.Window_Discard.prototype.loseItem = function(){
	$gameParty.loseItem(this._item,this._amount);
	this.itemList.redrawCurrentItem();
	this.freeSlot.refresh();
	if($gameParty.numItems(this._item) === 0){
		SoundManager.playOk();
		this.itemList.activate();
		this.itemList.refresh();
		this.itemList.updateHelp();
		this.commandWindow.close();
		this.commandWindow.deactivate();
		this.close();
	}else{
		this.closeWindow();
	}
}

Theo.LINV.Window_Discard.prototype.closeWindow = function(){
	this.close();
	this.commandWindow.activate();
	SoundManager.playOk();
}
//===================================================================
// ** Default Script - Window_ItemList
//===================================================================
Window_ItemList.prototype.itemSizeWindow = function(w){
	this._itemSizeWindow = w;
	this._itemSizeWindow.setItem(this.item);
}

Theo.LINV.itemList_updateHelp = Window_ItemList.prototype.updateHelp;
Window_ItemList.prototype.updateHelp = function(){
	Theo.LINV.itemList_updateHelp.call(this);
	if (!this._itemSizeWindow){return};
	this._itemSizeWindow.setItem(this.item());
}

Window_ItemList.prototype.changeHeight = function(height){
	this.height = height;
	this.refresh();
}

// Overwrite
Window_ItemList.prototype.isEnabled = function(item) {
  	if (item){return true}else{return false};
};
//===================================================================
// ** Default Script - Window_ShopNumber
//===================================================================
Theo.LINV.shopNumInit = Window_ShopNumber.prototype.initialize;
Window_ShopNumber.prototype.initialize = function(){
	Window_ShopNumber.prototype.initialize.call(this, x, y, height);
	this._mode = 'buy';
}

Theo.LINV.shopNumRefresh = Window_ShopNumber.prototype.refresh;
Window_ShopNumber.prototype.refresh = function(){
	Theo.LINV.shopNumRefresh.call(this);
	this.drawItemSize();
}

Window_ShopNumber.prototype.drawItemSize = function(){
	let num = this._number + this._item.invSize;
	let total = $gameParty.totalInvSize() + (this._mode === 'buy' ? num : num * -1);
	let txt = String(total)+"/"+String($gameParty.invMax());
	let ypos = this.itemY() + lineHeight() * 4;
	this.changeTextColor(this.systemColor());
	this.drawText(Theo.LINV.Params['invSlotVocab'],6,ypos,contents.width-12);
	this.changeTextColor(this.normalColor());
	this.drawText(txt,6,ypos,contents.width-12,'right');
}
//===================================================================
// ** Default Script - Window_ShopStatus
//===================================================================
if (Theo.LINV.Params['displayItem'] === 'true'){
	Theo.LINV.shopStatusPossession = Window_ShopStatus.prototype.drawPossession;
	Window_ShopStatus.prototype.drawPossession = function(x, y){
		Theo.LINV.shopStatusPossession.call(this, x, y);
		y += lineHeight();
		this.drawItemSize(this._item, x, y, contents.width - (x*2));
	}
}
//===================================================================
// ** Default Script - Scene_Menu
//===================================================================
Theo.LINV.sceneMenuCreate = Scene_Menu.prototype.create;
Scene_Menu.prototype.create = function(){
	Theo.LINV.sceneMenuCreate.call(this);
	this.createLinvWindow();
}

Scene_Menu.prototype.createLinvWindow = function(){
	this._linvWindow = new Theo.LINV.Window_MainMenu(this._goldWindow.width);
	this._linvWindow.x = this._commandWindow.x;
	this._linvWindow.y = this._commandWindow.height;
	this._linvWindow.refresh();
	this.addWindow(this._linvWindow);
}
//===================================================================
// ** Default Script - Scene_Item
//===================================================================
Theo.LINV.sceneItemCreate = Scene_Item.prototype.create;
Scene_Item.prototype.create = function(){
	Theo.LINV.sceneItemCreate.call(this);
	this.resizeItemWindow();
	this.createUpperLayer();
	this.createFreeslotWindow();
	this.createItemsizeWindow();
	this.createUsecommandWindow();
	this.createDiscardAmount();
	this.reoderChilds();
}

Scene_Item.prototype.resizeItemWindow = function(){
	this._itemWindow.height -= this._itemWindow.lineHeight() * 2;
}

Scene_Item.prototype.reoderChilds = function(){
	this._windowLayer.children.findIndex(function(element){
		if (element === this._actorWindow){
			this._windowLayer.removeChild(element);
			this._windowLayer.addChild(element);
			return true;
		}
		return false;
	},this);
}

Scene_Item.prototype.createUpperLayer = function(){
	let width = Graphics.boxWidth;
	let height = Graphics.boxHeight;
	let x = (Graphics.width - width) / 2;
	let y = (Graphics.height - height) / 2;
	this._useLayer = new WindowLayer();
	this._useLayer.move(x, y, width, height);
	this.addChild(this._useLayer);
}

Scene_Item.prototype.addUpperWindow = function(w){
	this._useLayer.addChild(w);
}

Scene_Item.prototype.createFreeslotWindow = function(){
	let wy = this._itemWindow.y + this._itemWindow.height;
	let wh = Theo.LINV.Params['displayItem'] === 'true' ? Graphics.width/2 : Graphics.width;
	this._freeSlot = new Theo.LINV.Window_FreeSlot(0,wy,wh);
	this.addWindow(this._freeSlot);
}

Scene_Item.prototype.createItemsizeWindow = function(){
	if(Theo.LINV.Params['displayItem'] === 'false'){return};
	let wx = this._freeSlot.width
	let wy = this._freeSlot.y
	let ww = wx
	this._itemSize = new Theo.LINV.Window_ItemSize(wx,wy,ww)
	this._itemWindow._itemSizeWindow = this._itemSize
	this.addWindow(this._itemSize)
}

Scene_Item.prototype.createUsecommandWindow = function(){
	this._useCommand = new Theo.LINV.Window_ItemUse()
	this._useCommand.toCenter()
	this._useCommand.setHandler('use', this.useCommandOk.bind(this))
	this._useCommand.setHandler('discard', this.onDiscardOk.bind(this))
	this._useCommand.setHandler('cancel', this.onUseCancel.bind(this))
	this.addUpperWindow(this._useCommand)
}

Scene_Item.prototype.createDiscardAmount = function(){
	let wx = this._useCommand.x
	let wy = this._useCommand.y + this._useCommand.height
	let ww = this._useCommand.width
	this._discardWindow = new Theo.LINV.Window_Discard(wx,wy,ww)
	this._discardWindow.commandWindow = this._useCommand
	this._discardWindow.itemList = this._itemWindow
	this._discardWindow.freeSlot = this._freeSlot
	this.addUpperWindow(this._discardWindow)
}

// Overwrite
Theo.LINV.sceneItem_OnItemOk = Scene_Item.prototype.onItemOk;
Scene_Item.prototype.onItemOk = function(){
	this._useCommand.setItem(this.item())
	this._useCommand.open()
	this._useCommand.activate()
	this._useCommand.select(0)
}

Theo.LINV.sceneItem_UseItem = Scene_Item.prototype.useItem;
Scene_Item.prototype.useItem = function(){
	this._useCommand.close()
	Theo.LINV.sceneItem_UseItem.call(this)
	this._freeSlot.refresh();
}

Scene_Item.prototype.useCommandOk = function(){
	Theo.LINV.sceneItem_OnItemOk.call(this);
	this._useCommand.close();
}

Scene_Item.prototype.onDiscardOk = function(){
	this._discardWindow.setItem(this.item())
	this._discardWindow.open()
}

Scene_Item.prototype.onUseCancel = function(){
	this._itemWindow.activate()
	this._useCommand.close()
	this._useCommand.deactivate()
}

//===================================================================
// ** Default Script - Scene_Shop
//===================================================================
Theo.LINV.shopBuyOk = Scene_Shop.prototype.onBuyOk;
Scene_Shop.prototype.onBuyOk = function() {
	this._numberWindow._mode = 'buy';
	Theo.LINV.shopBuyOk.call(this);
};

Theo.LINV.shopSellOk = Scene_Shop.prototype.onSellOk;
Scene_Shop.prototype.onSellOk = function() {
	this._numberWindow._mode = 'sell';
	Theo.LINV.shopSellOk.call(this);
};
