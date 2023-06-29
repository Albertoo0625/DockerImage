const axios = require('axios');
const ngrok = require('ngrok');
const http = require('http');
const io = require('socket.io');

let assignedPort;

const handleStream = async (req, res) => {
  const url = req.body.url;
  try {
    const server = http.createServer((req, serverResponse) => {
      const requestChunk = async () => {
        try {
          const response = await axios.get(url, {
            responseType: 'stream',
          });

          response.data.on('data', (chunk) => {
            serverResponse.write(chunk);
          });

          response.data.on('end', () => {
            requestChunk(); // Request the next chunk when the current one ends
          });

          response.data.on('error', (error) => {
            console.error('Stream encountered an error:', error);
          });
        } catch (error) {
          console.error('Error fetching chunk:', error);
        }
      };

      requestChunk(); // Start requesting the first chunk

      serverResponse.on('close', () => {
        console.log('Connection closed by the client');
        // You can handle any cleanup or additional logic here
      });
    });

    server.listen(0, () => {
      assignedPort = server.address().port;
      console.log(`Server is running on port ${assignedPort}`);
      console.log(`http://localhost:${assignedPort}`);
    });

    // Start the server and expose it with ngrok
    try {
      const ngrokUrl = await ngrok.connect({
        authtoken: '2KVGmlxJUHWrgTXlIU9wtesvpM3_39DmFsdbs5eBcQsustWvy',
        addr: assignedPort, // Use the available port
        region: 'in', // Replace with your desired ngrok region
      });

      console.log('ngrok connected:', ngrokUrl);

      // Close ngrok connection when Node.js exits
      process.on('exit', () => {
        ngrok.kill();
      });

      const startSocketServer = () => {
        const socketServer = http.createServer();
        const responseio = io(socketServer, {
          cors: {
            origin: '*',
            methods: ['GET', 'POST'],
          },
        });

        responseio.on('connection', (socket) => {
          console.log('A user connected');
          socket.send(ngrokUrl); // Send the ngrok URL to the client

          socket.on('error', console.error);
        });

        socketServer.listen(8080, () => {
          console.log('Socket server listening on port 8080');
        });

        socketServer.on('error', (error) => {
          console.error('Socket server error:', error);
          socketServer.close();
          startSocketServer(); // Retry setting up the server again
        });
      };

      startSocketServer();
    } catch (error) {
      console.error('Error starting ngrok:', error);
    }
  } catch (error) {
    console.error('Error handling stream:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
};

module.exports = { handleStream };
