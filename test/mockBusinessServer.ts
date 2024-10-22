import express from "express";

const server = express();
server.use(express.json());
server.use((req, _, next) => {
  console.log("URL called:", req.url);
  next();
});

const users = {
  1: {
    id: 1,
    name: "Alice Johnson",
    email: "alice.johnson@example.com",
    joined: "2022-01-15",
  },
  2: {
    id: 2,
    name: "Bob Smith",
    email: "bob.smith@example.com",
    joined: "2022-02-20",
  },
  3: {
    id: 3,
    name: "Charlie Brown",
    email: "charlie.brown@example.com",
    joined: "2022-03-05",
  },
};

const orders = {
  101: {
    id: 101,
    userId: 1,
    item: "Laptop",
    amount: 1200,
    imageUrl:
      "https://images.pexels.com/photos/2280547/pexels-photo-2280547.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    date: "2023-01-10",
  },
  102: {
    id: 102,
    userId: 2,
    item: "Smartphone",
    imageUrl:
      "https://images.pexels.com/photos/2280547/pexels-photo-2280547.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    amount: 800,
    date: "2023-02-15",
  },
  103: {
    id: 103,
    userId: 1,
    item: "Headphones",
    amount: 200,
    imageUrl:
      "https://images.pexels.com/photos/2280547/pexels-photo-2280547.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    date: "2023-03-20",
  },
  104: {
    id: 104,
    userId: 3,
    item: "Tablet",
    amount: 600,
    imageUrl:
      "https://images.pexels.com/photos/2280547/pexels-photo-2280547.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    date: "2023-04-10",
  },
};

function getUser(uid: string) {
  const user = users[uid];

  if (!user) return null;
  return user;
}

function getAllOrdersForUser(user_id: string) {
  const ordersForUser = Object.values(orders).filter(
    (o) => o.userId === Number(user_id),
  );

  return ordersForUser;
}

function getOrderForUser(order_id: string, user_id: string) {
  const order = orders[order_id];

  console.log("checking order for order id: and user id:", order_id, user_id);

  if (!order || order.userId !== user_id) {
    return null;
  }

  return order;
}

server.post("/tokenize", async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const resp = await fetch(
      "http://localhost:9090/api/v1/bots/a6452388-a937-4551-8da7-8fea93c5af10/chat/new",
      {
        headers: { "x-api-key": "48b4d8531917f4bed2f4e57722137900" },
        body: JSON.stringify({ saveHistory: true }),
        method: "POST",
      },
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
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ status: "error", error: "internal server error!" });
  }
});

server.get("/currentUser", function (req, res) {
  const user = getUser(String(1)); //mocking
  if (!user) {
    return res
      .status(404)
      .json({ status: "error", description: "user does not exist!" });
  }
  res.status(200).json(user);
});

server.post("/orders/:order_id", function (req, res) {
  console.log(req.body);
  const order = getOrderForUser(req.params.order_id, req.body.userId);
  if (!order) {
    return res
      .status(400)
      .json({ status: "error", description: "order not found for the user" });
  }
  res.status(200).json(order);
});

server.post("/orders", function (req, res) {
  console.log(req.body);
  const ordersForUser = getAllOrdersForUser(req.body.userId);
  res.status(200).json(ordersForUser);
});

server.post("/orders/:order_id/cancel", function (req, res) {
  const order_id = req.params.order_id;
  const order = getOrderForUser(order_id, req.body.userId);

  if (order) {
    return res.status(200).json({
      status: "success",
      description: `Order with id ${order_id} has been cancelled.`,
    });
  }

  res.status(404).json({
    status: "error",
    description: `Order with id ${order_id} does not exist!`,
  });
});

export default function start(PORT: number, host: string = "127.0.0.1") {
  server.listen(PORT, host, function () {
    console.log("MOCK-BUSINESS-SERVER is listening on:", PORT);
  });
}
