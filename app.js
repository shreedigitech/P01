/* ShopFlow frontend */
const cfg=window.SHOP_CONFIG;
const {createClient}=window.supabase;
const supabase=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let state={user:null,profile:null,shop:null,products:[],categories:[],brands:[],customers:[],suppliers:[],cart:[],page:"dashboard"};

const money=n=>new Intl.NumberFormat(cfg.LOCALE,{style:"currency",currency:cfg.CURRENCY,maximumFractionDigits:2}).format(Number(n||0));
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const toast=(m,bad=false)=>{const t=$("#toast");t.textContent=m;t.style.background=bad?"#b91c1c":"#0f172a";t.classList.add("show");setTimeout(()=>t.classList.remove("show"),3200)};
const today=()=>new Date().toISOString().slice(0,10);
const can=r=>["owner","manager","cashier","stock_manager"].includes(r);
const roleAtLeast=(...roles)=>roles.includes(state.profile?.role);

async function sha256(text){const data=new TextEncoder().encode(text);const hash=await crypto.subtle.digest("SHA-256",data);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function showAuth(){$("#authView").classList.remove("hidden");$("#appView").classList.add("hidden")}
function enterApp(preview=false){state.user={id:null,email:"local@shop"};state.profile={full_name:"Local Shop User",role:"owner",active:true};$("#authView").classList.add("hidden");$("#appView").classList.remove("hidden");$("#userBadge").textContent=preview?"Preview Mode • local password":"Local Owner • password hash";loadAll().then(()=>showPage("dashboard"));}
async function init(){
  // Supabase Auth is intentionally disabled in this temporary build.
  // The UI is unlocked using a local SHA-256 password hash; database access uses the Supabase anon/publishable key.
  if(localStorage.getItem("shopflow_unlocked")==="1" && (cfg.REMEMBER_LOGIN!==false)){enterApp(false);return;}
  showAuth();
}

async function loadAll(){
  const [shop,cats,brands,products,customers,suppliers]=await Promise.all([
    supabase.from("shop_settings").select("*").eq("id",1).single(),
    supabase.from("categories").select("*").order("department").order("name"),
    supabase.from("brands").select("*").order("name"),
    supabase.from("products").select("*,categories(name,department),brands(name),units(name)").eq("active",true).order("name"),
    supabase.from("customers").select("*").order("name"),
    supabase.from("suppliers").select("*").order("name")
  ]);
  if(shop.data) state.shop=shop.data;
  state.categories=cats.data||[];state.brands=brands.data||[];state.products=products.data||[];state.customers=customers.data||[];state.suppliers=suppliers.data||[];
  $("#shopNameTop").textContent=state.shop?.shop_name||"";
}
function showPage(page){
  state.page=page; $$(".page").forEach(x=>x.classList.add("hidden")); $(`#${page}Page`).classList.remove("hidden");
  $$("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  $("#pageTitle").textContent=page[0].toUpperCase()+page.slice(1);
  renderPage();
}
async function renderPage(){
  if(state.page==="dashboard") await renderDashboard();
  if(state.page==="billing") renderBilling();
  if(state.page==="purchases") renderPurchases();
  if(state.page==="products") renderProducts();
  if(state.page==="customers") renderCustomers();
  if(state.page==="suppliers") renderSuppliers();
  if(state.page==="reports") await renderReports();
  if(state.page==="expenses") await renderExpenses();
  if(state.page==="settings") renderSettings();
}
function stat(title,val,icon){return `<div class="card stat"><div><div class="muted small">${title}</div><div class="num">${val}</div></div><div class="icon">${icon}</div></div>`}

async function renderDashboard(){
  const start=new Date();start.setHours(0,0,0,0);
  const end=new Date(start);end.setDate(end.getDate()+1);
  const [sales,purchases,low]=await Promise.all([
    supabase.from("sales").select("total").gte("sale_date",start.toISOString()).lt("sale_date",end.toISOString()).eq("status","completed"),
    supabase.from("purchases").select("total").gte("purchase_date",today()).lt("purchase_date",new Date(end).toISOString().slice(0,10)),
    supabase.from("products").select("id,name,current_stock,minimum_stock,unit_code").eq("active",true).filter("current_stock","lte","minimum_stock").order("current_stock").limit(20)
  ]);
  const salesTotal=(sales.data||[]).reduce((a,x)=>a+Number(x.total),0);
  const purchaseTotal=(purchases.data||[]).reduce((a,x)=>a+Number(x.total),0);
  const stockValue=state.products.reduce((a,x)=>a+Number(x.current_stock)*Number(x.purchase_price),0);
  $("#dashboardPage").innerHTML=`
  <div class="grid grid-4">${stat("Today's Sales",money(salesTotal),"🧾")}${stat("Today's Purchases",money(purchaseTotal),"🛒")}${stat("Stock Cost Value",money(stockValue),"📦")}${stat("Low Stock",(low.data||[]).length,"⚠️")}</div>
  <div class="grid grid-2" style="margin-top:16px">
    <div class="card"><div class="section-title"><h3>Low Stock</h3><button class="secondary" onclick="showPage('products')">Manage</button></div>
    ${(low.data||[]).length?`<div class="table-wrap"><table class="table"><thead><tr><th>Product</th><th>Stock</th><th>Minimum</th></tr></thead><tbody>${low.data.map(x=>`<tr><td>${esc(x.name)}</td><td class="danger-text">${x.current_stock} ${x.unit_code}</td><td>${x.minimum_stock}</td></tr>`).join("")}</tbody></table></div>`:'<div class="empty">No low-stock items.</div>'}</div>
    <div class="card"><div class="section-title"><h3>Quick actions</h3></div><div class="grid grid-2"><button class="primary" onclick="showPage('billing')">+ New Sale</button><button class="success" onclick="showPage('purchases')">+ Purchase</button><button class="secondary" onclick="openProductModal()">+ Product</button><button class="secondary" onclick="openCustomerModal()">+ Customer</button></div></div>
  </div>`;
}

function productLabel(p){return `${p.name}${p.size?` • ${p.size}`:""}${p.brand?.name?` • ${p.brand.name}`:""}`}
async function openOCRModal(){
  openModal("📷 Scan Product List",`<div class="hint">Upload a supplier list, handwritten/printed item list, or take a photo. OCR reads the text and matches it against products already in your ShopFlow catalogue. It does not automatically fetch prices from the internet.</div><div style="margin-top:12px" class="form-grid"><div class="field"><label>Upload image</label><input id="ocrFile" type="file" accept="image/*"></div><div class="field"><label>Camera</label><input id="ocrCamera" type="file" accept="image/*" capture="environment"></div></div><div id="ocrStatus" class="muted small" style="margin-top:12px"></div><div id="ocrProgress" class="progress hidden"><span></span></div><img id="ocrPreview" class="ocr-preview hidden" style="margin-top:12px"><div id="ocrResults" class="ocr-results"></div><div class="actions"><button class="secondary" type="button" onclick="closeModal()">Close</button><button class="primary" id="ocrAddBtn" type="button" disabled>Add matched items to bill</button></div>`);
  const handle=f=>{if(f)runOCR(f)};$("#ocrFile").onchange=e=>handle(e.target.files[0]);$("#ocrCamera").onchange=e=>handle(e.target.files[0]);$("#ocrAddBtn").onclick=()=>{const rows=$$(".ocr-select:checked");rows.forEach(ch=>{const id=ch.dataset.id,q=Math.max(1,Number($("#ocrQty_"+id).value||1));for(let i=0;i<q;i++)addCart(id)});closeModal();toast(`${rows.length} matched product(s) added.`)};
}
async function runOCR(file){
  if(!window.Tesseract){toast("OCR library could not load. Check internet/CDN access.",true);return}
  const preview=$("#ocrPreview"),status=$("#ocrStatus"),bar=$("#ocrProgress"),fill=bar.querySelector("span");preview.src=URL.createObjectURL(file);preview.classList.remove("hidden");bar.classList.remove("hidden");status.textContent="Reading image...";
  try{const result=await Tesseract.recognize(file,"eng",{logger:m=>{if(m.status){status.textContent=`${m.status} ${Math.round((m.progress||0)*100)}%`;fill.style.width=`${Math.round((m.progress||0)*100)}%`}}});const text=result.data.text||"";status.textContent="Text detected. Matching catalogue...";renderOCRMatches(text);}
  catch(e){console.error(e);status.textContent="OCR failed.";toast("Could not read the image. Try a clearer photo.",true)}
}
function normText(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function scoreProduct(line,p){const l=normText(line),name=normText(p.name),sku=normText(p.sku),barcode=normText(p.barcode),size=normText(p.size);if(!l)return 0;if(sku&&l.includes(sku))return 100;if(barcode&&l.includes(barcode))return 100;if(name&&l.includes(name))return 95;const tokens=name.split(" ").filter(x=>x.length>2);const hit=tokens.filter(t=>l.includes(t)).length;let score=tokens.length?hit/tokens.length*75:0;if(size&&l.includes(size))score+=15;return score}
function renderOCRMatches(text){const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(x=>x.length>2);const matches=[];for(const line of lines){const qtyMatch=line.match(/^\s*(\d+(?:\.\d+)?)\s*[xX:-]?\s+/);const qty=qtyMatch?Math.max(1,Number(qtyMatch[1])):1;let best=null,bestScore=0;for(const p of state.products){const sc=scoreProduct(line,p);if(sc>bestScore){bestScore=sc;best=p}}if(best&&bestScore>=45)matches.push({line,product:best,score:Math.round(bestScore),qty});}
  const unique=[];const seen=new Set();for(const m of matches){if(!seen.has(m.product.id)){seen.add(m.product.id);unique.push(m)}}const box=$("#ocrResults");if(!unique.length){box.innerHTML=`<div class="empty">No catalogue match found.<br><span class="small">Try clearer text, or add the product to Products first.</span></div>`;$("#ocrAddBtn").disabled=true;return}
  box.innerHTML=unique.map(m=>`<label class="ocr-row"><div><input class="ocr-select" type="checkbox" data-id="${m.product.id}" checked> <b>${esc(productLabel(m.product))}</b><div class="muted small">Detected: ${esc(m.line)} • match ${m.score}% • ${money(m.product.selling_price)}</div></div><input id="ocrQty_${m.product.id}" type="number" min="1" step="1" value="${m.qty}"><span class="badge green">${m.product.current_stock} in stock</span></label>`).join("");$("#ocrAddBtn").disabled=false;
}

function renderBilling(){
  const cartTotal=state.cart.reduce((a,x)=>a+x.quantity*x.unit_price,0);
  const discount=state.cartDiscount||0, tax=state.cart.reduce((a,x)=>a+(x.quantity*x.unit_price-x.discount)*(Number(x.gst_rate)/100),0);
  const total=Math.max(0,cartTotal-discount+tax);
  $("#billingPage").innerHTML=`<div class="pos">
  <div>
    <div class="card"><div class="toolbar"><div class="field" style="flex:1"><label>Search / scan barcode</label><input id="productSearch" placeholder="Search product name, SKU or barcode"></div><button class="secondary" onclick="clearCart()">Clear</button></div><div id="productResults" class="product-results"></div></div>
  </div>
  <div class="card cart"><div class="section-title"><h3>Current Bill</h3><span class="badge">${state.cart.length} items</span></div><div class="cart-items">${state.cart.length?state.cart.map((x,i)=>`<div class="cart-row"><div class="line"><b>${esc(productLabel(x))}</b><b>${money(x.quantity*x.unit_price-x.discount)}</b></div><div class="muted small">Stock ${x.current_stock} • Rate ${money(x.unit_price)} • Discount ${money(x.discount)}</div><div class="qty"><button onclick="changeQty(${i},-1)">−</button><input value="${x.quantity}" onchange="setQty(${i},this.value)"><button onclick="changeQty(${i},1)">+</button><button class="danger" onclick="removeCart(${i})">×</button></div></div>`).join(""):'<div class="empty">Add products to start billing.</div>'}</div>
  <div class="totals"><div class="total-line"><span>Subtotal</span><b>${money(cartTotal)}</b></div><div class="field"><label>Bill discount</label><input id="billDiscount" type="number" min="0" step=".01" value="${discount}"></div><div class="total-line"><span>GST</span><b>${money(tax)}</b></div><div class="total-line grand"><span>Total</span><span>${money(total)}</span></div><button class="primary wide" onclick="openSaleModal()">Generate Bill</button></div></div></div>`;
  const inp=$("#productSearch");inp?.addEventListener("input",()=>renderProductResults(inp.value));renderProductResults("");
}
function renderProductResults(q=""){
  const term=q.toLowerCase().trim();const list=state.products.filter(p=>!term||[p.name,p.sku,p.barcode,p.size,p.brands?.name,p.categories?.name].some(v=>String(v||"").toLowerCase().includes(term))).slice(0,40);
  $("#productResults").innerHTML=list.map(p=>`<button class="product-pick" onclick="addCart('${p.id}')"><b>${esc(productLabel(p))}</b><br><span class="muted small">${esc(p.sku)} • ${p.current_stock} ${p.unit_code} • ${money(p.selling_price)}</span></button>`).join("")||'<div class="empty">No products found.</div>';
}
function addCart(id){
  const p=state.products.find(x=>x.id===id);if(!p)return;
  if(Number(p.current_stock)<=0){toast("Out of stock",true);return}
  const x=state.cart.find(x=>x.product_id===id);if(x)x.quantity=Math.min(Number(p.current_stock),x.quantity+1);else state.cart.push({product_id:id,name:p.name,size:p.size,brand:p.brands?.name,quantity:1,unit_price:Number(p.selling_price),purchase_cost:Number(p.purchase_price),discount:0,gst_rate:Number(p.gst_rate),current_stock:Number(p.current_stock)});
  renderBilling();
}
function changeQty(i,d){state.cart[i].quantity=Math.max(0,Math.min(state.cart[i].current_stock,state.cart[i].quantity+d));if(!state.cart[i].quantity)state.cart.splice(i,1);renderBilling()}
function setQty(i,v){state.cart[i].quantity=Math.max(0,Math.min(state.cart[i].current_stock,Number(v)||0));if(!state.cart[i].quantity)state.cart.splice(i,1);renderBilling()}
function removeCart(i){state.cart.splice(i,1);renderBilling()}
function clearCart(){state.cart=[];state.cartDiscount=0;renderBilling()}

function openSaleModal(){
  if(!state.cart.length)return toast("Add at least one product.",true);
  const subtotal=state.cart.reduce((a,x)=>a+x.quantity*x.unit_price-x.discount,0),tax=state.cart.reduce((a,x)=>a+(x.quantity*x.unit_price-x.discount)*(x.gst_rate/100),0),discount=Number(state.cartDiscount||0),total=Math.max(0,subtotal-discount+tax);
  openModal("Complete Sale",`<form id="saleForm"><div class="form-grid"><div class="field"><label>Customer</label><select id="saleCustomer"><option value="">Walk-in customer</option>${state.customers.map(c=>`<option value="${c.id}">${esc(c.name)} ${c.phone?`• ${esc(c.phone)}`:""}</option>`).join("")}</select></div><div class="field"><label>Bill discount</label><input id="saleDiscount" type="number" min="0" value="${discount}" step=".01"></div><div class="field"><label>Cash</label><input id="cashPaid" type="number" min="0" step=".01" value="${total}"></div><div class="field"><label>UPI</label><input id="upiPaid" type="number" min="0" step=".01" value="0"></div><div class="field"><label>Card</label><input id="cardPaid" type="number" min="0" step=".01" value="0"></div><div class="field"><label>Credit</label><input id="creditPaid" type="number" min="0" step=".01" value="0"></div><div class="full muted small">Total including GST: <b>${money(total)}</b>. Payment fields must add up to the total.</div></div><div class="actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary" type="submit">Save Sale</button></div></form>`);
  $("#saleForm").onsubmit=saveSale;
}
async function saveSale(e){
  e.preventDefault();const subtotal=state.cart.reduce((a,x)=>a+x.quantity*x.unit_price-x.discount,0),tax=state.cart.reduce((a,x)=>a+(x.quantity*x.unit_price-x.discount)*(x.gst_rate/100),0),discount=Number($("#saleDiscount").value||0),total=Math.max(0,subtotal-discount+tax);
  const cash=Number($("#cashPaid").value||0),upi=Number($("#upiPaid").value||0),card=Number($("#cardPaid").value||0),credit=Number($("#creditPaid").value||0);
  if(Math.abs(cash+upi+card+credit-total)>0.01)return toast("Payment total must equal bill total.",true);
  const items=state.cart.map(x=>({product_id:x.product_id,quantity:x.quantity,unit_price:x.unit_price,purchase_cost:x.purchase_cost,discount:x.discount,gst_rate:x.gst_rate,line_total:x.quantity*x.unit_price-x.discount}));
  const {data,error}=await supabase.rpc("create_sale",{p_customer_id:$("#saleCustomer").value||null,p_subtotal:subtotal,p_discount:discount,p_tax:tax,p_total:total,p_cash:cash,p_upi:upi,p_card:card,p_credit:credit,p_items:items});
  if(error)return toast(error.message,true);
  const saleId=data;closeModal();state.cart=[];state.cartDiscount=0;await loadAll();toast("Sale saved.");
  await showInvoiceActions(saleId);
  if(state.page==="billing")renderBilling();
}
async function showInvoiceActions(saleId){
  const {data:sale}=await supabase.from("sales").select("*,customers(*)").eq("id",saleId).single();
  const {data:items}=await supabase.from("sale_items").select("*,products(name,size,unit_code,brands(name))").eq("sale_id",saleId);
  openModal("Invoice saved",`<div class="card"><b>${esc(sale.invoice_no)}</b><p>Total: <b>${money(sale.total)}</b></p><p>${sale.customers?`Customer: ${esc(sale.customers.name)} • ${esc(sale.customers.phone||"")}`:"Walk-in customer"}</p></div><div class="actions"><button class="secondary" onclick="downloadInvoice('${sale.id}')">Download PDF</button>${sale.customers?.phone?`<button class="success" onclick="sendWhatsApp('${sale.id}')">Send WhatsApp</button>`:""}<button class="primary" onclick="closeModal()">Done</button></div>`);
}
async function invoiceData(id){
 const {data:s}=await supabase.from("sales").select("*,customers(*)").eq("id",id).single();
 const {data:it}=await supabase.from("sale_items").select("*,products(name,size,unit_code)").eq("sale_id",id).order("id");
 return {s,items:it||[]};
}
async function makeInvoicePdf(id){
 const {s,items}=await invoiceData(id);const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:"mm",format:"a4"});let y=18;
 doc.setFontSize(18);doc.text(state.shop?.shop_name||"Shop",15,y);y+=7;doc.setFontSize(9);doc.text(state.shop?.address||"",15,y);y+=5;doc.text(`Phone: ${state.shop?.phone||""}   GSTIN: ${state.shop?.gstin||""}`,15,y);y+=8;doc.line(15,y,195,y);y+=8;doc.setFontSize(12);doc.text(`Invoice: ${s.invoice_no}`,15,y);doc.text(new Date(s.sale_date).toLocaleString("en-IN"),140,y);y+=7;doc.setFontSize(10);doc.text(`Customer: ${s.customers?.name||"Walk-in"}`,15,y);doc.text(`Mobile: ${s.customers?.phone||""}`,110,y);y+=9;
 doc.setFontSize(8);doc.text("Item",15,y);doc.text("Qty",120,y);doc.text("Rate",140,y);doc.text("Disc",165,y);doc.text("Total",180,y);y+=5;doc.line(15,y,195,y);y+=6;
 items.forEach(x=>{const name=x.products?.name+(x.products?.size?` (${x.products.size})`:"");doc.text(name.slice(0,48),15,y);doc.text(String(x.quantity),120,y);doc.text(money(x.unit_price),140,y);doc.text(money(x.discount),165,y);doc.text(money(x.line_total),180,y);y+=6;if(y>270){doc.addPage();y=20}});
 y+=4;doc.line(130,y,195,y);y+=7;doc.text(`Subtotal: ${money(s.subtotal)}`,145,y);y+=6;doc.text(`Discount: ${money(s.discount)}`,145,y);y+=6;doc.text(`GST: ${money(s.tax)}`,145,y);y+=7;doc.setFontSize(13);doc.text(`TOTAL: ${money(s.total)}`,145,y);y+=12;doc.setFontSize(9);doc.text(`Payment: Cash ${money(s.cash_paid)} | UPI ${money(s.upi_paid)} | Card ${money(s.card_paid)} | Credit ${money(s.credit_amount)}`,15,y);y+=8;doc.text("Thank you for your business.",15,y);
 return {blob:doc.output("blob"),doc};
}
async function downloadInvoice(id){const {blob,doc}=await makeInvoicePdf(id);const {s}=await invoiceData(id);doc.save(`${s.invoice_no}.pdf`)}
async function sendWhatsApp(id){
 try{
  toast("Preparing invoice...");
  const {blob}=await makeInvoicePdf(id);const {s}=await invoiceData(id);
  if(!s.customers?.phone)return toast("Customer mobile number is missing.",true);
  const path=`${s.id}.pdf`;
  const up=await supabase.storage.from("invoices").upload(path,blob,{contentType:"application/pdf",upsert:true});
  if(up.error)throw up.error;
  const signed=await supabase.storage.from("invoices").createSignedUrl(path,3600);if(signed.error)throw signed.error;
  const res=await supabase.functions.invoke(cfg.WHATSAPP_FUNCTION,{body:{phone:s.customers.phone,invoice_no:s.invoice_no,total:s.total,document_url:signed.data.signedUrl}});
  if(res.error)throw res.error;toast("WhatsApp invoice sent.");
 }catch(e){toast(e.message||"WhatsApp sending failed.",true)}
}

function renderPurchases(){
 $("#purchasesPage").innerHTML=`<div class="card"><div class="section-title"><h3>New Purchase</h3><span class="muted small">Purchase increases stock atomically.</span></div><form id="purchaseForm"><div class="form-grid"><div class="field"><label>Supplier</label><select id="purSupplier"><option value="">Select supplier</option>${state.suppliers.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></div><div class="field"><label>Supplier invoice no.</label><input id="purInv"></div></div><div style="margin-top:15px" id="purRows"></div><div class="actions"><button type="button" class="secondary" onclick="addPurchaseRow()">+ Add item</button><button class="success">Save Purchase</button></div></form></div><div class="card" style="margin-top:16px"><div class="section-title"><h3>Recent Purchases</h3></div><div id="purchaseHistory"></div></div>`;
 addPurchaseRow();$("#purchaseForm").onsubmit=savePurchase;loadPurchaseHistory();
}
function addPurchaseRow(){
 const box=$("#purRows");const id=`r${Date.now()}${Math.random().toString(16).slice(2)}`;box.insertAdjacentHTML("beforeend",`<div class="form-grid pur-row card" style="margin-bottom:9px" id="${id}"><div class="field"><label>Product</label><select class="p-product"><option value="">Select</option>${state.products.map(p=>`<option value="${p.id}">${esc(productLabel(p))}</option>`).join("")}</select></div><div class="field"><label>Quantity</label><input class="p-qty" type="number" min=".001" step=".001"></div><div class="field"><label>Unit cost</label><input class="p-cost" type="number" min="0" step=".01"></div><div class="field"><label>GST %</label><input class="p-gst" type="number" min="0" step=".01" value="0"></div><button type="button" class="danger" onclick="document.getElementById('${id}').remove()">Remove</button></div>`);
 box.lastElementChild.querySelector(".p-product").onchange=e=>{const p=state.products.find(x=>x.id===e.target.value);if(p)box.lastElementChild.querySelector(".p-cost").value=p.purchase_price;box.lastElementChild.querySelector(".p-gst").value=p.gst_rate};
}
async function savePurchase(e){
 e.preventDefault();const rows=$$(".pur-row").map(r=>({product_id:r.querySelector(".p-product").value,quantity:Number(r.querySelector(".p-qty").value),unit_cost:Number(r.querySelector(".p-cost").value),gst_rate:Number(r.querySelector(".p-gst").value),line_total:Number(r.querySelector(".p-qty").value)*Number(r.querySelector(".p-cost").value)})).filter(x=>x.product_id&&x.quantity>0);
 if(!rows.length)return toast("Add purchase items.",true);const subtotal=rows.reduce((a,x)=>a+x.line_total,0),tax=rows.reduce((a,x)=>a+x.line_total*x.gst_rate/100,0),total=subtotal+tax;
 const {error}=await supabase.rpc("create_purchase",{p_supplier_id:$("#purSupplier").value||null,p_supplier_invoice_no:$("#purInv").value||"",p_subtotal:subtotal,p_discount:0,p_tax:tax,p_total:total,p_paid:0,p_items:rows});
 if(error)return toast(error.message,true);toast("Purchase saved and stock updated.");await loadAll();renderPurchases();
}
async function loadPurchaseHistory(){
 const {data}=await supabase.from("purchases").select("*,suppliers(name)").order("created_at",{ascending:false}).limit(30);
 $("#purchaseHistory").innerHTML=`<div class="table-wrap"><table class="table"><thead><tr><th>No</th><th>Date</th><th>Supplier</th><th>Total</th><th>Due</th></tr></thead><tbody>${(data||[]).map(x=>`<tr><td>${x.purchase_no}</td><td>${x.purchase_date}</td><td>${esc(x.suppliers?.name||"—")}</td><td>${money(x.total)}</td><td>${money(x.due)}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderProducts(){
 $("#productsPage").innerHTML=`<div class="card"><div class="toolbar"><div class="field" style="flex:1"><label>Search</label><input id="prodSearch" placeholder="Name, SKU, barcode, brand, size"></div><button class="primary" onclick="openProductModal()">+ Add product</button></div><div id="productsTable"></div></div>`;
 $("#prodSearch").oninput=e=>renderProductTable(e.target.value);renderProductTable("");
}
function renderProductTable(q){
 const t=q.toLowerCase();const list=state.products.filter(p=>[p.name,p.sku,p.barcode,p.size,p.brands?.name,p.categories?.name].some(v=>String(v||"").toLowerCase().includes(t)));
 $("#productsTable").innerHTML=`<div class="table-wrap"><table class="table"><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Purchase</th><th>MRP</th><th>Sell</th><th>Min Sell</th><th>Action</th></tr></thead><tbody>${list.map(p=>`<tr><td><b>${esc(p.name)}</b><br><span class="muted small">${esc(p.size||"")} ${esc(p.brands?.name||"")}</span></td><td>${esc(p.sku)}</td><td>${esc(p.categories?.name||"")}</td><td class="${Number(p.current_stock)<=Number(p.minimum_stock)?'danger-text':''}">${p.current_stock} ${p.unit_code}</td><td>${money(p.purchase_price)}</td><td>${money(p.mrp)}</td><td>${money(p.selling_price)}</td><td>${money(p.minimum_selling_price)}</td><td><button class="secondary" onclick="openProductModal('${p.id}')">Edit</button></td></tr>`).join("")}</tbody></table></div>`;
}
function openProductModal(id){
 const p=state.products.find(x=>x.id===id)||{sku:"",barcode:"",name:"",category_id:"",brand_id:"",size:"",color:"",material:"",unit_code:"PCS",hsn_code:"",gst_rate:18,purchase_price:0,mrp:0,selling_price:0,wholesale_price:0,minimum_selling_price:0,minimum_stock:0};
 openModal(id?"Edit Product":"Add Product",`<form id="productForm"><div class="form-grid">
 <div class="field"><label>SKU</label><input id="fsku" required value="${esc(p.sku)}"></div><div class="field"><label>Barcode</label><input id="fbarcode" value="${esc(p.barcode||"")}"></div>
 <div class="field full"><label>Product name</label><input id="fname" required value="${esc(p.name)}"></div>
 <div class="field"><label>Category</label><select id="fcat"><option value="">Select</option>${state.categories.map(c=>`<option value="${c.id}" ${c.id===p.category_id?"selected":""}>${esc(c.department)} • ${esc(c.name)}</option>`).join("")}</select></div>
 <div class="field"><label>Brand</label><select id="fbrand"><option value="">Select</option>${state.brands.map(b=>`<option value="${b.id}" ${b.id===p.brand_id?"selected":""}>${esc(b.name)}</option>`).join("")}</select></div>
 <div class="field"><label>Size</label><input id="fsize" value="${esc(p.size||"")}"></div><div class="field"><label>Colour</label><input id="fcolor" value="${esc(p.color||"")}"></div>
 <div class="field"><label>Unit</label><select id="funit">${["PCS","MTR","FT","KG","GM","LTR","BOX","PACK","COIL","ROLL","SET","PAIR","BUNDLE"].map(u=>`<option ${u===p.unit_code?"selected":""}>${u}</option>`).join("")}</select></div>
 <div class="field"><label>HSN</label><input id="fhsn" value="${esc(p.hsn_code||"")}"></div>
 <div class="field"><label>GST %</label><input id="fgst" type="number" value="${p.gst_rate}"></div><div class="field"><label>Minimum stock</label><input id="fminstock" type="number" step=".001" value="${p.minimum_stock}"></div>
 <div class="field"><label>Purchase price</label><input id="fpurchase" type="number" step=".01" value="${p.purchase_price}"></div><div class="field"><label>MRP</label><input id="fmrp" type="number" step=".01" value="${p.mrp}"></div>
 <div class="field"><label>Selling price</label><input id="fsell" type="number" step=".01" value="${p.selling_price}"></div><div class="field"><label>Wholesale price</label><input id="fwholesale" type="number" step=".01" value="${p.wholesale_price}"></div>
 <div class="field"><label>Minimum selling price</label><input id="fminsell" type="number" step=".01" value="${p.minimum_selling_price}"></div>
 ${id?`<div class="field"><label>Current stock</label><input value="${p.current_stock}" disabled></div>`:`<div class="field"><label>Opening stock</label><input id="fopening" type="number" step=".001" value="0"></div>`}
 </div><div class="actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save</button></div></form>`);
 $("#productForm").onsubmit=e=>saveProduct(e,id);
}
async function saveProduct(e,id){e.preventDefault();const row={sku:$("#fsku").value.trim(),barcode:$("#fbarcode").value.trim()||null,name:$("#fname").value.trim(),category_id:$("#fcat").value||null,brand_id:$("#fbrand").value||null,size:$("#fsize").value,color:$("#fcolor").value,unit_code:$("#funit").value,hsn_code:$("#fhsn").value,gst_rate:Number($("#fgst").value||0),purchase_price:Number($("#fpurchase").value||0),mrp:Number($("#fmrp").value||0),selling_price:Number($("#fsell").value||0),wholesale_price:Number($("#fwholesale").value||0),minimum_selling_price:Number($("#fminsell").value||0),minimum_stock:Number($("#fminstock").value||0)};
 if(id){const old=state.products.find(x=>x.id===id);const {error}=await supabase.from("products").update(row).eq("id",id);if(error)return toast(error.message,true);if(Number(old.purchase_price)!==row.purchase_price||Number(old.selling_price)!==row.selling_price)await supabase.from("price_history").insert({product_id:id,old_purchase_price:old.purchase_price,old_selling_price:old.selling_price,new_purchase_price:row.purchase_price,new_selling_price:row.selling_price,changed_by:null});}
 else {row.opening_stock=Number($("#fopening").value||0);row.current_stock=row.opening_stock;const {error}=await supabase.from("products").insert(row);if(error)return toast(error.message,true)}
 closeModal();await loadAll();renderProducts();toast("Product saved.");
}

function renderCustomers(){ $("#customersPage").innerHTML=`<div class="card"><div class="toolbar"><div class="field" style="flex:1"><label>Search customer</label><input id="custSearch" placeholder="Name or mobile"></div><button class="primary" onclick="openCustomerModal()">+ Customer</button></div><div id="customersTable"></div></div>`;$("#custSearch").oninput=e=>renderCustomersTable(e.target.value);renderCustomersTable("")}
function renderCustomersTable(q){const t=q.toLowerCase();const list=state.customers.filter(c=>(c.name+" "+c.phone).toLowerCase().includes(t));$("#customersTable").innerHTML=`<div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Mobile</th><th>Address</th><th>Opening</th><th>Action</th></tr></thead><tbody>${list.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td>${esc(c.address)}</td><td>${money(c.opening_balance)}</td><td><button class="secondary" onclick="customerStatement('${c.id}')">Statement</button></td></tr>`).join("")}</tbody></table></div>`}
function openCustomerModal(){openModal("Add Customer",`<form id="customerForm"><div class="form-grid"><div class="field"><label>Name</label><input id="cname" required></div><div class="field"><label>WhatsApp / Mobile</label><input id="cphone" inputmode="tel" placeholder="+91 9876543210"></div><div class="field full"><label>Address</label><textarea id="caddress"></textarea></div><div class="field"><label>GSTIN</label><input id="cgst"></div><div class="field"><label>Opening due</label><input id="copening" type="number" step=".01" value="0"></div></div><div class="actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save</button></div></form>`);$("#customerForm").onsubmit=async e=>{e.preventDefault();const {error}=await supabase.from("customers").insert({name:$("#cname").value,phone:$("#cphone").value,address:$("#caddress").value,gstin:$("#cgst").value,opening_balance:Number($("#copening").value||0)});if(error)return toast(error.message,true);closeModal();await loadAll();renderCustomers();toast("Customer saved.")}}
async function customerStatement(id){const c=state.customers.find(x=>x.id===id);const {data:s}=await supabase.from("sales").select("invoice_no,sale_date,total,credit_amount,status").eq("customer_id",id).order("sale_date",{ascending:false}).limit(100);const due=(c?.opening_balance||0)+(s||[]).reduce((a,x)=>a+Number(x.credit_amount||0),0);openModal("Customer Statement",`<div class="card"><b>${esc(c.name)}</b><p>Mobile: ${esc(c.phone)}</p><p>Opening due: ${money(c.opening_balance)}</p><p>Credit from sales: ${money(due-(c.opening_balance||0))}</p><h3>Tracked credit: ${money(due)}</h3></div><div class="table-wrap"><table class="table"><thead><tr><th>Invoice</th><th>Date</th><th>Total</th><th>Credit</th></tr></thead><tbody>${(s||[]).map(x=>`<tr><td>${x.invoice_no}</td><td>${new Date(x.sale_date).toLocaleString("en-IN")}</td><td>${money(x.total)}</td><td>${money(x.credit_amount)}</td></tr>`).join("")}</tbody></table></div>`)}
function renderSuppliers(){ $("#suppliersPage").innerHTML=`<div class="card"><div class="toolbar"><button class="primary" onclick="openSupplierModal()">+ Supplier</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Mobile</th><th>GSTIN</th><th>Opening Balance</th></tr></thead><tbody>${state.suppliers.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.phone)}</td><td>${esc(s.gstin)}</td><td>${money(s.opening_balance)}</td></tr>`).join("")}</tbody></table></div></div>`}
function openSupplierModal(){openModal("Add Supplier",`<form id="supplierForm"><div class="form-grid"><div class="field"><label>Name</label><input id="sname" required></div><div class="field"><label>Mobile</label><input id="sphone"></div><div class="field full"><label>Address</label><textarea id="saddress"></textarea></div><div class="field"><label>GSTIN</label><input id="sgst"></div><div class="field"><label>Opening payable</label><input id="sopening" type="number" step=".01" value="0"></div></div><div class="actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save</button></div></form>`);$("#supplierForm").onsubmit=async e=>{e.preventDefault();const {error}=await supabase.from("suppliers").insert({name:$("#sname").value,phone:$("#sphone").value,address:$("#saddress").value,gstin:$("#sgst").value,opening_balance:Number($("#sopening").value||0)});if(error)return toast(error.message,true);closeModal();await loadAll();renderSuppliers();toast("Supplier saved.")}}

