type ChVals = {
  [key: string]: string;
};

type inputError = {
  element: HTMLInputElement;
  path: string;
  msg: string;
};

function createInputErrorElement(message: string) {
  const elem = document.createElement("p");
  elem.classList.add("text-red-500", "text-xs", "input-err-elem");
  elem.innerText = message;
  return elem;
}

function triggerInputErrors(inputs: inputError[]) {
  for (const input of inputs) {
    if (input.element.name.trim() === input.path) {
      input.element.classList.remove("border-gray-300");
      input.element.style.borderColor = "red";
      const newErrElem = createInputErrorElement(input.msg);
      input.element.after(newErrElem);
    }
  }
}

function removeInputError(input: HTMLInputElement) {
  const errElem = input.nextElementSibling;
  errElem?.remove();
}

function removeFormInputErrors(form: HTMLFormElement) {
  const errElems = form.querySelectorAll(".input-err-elem");

  for (const errElem of errElems) {
    const inputElem = errElem.previousElementSibling as HTMLInputElement;

    inputElem.style.borderColor = "";

    inputElem.classList.add("border-gray-200");

    errElem.remove();
  }
}

document.body.addEventListener("htmx:responseError", (event: any) => {
  const errResp = event.detail.xhr.responseText;
  const status = event.detail.xhr.status;
  const form = event.detail.elt.form as HTMLFormElement;
  try {
    const parsedErr = JSON.parse(errResp);
    if (status === 422) {
      const inputs = parsedErr.errors.map((err: any) => {
        const element = form.querySelector(
          `input[name=${err.path}], textarea[name=${err.path}], select[name=${err.path}]`,
        );
        return { path: err.path, msg: err.msg, element };
      });

      triggerInputErrors(inputs);
    } else {
      return showToast(parsedErr.error, "danger");
    }
  } catch (err) {
    console.log("ERRRRRRR:", err);
    //invalid json
  }
});

document.body.addEventListener("htmx:afterRequest", (event: any) => {
  const status = event.detail.xhr.status;

  const respText = event.detail.xhr.responseText;
  try {
    const resp = JSON.parse(respText);
    if (status < 400) {
      return showToast(resp.description, "success");
    }
  } catch (err) {
    console.log("ERRRRRRR:", err);
    /*if (status < 302) {
      return showToast(respText, "success");
    }*/
    //invalid json
  }
});

document.body.addEventListener("htmx:configRequest", (event: any) => {
  const form = event.detail.elt.form;
  removeFormInputErrors(form);
});

//get input value
function val(id: string) {
  const elem = document.getElementById(id) as HTMLInputElement;
  return elem?.value;
}

//convert text to arr
function arr(text: string, d: string) {
  return JSON.stringify(text.split(d));
}

function disable(elem: string | HTMLButtonElement) {
  if (typeof elem === "string") {
    elem = document.getElementById(elem) as HTMLButtonElement;
    elem.disabled = true;
  } else {
    elem.disabled = true;
  }
}

function enable(elem: string | HTMLButtonElement) {
  if (typeof elem === "string") {
    elem = document.getElementById(elem) as HTMLButtonElement;
    elem.disabled = false;
  } else {
    elem.disabled = false;
  }
}

const formElements = document.querySelectorAll("form");
const previousFormValues = new Map();

window.addEventListener("DOMContentLoaded", () => {
  for (const form of formElements) {
    const submitBtn = form.querySelector(
      `button[type="submit"]`,
    ) as HTMLButtonElement;
    if (submitBtn) submitBtn.disabled = true;

    const previousValues = new Map();
    let values = {} as ChVals;

    for (const elem of form.elements) {
      const target = elem as HTMLInputElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "SELECT" ||
        target.tagName === "TEXTAREA"
      ) {
        previousFormValues.set(target.id, target.value.trim() || "");
        values[target.id] = "f";
      }
    }

    form.addEventListener("input", function (event) {
      console.log("form input");
      const target = event.target as HTMLInputElement;
      const tID = target.id as keyof typeof previousFormValues;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "SELECT" ||
        target.tagName === "TEXTAREA"
      ) {
        const currentValue = target.value.trim();
        const previousValue = previousFormValues.get(tID) || "";
        previousValues.set(tID, currentValue);

        if (currentValue !== previousValue) {
          values[tID as keyof typeof values] = "t";
        } else {
          values[tID as keyof typeof values] = "f";
        }
      }

      const isNotChanged = Object.values(values).every((val) => {
        return val === "f";
      });

      if (isNotChanged || form.classList.contains("disabled")) {
        form.removeAttribute("cVal");
        submitBtn.disabled = true;
      } else {
        submitBtn.disabled = false;
        form.setAttribute("cVal", "true");
      }
    });

    submitBtn.addEventListener("click", function (_) {
      previousFormValues.clear();
      for (const key of previousValues.keys()) {
        previousFormValues.set(key, previousValues.get(key));
      }
      submitBtn.disabled = true;
    });
  }
});

function showToast(message: string, type: string) {
  window.dispatchEvent(
    new CustomEvent("toast", {
      detail: {
        message,
        type, // or 'info', 'warning', 'danger'
      },
    }),
  );
}
