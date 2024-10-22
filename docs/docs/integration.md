# Integration

## Using Prebuilt UI

Currently, the prebuilt UI for Amplizard is supported exclusively for web applications. To integrate the Amplizard chatbot into your web app, follow these steps using the Amplizard SDK.

#### Step 1: Use the Amplizard SDK

To get started, the SDK requires the `tokenize` endpoint of your backend, which will handle communication with the Amplizard backend for creating a new chat session.

So below is the example tokenization route.

**NOTE**: The Prebuilt UI SDK expects the below response structure, make sure to follow that way.

=== "JavaScript"

    ```javascript
    // '/tokenization'
    async function tokenizationRoute(req, res) {
      const resp = await fetch(
        "https://amplizard.com/api/v1/bots/replace_with_bot_id/chat/new",
        {
          headers: { "x-api-key": "replace_with_api_key" },
          body: JSON.stringify({ saveHistory: true }), // save chat history
          method: "POST",
        }
      );

      if (!resp.ok) {
        console.log(resp);
        return res
          .status(400)
          .json({ status: "error", description: "tokenization error!!!" });
      }

      const jsonResp = await resp.json();

      console.log(jsonResp);

      return res.status(201).json({
        status: "success",
        token: jsonResp.token,
        chatId: jsonResp.chatId,
      });
    }
    ```

=== "Python"

    ```python
    from flask import Flask, request, jsonify
    import requests

    app = Flask(__name__)

    @app.route('/tokenization', methods=['POST'])
    async def tokenization_route():
        try:
            # Make the POST request to the Amplizard backend
            response = requests.post(
                "https://amplizard.com/api/v1/bots/replace_with_bot_id/chat/new",
                headers={"x-api-key": "replace_with_api_key"},
                json={"saveHistory": True},  # save chat history
            )

            # Check if the request was successful
            if response.status_code != 200:
                print(response.text)
                return jsonify({"status": "error", "description": "tokenization error!!!"}), 400

            # Parse the JSON response
            json_resp = response.json()

            print(json_resp)

            # Return the token and chatId
            return jsonify({
                "status": "success",
                "token": json_resp.get("token"),
                "chatId": json_resp.get("chatId"),
            }), 201

        except Exception as e:
            print(str(e))
            return jsonify({"status": "error", "description": "An unexpected error occurred."}), 500

    if __name__ == '__main__':
        app.run(port=5000)
    ```

#### Step 2: Include the Amplizard Script

Add the following script tag to the `<head>` section of your HTML file:

```html
<script
  src="https://cdn.amplizard.com/js/amplizard.js"
  id="amplizardScript"
  crossorigin="anonymous"
></script>
```

#### Step 3: Initialize and Render the Amplizard Chatbot

Use the following code to initialize the Amplizard chatbot and render it in your web app:

```javascript
const amplizard = new window.Amplizard("your_tokenize_endpoint", {
  botId: "bot_id_goes_here",
  method: "request_method",
  headers: {}, // Example: authorization headers
});

async function main() {
  await amplizard.tokenize();
  await amplizard.render("body");
}

main();
```

## Using Api

### New chat session endpoint

#### Description

This endpoint creates a new chat session with the Amplizard chatbot and returns the chatId(used for conversation) and the token.

#### URL

`POST /api/v1/bots/{bot_id}/chat/new`

#### Request

##### Headers

- `x-api-key`: **string** (required) - Your API key for authentication.

##### Request Method

- `method`: **POST**.

##### Body Parameters

- `saveHistory`: **boolean** (optional) - Whether to save the chat history.

#### Response

- **Status**: `201 Created`
- **Body**:

  ```json
  {
    "status": "string", //response status: either 'success' or 'error'.
    "description": "string", //description of the response.
    "token": "stirng", //auth token (only for prebuilt ui).
    "chatId": "string" //new chat id that will be used for converation.
  }
  ```

### Chat conversation endpoint

#### Description

This endpoint interacts with the Amplizard AI model to facilitate conversations.

#### URL

`POST /api/v1/bots/{bot_id}/chat/{chat_id}`

#### Request

##### Request Method

- `method`: **POST**.

##### Headers

- `x-api-key`: **string** (required) - Your API key for authentication.

##### Body Parameters

- `prompt`: **string** (required) - Chat prompt from user for ai.
- `image`: **binary** (optional) - image for ai to analyze(only when specifically requested by AI).

#### Successful Response

- **Status**: `201 Created`
- **Body**:

  ```json
  {
    "status": "string", // response status: either 'success' or 'error'.
    "message": "string", // response message from the ai model.
    "sender": "string", // indicates the sender, AI in this case.
    "name": "string", // name of the ai model.
    "closed": "boolean" // whether the chat has been closed or not.
  }
  ```
