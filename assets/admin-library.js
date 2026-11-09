(()=>{
"use strict";
const DB="littlePawsImageDB",STORE="images",META="littlePawsImageMeta";
const $=id=>document.getElementById(id);
let db,urls=[];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:"id"})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function tx(mode,fn){return new Promise((resolve,reject)=>{const t=db.transaction(STORE,mode),s=t.objectStore(STORE);let result;try{result=fn(s)}catch(e){reject(e);return}t.oncomplete=()=>resolve(result?.result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error)})}
function meta(){try{return JSON.parse(localStorage.getItem(META)||'{"seq":0,"items":[]}')}catch{return {seq:0,items:[]}}}
function saveMeta(m){localStorage.setItem(META,JSON.stringify(m))}
function cats(){try{return JSON.parse(localStorage.getItem("littlePawsData")||"{}").pets||[]}catch{return []}}
function updateCats(fn){const d=JSON.parse(localStorage.getItem("littlePawsData")||"{}");d.pets=Array.isArray(d.pets)?d.pets:[];fn(d.pets);localStorage.setItem("littlePawsData",JSON.stringify(d))}
async function blob(id){return tx("readonly",s=>s.get(id))}
function categoryName(k){return ({CAT:"Ảnh mèo",BANNER:"Banner",WEBSITE:"Nội dung website",OTHER:"Khác"})[k]||"Khác"}
async function render(){
 urls.forEach(URL.revokeObjectURL);urls=[];
 const m=meta(),q=$("libSearch").value.trim().toLocaleLowerCase("vi"),cat=$("libCategory").value;
 const list=m.items.filter(x=>(!cat||x.category===cat)&&(!q||[x.name,x.description,...(x.tags||[])].join(" ").toLocaleLowerCase("vi").includes(q)));
 const cards=await Promise.all(list.map(async x=>{const rec=await blob(x.id);let src="";if(rec?.blob){src=URL.createObjectURL(rec.blob);urls.push(src)}return {x,src}}));
 $("libGrid").innerHTML=cards.map(({x,src})=>'<article class="lib-card"><img src="'+src+'" alt="'+esc(x.name)+'"><div class="lib-body"><h3>'+esc(x.name)+'</h3><p>'+esc(x.description||"Chưa có mô tả")+'</p><div class="lib-tags">'+esc(categoryName(x.category))+' · '+esc((x.tags||[]).join(", "))+'</div><small>Tải lên: '+new Date(x.createdAt).toLocaleString("vi-VN")+'</small><div class="lib-actions"><button class="lib-btn" data-attach="'+esc(x.id)+'">Liên kết với mèo</button><button class="lib-btn danger" data-delete="'+esc(x.id)+'">Xóa ảnh</button></div></div></article>').join("");
 $("libEmpty").hidden=cards.length>0;
}
$("uploadForm").addEventListener("submit",async e=>{
 e.preventDefault();const file=$("imageFile").files[0];if(!file)return;
 if(!file.type.startsWith("image/")){$("uploadNotice").textContent="Tệp đã chọn không phải hình ảnh.";return}
 if(file.size>12*1024*1024){$("uploadNotice").textContent="Ảnh vượt quá 12 MB. Hãy chọn ảnh nhỏ hơn.";return}
 try{const m=meta();m.seq+=1;const id="ID_IMG"+String(m.seq).padStart(4,"0"),record={id,blob:file};await tx("readwrite",s=>s.put(record));m.items.push({id,name:$("imageName").value.trim(),description:$("imageDescription").value.trim(),tags:$("imageTags").value.split(",").map(x=>x.trim()).filter(Boolean),category:$("imageCategory").value,createdAt:new Date().toISOString(),mime:file.type,size:file.size});saveMeta(m);e.target.reset();$("uploadNotice").textContent="Đã thêm ảnh vào thư viện trên thiết bị này.";await render()}catch(err){$("uploadNotice").textContent="Không lưu được ảnh: "+(err?.message||"trình duyệt từ chối lưu trữ")};
});
$("libSearch").addEventListener("input",render);$("libCategory").addEventListener("change",render);
let selected=null;
$("libGrid").addEventListener("click",async e=>{
 const a=e.target.closest("[data-attach]"),d=e.target.closest("[data-delete]");
 if(a){selected=a.dataset.attach;const m=meta(),item=m.items.find(x=>x.id===selected),rec=await blob(selected);if(!item||!rec?.blob)return;const url=URL.createObjectURL(rec.blob);$("attachPreview").src=url;$("attachPreview").onload=()=>URL.revokeObjectURL(url);$("attachTitle").textContent=item.name+" · "+item.id;const ps=cats();$("catSelect").innerHTML=ps.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' — '+esc(p.id)+'</option>').join("");if(!ps.length){alert("Chưa có hồ sơ mèo để liên kết.");return}$("attachDialog").showModal()}
 if(d){const id=d.dataset.delete,m=meta(),item=m.items.find(x=>x.id===id);if(!item)return;const references=cats().filter(p=>p.primaryImageId===id||(p.imageIds||[]).includes(id));if(references.length){alert("Ảnh đang được liên kết với hồ sơ: "+references.map(p=>p.name+" ("+p.id+")").join(", ")+". Hãy gỡ liên kết trước khi xóa.");return}if(!confirm("Xóa ảnh "+item.name+" khỏi thư viện trên thiết bị này?"))return;await tx("readwrite",s=>s.delete(id));m.items=m.items.filter(x=>x.id!==id);saveMeta(m);render()}
});
$("attachCancel").onclick=()=>$("attachDialog").close();
$("attachSave").onclick=()=>{
 const catId=$("catSelect").value,role=document.querySelector('input[name="attachRole"]:checked')?.value;if(!selected||!catId)return;
 updateCats(ps=>{const p=ps.find(x=>x.id===catId);if(!p)return;p.imageIds=Array.isArray(p.imageIds)?p.imageIds:[];if(role==="primary"){p.primaryImageId=selected;if(!p.imageIds.includes(selected))p.imageIds.unshift(selected)}else if(!p.imageIds.includes(selected))p.imageIds.push(selected)});
 $("attachDialog").close();alert("Đã liên kết ảnh với hồ sơ mèo trên thiết bị này.");
};
(async()=>{try{db=await openDB();await render()}catch(e){$("uploadNotice").textContent="Trình duyệt không hỗ trợ hoặc không mở được IndexedDB."}})();
})();