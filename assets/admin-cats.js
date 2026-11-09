(()=>{
"use strict";
const KEY="littlePawsData";
const labels={NOT_ADOPTED:"Chưa nhận nuôi",PENDING_ADOPTION:"Đang chờ nhận nuôi",ADOPTED:"Đã nhận nuôi",NOT_READY:"Chưa sẵn sàng nhận nuôi"};
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function load(){let d={};try{d=JSON.parse(localStorage.getItem(KEY)||"{}")}catch{}d.pets=Array.isArray(d.pets)?d.pets:[];d.statusHistory=Array.isArray(d.statusHistory)?d.statusHistory:[];let max=Number(d.catIdSequence)||0;for(const p of d.pets){const m=/^ID_C(\d+)$/.exec(p.id||"");if(m)max=Math.max(max,Number(m[1]));p.status=p.status||"NOT_ADOPTED"}d.catIdSequence=max;return d}
function save(d){localStorage.setItem(KEY,JSON.stringify(d))}
let editing=null;
function render(){
 const d=load(),q=$("search").value.trim().toLocaleLowerCase("vi"),filter=$("statusFilter").value;
 const counts=Object.fromEntries(Object.keys(labels).map(k=>[k,d.pets.filter(p=>p.status===k).length]));
 let summary=$("statusSummary");if(!summary){summary=document.createElement("div");summary.id="statusSummary";summary.className="admin-tools";$("cats").closest(".admin-table-wrap").before(summary)}
 summary.innerHTML=Object.entries(labels).map(([k,v])=>'<span class="status-pill">'+esc(v)+': '+counts[k]+'</span>').join(" ");
 const list=d.pets.filter(p=>(!filter||p.status===filter)&&(!q||(p.name||"").toLocaleLowerCase("vi").includes(q)||(p.id||"").toLowerCase().includes(q)));
 $("cats").innerHTML=list.map(p=>'<tr><td><img class="admin-cat-img" src="'+esc(p.image||"")+'" alt=""></td><td><strong>'+esc(p.name)+'</strong><br><small>'+esc(p.id)+'</small></td><td>'+esc(p.age||"—")+'</td><td>'+esc(p.gender||"—")+'</td><td><span class="status-pill">'+esc(labels[p.status]||"Chưa nhận nuôi")+'</span></td><td><button class="admin-action primary" data-edit="'+esc(p.id)+'">Sửa</button></td></tr>').join("");
 $("empty").hidden=list.length!==0;
 $("history").innerHTML=d.statusHistory.slice().reverse().slice(0,50).map(h=>'<li><strong>'+esc(h.catName)+'</strong> ('+esc(h.catId)+'): '+esc(labels[h.from]||h.from)+' → <strong>'+esc(labels[h.to]||h.to)+'</strong><br><small>'+new Date(h.at).toLocaleString("vi-VN")+'</small></li>').join("")||"<li>Chưa có thay đổi trạng thái.</li>";
}
function openEditor(p){editing=p?.id||null;$("catForm").reset();$("formTitle").textContent=p?"Chỉnh sửa hồ sơ":"Thêm hồ sơ mèo";$("catIdNote").textContent=p?"Mã hồ sơ: "+p.id:"ID sẽ được tự động cấp khi lưu.";const f=$("catForm").elements;if(p)for(const k of ["name","image","age","gender","health","vaccinated","personality","care","description","status"])if(f[k])f[k].value=p[k]|| (k==="status"?"NOT_ADOPTED":"");$("editor").showModal();f.name.focus()}
$("addCat").addEventListener("click",()=>openEditor(null));
$("cats").addEventListener("click",e=>{const b=e.target.closest("[data-edit]");if(!b)return;const p=load().pets.find(x=>x.id===b.dataset.edit);if(p)openEditor(p)});
$("search").addEventListener("input",render);$("statusFilter").addEventListener("change",render);
$("catForm").addEventListener("submit",e=>{
 if(e.submitter?.value!=="save")return;e.preventDefault();
 const f=e.currentTarget.elements,name=f.name.value.trim();if(!name){f.name.focus();return}
 const d=load(),values={};for(const k of ["name","image","age","gender","health","vaccinated","personality","care","description","status"])values[k]=(f[k].value||"").trim();
 let p=d.pets.find(x=>x.id===editing);
 if(p){const before=p.status||"NOT_ADOPTED";Object.assign(p,values);if(before!==p.status)d.statusHistory.push({catId:p.id,catName:p.name,from:before,to:p.status,at:new Date().toISOString()})}
 else{d.catIdSequence+=1;const id="ID_C"+String(d.catIdSequence).padStart(4,"0");p={id,...values,images:[]};d.pets.push(p);if(p.status!=="NOT_ADOPTED")d.statusHistory.push({catId:id,catName:p.name,from:"NOT_ADOPTED",to:p.status,at:new Date().toISOString()})}
 save(d);$("editor").close();render();
});
render();
})();