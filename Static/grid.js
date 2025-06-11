console.log("CSS-grid version loaded");

const cols=1000, rows=3000;
const grid=document.getElementById("grid");
const selected=new Set(), claimed=new Set(), history=[];
const cellCount=document.getElementById("pixelCount");
const totalPrice=document.getElementById("totalPrice");
const claimedCount=document.getElementById("claimedPixels");
const errorMsg=document.getElementById("errorMessage");

function updateCounts(){
  cellCount.textContent=selected.size;
  totalPrice.textContent=selected.size;
  claimedCount.textContent=claimed.size;
}
function toggleCell(id){
  if(claimed.has(id))return;
  if(selected.has(id)){
    selected.delete(id);
  } else {
    selected.add(id);
    history.push(id);
  }
  document.getElementById(id).classList.toggle("selected");
  updateCounts();
}

// Build grid
(function build(){
  const frag=document.createDocumentFragment();
  for(let y=0;y<rows;y++){
    for(let x=0;x<cols;x++){
      const id=`${x},${y}`;
      const div=document.createElement("div");
      div.id=id; div.className="cell";
      div.onclick=()=>toggleCell(id);
      frag.appendChild(div);
    }
  }
  grid.appendChild(frag);
})();

// Fetch claimed
fetch("/claimed-pixels").then(r=>r.json()).then(d=>{
  d.claimed.forEach(id=>{
    claimed.add(id);
    document.getElementById(id)?.classList.add("claimed");
  });
  updateCounts();
});

// Buttons
document.getElementById("undoButton").onclick=()=>{
  const last=history.pop();
  if(last){
    selected.delete(last);
    document.getElementById(last)?.classList.remove("selected");
    updateCounts();
  }
};
document.getElementById("deselectAllButton").onclick=()=>{
  selected.clear(); history.length=0;
  document.querySelectorAll(".cell.selected").forEach(el=>el.classList.remove("selected"));
  updateCounts();
};

// Stripe
const stripe=Stripe(STRIPE_PUBLIC_KEY);
document.getElementById("payButton").onclick=async()=>{
  if(selected.size===0){
    errorMsg.textContent="Select at least one pixel";
    return;
  }
  const charity=document.getElementById("charitySelect").value;
  const data={pixels:Array.from(selected).map(s=>s.split(",").map(Number)), charity};
  const r=await fetch("/create-checkout-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
  const j=await r.json();
  if(j.error){ errorMsg.textContent=j.error; return; }
  stripe.redirectToCheckout({sessionId:j.id});
};
