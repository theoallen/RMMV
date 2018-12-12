//=============================================================================
// Replace main.js with this for creating a blank canvas
//=============================================================================

function Scene_Example() {
	Stage.prototype.initialize.call(this);
	this._layer = new PIXI.display.Layer();
  this._spr = new Sprite();
  this._spr.bitmap = ImageManager.loadEnemy('Mimic');
	
	this._spr.x = 100;
	this._spr.y = 100;
	
	this._window = new Window_Base(20,20,100,36*2);
	this._layer.addChild(this._spr);
	this._layer.addChild(this._window);
	this.addChild(this._layer);
}

Scene_Example.prototype = Object.create(Stage.prototype);
Scene_Example.prototype.constructor = Scene_Example;

// Main Loop
Scene_Example.prototype.update = function(){
	requestAnimationFrame(this.update.bind(this));
	Graphics.render(this);
	Input.update();
	TouchInput.update();
  this._window.update();
}

PluginManager.setup($plugins);

window.onload = function() {
	DataManager.loadDatabase();
	var scene;
	var intr = setInterval(function(){
		if(DataManager.isDatabaseLoaded()){
			DataManager.createGameObjects();
			scene = new Scene_Example();
			scene.update();
			clearInterval(intr);
		}
	},16);
	Graphics.initialize(800, 600, 'webgl');
	Input.initialize();
  TouchInput.initialize();
	// SceneManager.run(Scene_Boot);
};
