/** xj.operate(判断操作方式) | V0.6.0 | Apache Licence 2.0 | 2016-2022 © XJ.Chen | https://github.com/xjZone/xj.operate/ */
;(function(global, factory){
	if(typeof(define) === 'function' && (define.amd !== undefined || define.cmd !== undefined)){ define(factory) }
	else if(typeof(module) !== 'undefined' && typeof(exports) === 'object'){ module.exports = factory() }
	else{ global = (global||self), global.xj||(global.xj = {}), global.xj.operate = factory() };
}(this, function(){ 'use strict';



// ---------------------------------------------------------------------------------------------
// globalThis, window, self, global
var pub_global = (typeof(globalThis) !== 'undefined') ? globalThis : (typeof(window) !== 'undefined') ? window : (typeof(self) !== 'undefined') ? self : global;

// public nothing, version, keyword
var pub_nothing = function(){}, pub_version = '0.6.0', pub_keyword = 'operate';

// public config
var pub_config = {
	
	classTarget : document.documentElement,		// 将被添加 existClass, mouseClass, touchClass, otherClass 配置的节点，默认是 html，这里是建议保持默认，不要修改
	existClass : 'xj-operate-exist',			// 初始化后 classTarget 配置会被添加的类名，默认是 'xj-operate-exist'，可用于在 CSS 判断是否有本插件，不推荐修改
	
	mouseClass : 'xj-operate-mouse',			// 当使用了鼠标进行操作，会在 classTarget 节点上添加的类名，默认是 'xj-operate-mouse'，并不推荐修改，因为不少 xj 插件都是默认只响应这个类名，如果需要配置其他类名，可在 mouseCallback 回调中设置
	touchClass : 'xj-operate-touch',			// 当使用了触屏进行操作，会在 classTarget 节点上添加的类名，默认是 'xj-operate-touch'，并不推荐修改，因为不少 xj 插件都是默认只响应这个类名，如果需要配置其他类名，可在 touchCallback 回调中设置
	otherClass : 'xj-operate-other',			// 既不是鼠标也不是触屏，会在 classTarget 节点上添加的类名，默认是 'xj-operate-other'，但实际上这个状态并不会自动出现，页面只会在 mouse 和 touch 这两个状态中进行切换，除非是主动调用 otherSet()
	
	pressHover : false,							// 当处于 touch 状态的时候，如果长按屏幕且没有移动过，是否临时转遍为 mouse 状态，以便让 hover 生效，默认为 false
	delayTime : 500,							// touchstart 和 mousemove 的最大间隔时间，在此时间如果内触发连续触发这两个事件，将会进入 mouse 状态，默认为 500
	
	mouseCallback : pub_nothing,				// 触发为 mouse 状态的回调函数，temporary 参数是这个状态是否为临时性转遍的标志，一般都是 true，除非调用 mouseSet() 时传入了 false，如果该函数最终返回的是 false，那么将会阻止本次进入 mouse 状态
	touchCallback : pub_nothing,				// 触发为 touch 状态的回调函数，temporary 参数是这个状态是否为临时性转遍的标志，一般都是 true，除非调用 touchSet() 时传入了 false，如果该函数最终返回的是 false，那么将会阻止本次进入 touch 状态
	otherCallback : pub_nothing,				// 既不是 mouse 也不是 touch 的回调函数，temporary 参数是调用 otherSet() 传入的参数，这个函数返回 false 将阻止进入 other 状态，实际上 other 状态并不会自动出现，这回调只在调用 otherSet() 时响应
	
};

// public option
var pub_option = {};



// ---------------------------------------------------------------------------------------------
// 如果已经存在了就直接返回目标对象
if(pub_global.xj === undefined){ pub_global.xj = {} };
if(pub_global.xj.operateReturn === undefined){ pub_global.xj.operateReturn = {} };
if(pub_global.xj.operateReturn[pub_version] !== undefined){ return pub_global.xj.operateReturn[pub_version] };



// 创建并合并 config 和 option 对象
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
// V0.5.X- 判断，原理是通过触屏环境无法在短时间内连续触发多次 mousemove 实现，但那样响应不够灵敏
// V0.6.X+ 判断，改为 mousemove 触发和 touchstart 触发，其间隔是否小于 500ms，逻辑复杂但是更灵敏

// Safari(IOS) 长按时只会触发 touchstart 和 touchend，不会触发 mousemove，但可通过 touchend 判断
// touchend 和 touchstart 的触发时间距大于 500ms，那就算是长按，因为一般长按的响应时间就是 500ms

// Android 的 WX 和 UC，长按只会触发 touchstart 事件，因为长按所弹出的菜单，会导致其他事件被中断
// 所以无法通过 touchend 等事件来判断是否为长按，但好在会触发 touchcancel 事件，可绑定该事件判断
// Android 的 Firefox 长按也可能触发 touchmove 事件，触发 touchmove 事件意味着这是滚动或缩放操作
// 所以最终的逻辑改为即使触发了 touchmove，但只要触发次数少于 2 次，那也还是可能处于长按的操作中

// Chrome 的移动模拟，长按后放开会先触发 touchend 后触发 mousemove，所以会先执行 touchend 的回调
// 如果允许进入 mouse 状态，那么在 touchend 回调中就会进入了，之后 mousemove 回调将会直接 return

// 最大问题是 mouse 临时换成 touch，之后就无法再自动恢复成 mouse 状态，因为此时 mousemove 超时了
// 如果遇到 pressHover === false 时会 return，所以创建 trulyTouchstart 判断到能 touch 就不要继续
// 用 'ontouchstart' in document 判断是不行的，Chrome 切换状态或触屏设备拔插鼠标后该判断就不准了
// 所以改为在 touchstart 事件中使用 trulyTouchstart，来动态的真实判断当前环境是否支持 touch 事件

var trulyTouchstart = false;   // 是否真实触发过
var lastTouchstart = 0;        // 触屏开始的时间
var hasTouchstart = false;     // 是否有触屏开始
var touchmoveSum = 0;          // 触屏移动的次数
var hasTouchend = false;       // 是否有触屏结束

// 当 mousemove 没紧跟 touchstart 触发就算是鼠标
// 所谓紧跟就是两个事件的触发间隔值 >= delayTime
var mousemoveListener = function(event){
	
	if(event.isTrusted === false){ return }
	else if(pub_return.mouse === true){ return }
	else if(touchmoveSum > 2){ return 'scroll/zoom' };
	
	if(Date.now() - lastTouchstart <= pub_config.delayTime){ return }
	else if(Date.now() - lastTouchstart  >  pub_config.delayTime && 
	pub_config.pressHover === false && trulyTouchstart === true){
		trulyTouchstart = false;
		return;
	};
	
	pub_return.mouseSet();
	
};

// 触发了 touchstart，就更新 lastTouchstart 变量
// 点击时间和 touch 判断不能颠倒，时间后面要用到
var touchstartListener = function(event){
	
	if(event.isTrusted === false){ return };
	if(event.touches.length > 1){ return };
	
	if(touchmoveSum > 2){ return };
	hasTouchstart = true, hasTouchend = false;
	
	trulyTouchstart = true;
	
	lastTouchstart = Date.now( );
	if(pub_return.touch === true){ return };
	
	pub_return.touchSet();
	
};

// 触发 touchmove 就是滚动或缩放，所有操作都作废
// Firefox(Android) 长按也会触发，所以改为累进值
var touchmoveListener = function(event){
	if(event.isTrusted === true){
		touchmoveSum += 1;
	};
};

// touchend 距离 touchstart 超过 500ms，就算长按
// 当手指都离开后 hasTouchstart 等变量才能初始化
var touchendListener = function(event){
	
	if(event.isTrusted === false){ return };
	if(event.touches.length > 0){ return };
	
	if(pub_config.pressHover === true 
	&& Date.now() - lastTouchstart >= 500 && 
	touchmoveSum <= 2 && pub_return.mouse === false 
	){ pub_return.mouseSet() };
	
	hasTouchstart = false;
	touchmoveSum = 0;
	hasTouchend = true;
	
};

// 类似 touchend，但是有开始却没有结束，也算长按
// touchcancel 时，event.touches.length 也是为 0
var touchcancelListener = function(event){
	
	if(event.isTrusted === false){ return };
	if(event.touches.length > 0){ return };
	
	if(pub_config.pressHover === true 
	&& Date.now() - lastTouchstart >= 500 && 
	touchmoveSum <= 2 && pub_return.mouse === false 
	){ if(hasTouchstart === true 
	&& hasTouchend === false){ pub_return.mouseSet() }; };
	
	hasTouchstart = false;
	touchmoveSum = 0;
	hasTouchend = true;
	
};



// ---------------------------------------------------------------------------------------------
// 不用担心重复绑定，因为重复会无效
var toggleEventListener = function(temporary){
	
	pub_doc[temporary === true ? 'addEventListener' : 
	'removeEventListener']('mousemove',   mousemoveListener,   true);
	
	pub_doc[temporary === true ? 'addEventListener' : 
	'removeEventListener']('touchstart',  touchstartListener,  true);
	
	pub_doc[temporary === true ? 'addEventListener' : 
	'removeEventListener']('touchmove',   touchmoveListener,   true);
	
	pub_doc[temporary === true ? 'addEventListener' : 
	'removeEventListener']('touchend',    touchendListener,    true);
	
	pub_doc[temporary === true ? 'addEventListener' : 
	'removeEventListener']('touchcancel', touchcancelListener, true);
	
};

// 根据传入的状态值来决定类名的设置
var switchTargetClass = function(state){
	
	pub_config.classTarget.classList[state === 
	'mouse' ? 'add' : 'remove'](pub_config.mouseClass);
	
	pub_config.classTarget.classList[state === 
	'touch' ? 'add' : 'remove'](pub_config.touchClass);
	
	pub_config.classTarget.classList[state === 
	'other' ? 'add' : 'remove'](pub_config.otherClass);
	
};

// 这是插件执行后最终将会返回的对象
var pub_return = {
	
	version : pub_version,						// 插件和配置的版本号
	
	mouse : false,								// 是否正处于 mouse 状态，是则返回 true，否则返回 fasle
	touch : false,								// 是否正处于 touch 状态，是则返回 true，否则返回 fasle
	other : false,								// 是否正处于 other 状态，是则返回 true，否则返回 fasle，实际上这个状态并不会自动出现，除非是手动调用了 otherSet()
	
	mouseSet : pub_nothing,						// 手动设置为 mouse 状态，可传入 temporary 参数，不传则默认是 true，也就是设置状态是临时的，传入 false 则永久性进入 mouse 状态，得再次调用 mouseSet() | touchSet() | otherSet() 才能恢复继续监听
	touchSet : pub_nothing,						// 手动设置为 touch 状态，可传入 temporary 参数，不传则默认是 true，也就是设置状态是临时的，传入 false 则永久性进入 touch 状态，得再次调用 mouseSet() | touchSet() | otherSet() 才能恢复继续监听
	otherSet : pub_nothing,						// 手动设置为 other 状态，可传入 temporary 参数，不传则默认是 true，也就是设置状态是临时的，传入 false 则永久性进入 other 状态，得再次调用 mouseSet() | touchSet() | otherSet() 才能恢复继续监听
	
};

pub_return.mouseSet = function(temporary){
	
	if(temporary === undefined){ temporary = true };
	
	if(pub_config.mouseCallback(temporary) === false){ return };
	
	pub_return.mouse = true;
	pub_return.touch = false;
	pub_return.other = false;
	
	switchTargetClass('mouse');
	toggleEventListener(temporary);
	
};

pub_return.touchSet = function(temporary){
	
	if(temporary === undefined){ temporary = true };
	
	if(pub_config.touchCallback(temporary) === false){ return };
	
	pub_return.mouse = false;
	pub_return.touch = true;
	pub_return.other = false;
	
	switchTargetClass('touch');
	toggleEventListener(temporary);
	
};

pub_return.otherSet = function(temporary){
	
	if(temporary === undefined){ temporary = true };
	
	if(pub_config.otherCallback(temporary) === false){ return };
	
	pub_return.mouse = false;
	pub_return.touch = false;
	pub_return.other = true;
	
	switchTargetClass('other');
	toggleEventListener(temporary);
	
};



// ---------------------------------------------------------------------------------------------
// 添加 existClass 类名
if(pub_config.classTarget !== null && pub_config.existClass !== ''){ pub_config.classTarget.classList.add(pub_config.existClass) };

// 初始化状态设置
if(('ontouchstart' in pub_doc) === true){ pub_return.touchSet() }else{ pub_return.mouseSet() };

// 返回对象
return pub_global.xj[pub_keyword+'Return'][pub_version] = pub_return;



})); // 插件结束


