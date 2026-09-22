window.SplatWorld=async function(canvas,b64,opts){
  opts=opts||{};
  const gl=canvas.getContext('webgl2',{antialias:false,premultipliedAlpha:true,alpha:true});
  if(!gl)throw new Error('no webgl2');
  const bin=typeof b64==='string'?Uint8Array.from(atob(b64),c=>c.charCodeAt(0)):b64;
  const ds=new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip')));
  const buf=new Uint8Array(await ds.arrayBuffer());
  const dv=new DataView(buf.buffer);let n=dv.getUint32(0,true);const fb=buf[4];let o=5;
  const pos=buf.subarray(o,o+n*9);o+=n*9;const al=buf.subarray(o,o+n);o+=n;const col=buf.subarray(o,o+n*3);o+=n*3;
  const sc=buf.subarray(o,o+n*3);o+=n*3;const rot=buf.subarray(o,o+n*3);
  const step=opts.decimate||1;const N=Math.floor(n/step);
  const TW=2048,TH=Math.ceil(N/TW);
  const cenA=new Float32Array(TW*TH*4),covA=new Float32Array(TW*TH*4),covB=new Float32Array(TW*TH*4),colA=new Uint8Array(TW*TH*4);
  const cx=new Float32Array(N),cy=new Float32Array(N),cz=new Float32Array(N);
  const inv=1/(1<<fb);
  for(let k=0;k<N;k++){
    const i=k*step,p=i*9;
    let X=pos[p]|(pos[p+1]<<8)|(pos[p+2]<<16);if(X&0x800000)X-=1<<24;
    let Y=pos[p+3]|(pos[p+4]<<8)|(pos[p+5]<<16);if(Y&0x800000)Y-=1<<24;
    let Z=pos[p+6]|(pos[p+7]<<8)|(pos[p+8]<<16);if(Z&0x800000)Z-=1<<24;
    const x=X*inv,y=Y*inv,z=Z*inv;cx[k]=x;cy[k]=y;cz[k]=z;
    cenA[k*4]=x;cenA[k*4+1]=y;cenA[k*4+2]=z;cenA[k*4+3]=al[i]/255;
    const sx=Math.exp(sc[i*3]/16-10),sy=Math.exp(sc[i*3+1]/16-10),sz=Math.exp(sc[i*3+2]/16-10);
    let qx=rot[i*3]/127.5-1,qy=rot[i*3+1]/127.5-1,qz=rot[i*3+2]/127.5-1;const qw=Math.sqrt(Math.max(0,1-qx*qx-qy*qy-qz*qz));
    const r00=1-2*(qy*qy+qz*qz),r01=2*(qx*qy-qw*qz),r02=2*(qx*qz+qw*qy);
    const r10=2*(qx*qy+qw*qz),r11=1-2*(qx*qx+qz*qz),r12=2*(qy*qz-qw*qx);
    const r20=2*(qx*qz-qw*qy),r21=2*(qy*qz+qw*qx),r22=1-2*(qx*qx+qy*qy);
    const m00=r00*sx,m01=r01*sy,m02=r02*sz,m10=r10*sx,m11=r11*sy,m12=r12*sz,m20=r20*sx,m21=r21*sy,m22=r22*sz;
    covA[k*4]=m00*m00+m01*m01+m02*m02;covA[k*4+1]=m00*m10+m01*m11+m02*m12;covA[k*4+2]=m00*m20+m01*m21+m02*m22;covA[k*4+3]=m10*m10+m11*m11+m12*m12;
    covB[k*4]=m10*m20+m11*m21+m12*m22;covB[k*4+1]=m20*m20+m21*m21+m22*m22;
    for(let c=0;c<3;c++){const v=.5+.282095*((col[i*3+c]/255-.5)/.15);colA[k*4+c]=Math.max(0,Math.min(255,v*255));}
    colA[k*4+3]=255;
  }
  const mkTex=(data,internal,format,type)=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D,0,internal,TW,TH,0,format,type,data);return t;};
  const tCen=mkTex(cenA,gl.RGBA32F,gl.RGBA,gl.FLOAT),tCovA=mkTex(covA,gl.RGBA32F,gl.RGBA,gl.FLOAT),tCovB=mkTex(covB,gl.RGBA32F,gl.RGBA,gl.FLOAT),tCol=mkTex(colA,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE);
  const tPrint=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tPrint);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([240,238,230,255]));
  const vs=`#version 300 es
precision highp float;precision highp int;
uniform sampler2D uCen,uCovA,uCovB,uCol,uPrint,uPhoto;
uniform mat4 uProj,uView,uPrintView;
uniform vec2 uFocal,uViewport,uPrintTan;
uniform float uPrintMix,uFade,uTime,uDrift,uPhotoOn;
uniform mat4 uPhotoView;uniform vec2 uPhotoTan,uPhotoCull;
uniform vec3 uPaper,uRef;
in vec2 aPos;in uint aIndex;
out vec4 vColor;out vec2 vPos;
float hh(float n){return fract(sin(n*12.9898)*43758.5453);}
void main(){
  ivec2 tc=ivec2(int(aIndex)%2048,int(aIndex)/2048);
  vec4 cen=texelFetch(uCen,tc,0);
  vec3 c=cen.xyz;
  float sd=hh(float(aIndex));
  c+=uDrift*vec3(sin(sd*91.+uTime*.4),cos(sd*57.+uTime*.35)-.4,sin(sd*23.+uTime*.3))*(.4+length(c)*.08);
  vec4 cam=uView*vec4(c,1.);
  vec4 p2=uProj*cam;
  float clip=1.2*p2.w;
  if(cam.z<.05||p2.x<-clip||p2.x>clip||p2.y<-clip||p2.y>clip){gl_Position=vec4(0.,0.,2.,1.);return;}
  vec4 ca=texelFetch(uCovA,tc,0),cb=texelFetch(uCovB,tc,0);
  mat3 Vrk=mat3(ca.x,ca.y,ca.z, ca.y,ca.w,cb.x, ca.z,cb.x,cb.y);
  mat3 J=mat3(uFocal.x/cam.z,0.,-(uFocal.x*cam.x)/(cam.z*cam.z), 0.,-uFocal.y/cam.z,(uFocal.y*cam.y)/(cam.z*cam.z), 0.,0.,0.);
  mat3 T=transpose(mat3(uView))*J;
  mat3 cov2d=transpose(T)*Vrk*T;
  cov2d[0][0]+=.3;cov2d[1][1]+=.3;
  float mid=(cov2d[0][0]+cov2d[1][1])/2.;
  float rad=length(vec2((cov2d[0][0]-cov2d[1][1])/2.,cov2d[0][1]));
  float l1=mid+rad,l2=mid-rad;
  if(l2<0.){gl_Position=vec4(0.,0.,2.,1.);return;}
  vec2 dvec=normalize(vec2(cov2d[0][1],l1-cov2d[0][0]));
  vec2 maj=min(sqrt(2.*l1),1024.)*dvec,mnr=min(sqrt(2.*l2),1024.)*vec2(dvec.y,-dvec.x);
  vec3 wc=texelFetch(uCol,tc,0).rgb;
  vec4 pc=uPrintView*vec4(cen.xyz,1.);
  vec2 puv=vec2(.5)+(pc.xy/max(pc.z,.001))/(2.*uPrintTan);
  vec3 prc=clamp(textureLod(uPrint,puv,0.).rgb/uRef,0.,1.)*uPaper;
  vec2 pe=min(puv,1.-puv);
  float inside=smoothstep(0.,.06,min(pe.x*1.5,pe.y))*step(.05,pc.z);
  vec3 outc=mix(wc,mix(uPaper,prc,inside),uPrintMix);
  float a=cen.w;
  a=mix(a,min(1.,a*1.6),uPrintMix*inside);
  a*=mix(1.,inside,uPrintMix)*uFade;
  if(uPhotoOn>0.){vec4 hc=uPhotoView*vec4(cen.xyz,1.);vec2 hu=(hc.xy/max(hc.z,.001))/uPhotoTan;vec2 he=1.-abs(hu);
    float hin=smoothstep(0.,.08,min(he.x,he.y))*step(.05,hc.z)*textureLod(uPhoto,vec2(.5)+hu*.5,0.).a;float far=smoothstep(uPhotoCull.x,uPhotoCull.y,length(cen.xz));a*=1.-hin*far*uPhotoOn;}
  vColor=vec4(outc,a);
  vPos=aPos;
  vec2 vC=p2.xy/p2.w;
  gl_Position=vec4(vC+2.*(aPos.x*maj+aPos.y*mnr)/uViewport,0.,1.);
}`;
  const fs=`#version 300 es
precision highp float;
in vec4 vColor;in vec2 vPos;out vec4 o;
void main(){float A=-dot(vPos,vPos);if(A<-4.)discard;float B=exp(A)*vColor.a;o=vec4(B*vColor.rgb,B);}`;
  const sh=(t,s)=>{const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(x));return x;};
  const prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,vs));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(prog));
  const bgProg=gl.createProgram();
  gl.attachShader(bgProg,sh(gl.VERTEX_SHADER,`#version 300 es
out vec2 vN;void main(){vec2 p=vec2(float((gl_VertexID&1)<<2)-1.,float((gl_VertexID&2)<<1)-1.);vN=p;gl_Position=vec4(p,0.,1.);}`));
  gl.attachShader(bgProg,sh(gl.FRAGMENT_SHADER,`#version 300 es
precision highp float;in vec2 vN;out vec4 o;
uniform sampler2D uPano,uPrint,uPhoto;uniform mat3 uPhotoBasis;uniform vec2 uPhotoTan;uniform float uPhotoOn;uniform mat3 uBasis,uPrintBasis;uniform vec2 uTanXY,uOff,uPrintTan;uniform float uPrintMix,uFade,uTime;uniform vec3 uPaper,uRef;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return .5*vn(p)+.3*vn(p*2.1)+.2*vn(p*4.6);}
void main(){
  vec2 q=(vN-uOff)*uTanXY; q.y=-q.y;
  vec3 dir=normalize(uBasis*vec3(q,1.));
  float lon=atan(dir.x,dir.z),lat=asin(clamp(-dir.y,-1.,1.));
  vec3 pano=texture(uPano,vec2(lon/6.2831853+.5,.5-lat/3.14159265)).rgb;
  vec3 pc=transpose(uPrintBasis)*dir;
  vec2 puv=vec2(.5)+(pc.xy/max(pc.z,.001))/(2.*uPrintTan);
  vec2 pe=min(puv,1.-puv);
  float inside=smoothstep(0.,.06,min(pe.x*1.5,pe.y))*step(.05,pc.z);
  vec3 prc=clamp(textureLod(uPrint,puv,0.).rgb/uRef,0.,1.)*uPaper;
  if(uPhotoOn>0.){vec3 hc=transpose(uPhotoBasis)*dir;vec2 hu=(hc.xy/max(hc.z,.001))/uPhotoTan;vec2 he=1.-abs(hu);
    float hin=smoothstep(0.,.1,min(he.x,he.y))*step(.05,hc.z)*uPhotoOn;vec4 ph=texture(uPhoto,vec2(.5)+hu*.5);pano=mix(pano,ph.rgb,hin*ph.a);}
  vec3 c=mix(pano,mix(uPaper,prc,inside),uPrintMix);
  float n=fbm(vN*vec2(3.2,2.2)+vec2(uTime*.03,0.));
  float a=smoothstep(0.,.18,uFade*1.25-n*.25);
  o=vec4(c*a,a);
}`));
  gl.linkProgram(bgProg);if(!gl.getProgramParameter(bgProg,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(bgProg));
  const BU=n=>gl.getUniformLocation(bgProg,n);const bgVao=gl.createVertexArray();
  const tPano=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tPano);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([236,232,222,255]));
  const tPhoto=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tPhoto);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([236,232,222,255]));let photo=null;
  gl.useProgram(bgProg);gl.uniform1i(BU('uPhoto'),6);gl.uniform1i(BU('uPano'),5);gl.uniform1i(BU('uPrint'),4);gl.uniform3f(BU('uPaper'),.969,.965,.949);gl.uniform3f(BU('uRef'),.831,.831,.796);
  gl.useProgram(prog);
  const U=name=>gl.getUniformLocation(prog,name);
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  const qb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,qb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-2,-2,2,-2,2,2,-2,2]),gl.STATIC_DRAW);
  const aPos=gl.getAttribLocation(prog,'aPos');gl.enableVertexAttribArray(aPos);gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);
  const ib=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,ib);const order=new Uint32Array(N);gl.bufferData(gl.ARRAY_BUFFER,order,gl.DYNAMIC_DRAW);
  const aIdx=gl.getAttribLocation(prog,'aIndex');gl.enableVertexAttribArray(aIdx);gl.vertexAttribIPointer(aIdx,1,gl.UNSIGNED_INT,0,0);gl.vertexAttribDivisor(aIdx,1);
  const eb=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,eb);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint8Array([0,1,2,0,2,3]),gl.STATIC_DRAW);
  [['uCen',tCen,0],['uCovA',tCovA,1],['uCovB',tCovB,2],['uCol',tCol,3],['uPrint',tPrint,4],['uPhoto',tPhoto,6]].forEach(([nm,t,u])=>{gl.activeTexture(gl.TEXTURE0+u);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(U(nm),u);});
  gl.uniform3f(U('uPaper'),.969,.965,.949);gl.uniform3f(U('uRef'),.831,.831,.796);
  gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.ONE_MINUS_DST_ALPHA,gl.ONE,gl.ONE_MINUS_DST_ALPHA,gl.ONE);
  /* sorting: counting sort on camera-space depth, nearest first */
  const depth=new Int32Array(N),counts=new Uint32Array(65536),starts=new Uint32Array(65536);
  let lastSortKey='';
  function sort(view){
    const f0=view[2],f1=view[6],f2=view[10],f3=view[14];
    let mn=1e9,mx=-1e9;
    for(let i=0;i<N;i++){const d=f0*cx[i]+f1*cy[i]+f2*cz[i]+f3;depth[i]=d*1000|0;if(depth[i]<mn)mn=depth[i];if(depth[i]>mx)mx=depth[i];}
    const s=65535/(mx-mn||1);counts.fill(0);
    for(let i=0;i<N;i++){depth[i]=((depth[i]-mn)*s)|0;counts[depth[i]]++;}
    starts[0]=0;for(let i=1;i<65536;i++)starts[i]=starts[i-1]+counts[i-1];
    for(let i=0;i<N;i++)order[starts[depth[i]]++]=i;
    gl.bindBuffer(gl.ARRAY_BUFFER,ib);gl.bufferSubData(gl.ARRAY_BUFFER,0,order);
  }
  function lookMatrix(c,yaw,pitch){
    const cp=Math.cos(pitch),f=[Math.sin(yaw)*cp,-Math.sin(pitch),Math.cos(yaw)*cp];
    let r=[f[2],0,-f[0]];const rl=Math.hypot(r[0],r[2])||1;r=[r[0]/rl,0,r[2]/rl];
    const d=[f[1]*r[2]-f[2]*r[1],f[2]*r[0]-f[0]*r[2],f[0]*r[1]-f[1]*r[0]];
    const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
    return new Float32Array([r[0],d[0],f[0],0, r[1],d[1],f[1],0, r[2],d[2],f[2],0, -dot(r,c),-dot(d,c),-dot(f,c),1]);
  }
  return {
    count:N,
    dispose(){[tCen,tCovA,tCovB,tCol,tPrint,tPano,tPhoto].forEach(t=>gl.deleteTexture(t));[qb,ib,eb].forEach(b=>gl.deleteBuffer(b));gl.deleteVertexArray(vao);gl.deleteVertexArray(bgVao);gl.deleteProgram(prog);gl.deleteProgram(bgProg);},
    /* photo:{img,yaw,pitch,tanV,aspect,cull:[d0,d1]} — a sharp backdrop for distant scenery (the hillside), drawn by view direction */
    setPhoto(p){photo=p;gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,tPhoto);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,p.img);gl.generateMipmap(gl.TEXTURE_2D);},
    setPano(img){gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,tPano);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);},
    setPrint(img){gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,tPrint);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);},
    /* cam:{pos,yaw,pitch,tanV (half vertical fov tangent), offX,offY (NDC shift)}, print:{pos,yaw,pitch,tanV,aspect} */
    render(cam,print,u){
      const w=canvas.width,h=canvas.height;gl.viewport(0,0,w,h);
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      if(u.fade<=0.001&&!(u.bgFade>0.001))return;
      const fy=h/(2*cam.tanV),fx=fy;
      const zn=.05,zf=400;
      const proj=new Float32Array([2*fx/w,0,0,0, 0,-2*fy/h,0,0, cam.offX||0,cam.offY||0,zf/(zf-zn),1, 0,0,-(zf*zn)/(zf-zn),0]);
      const view=lookMatrix(cam.pos,cam.yaw,cam.pitch);
      const key=Array.from(view).map((v,i)=>(v*(i>=12?25:60)).toFixed(0)).join(',');
      if(key!==lastSortKey){sort(view);lastSortKey=key;}
      gl.useProgram(prog);gl.bindVertexArray(vao);
      gl.uniformMatrix4fv(U('uProj'),false,proj);gl.uniformMatrix4fv(U('uView'),false,view);
      gl.uniformMatrix4fv(U('uPrintView'),false,lookMatrix(print.pos,print.yaw,print.pitch));
      gl.uniform2f(U('uPrintTan'),print.tanV*print.aspect,print.tanV);
      gl.uniform2f(U('uFocal'),fx,fy);gl.uniform2f(U('uViewport'),w,h);
      gl.uniform1f(U('uPrintMix'),u.printMix);gl.uniform1f(U('uFade'),u.fade);gl.uniform1f(U('uTime'),u.time||0);gl.uniform1f(U('uDrift'),u.drift||0);
      gl.uniform1f(U('uPhotoOn'),photo?1:0);if(photo){gl.uniformMatrix4fv(U('uPhotoView'),false,lookMatrix([0,0,0],photo.yaw,photo.pitch));gl.uniform2f(U('uPhotoTan'),photo.tanV*photo.aspect,photo.tanV);gl.uniform2f(U('uPhotoCull'),photo.cull[0],photo.cull[1]);}
      gl.drawElementsInstanced(gl.TRIANGLES,6,gl.UNSIGNED_BYTE,0,N);
      const basisOf=(yaw,pitch)=>{const m=lookMatrix([0,0,0],yaw,pitch);return new Float32Array([m[0],m[4],m[8], m[1],m[5],m[9], m[2],m[6],m[10]]);};
      gl.useProgram(bgProg);gl.bindVertexArray(bgVao);
      gl.uniformMatrix3fv(BU('uBasis'),false,basisOf(cam.yaw,cam.pitch));gl.uniformMatrix3fv(BU('uPrintBasis'),false,basisOf(print.yaw,print.pitch));
      gl.uniform2f(BU('uTanXY'),cam.tanV*w/h,cam.tanV);gl.uniform2f(BU('uOff'),cam.offX||0,cam.offY||0);gl.uniform2f(BU('uPrintTan'),print.tanV*print.aspect,print.tanV);
      gl.uniform1f(BU('uPrintMix'),u.printMix);gl.uniform1f(BU('uFade'),u.bgFade==null?u.fade:u.bgFade);gl.uniform1f(BU('uTime'),u.time||0);
      gl.uniform1f(BU('uPhotoOn'),photo?1:0);if(photo){gl.uniformMatrix3fv(BU('uPhotoBasis'),false,basisOf(photo.yaw,photo.pitch));gl.uniform2f(BU('uPhotoTan'),photo.tanV*photo.aspect,photo.tanV);}
      gl.drawArrays(gl.TRIANGLES,0,3);
    }
  };
};
