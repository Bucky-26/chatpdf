const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
const port = 11111;

app.use(express.json());


async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading JSON file:", error.message);
        throw error;
    }
}


async function handleApiRequest(req, res, apiEndpoint, requestData) {
    try {
        const response = await axios.post(apiEndpoint, JSON.stringify(requestData), getConfig());
        const responseData = response.data;

        console.log(responseData);

        const src = responseData.sourceId;  

        const responseDataFormatted = {
            [requestData.attachmentID || "defaultAttachmentID"]: src,
        };

        const jsonString = JSON.stringify(responseDataFormatted, null, 2);

        await fs.writeFile('data.json', jsonString, 'utf-8');

        console.log(jsonString);
        res.status(200).json(responseDataFormatted);
    } catch (error) {
        console.error("Error:", error.message);
        res.status(error.response?.status || 500).json({ error: error.message });
    }
}


function getConfig() {
    return {
        headers: {
            "x-api-key": "sec_9IkT1KWROWwzFUdfcf68wUHrxNECJgpo",
            "Content-Type": "application/json",
        },
    };
}

app.get("/v1/upload", async (req, res) => {
    try {
        const { docs, attachmentID } = req.query;

        if (!docs) {
            return res.status(400).json({ error: 'Missing "docs" parameter' });
        }

        const requestData = { url: docs, attachmentID };
        await handleApiRequest(req, res, 'https://api.chatpdf.com/v1/sources/add-url', requestData);
    } catch (error) {
        console.error("Error:", error.message);
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

app.get("/v1/chat", async (req, res) => {
    try {
        const { query, id } = req.query;

        const jsonData = await readJsonFile('data.json');

        if (jsonData.hasOwnProperty(id)) {
            const sourceId = jsonData[id];

            const chatData = {
                stream: false,
                sourceId: sourceId,
                messages: [
                    {
                        role: "user",
                        content: query,
                    },
                ],
            };

            await handleApiRequest(req, res, 'https://api.chatpdf.com/v1/chats/message', chatData);
        } else {
            res.status(404).json({ error: 'AttachmentID not found' });
        }
    } catch (error) {
        console.error("Error:", error.message);
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

app.get('/', (req, res) => {
    res.sendStatus(200);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
