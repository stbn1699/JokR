import express from "express";

const app = express();
const PORT = 3000;

app.get("/ping", (request, response) => {
	response.status(200).json({
		status: "ok",
		message: "pong",
	});
});

app.listen(PORT, () => {
	console.log(`🚀 Server running on http://localhost:${PORT}`);
});
