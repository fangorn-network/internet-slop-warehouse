// Original CC0 procedural texture synthesis. No photographs or external inputs.
import {deflateSync} from 'node:zlib';import {writeFileSync,mkdirSync} from 'node:fs';
let state=3291;const r=()=>((state=Math.imul(state,1664525)+1013904223>>>0)/4294967296);
function png(w,h,pixels){const crc=b=>{let c=0xffffffff;for(const v of b){c^=v;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};const chunk=(type,data)=>{const t=Buffer.from(type),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([len,t,data,sum]);};const header=Buffer.alloc(13);header.writeUInt32BE(w);header.writeUInt32BE(h,4);header[8]=8;header[9]=6;const raw=Buffer.alloc((w*4+1)*h);for(let y=0;y<h;y++)Buffer.from(pixels.buffer,y*w*4,w*4).copy(raw,y*(w*4+1)+1);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
const W=512,H=512,needle=new Uint8Array(W*H*4);
function dot(x,y,radius,color){for(let yy=Math.max(0,Math.floor(y-radius-1));yy<Math.min(H,y+radius+1);yy++)for(let xx=Math.max(0,Math.floor(x-radius-1));xx<Math.min(W,x+radius+1);xx++){const alpha=Math.min(1,Math.max(0,radius+.5-Math.hypot(xx-x,yy-y)));if(!alpha)continue;const i=(yy*W+xx)*4,a=alpha*(color[3]??255)/255,old=needle[i+3]/255,out=a+old*(1-a);for(let k=0;k<3;k++)needle[i+k]=(color[k]*a+needle[i+k]*old*(1-a))/out;needle[i+3]=out*255;}}
function line(x,y,xx,yy,width,color){const n=Math.ceil(Math.hypot(xx-x,yy-y));for(let i=0;i<=n;i++)dot(x+(xx-x)*i/n,y+(yy-y)*i/n,width,color);}
line(256,496,256,26,3,[74,66,47]);
const branches=[];
for(let j=0;j<23;j++){const y=470-j*18,width=(1-j/25)*205;for(const sign of [-1,1]){const x=256+sign*width,tipY=y-70-r()*35;line(256,y,x,tipY,1.6,[71,78,50]);branches.push([256,y,x,tipY]);for(let k=0;k<26;k++){const f=k/26,cx=256+(x-256)*f,cy=y+(tipY-y)*f;for(const side of [-1,1]){const length=13+r()*25,dx=(sign*.55+side*.7)*length,dy=(-.85+side*.14)*length;line(cx,cy,cx+dx,cy+dy,.7+r()*.5,[34+r()*24,62+r()*32,49+r()*25]);}}}}

mkdirSync('parts/field-station',{recursive:true});writeFileSync('parts/field-station/pine-spray.png',png(W,H,needle));console.log('Original CC0 green pine spray generated');
