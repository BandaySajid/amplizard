function autoGrowTextArea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto"; // Reset the height
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
}

document.getElementById("chat-icon")!.onclick = function () {
  const chatModal = document.getElementById("chat-modal");
  chatModal?.classList.toggle("hidden");
};

function sanitizeMessage() {
  const messages = document.getElementsByClassName("messageInner");

  const last = messages.item(messages.length - 1) as HTMLSpanElement;

  const html = last.innerHTML;
  last.innerHTML = "";
  last.textContent = html;
}

document.body.addEventListener("htmx:afterRequest", (event: any) => {
  const status = event.detail.xhr.status;

  if (status === 200) {
    const loaders = document.querySelectorAll(".message-loader");
    loaders.forEach((l) => l.remove());
  }
});

function handleMessageInput(t: HTMLTextAreaElement) {
  const b = document.querySelector("button[type=submit]") as HTMLButtonElement;
  if (t.value.trim().length > 0) {
    b.disabled = false;
  } else {
    b.disabled = true;
  }
}
