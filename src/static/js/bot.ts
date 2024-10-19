const ai_provider_selector = document.getElementById("selector");
ai_provider_selector?.addEventListener("change", sync_ai_models);

function sync_ai_models(event: Event) {
  const a = event.target;
  console.log("providers", ai_provider_selector);
}
