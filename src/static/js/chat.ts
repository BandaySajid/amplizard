/* const ImageMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
];

const loadedScript = document.getElementById(
  "chatUiScript",
) as HTMLScriptElement;

const url =
  loadedScript.getAttribute("environment") === "production"
    ? "https://amplizard.com"
    : "http://localhost:9090";

const textarea = document.getElementById("chat-input") as HTMLTextAreaElement;

function autoResize() {
  textarea.style.height = "auto"; // Reset height to auto
  textarea.style.height = `${Math.min(textarea.scrollHeight, (<any>textarea).maxHeight)}px`;
}

const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight, 10);
(<any>textarea).minHeight = lineHeight; // 1 row
(<any>textarea).maxHeight = lineHeight * 3; // 3 rows

textarea.addEventListener("input", autoResize);

autoResize();

function showToast(message: string, type: string) {
  window.dispatchEvent(
    new CustomEvent("toast", {
      detail: {
        message,
        type, // 'success', 'info', 'warning', 'danger'
      },
    }),
  );
}

const chatModal = document.getElementById("chat-modal");
const chatContainer = document.getElementById("chat-container") as HTMLElement;
const chatForm = document.getElementById("chat-form") as HTMLFormElement;
const sendButton = document.getElementById("send_btn") as HTMLButtonElement;
const chatInput = document.getElementById("chat-input") as HTMLInputElement;
const imageInput = document.getElementById("file-input") as HTMLInputElement;
chatForm.addEventListener("submit", submitForm);
let msg_count = 0;

async function fetchSource(url: string, opts: RequestInit) {
  const response = await fetch(url, {
    method: opts.method || "GET",
    headers: opts.headers,
    body: opts.body,
    signal: opts.signal,
  });

  if (!response.ok) {
    throw new Error("Network request failed");
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  async function* streamParser() {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let startIndex = 0;
        let endIndex;
        while ((endIndex = buffer.indexOf("\n\n", startIndex)) >= 0) {
          const chunk = buffer.slice(startIndex, endIndex).trim();
          startIndex = endIndex + 2;

          if (chunk.length) {
            yield sseevent(chunk);
          }
        }
        buffer = buffer.slice(startIndex);
      }
    } catch (err) {
      console.error("Error while reading the stream:", err);
    }
  }

  return streamParser();
}

function sseevent(message: string) {
  // Extracting only the data part
  const dataLines = message
    .split("\n")
    .filter((line) => line.startsWith("data: "));
  const data = dataLines.map((line) => line.slice(5).trim()).join("\n");
  return { data };
}

async function sendMessage(formData: FormData, url: string) {
  const controller = new AbortController();

  try {
    const dataStream = await fetchSource(url, {
      method: "POST",
      body: formData,
      headers: {
        accessToken: localStorage.getItem("AMPLIZARD_UI_TOKEN") || "",
      },
      signal: controller.signal,
    });

    addMessage("AI", "");

    for await (const event of dataStream) {
      try {
        if (event.data?.length > 0) {
          const data = JSON.parse(event.data);
          if (data.end) {
            sendButton.disabled = false;
            sendButton.firstElementChild?.classList.remove("hidden");
            sendButton.lastElementChild?.classList.add("htmx-indicator");
            controller.abort();
            break;
          }
          const messageElement = document.getElementById(
            "MESSAGE_ID_" + msg_count,
          );
          if (messageElement) {
            messageElement.textContent += data.message;
          }
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      } catch (err) {
        console.error("Error parsing message:", err);
      }
    }
  } catch (err) {
    console.error("Streaming error:", err);
  }
}

function submitForm(event: Event) {
  event.preventDefault();

  const image = imageInput.files?.[0];

  const formData = new FormData();
  if (image) {
    if (!ImageMimeTypes.includes(image.type)) {
      return showToast("Only images are supported", "danger");
    }

    formData.append("image", image);
    imageInput.value = "";
  }

  const message = chatInput.value.trim();
  if (image || message) {
    sendButton.firstElementChild!.classList.add("hidden");
    sendButton.lastElementChild?.classList.remove("htmx-indicator");

    formData.append("prompt", message);
    formData.append("stream", "true");
    addMessage("You", message);

    const apiUrl = `${url}/api/v1/bots/${localStorage.getItem("AMPLIZARD_BOT_ID")}/chat/${localStorage.getItem("AMPLIZARD_CHAT_ID")}`;
    sendMessage(formData, apiUrl);

    sendButton.disabled = true;
    chatInput.value = "";
  }
}

function addMessage(sender: string, message: string) {
  msg_count += 1;
  const id = "MESSAGE_ID_" + msg_count;
  const messageElement = document.createElement("div");
  const msgTextElement = document.createElement("p");
  const msgBadgeElement = document.createElement("span");

  msgTextElement.classList.add("leading-relaxed", "break-words");

  msgBadgeElement.classList.add("block", "font-bold", "text-gray-700");

  msgBadgeElement.textContent += sender;

  const newSpanMessageElement = document.createElement("span");
  newSpanMessageElement.id = id;
  newSpanMessageElement.textContent = message;

  msgTextElement.appendChild(msgBadgeElement);
  msgTextElement.appendChild(newSpanMessageElement);
  messageElement.className =
    "flex gap-3 my-4 text-gray-600 text-sm flex-1 mt-4";
  messageElement.innerHTML = `
		<span class="relative flex shrink-0 overflow-hidden rounded-full w-8 h-8">
			<div class="rounded-full bg-gray-100 border p-1">
				${sender === "You" ? getUserIcon() : getAIIcon()}
			</div>
		</span>
		${msgTextElement.outerHTML}
		`;
  chatContainer?.appendChild(messageElement);
  chatContainer!.scrollTop = chatContainer!.scrollHeight;
  return msgTextElement;
}

function getUserIcon() {
  return `<svg stroke="none" fill="black" stroke-width="0" viewBox="0 0 16 16" height="20" width="20" xmlns="http://www.w3.org/2000/svg">
			<path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z">
			</path>
		</svg>`;
}

function getAIIcon() {
  return `<svg stroke="none" fill="black" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true" height="20" width="20" xmlns="http://www.w3.org/2000/svg">
			<path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z">
			</path>
		</svg>`;
}

chatContainer!.scrollTop = chatContainer!.scrollHeight;

// Add initial AI message
addMessage("AI", "Hi, how can I help you today?");*/
