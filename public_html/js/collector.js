// collector.js

// endpoint for json-server (posts array in db.json)
var ENDPOINT = "/json/posts";

// save/load queue from localStorage
function loadQueue() {
  try { return JSON.parse(localStorage.getItem("queue")) || []; }
  catch(e){ return []; }
}
function saveQueue(arr) {
  localStorage.setItem("queue", JSON.stringify(arr));
}
function addEvent(ev) {
  var q = loadQueue();
  q.push(ev);
  saveQueue(q);
}

// send data to server
function sendNow(data) {
  return fetch(ENDPOINT, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(data),
    keepalive:true
  }).then(r=>r.ok).catch(()=>false);
}

// flush queue
function flushQueue() {
  var q = loadQueue();
  if(!q.length) return;
  (async function(){
    for(var i=0;i<q.length;i++){
      var ok = await sendNow(q[i]);
      if(!ok) return;
    }
    saveQueue([]);
  })();
}

// static data
function collectStatic() {
  addEvent({
    kind:"static",
    ua:navigator.userAgent,
    lang:navigator.language,
    cookies:navigator.cookieEnabled,
    js:true,
    screen:{w:screen.width,h:screen.height},
    window:{iw:innerWidth,ih:innerHeight},
    href:location.href,
    ts:Date.now()
  });
}

// performance data
function collectPerf() {
  var t = performance.timing;
  addEvent({
    kind:"performance",
    start:t.navigationStart,
    end:t.loadEventEnd,
    total:t.loadEventEnd - t.navigationStart,
    ts:Date.now(),
    href:location.href
  });
}

// mouse
window.addEventListener("mousemove",function(e){
  addEvent({kind:"activity",type:"move",x:e.clientX,y:e.clientY,ts:Date.now(),href:location.href});
});
window.addEventListener("click",function(e){
  addEvent({kind:"activity",type:"click",btn:e.button,x:e.clientX,y:e.clientY,ts:Date.now(),href:location.href});
});
window.addEventListener("scroll",function(){
  addEvent({kind:"activity",type:"scroll",x:scrollX,y:scrollY,ts:Date.now(),href:location.href});
});

// keys
window.addEventListener("keydown",function(e){
  addEvent({kind:"activity",type:"keydown",key:e.key,ts:Date.now(),href:location.href});
});
window.addEventListener("keyup",function(e){
  addEvent({kind:"activity",type:"keyup",key:e.key,ts:Date.now(),href:location.href});
});

// errors
window.addEventListener("error",function(e){
  addEvent({kind:"activity",type:"error",msg:e.message,ts:Date.now(),href:location.href});
});

// enter/leave
function pageEnter(){
  addEvent({kind:"activity",type:"enter",ts:Date.now(),href:location.href});
}
function pageLeave(){
  addEvent({kind:"activity",type:"leave",ts:Date.now(),href:location.href});
  flushQueue();
}
window.addEventListener("beforeunload",pageLeave);

// run
function start(){
  collectStatic();
  if(document.readyState==="complete") collectPerf();
  else window.addEventListener("load",collectPerf,{once:true});
  pageEnter();
  setInterval(flushQueue,5000);
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
else start();

