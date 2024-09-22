const AMPLIZARD_ONE_HOUR = 1000 * (60 * 60);

interface AmplizardOpts {
  botId: string;
  method: string;
  headers?: Headers;
  body?: string;
}

class Amplizard {
  businessUrl: string;
  opts: AmplizardOpts;
  localhost: boolean;
  embedUrl: string;
  chatUIUrl: string;
  host: string;

  constructor(businessUrl: string, opts: AmplizardOpts) {
    if (!businessUrl) {
      throw new Error("business url is required");
    }

    if (!opts.botId) {
      throw new Error("bot id is required");
    }

    const scriptUrl = new URL(
      (document.getElementById("amplizardScript") as HTMLScriptElement).src,
    );

    const hostname = scriptUrl.hostname;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      this.host = "http://localhost:9090";
      this.localhost = true;
      this.embedUrl = "http://localhost:9090/embed/";
      this.chatUIUrl = "http://localhost:9090/js/chat.js";
    } else {
      this.host = "https://amplizard.com";
      this.localhost = false;
      this.embedUrl = "https://amplizard.com/embed/";
      this.chatUIUrl = "https://cdn.amplizard.com/js/chat.js";
    }

    this.businessUrl = businessUrl;
    this.opts = opts;

    localStorage.setItem("AMPLIZARD_BOT_ID", opts.botId);
  }

  async tokenize() {
    const existingToken = localStorage.getItem("AMPLIZARD_UI_TOKEN");
    if (!existingToken) {
      const resp = await fetch(this.businessUrl, this.opts);
      const jsonResp = await resp.json();
      const token = jsonResp.token;
      const chatId = jsonResp.chatId;

      if (!token) {
        throw new Error("No token received!");
      }

      if (!chatId) {
        throw new Error("No chatId received!");
      }

      localStorage.setItem("AMPLIZARD_CHAT_ID", chatId);
      localStorage.setItem("AMPLIZARD_UI_TOKEN", token);
    } else {
      console.log("using existing session");
    }
  }

  async render(elementId: string) {
    if (!elementId) {
      throw new Error("Render element id is required");
    }

    const element = document.getElementById(elementId) as HTMLElement;

    const html = await this.requestHTML(
      this.embedUrl + localStorage.getItem("AMPLIZARD_CHAT_ID"),
      { cache: "default" },
    );

    if (html) {
      element.innerHTML = html;
    } else {
      console.error("Error while rendering ui");
    }

    //this.loadJS(this.chatUIUrl, this.localhost ? "development" : "production");
    this.loadCSS(this.host + "/css/styles.css");
    this.loadJS(
      this.host + "/js/htmx.min.js",
      this.localhost ? "development" : "production",
    );
    this.loadJS(
      this.host + "/js/alpine.min.js",
      this.localhost ? "development" : "production",
    );
    this.loadJS(
      this.host + "/js/fontawesome.js",
      this.localhost ? "development" : "production",
    );
    this.loadJS(
      this.host + "/js/chatbot.js",
      this.localhost ? "development" : "production",
    );
  }

  private async requestHTML(embedUrl: string, options: RequestInit) {
    try {
      const htmlResp = await fetch(embedUrl, options);

      if (!htmlResp.ok) throw htmlResp;

      const html = await htmlResp.text();
      return html;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  loadJS(FILE_URL: string, environment: string, async: string = "true") {
    const scriptEle = document.createElement("script");

    scriptEle.setAttribute("src", FILE_URL);
    scriptEle.setAttribute("environment", environment);
    scriptEle.setAttribute("type", "text/javascript");
    scriptEle.setAttribute("async", async);
    scriptEle.id = "chatUiScript";

    document.body.appendChild(scriptEle);

    scriptEle.addEventListener("load", () => {
      console.log("Script loaded");
    });

    scriptEle.addEventListener("error", (ev) => {
      console.error("Error on loading script", ev);
    });
  }

  loadCSS(FILE_URL: string) {
    const linkElem = document.createElement("link");
    linkElem.href = FILE_URL;
    linkElem.rel = "stylesheet";
    document.head.appendChild(linkElem);
  }
}

(<any>window).Amplizard = Amplizard;
