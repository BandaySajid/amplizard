enum RespType {
  "json" = "json",
  "text" = "text",
}

export default function initClient(baseUrl: string) {
  return async function (
    endpoint: string,
    options: RequestInit,
    type: RespType = RespType.json,
  ) {
    const resp = await fetch(baseUrl + endpoint, options);
    let data: string | object;
    if (type === RespType.json) {
      data = await resp.json();
    } else {
      data = await resp.text();
    }

    return {
      data: data || null,
      status: resp.status,
      statusText: resp.statusText,
      ok: resp.ok,
      headers: resp.headers,
    };
  };
}
