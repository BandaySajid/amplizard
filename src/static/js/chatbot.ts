const fileInput = document.getElementById("file-input") as HTMLInputElement;
const chatForm = document.getElementById("chat-form") as HTMLFormElement;
const selectedImageContainer = document.getElementById(
  "selected-image-container",
) as HTMLDivElement;
const sendMessageButton = document.getElementById(
  "send_btn",
) as HTMLButtonElement;

const ImageMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
];

document.body.addEventListener("htmx:configRequest", function (evt) {
  (evt as any).detail.headers["Authorization"] =
    "Bearer " + localStorage.getItem("AMPLIZARD_UI_TOKEN"); // add a new header into the request
});

const MAX_FILE_SIZE = 20 * (1000 * 1000);

function refreshSelectedImage() {
  fileInput.value = "";
  const selectedImage = document.getElementById(
    "selected-image",
  ) as HTMLDivElement;
  selectedImage?.remove();
}

function showToast(message: string, type: string) {
  dispatchEvent(
    new CustomEvent("toast", {
      detail: {
        message,
        type,
      },
    }),
  );
}

type attr = [string, string];

function createElement(elemName: string, attributes: Array<attr>) {
  const element = document.createElement(elemName);
  for (const attr of attributes) {
    element.setAttribute(attr[0], attr[1]);
  }
  return element;
}

sendMessageButton.addEventListener("click", refreshSelectedImage);
fileInput.addEventListener("input", (event) => {
  const exSelected = document.getElementById("selected-image");
  exSelected?.remove();

  const target = event.target as HTMLInputElement;
  const file = target.files![0];

  if (!ImageMimeTypes.includes(file.type)) {
    fileInput.value = "";
    return showToast("Only images are supported!", "danger");
  }

  if (file.size > MAX_FILE_SIZE) {
    fileInput.value = "";
    return showToast("File size should be smaller than 20MB", "danger");
  }

  const container = createElement("div", [
    ["class", "selected-image flex gap-2 items-center bg-gray-900 p-2"],
    ["id", "selected-image"],
  ]);

  const nameElem = createElement("span", [["class", "text-white"]]);
  nameElem.textContent = file.name;

  const unselectIcon = createElement("i", [
    ["class", "fa-regular fa-circle-xmark text-white cursor-pointer"],
    ["id", "unselect-image-button"],
  ]);

  container.appendChild(nameElem);
  container.appendChild(unselectIcon);

  selectedImageContainer.appendChild(container);

  unselectIcon.addEventListener("click", refreshSelectedImage);
});
