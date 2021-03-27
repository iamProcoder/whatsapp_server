const { Client } = require('whatsapp-web.js');

const socketApi = (io) => {
  let isReadyClient = false;
  let limitTimestamp_ = 50;
  
  let client = new Client();
  client.initialize();

  io.on("connection", (socket) => {    
    console.log("~~~~~~~~~ socket running ~~~~~~~~~");

    client.on("qr", (qr) => {
      socket.emit("ready_qr", qr);
    });

    client.on("ready", () => {
      console.log("Client is ready!");
      isReadyClient = true;
      socket.emit("isReadyClient", isReadyClient);
    });
    
    socket.on("getContactList", () => {
      if (isReadyClient) {
        client.getContacts()
          .then((cl) => {
             socket.emit("contactList", cl);            
          })
          .catch((err) => console.log("getContacts ==> " + err));
      }
    });
    
    socket.on('getContactPhoto', (id) => {
      const _id = `${id}@c.us`;
      client.getProfilePicUrl(_id)
        .then((picUrl) => {
          socket.emit('responseContactPhoto', picUrl);
        })
        .catch(err => console.log("getContactPhoto ==> " + err));
    });

    socket.on("getChatById", async(data) => {
      try {
        const { id, isScrollTop } = data;        
        if (isScrollTop) limitTimestamp_ += 25;
        else limitTimestamp_ = 50;
        const _id = `${id}@c.us`;
        if (isReadyClient) {
          const messagePromiseList = await client.getChatById(_id)
          .then(chat => chat.fetchMessages({limit: limitTimestamp_, id: {user: id}}))
          .then(messages => {
            const mediaInMessagePromises = messages.map((message) => {
              if (message.hasMedia) {
                  const promise = message.downloadMedia().then((media) => {
                  message.mediaKey =  media.data;
                });

                return {message, promise};
              }
              return {message};
            });
            return mediaInMessagePromises;
          })

          const promises = messagePromiseList.filter(({promise}) => promise).map(({promise}) => promise);
          await Promise.all(promises);
          socket.emit('fetchMessages', messagePromiseList.map(({message}) => message));       
        }
      } catch (error) {
        console.log(console.log("getChatById ==> " + error))
      }
    });

    client.on("message", (message) => {
      let fromUser = message.from;
      if (message.hasMedia) {
        message.downloadMedia().then((media) => {
          message.mediaKey = media.data;
          socket.emit("inComingMessage", { message, fromUser });
        });
      } else socket.emit("inComingMessage", { message, fromUser });
    });

    socket.on("sendMessage", (data) => {
      const { number, message } = data;
      const _number = `${number}@c.us`;
      client.sendMessage(_number, message).then((response) => {
        if (response.fromMe) {
          client.getChatById(_number).then((chat) => {
            chat.fetchMessages({limitTimestamp: 50, id: {user: number}})
            .then((messages) => { 
              socket.emit('fetchMessages', messages);
            }).catch(err => console.log("fetchMessages ==> " + err));
            
          }).catch(err => console.log("getChatById ==> " + err));
        }
      });
    });

    socket.on("disconnect", () => {
      console.log("user disconnected");
      isReadyClient = false;
    });

    client.on("disconnected", () => {
      console.log("user disconnected on client func");
      isReadyClient = false;
    });
    
  });
};

module.exports = socketApi;


