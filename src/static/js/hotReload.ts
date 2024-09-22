if (document.location.hostname === "localhost") {
  const reloadGateway = new WebSocket("ws://localhost:6969");

  reloadGateway.addEventListener("message", function (msg: MessageEvent) {
    if (msg.data === "reload") {
      window.location.reload();
    }
  });
}
