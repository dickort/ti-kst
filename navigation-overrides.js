// TI Detailing Kostanay — direct navigation for services and directions
const directionUrl=(key)=>`./direction.html?direction=${encodeURIComponent(key)}`;

// Service clicks always open a dedicated service page before legacy modal handlers.
document.addEventListener("click",function(event){
  const trigger=event.target.closest("[data-service]");
  if(!trigger)return;
  const slug=trigger.dataset.service;
  if(!slug)return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  window.location.href=`./service.html?service=${encodeURIComponent(slug)}`;
},true);

// Keep the hero CTA synced with the selected direction.
document.addEventListener("click",function(event){
  const trigger=event.target.closest("[data-direction]");
  if(!trigger)return;
  const key=trigger.dataset.direction;
  const more=document.getElementById("panelMore");
  if(more)more.href=directionUrl(key);
},true);

function enhanceDirectionColumns(){
  document.querySelectorAll(".direction-column[data-column]").forEach(column=>{
    const head=column.querySelector(".direction-column-head");
    if(!head||head.querySelector(".direction-column-link"))return;
    const key=column.dataset.column;
    const link=document.createElement("a");
    link.className="direction-column-link";
    link.href=directionUrl(key);
    link.textContent="Смотреть направление ↗";
    head.appendChild(link);
  });
}

window.addEventListener("load",()=>{
  enhanceDirectionColumns();
  const observer=new MutationObserver(enhanceDirectionColumns);
  const root=document.getElementById("serviceDirections");
  if(root)observer.observe(root,{childList:true,subtree:true});
});
