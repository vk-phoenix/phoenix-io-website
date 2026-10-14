(function(){
  var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  var nav=document.getElementById("mainnav"), btn=document.getElementById("menuBtn");
  var page=document.querySelector("main .page");
  btn.addEventListener("click",function(){ var o=nav.classList.toggle("open"); btn.setAttribute("aria-expanded",o?"true":"false"); });

  /* hero flow field: layered contour lines drifting slowly */
  var pm={x:-999,y:-999,s:0,tx:-999,ty:-999,ts:0}; var cv=document.getElementById("flow"), cx=cv&&cv.getContext("2d"), W=0,H=0,t=0, dpr=Math.min(window.devicePixelRatio||1,2);
  function size(){ if(!cv) return; var r=cv.getBoundingClientRect(); if(!r.width) return; W=r.width;H=r.height; cv.width=W*dpr; cv.height=H*dpr; cx.setTransform(dpr,0,0,dpr,0,0); draw(); }
  function draw(){
    cx.clearRect(0,0,W,H);
    var lines=26, x0=W*.38;
    for(var i=0;i<lines;i++){
      var k=i/(lines-1);
      var g=cx.createLinearGradient(x0,0,W,0);
      var a=.05+.22*Math.sin(Math.PI*k);
      g.addColorStop(0,"rgba(180,183,255,0)");
      g.addColorStop(.45,"rgba(180,183,255,"+a.toFixed(3)+")");
      g.addColorStop(1,(i%7===3)?"rgba(255,138,92,"+(a*1.6).toFixed(3)+")":"rgba(180,183,255,"+(a*.6).toFixed(3)+")");
      cx.strokeStyle=g; cx.lineWidth=(i%7===3)?1.2:.8; cx.beginPath();
      for(var x=x0;x<=W+4;x+=6){
        var u=(x-x0)/(W-x0);
        var y=H*(.18+.66*k) + Math.sin(u*3.2+t*.6+k*2.4)*H*.07*(0.4+u) + Math.sin(u*7.1-t*.35+k*5)*H*.018; var ddx=x-pm.x, ddy=y-pm.y; y+=pm.s*Math.exp(-(ddx*ddx+ddy*ddy)/9000)*(ddy>0?18:-18);
        if(x===x0) cx.moveTo(x,y); else cx.lineTo(x,y);
      }
      cx.stroke();
    }
  }
  function loop(){ if(cv){ t+=.008; pm.x+=(pm.tx-pm.x)*.08; pm.y+=(pm.ty-pm.y)*.08; pm.s+=(pm.ts-pm.s)*.06; draw(); } requestAnimationFrame(loop); }
  window.addEventListener("resize",size);


  /* ===== motion ===== */
  if(!reduce){
    document.documentElement.classList.add("motion");
    // split headlines into words
    document.querySelectorAll(".hero h1, .pagehead h1").forEach(function(h){
      var i=0, nodes=Array.prototype.slice.call(h.childNodes);
      nodes.forEach(function(n){
        if(n.nodeType===3){
          var frag=document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function(part){
            if(!part) return;
            if(/^\s+$/.test(part)){ frag.appendChild(document.createTextNode(" ")); return; }
            var w=document.createElement("span"); w.className="w"; w.setAttribute("aria-hidden","true");
            var s=document.createElement("span"); s.textContent=part; s.style.setProperty("--i",i++); w.appendChild(s); frag.appendChild(w);
          });
          h.replaceChild(frag,n);
        } else if(n.nodeType===1 && n.tagName!=="BR"){
          var w2=document.createElement("span"); w2.className="w"; var s2=document.createElement("span"); s2.style.setProperty("--i",i++);
          h.replaceChild(w2,n); s2.appendChild(n); w2.appendChild(s2);
        }
      });
      if(!h.hasAttribute("aria-label")) h.setAttribute("aria-label",h.textContent.replace(/\s+/g," ").trim());
    });
    // rotating word
    var rot=document.querySelector(".rot"), words=["can't fail.","must scale.","stay secure.","never sleep."], wi=0;
    // Background tabs pause requestAnimationFrame but keep timers running, so
    // skip ticks while hidden and keep only the current word before each swap.
    if(rot){ setInterval(function(){
      if(document.hidden) return;
      while(rot.children.length>1) rot.removeChild(rot.firstElementChild);
      var cur=rot.firstElementChild; cur.className=""; wi=(wi+1)%words.length;
      var nx=document.createElement("span"); nx.className="wait"; nx.textContent=words[wi]; rot.appendChild(nx);
      void nx.offsetWidth; // commit the start position so the transition runs
      cur.classList.add("out"); nx.classList.remove("wait");
      setTimeout(function(){ if(cur.parentNode) cur.parentNode.removeChild(cur); },900);
    },3200); }
    // reveal targets
    var sel=".head,.m,.col,.work,.pr,.aud>a,.feature .meta,.arch,.block,.tablebox,.quiet,.side,.steps li,.filters,.btns:not(.hero .btns)";
    document.querySelectorAll(sel).forEach(function(el){
      if(el.closest(".hero")) return;
      el.classList.add("reveal");
      var sib=Array.prototype.indexOf.call(el.parentNode.children,el);
      el.style.setProperty("--d",Math.min(sib,6)*90+"ms");
    });
    document.querySelectorAll(".arch").forEach(function(a){
      a.querySelectorAll("path:not(.flow)").forEach(function(p){p.setAttribute("pathLength","1")});
      a.querySelectorAll(".n").forEach(function(n,i){n.style.setProperty("--i",i)});
    });
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add(e.target.classList.contains("section")?"lit":"in"); if(e.target.classList.contains("m")) countUp(e.target); io.unobserve(e.target);} });
    },{rootMargin:"0px 0px -5% 0px",threshold:0});
    function countUp(el){
      var n=el.querySelector(".n"); if(!n||n.dataset.done) return; n.dataset.done=1;
      var tn=Array.prototype.find.call(n.childNodes,function(c){return c.nodeType===3&&/\d/.test(c.textContent)}); if(!tn) return;
      var raw=tn.textContent, m=raw.match(/[\d,]+/); if(!m) return; var target=parseInt(m[0].replace(/,/g,""),10); if(target<10) return;
      var t0=null, dur=1400;
      function step(ts){ if(!t0) t0=ts; var p=Math.min(1,(ts-t0)/dur), e=1-Math.pow(1-p,3), v=Math.round(target*e);
        tn.textContent=raw.replace(m[0], v.toLocaleString("en-US")); if(p<1) requestAnimationFrame(step); else tn.textContent=raw; }
      requestAnimationFrame(step);
    }
    window.__motion=function(pg){
      pg.classList.remove("enter"); void pg.offsetWidth; pg.classList.add("enter");
      pg.querySelectorAll(".reveal").forEach(function(el){ io.observe(el); });
      pg.querySelectorAll(".section").forEach(function(s){ s.classList.remove("lit"); io.observe(s); });
    };
    // header shadow on scroll
    var hd=document.querySelector("header.site");
    window.addEventListener("scroll",function(){ hd.classList.toggle("scrolled",window.scrollY>12); },{passive:true});
    // hero pointer: glow + flow bend
    var hero=document.querySelector(".hero");
    if(hero) hero.addEventListener("pointermove",function(e){
      var r=hero.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top;
      hero.style.setProperty("--mx",x+"px"); hero.style.setProperty("--my",y+"px");
      pm.tx=x; pm.ty=y; pm.ts=1;
    });
    if(hero) hero.addEventListener("pointerleave",function(){ pm.ts=0; });
    // audience spotlight
    document.querySelectorAll(".aud>a").forEach(function(a){ a.addEventListener("pointermove",function(e){ var r=a.getBoundingClientRect(); a.style.setProperty("--px",(e.clientX-r.left)+"px"); a.style.setProperty("--py",(e.clientY-r.top)+"px"); }); });
  }
  size();
  if(page&&window.__motion) window.__motion(page);
  if(!reduce) requestAnimationFrame(loop);

  var toast=document.getElementById("toast"), tt;
  function say(msg){ toast.textContent=msg; toast.hidden=false; clearTimeout(tt); tt=setTimeout(function(){toast.hidden=true},3200); }
  document.querySelectorAll("[data-toast]").forEach(function(el){ el.addEventListener("click",function(e){ e.preventDefault(); say(el.dataset.toast); }); });
  document.querySelectorAll(".copy").forEach(function(b){ b.addEventListener("click",function(){ var v=b.dataset.copy;
    try{ navigator.clipboard.writeText(v).then(function(){b.textContent="Copied"},function(){say("UEI: "+v)}); }catch(e){ say("UEI: "+v); } }); });
  document.querySelectorAll(".filters button").forEach(function(b){ b.addEventListener("click",function(){
    document.querySelectorAll(".filters button").forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});
    var f=b.dataset.f, rows=document.querySelectorAll("#pplist .work"); rows.forEach(function(c){c.classList.add("fade")}); setTimeout(function(){ rows.forEach(function(c){ c.hidden=!(f==="all"||c.dataset.c.split(" ").indexOf(f)>=0); c.classList.add("in"); requestAnimationFrame(function(){c.classList.remove("fade")}); }); },reduce?0:220); }); });
  var form=document.getElementById("cform");
  if(form) form.addEventListener("submit",function(e){
    e.preventDefault();
    var msg=document.getElementById("formmsg"), sb=form.querySelector("button[type=submit]");
    if(!form.checkValidity()){ form.reportValidity(); return; }
    msg.className="formmsg"; msg.textContent="Sending…"; sb.disabled=true;
    fetch(form.action,{method:"POST",body:new FormData(form),headers:{"Accept":"application/json"}})
      .then(function(r){ return r.json().catch(function(){return {}}).then(function(d){ return {ok:r.ok,d:d}; }); })
      .then(function(res){
        if(res.ok){ form.reset(); msg.className="formmsg ok"; msg.textContent="Thank you. Your message was sent, and we respond within two business days."; }
        else { msg.textContent=(res.d&&res.d.error)||"Your message could not be sent. Please email info@phoenixio.co."; }
      })
      .catch(function(){ msg.textContent="Your message could not be sent. Please email info@phoenixio.co."; })
      .then(function(){ sb.disabled=false; if(window.turnstile) try{ turnstile.reset(); }catch(_){} });
  });
})();
