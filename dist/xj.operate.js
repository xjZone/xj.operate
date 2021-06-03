/** xj.operate(判断操作方式) | V0.5.0 | Apache Licence 2.0 | 2016-2021 © XJ.Chen | https://github.com/xjZone/xj.operate */
;(function(global, factory){
	if(typeof(define) === 'function' && (define.amd !== undefined || define.cmd !== undefined)){ define(factory) }
	else if(typeof(module) !== 'undefined' && typeof(exports) === 'object'){ module.exports = factory() }
	else{ global = (global||self), global.xj||(global.xj = {}), global.xj.operate = factory() };
}(this, function(){ 'use strict';



// Polyfill : classList V0.1.1
// 解决 IE10 的 SVG 标签不支持 classList 对象的 3 个方法 : pub_hasClass() / pub_addClass() / pub_delClass()
var pub_hasClass,pub_addClass,pub_delClass;!function(){pub_hasClass=function(a,b){var c,d;return a.classList?a.classList.contains(b):(c=a.getAttribute("class"),d=c?c.split(/\s+/):[],-1===d.indexOf(b)?!1:!0)},pub_addClass=function(a,b){var c,d;return a.classList?a.classList.add(b):(c=a.getAttribute("class"),d=c?c.split(/\s+/):[],0===d.length?a.setAttribute("class",b):-1===d.indexOf(b)&&a.setAttribute("class",d.join(" ")+" "+b),void 0)},pub_delClass=function(a,b){var c,d;return a.classList?a.classList.remove(b):(c=a.getAttribute("class"),d=c?c.split(/\s+/):[],c="",-1!==d.indexOf(b)&&(d.forEach(function(a){a!==b&&(c+=a+" ")}),a.setAttribute("class",c.trim())),void 0)}}();



// ---------------------------------------------------------------------------------------------
// globalThis | window | self | global
var pub_global = (typeof(globalThis) !== 'undefined' ? globalThis : typeof(window) !== 'undefined' ? window : typeof(self) !== 'undefined' ? self : global);

// public nothing, version, keyword
var pub_nothing = function(){}, pub_version = '0.5.0', pub_keyword = 'operate';

// public config, advance set
var pub_config = {
	
	classTarget : document.documentElement,		// 将被添加 existClass / mouseClass / touchClass / otherClass 类名的目标节点，默认是 html 标签，不推荐修改，保持默认即可
	existClass : 'xj-operate-exist',			// 初始化后 targetClass 元素节点会被添加的类名，默认是 'xj-operate-exist'，可用于 CSS 判断环境中是否存在 xj.operate 插件
	
	mouseClass : 'xj-operate-mouse',			// 当使用了鼠标进行操作，会在 classTarget 节点上添加的类名，默认为 'xj-operate-mouse'，并不推荐修改，因为不少 xj 插件都是默认只响应这个类名，如果需要配置其他类名，可在 mouseCallback 回调中设置
	touchClass : 'xj-operate-touch',			// 当使用了触屏进行操作，会在 classTarget 节点上添加的类名，默认为 'xj-operate-touch'，并不推荐修改，因为不少 xj 插件都是默认只响应这个类名，如果需要配置其他类名，可在 touchCallback 回调中设置
	otherClass : 'xj-operate-other',			// 既不是鼠标也不是触屏，会在 classTarget 节点上添加的类名，默认为 'xj-operate-other'，但实际上这个状态并不会自动出现，页面只会在 mouse 和 touch 这两个状态中进行切换，除非是主动调用 otherSet()
	
	frequency : 10,								// mousemove 事件的触发频率，默认为 10，在 duration 参数这个时间内，能连续触发这么多次 mousemove，那就算是使用了鼠标设备
	duration : 1000,							// mousemove 事件的触发时间，默认为 1000(ms)，在这个时间内能连续触发 frequency 次 mousemove 事件，那就算是使用了鼠标设备
	
	mouseCallback : pub_nothing,				// 触发为 mouse 状态的回调函数，temporary 参数是这个状态是否为临时性转遍的标志，一般都是 true，除非调用 mouseSet() 时传入了 false，如果该函数最终返回的是 false，那么将会阻止本次进入 mouse 状态
	touchCallback : pub_nothing,				// 触发为 touch 状态的回调函数，temporary 参数是这个状态是否为临时性转遍的标志，一般都是 true，除非调用 touchSet() 时传入了 false，如果该函数最终返回的是 false，那么将会阻止本次进入 touch 状态
	otherCallback : pub_nothing,				// 既不是 mouse 也不是 touch 的回调函数，temporary 参数是调用 otherSet() 传入的参数，这个函数返回 false 将阻止进入 other 状态，实际上 other 状态并不会自动出现，这回调只在调用 otherSet() 时响应
	
};

// public option(00 items)
var pub_option = {};



// ---------------------------------------------------------------------------------------------
// 如果已经存在了就直接返回目标对象
if(pub_global.xj === undefined){ pub_global.xj = {} };
if(pub_global.xj.operateReturn === undefined){ pub_global.xj.operateReturn = {} };
if(pub_global.xj.operateReturn[pub_version] !== undefined){ return pub_global.xj.operateReturn[pub_version] };



// 创建并合并 config 和 option 参数
if(pub_global.xj.operateConfig === undefined){ pub_global.xj.operateConfig = {} };
if(pub_global.xj.operateOption === undefined){ pub_global.xj.operateOption = {} };
if(pub_global.xj.operateConfig[pub_version] !== undefined){ Object.keys(pub_global.xj.operateConfig[pub_version]).forEach(function(key){ pub_config[key] = pub_global.xj.operateConfig[pub_version][key] }) };
if(pub_global.xj.operateOption[pub_version] !== undefined){ Object.keys(pub_global.xj.operateOption[pub_version]).forEach(function(key){ pub_option[key] = pub_global.xj.operateOption[pub_version][key] }) };



// 创建页面最顶层四个全局节点的变量
var pub_win = pub_global;
var pub_doc = pub_win.document;
var pub_html = pub_doc.documentElement;
var pub_body = pub_doc.body;



// ---------------------------------------------------------------------------------------------
// mouse 事件监听函数将会用到的变量
var lastTime = 0;
var thisTime = Date.now();
var totalDuration = 0;
var durationArray = new Array();



// touch 事件监听函数，touch = true
var touchListener = function(event){
	if(event && event.isTrusted === false
	){ return }else{ pub_return.touchSet() };
};



// mouse 事件监听函数，mouse = true
var mouseListener = function(event){
	
	if(event && event.isTrusted === false){ return };
	
	lastTime = thisTime;
	thisTime = new Date().getTime();
	
	durationArray.push( thisTime - lastTime );
	if(durationArray.length < pub_config.frequency){ return };
	
	durationArray.forEach(function(time){ totalDuration += time });
	if(totalDuration <= pub_config.duration){ pub_return.mouseSet() };
	
	totalDuration = 0;
	durationArray = [];
	
};



// ---------------------------------------------------------------------------------------------
// 这是插件执行后最终将会返回的对象
var pub_return = {
	
	version : pub_version,						// 插件和配置的版本号
	
	mouse : false,								// 是否正处于 mouse 状态，是则返回 true，否则返回 fasle
	touch : false,								// 是否正处于 touch 状态，是则返回 true，否则返回 fasle
	other : false,								// 是否正处于 other 状态，是则返回 true，否则返回 fasle，实际上这个状态并不会自动出现，除非是手动调用了 otherSet()
	
	mouseSet : pub_nothing,						// 手动设置为 mouse 状态，可传入 temporary 参数，不传则默认为 true，也就是设置为 mouse 状态是临时的，传入 false 则永久性进入 mouse 状态，之后就得用 mouseSet() / touchSet() 方法才能恢复继续监听
	touchSet : pub_nothing,						// 手动设置为 touch 状态，可传入 temporary 参数，不传则默认为 true，也就是设置为 touch 状态是临时的，传入 false 则永久性进入 touch 状态，之后就得用 mouseSet() / touchSet() 方法才能恢复继续监听
	otherSet : pub_nothing,						// 手动设置为 other 状态，可传入 temporary 参数，不传则默认为 true，也就是设置为 other 状态是临时的，传入 false 则永久性进入 other 状态，之后就得用 mouseSet() / touchSet() 方法才能恢复继续监听
	
};

pub_return.mouseSet = function(temporary){
	
	lastTime = thisTime;
	thisTime = Date.now();
	totalDuration = 0;
	durationArray = [];
	
	if(temporary === undefined){ temporary = true };
	
	if(pub_config.mouseCallback !== pub_nothing && 
	pub_config.mouseCallback(temporary) === false){ return };
	
	pub_return.mouse = true;
	pub_return.touch = false;
	pub_return.other = false;
	
	pub_addClass(pub_config.classTarget, pub_config.mouseClass);
	pub_delClass(pub_config.classTarget, pub_config.touchClass);
	pub_delClass(pub_config.classTarget, pub_config.otherClass);
	
	if(temporary === true){
		pub_doc.removeEventListener('mousemove', mouseListener, true);
		pub_doc.addEventListener('touchstart', touchListener, true);
	}else{
		pub_doc.removeEventListener('mousemove', mouseListener, true);
		pub_doc.removeEventListener('touchstart', touchListener, true);
	};
	
};

pub_return.touchSet = function(temporary){
	
	lastTime = thisTime;
	thisTime = Date.now();
	totalDuration = 0;
	durationArray = [];
	
	if(temporary === undefined){ temporary = true };
	
	if(pub_config.touchCallback !== pub_nothing && 
	pub_config.touchCallback(temporary) === false){ return };
	
	pub_return.mouse = false;
	pub_return.touch = true;
	pub_return.other = false;
	
	pub_delClass(pub_config.classTarget, pub_config.mouseClass);
	pub_addClass(pub_config.classTarget, pub_config.touchClass);
	pub_delClass(pub_config.classTarget, pub_config.otherClass);
	
	if(temporary === true){
		pub_doc.addEventListener('mousemove', mouseListener, true);
		pub_doc.removeEventListener('touchstart', touchListener, true);
	}else{
		pub_doc.removeEventListener('mousemove', mouseListener, true);
		pub_doc.removeEventListener('touchstart', touchListener, true);
	};
	
};

pub_return.otherSet = function(temporary){
	
	lastTime = thisTime;
	thisTime = Date.now();
	totalDuration = 0;
	durationArray = [];
	
	if(temporary === undefined){ temporary = true };
	
	if(pub_config.otherCallback !== pub_nothing && 
	pub_config.otherCallback(temporary) === false){ return };
	
	pub_return.mouse = false;
	pub_return.touch = false;
	pub_return.other = true;
	
	pub_delClass(pub_config.classTarget, pub_config.mouseClass);
	pub_delClass(pub_config.classTarget, pub_config.touchClass);
	pub_addClass(pub_config.classTarget, pub_config.otherClass);
	
	if(temporary === true){
		pub_doc.addEventListener('mousemove', mouseListener, true);
		pub_doc.addEventListener('touchstart', touchListener, true);
	}else{
		pub_doc.removeEventListener('mousemove', mouseListener, true);
		pub_doc.removeEventListener('touchstart', touchListener, true);
	};
	
};



// ---------------------------------------------------------------------------------------------
// 添加 existClass 类名
if(pub_config.classTarget !== null && pub_config.existClass !== ''){ pub_addClass(pub_config.classTarget, pub_config.existClass) };

// 初始化状态设置
if(('ontouchstart' in pub_win) === true){ pub_return.touchSet() }else{ pub_return.mouseSet() };

// 返回对象
return pub_global.xj.operateReturn[pub_version] = pub_return;



})); // 插件结束


