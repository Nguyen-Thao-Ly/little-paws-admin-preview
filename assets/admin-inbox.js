(()=>{
"use strict";
const KEY="littlePawsData",ACTOR="LOCAL_ADMIN";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const labels={PENDING:"Chờ xử lý",REVIEWING:"Đang xem xét",APPROVED:"Đã duyệt",REJECTED:"Từ chối",COMPLETED:"Hoàn tất"};
let tab="adoption",selected=null;
function parseDate(v){if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d}
function load(){
 let d={};try{d=JSON.parse(localStorage.getItem(KEY)||"{}")}catch{}
 d.pets=Array.isArray(d.pets)?d.pets:[];d.messages=Array.isArray(d.messages)?d.messages:[];d.adoptionRequests=Array.isArray(d.adoptionRequests)?d.adoptionRequests:[];d.inboxAudit=Array.isArray(d.inboxAudit)?d.inboxAudit:[];
 d.messageIdSequence=Number(d.messageIdSequence)||0;d.requestIdSequence=Number(d.requestIdSequence)||0;
 for(const m of d.messages){const n=/^ID_M(\d+)$/.exec(m.id||"");if(n)d.messageIdSequence=Math.max(d.messageIdSequence,Number(n[1]))}
 for(const r of d.adoptionRequests){const n=/^ID_R(\d+)$/.exec(r.id||"");if(n)d.requestIdSequence=Math.max(d.requestIdSequence,Number(n[1]))}
 d.messages.forEach((m,i)=>{if(!/^ID_M\d+$/.test(m.id||""))m.id=next("M",d);m.type="contact";m.status=m.status||"UNREAD";m.createdAt=m.createdAt||parseDate(m.date)?.toISOString()||new Date().toISOString();m.deletedAt=m.deletedAt||null;m.originalCategory=m.originalCategory||"contact";m.isRead=m.status==="READ"});
 d.adoptionRequests.forEach((r,i)=>{if(!/^ID_R\d+$/.test(r.id||"")){r.legacyId=r.id||null;r.id=next("R",d)}r.status=labels[r.status]?r.status:"PENDING";r.isRead=Boolean(r.isRead);r.deletedAt=r.deletedAt||null;r.originalCategory=r.originalCategory||"adoption";r.createdAt=r.createdAt||new Date().toISOString()});
 localStorage.setItem(KEY,JSON.stringify(d));return d;
}
function next(kind,d){const key=kind==="M"?"messageIdSequence":"requestIdSequence";d[key]=(Number(d[key])||0)+1;return "ID_"+kind+String(d[key]).padStart(4,"0")}
function save(d){localStorage.setItem(KEY,JSON.stringify(d))}
function audit(d,action,item,extra={}){d.inboxAudit.push({id:"LOCAL_AUDIT_"+Date.now()+"_"+Math.random().toString(36).slice(2,7),actor:ACTOR,action,itemId:item.id,category:item.originalCategory|| (item.type==="contact"?"contact":"adoption"),at:new Date().toISOString(),...extra});save(d)}
function allItems(d){return [...d.adoptionRequests.map(x=>({...x,_kind:"adoption"})),...d.messages.map(x=>({...x,_kind:"contact"}))]}
function activeItems(d,kind){const arr=kind==="adoption"?d.adoptionRequests:d.messages;return arr.filter(x=>!x.deletedAt)}
function counts(d){return {adoption:activeItems(d,"adoption").length,contact:activeItems(d,"contact").length,trash:allItems(d).filter(x=>x.deletedAt).length,unread:allItems(d).filter(x=>!x.deletedAt&&!x.isRead).length}}
function setStatusOptions(){const s=$("statusFilter");s.innerHTML=tab==="adoption"?'<option value="">Tất cả trạng thái</option>'+Object.entries(labels).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join(""):'<option value="">Tất cả trạng thái</option><option value="UNREAD">Chưa đọc</option><option value="READ">Đã đọc</option>'; $("readFilter").hidden=tab==="trash"}
function render(){
 const d=load(),c=counts(d);$("countAdoption").textContent=c.adoption;$("countContact").textContent=c.contact;$("countTrash").textContent=c.trash;
 $("summary").innerHTML='<div class="inbox-stat"><span>Đơn nhận nuôi</span><strong>'+c.adoption+'</strong></div><div class="inbox-stat"><span>Tin nhắn liên hệ</span><strong>'+c.contact+'</strong></div><div class="inbox-stat"><span>Chưa đọc</span><strong>'+c.unread+'</strong></div><div class="inbox-stat"><span>Trong thùng rác</span><strong>'+c.trash+'</strong></div>';
 setStatusOptions();
 let list=tab==="trash"?allItems(d).filter(x=>x.deletedAt):activeItems(d,tab).map(x=>({...x,_kind:tab}));
 const q=$("search").value.trim().toLocaleLowerCase("vi"),st=$("statusFilter").value,rd=$("readFilter").value,from=$("dateFrom").value,to=$("dateTo").value;
 list=list.filter(x=>{const hay=[x.id,x.name,x.email,x.phone,x.subject,x.message,x.catId,x.catName].join(" ").toLocaleLowerCase("vi");const date=(x.createdAt||"").slice(0,10);const status=tab==="contact"?(x.isRead?"READ":"UNREAD"):x.status;return (!q||hay.includes(q))&&(!st||status===st)&&(!rd|| (x.isRead?"READ":"UNREAD")===rd)&&(!from||date>=from)&&(!to||date<=to)});
 list.sort((a,b)=>{const n=(parseDate(a.createdAt)?.getTime()||0)-(parseDate(b.createdAt)?.getTime()||0);return $("sort").value==="oldest"?n:-n});
 $("tableHead").innerHTML='<tr><th>Mã</th><th>Người gửi</th><th>Nội dung chính</th><th>Ngày gửi</th><th>Trạng thái</th><th>Thao tác</th></tr>';
 $("rows").innerHTML=list.map(x=>{const date=parseDate(x.createdAt);const snippet=(x.subject||x.message||"").replace(/\s+/g," ").slice(0,100);const state=tab==="trash"?"Đã xóa":x._kind==="contact"?(x.isRead?"Đã đọc":"Chưa đọc"):(labels[x.status]||"Chờ xử lý")+(x.isRead?" · Đã đọc":" · Chưa đọc");return '<tr><td><strong>'+esc(x.id)+'</strong><span class="inbox-sub">'+(x._kind==="adoption"?"Đơn nhận nuôi":"Liên hệ")+'</span></td><td>'+esc(x.name||"—")+'<span class="inbox-sub">'+esc(x.email||x.phone||"Không có thông tin liên hệ")+'</span></td><td>'+esc(snippet||"—")+(x.catId?'<span class="inbox-sub">'+esc(x.catName||"Mèo")+" · "+esc(x.catId)+'</span>':"")+'</td><td>'+esc(date?date.toLocaleString("vi-VN"):"—")+'</td><td><span class="inbox-pill '+(!x.isRead&&tab!=="trash"?"unread":(x.status==="COMPLETED"?"done":""))+'">'+esc(state)+'</span></td><td><button class="inbox-action primary" data-open="'+esc(x.id)+'" data-kind="'+x._kind+'">Chi tiết</button></td></tr>'}).join("");
 $("empty").hidden=list.length>0;
}
function findItem(d,id,kind){const arr=kind==="adoption"?d.adoptionRequests:d.messages;return arr.find(x=>x.id===id)}
function catInfo(d,item){return d.pets.find(p=>p.id===item.catId)||null}
function openDetail(id,kind){
 const d=load(),item=findItem(d,id,kind);if(!item)return;selected={id,kind};
 if(!item.isRead){item.isRead=true;if(kind==="contact")item.status="READ";audit(d,"MARK_READ",item)}else save(d);
 const cat=kind==="adoption"?catInfo(d,item):null;
 $("detailTitle").textContent=(kind==="adoption"?"Đơn nhận nuôi ":"Tin nhắn liên hệ ")+item.id;
 const date=parseDate(item.createdAt);
 let html='<dl class="detail-grid"><dt>Người gửi</dt><dd>'+esc(item.name||"—")+'</dd><dt>Email</dt><dd>'+esc(item.email||"—")+'</dd><dt>Số điện thoại</dt><dd>'+esc(item.phone||"—")+'</dd><dt>Thời gian</dt><dd>'+esc(date?date.toLocaleString("vi-VN"):"—")+'</dd>';
 if(kind==="contact")html+='<dt>Tiêu đề</dt><dd>'+esc(item.subject||"—")+'</dd>';
 if(kind==="adoption")html+='<dt>Mã đơn</dt><dd>'+esc(item.id)+'</dd><dt>Trạng thái đơn</dt><dd>'+esc(labels[item.status]||item.status)+'</dd>';
 html+='</dl>';
 if(kind==="adoption"){if(cat)html+='<div class="cat-ref"><img src="'+esc(cat.image||"")+'" alt=""><div><strong>'+esc(cat.name)+'</strong><br><small>'+esc(cat.id)+'</small><br><a href="adopt.html#'+encodeURIComponent(cat.id)+'" target="_blank" rel="noopener">Mở danh sách hồ sơ mèo</a></div></div>';else html+='<p class="cat-ref">Mã mèo: '+esc(item.catId||"Không chọn mèo")+' — không tìm thấy hồ sơ tương ứng trong dữ liệu hiện tại.</p>'}
 html+='<h3>Nội dung chi tiết</h3><div class="detail-message">'+esc(item.message||"Không có nội dung.")+'</div>';
 if(item.deletedAt)html+='<p><small>Đã chuyển vào thùng rác lúc '+esc(new Date(item.deletedAt).toLocaleString("vi-VN"))+' bởi '+esc(item.deletedBy||ACTOR)+'. Danh mục gốc: '+esc(item.originalCategory||kind)+'</small></p>';
 $("detailBody").innerHTML=html;
 let actions="";
 if(item.deletedAt){actions+='<button class="inbox-action primary" data-restore>Khôi phục</button><button class="inbox-action danger" data-purge>Xóa vĩnh viễn</button>'}
 else{if(kind==="contact")actions+='<button class="inbox-action" data-read-toggle>'+ (item.isRead?"Đánh dấu chưa đọc":"Đánh dấu đã đọc")+'</button>';else actions+='<label>Trạng thái đơn <select class="inbox-select-status" id="requestStatus">'+Object.entries(labels).map(([k,v])=>'<option value="'+k+'" '+(item.status===k?"selected":"")+'>'+v+'</option>').join("")+'</select></label><button class="inbox-action" data-save-status>Lưu trạng thái</button>';actions+='<button class="inbox-action danger" data-trash>Chuyển vào thùng rác</button>'}
 actions+='<button class="inbox-action" data-close>Đóng</button>';$("detailActions").innerHTML=actions;$("detail").showModal();render();
}
$("rows").addEventListener("click",e=>{const b=e.target.closest("[data-open]");if(b)openDetail(b.dataset.open,b.dataset.kind)});
$("detailActions").addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b||!selected)return;const d=load(),item=findItem(d,selected.id,selected.kind);if(!item)return;
 if(b.hasAttribute("data-close")){$("detail").close();return}
 if(b.hasAttribute("data-trash")){if(!confirm("Chuyển mục này vào Thùng rác?"))return;item.deletedAt=new Date().toISOString();item.deletedBy=ACTOR;item.originalCategory=selected.kind;audit(d,"MOVE_TO_TRASH",item);$("detail").close();render();return}
 if(b.hasAttribute("data-restore")){item.deletedAt=null;item.deletedBy=null;audit(d,"RESTORE",item);$("detail").close();render();return}
 if(b.hasAttribute("data-purge")){if(!confirm("Xóa vĩnh viễn mục này? Thao tác không thể hoàn tác."))return;const arr=selected.kind==="adoption"?d.adoptionRequests:d.messages;const i=arr.findIndex(x=>x.id===item.id);if(i>=0)arr.splice(i,1);d.inboxAudit.push({id:"LOCAL_AUDIT_"+Date.now(),actor:ACTOR,action:"PERMANENT_DELETE",itemId:item.id,category:selected.kind,at:new Date().toISOString()});save(d);$("detail").close();render();return}
 if(b.hasAttribute("data-read-toggle")){item.isRead=!item.isRead;item.status=item.isRead?"READ":"UNREAD";audit(d,item.isRead?"MARK_READ":"MARK_UNREAD",item);$("detail").close();render();return}
 if(b.hasAttribute("data-save-status")){const value=$("requestStatus").value,from=item.status;item.status=value;item.statusHistory=Array.isArray(item.statusHistory)?item.statusHistory:[];item.statusHistory.push({from,to:value,at:new Date().toISOString(),actor:ACTOR});audit(d,"CHANGE_REQUEST_STATUS",item,{from,to:value});$("detail").close();render();return}
});
document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{tab=b.dataset.tab;document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));$("search").value="";$("statusFilter").value="";$("readFilter").value="";render()}));
["search","statusFilter","readFilter","dateFrom","dateTo","sort"].forEach(id=>$(id).addEventListener(id==="search"?"input":"change",render));
render();
})();