// TI Detailing Kostanay — dedicated service page routing
// Capture phase runs before the legacy modal handler in app.js.
document.addEventListener("click", function(event){
  const trigger=event.target.closest("[data-service]");
  if(!trigger) return;
  const slug=trigger.dataset.service;
  if(!slug) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  window.location.href=`./service.html?service=${encodeURIComponent(slug)}`;
}, true);
