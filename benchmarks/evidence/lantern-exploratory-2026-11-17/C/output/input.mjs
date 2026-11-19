// Shared keyboard and pointer input. Event targets are injected for testability.
export class CourierInput {
 constructor({win,doc,stick,knob,canMove,onInteract,onLantern,onPause,onSuspend,onGesture=()=>{}}){
  this.keys=new Set();this.touch={x:0,z:0};this.pointer=null;this.stick=stick;this.knob=knob;this.listeners=[];
  const listen=(target,type,fn)=>{target.addEventListener(type,fn);this.listeners.push(()=>target.removeEventListener(type,fn))};
  listen(win,'keydown',e=>{if(e.code==='Space'&&['BUTTON','INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return;if(canMove()&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='Escape'){this.clear();onPause();return}if(!canMove())return;this.keys.add(e.code);if(e.code==='Space'){onGesture();onLantern()}if(e.code==='KeyE'){onGesture();onInteract()}});
  listen(win,'keyup',e=>this.keys.delete(e.code));
  listen(win,'blur',()=>{this.clear();onSuspend()});
  listen(doc,'visibilitychange',()=>{if(doc.hidden){this.clear();onSuspend()}});
  listen(win,'pointercancel',()=>this.clear());
  const move=e=>{if(e.pointerId!==this.pointer)return;const r=stick.getBoundingClientRect();let x=e.clientX-r.left-r.width/2,z=e.clientY-r.top-r.height/2,len=Math.hypot(x,z),max=35;if(len>max){x*=max/len;z*=max/len}this.touch={x:Math.abs(x)<4?0:x/max,z:Math.abs(z)<4?0:z/max};knob.style.transform=`translate(${x}px,${z}px)`};
  listen(stick,'pointerdown',e=>{if(!canMove()||this.pointer!==null)return;this.pointer=e.pointerId;stick.setPointerCapture(e.pointerId);move(e);onGesture()});
  listen(stick,'pointermove',move);
  listen(stick,'pointerup',e=>{if(e.pointerId===this.pointer)this.clearTouch()});
  listen(stick,'lostpointercapture',e=>{if(e.pointerId===this.pointer)this.clearTouch()});
 }
 clearTouch(){this.touch={x:0,z:0};this.pointer=null;this.knob.style.transform=''}
 clear(){this.keys.clear();this.clearTouch()}
 vector(){return {x:(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0)+this.touch.x,z:(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)+this.touch.z}}
 dispose(){this.clear();this.listeners.forEach(remove=>remove());this.listeners=[]}
}
