import { NextResponse } from "next/server";

const SCRIPT = `(function(){
var q=document.querySelectorAll("[data-complianceforge]");
if(!q.length)return;
var b=(document.currentScript&&document.currentScript.src||"").replace(/\\/widget\\.js(?:\\?.*)?$/,"");
function go(el){
var id=el.getAttribute("data-complianceforge");
if(!id)return;
fetch(b+"/"+encodeURIComponent(id),{credentials:"omit",mode:"cors"})
.then(function(r){return r.ok?r.json():Promise.reject()})
.then(function(d){
if(!d)return;
var n=d.complianceScore;
if(typeof n!=="number")return;
el.textContent="";
var w=document.createElement("span");
w.style.cssText="display:inline-flex;align-items:center;gap:6px;font:600 12px system-ui,-apple-system,sans-serif;padding:5px 12px;border-radius:9999px;background:#0f172a;color:#e2e8f0;border:1px solid #334155";
var ck=document.createElement("span");
ck.style.color="#34d399";
ck.textContent="\\u2713";
var lb=document.createElement("span");
lb.textContent="EU AI Act Compliant";
var sc=document.createElement("span");
sc.style.cssText="opacity:.9;font-variant-numeric:tabular-nums";
sc.textContent=String(n);
w.appendChild(ck);w.appendChild(lb);w.appendChild(sc);
el.appendChild(w);
}).catch(function(){});
}
for(var i=0;i<q.length;i++)go(q[i]);
})();`;

export async function GET() {
  return new NextResponse(SCRIPT, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