async function renderReports(){
 const now=new Date(),from=new Date(now);from.setDate(from.getDate()-6);from.setHours(0,0,0,0);
 const {data:sales}=await supabase.from("sales").select("sale_date,total,discount,tax,credit_amount,status").gte("sale_date",from.toISOString()).eq("status","completed").order("sale_date");
 const days=Array.from({length:7},(_,i)=>{const d=new Date(from);d.setDate(from.getDate()+i);return d});
 const vals=days.map(d=>(sales||[]).filter(x=>new Date(x.sale_date).toDateString()===d.toDateString()).reduce((a,x)=>a+Number(x.total),0));const max=Math.max(1,...vals);
 const monthStart=new Date(now.getFullYear(),now.getMonth(),1).toISOString();const {data:ms}=await supabase.from("sales").select("total,discount,tax,credit_amount").gte("sale_date",monthStart).eq("status","completed");const mt=(ms||[]).reduce((a,x)=>a+Number(x.total),0);
 const discounts=(ms||[]).reduce((a,x)=>a+Number(x.discount),0),tax=(ms||[]).reduce((a,x)=>a+Number(x.tax),0),credit=(ms||[]).reduce((a,x)=>a+Number(x.credit_amount),0);
 $("#reportsPage").innerHTML=`<div class="grid grid-4">${stat("This month",money(mt),"📅")}${stat("Discounts",money(discounts),"🏷️")}${stat("GST",money(tax),"🧾")}${stat("Credit sales",money(credit),"📒")}</div><div class="grid grid-2" style="margin-top:16px"><div class="card"><div class="section-title"><h3>Last 7 days sales</h3></div><div class="chart">${vals.map((v,i)=>`<div class="bar" style="height:${Math.max(4,v/max*170)}px"><span>${days[i].toLocaleDateString("en-IN",{weekday:"short"})}</span></div>`).join("")}</div></div><div class="card"><div class="section-title"><h3>Inventory overview</h3></div><div class="kpi-list"><div><span>Total products</span><b>${state.products.length}</b></div><div><span>Total units in stock</span><b>${state.products.reduce((a,x)=>a+Number(x.current_stock),0).toFixed(2)}</b></div><div><span>Stock cost value</span><b>${money(state.products.reduce((a,x)=>a+Number(x.current_stock)*Number(x.purchase_price),0))}</b></div><div><span>Potential sales value</span><b>${money(state.products.reduce((a,x)=>a+Number(x.current_stock)*Number(x.selling_price),0))}</b></div></div></div></div>`;
}
async function renderExpenses(){const {data}=await supabase.from("expenses").select("*").order("expense_date",{ascending:false}).limit(50);$("#expensesPage").innerHTML=`<div class="card"><div class="section-title"><h3>Expenses</h3><button class="primary" onclick="openExpenseModal()">+ Expense</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Note</th></tr></thead><tbody>${(data||[]).map(x=>`<tr><td>${x.expense_date}</td><td>${esc(x.category)}</td><td>${money(x.amount)}</td><td>${esc(x.note)}</td></tr>`).join("")}</tbody></table></div></div>`}
function openExpenseModal(){openModal("Add Expense",`<form id="expenseForm"><div class="form-grid"><div class="field"><label>Category</label><input id="ecat" required placeholder="Rent, transport, salary..."></div><div class="field"><label>Amount</label><input id="eamount" type="number" min=".01" step=".01" required></div><div class="field"><label>Date</label><input id="edate" type="date" value="${today()}"></div><div class="field"><label>Note</label><input id="enote"></div></div><div class="actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save</button></div></form>`);$("#expenseForm").onsubmit=async e=>{e.preventDefault();const {error}=await supabase.from("expenses").insert({category:$("#ecat").value,amount:Number($("#eamount").value),expense_date:$("#edate").value,note:$("#enote").value,created_by:null});if(error)return toast(error.message,true);closeModal();renderExpenses();toast("Expense saved.")}}

function renderSettings(){const s=state.shop||{};$("#settingsPage").innerHTML=`<div class="card"><div class="section-title"><h3>Shop settings</h3></div><form id="settingsForm"><div class="form-grid"><div class="field"><label>Shop name</label><input id="shopname" value="${esc(s.shop_name||"")}"></div><div class="field"><label>Phone</label><input id="shopphone" value="${esc(s.phone||"")}"></div><div class="field full"><label>Address</label><textarea id="shopaddress">${esc(s.address||"")}</textarea></div><div class="field"><label>GSTIN</label><input id="shopgst" value="${esc(s.gstin||"")}"></div><div class="field"><label>Invoice prefix</label><input id="shopprefix" value="${esc(s.invoice_prefix||"INV")}"></div></div><div class="actions"><button class="primary">Save settings</button></div></form></div><div class="card" style="margin-top:16px"><b>Deployment/security</b><p class="muted small">Temporary login uses a local SHA-256 password hash. This is a convenience gate, not server-side authentication. Anyone with direct access to the public Supabase API could bypass it, so use this mode only until server authentication is restored. WhatsApp credentials belong in the Supabase Edge Function secrets.</p></div>`;$("#settingsForm").onsubmit=async e=>{e.preventDefault();const {error}=await supabase.from("shop_settings").update({shop_name:$("#shopname").value,phone:$("#shopphone").value,address:$("#shopaddress").value,gstin:$("#shopgst").value,invoice_prefix:$("#shopprefix").value}).eq("id",1);if(error)return toast(error.message,true);await loadAll();toast("Settings saved.")}}

function openModal(title,html){$("#modalRoot").innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-head"><h3>${title}</h3><button class="icon-btn" onclick="closeModal()">✕</button></div>${html}</div></div>`}
function closeModal(){$("#modalRoot").innerHTML=""}

$("#loginForm").onsubmit=async e=>{e.preventDefault();const password=$("#loginPassword").value;const hash=await sha256(password);if(hash!==cfg.LOCAL_PASSWORD_HASH){toast("Incorrect shop password",true);return}if($("#rememberLogin")?.checked) localStorage.setItem("shopflow_unlocked","1");else localStorage.removeItem("shopflow_unlocked");enterApp(false)};
$("#previewBtn").onclick=()=>{localStorage.removeItem("shopflow_unlocked");enterApp(true)};
$("#logoutBtn").onclick=()=>{localStorage.removeItem("shopflow_unlocked");showAuth();$("#loginPassword").value=""};
$("#refreshBtn").onclick=async()=>{await loadAll();renderPage();toast("Refreshed")};
$("#menuBtn").onclick=()=>$("#sidebar").classList.toggle("open");
$$("[data-page]").forEach(b=>b.onclick=()=>{showPage(b.dataset.page);$("#sidebar").classList.remove("open")});
window.addEventListener("load",init);
